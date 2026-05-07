import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { extractIdentityDocument } from "@/lib/identity/documentProvider";
import { validateOcrAgainstDeclaration } from "@/lib/identity/validateIdentityCrosscheck";
import { SUPPORTED_COUNTRY_VALUES } from "@/constants/supportedCountries";
import { sendIdentityVerifiedWelcomeEmail } from "@/lib/transactionalEmail";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(session.user.id);
    const userEmail = session.user.email || null;

    let profiles = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;
    if (!profiles.length) {
      await sql`INSERT INTO profiles (user_id, full_name, country) VALUES (${userId}, NULL, NULL)`;
      profiles = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;
    }
    const profile = profiles[0];

    if (profile.identity_verified_at) {
      return Response.json({
        ok: true,
        alreadyVerified: true,
        identityVerifiedAt: profile.identity_verified_at,
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const documentKind = String(formData.get("documentType") || "national_id");

    const fullName = String(formData.get("fullName") || "").trim();
    const idNumber = String(formData.get("idNumber") || "").trim();
    const dateOfBirth = String(formData.get("dateOfBirth") || "").trim();
    const sex = String(formData.get("sex") || "").trim().toUpperCase();
    const region = String(formData.get("region") || "").trim();
    const country = String(formData.get("country") || "").trim();

    if (!fullName || !idNumber || !dateOfBirth || !sex || !region || !country) {
      return Response.json(
        {
          error:
            "Provide legal full name, ID number, date of birth, sex, state/city, and country before uploading.",
        },
        { status: 400 },
      );
    }

    if (!["M", "F"].includes(sex)) {
      return Response.json(
        { error: "Sex must be M or F as on your government ID." },
        { status: 400 },
      );
    }

    if (!SUPPORTED_COUNTRY_VALUES.has(country)) {
      return Response.json(
        { error: "Select a supported country from the list." },
        { status: 400 },
      );
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "Missing file upload" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.has(mimeType)) {
      return Response.json(
        { error: "Unsupported file type. Use JPG, PNG, WebP, or PDF." },
        { status: 400 },
      );
    }

    await sql`
      UPDATE profiles SET
        full_name = ${fullName},
        country = ${country}
      WHERE user_id = ${userId}
    `;

    const refreshed = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;
    const row = refreshed[0];

    const buffer = await file.arrayBuffer();

    const ocr = await extractIdentityDocument(buffer, mimeType, {
      profileFullName: fullName,
      originalFilename: file.name || "",
      declared: {
        fullName,
        idNumber,
        dateOfBirth,
        sex,
        country,
        region,
      },
    });

    if (ocr.confidence < 1) {
      return Response.json(
        {
          error:
            "Could not read this document clearly enough. Use a sharp, well-lit photo or PDF, or configure OCR (see IDENTITY_OCR_HTTP_URL / mock env vars).",
        },
        { status: 400 },
      );
    }

    const check = validateOcrAgainstDeclaration(
      {
        profileFullName: fullName,
        declaredIdNumber: idNumber,
        declaredDob: dateOfBirth,
        declaredSex: sex,
        declaredRegion: region,
        selectedCountry: country,
      },
      {
        fullName: ocr.fullName,
        idNumber: ocr.idNumber,
        dateOfBirth: ocr.dateOfBirth,
        expiryDate: ocr.expiryDate,
        country: ocr.country,
        region: ocr.region,
        sex: ocr.sex,
      },
    );

    if (!check.ok) {
      return Response.json(
        { error: check.error, code: check.code, extractedHint: check.extractedHint },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const snapshot = fullName.trim();
    const ocrSnapshot = {
      ...ocr,
      documentKind,
      verifiedAt: now,
    };

    try {
      await sql`
        UPDATE profiles SET
          identity_verified_at = ${now},
          identity_verified_name_snapshot = ${snapshot},
          identity_document_kind = ${documentKind},
          identity_last_submitted_at = ${now},
          identity_ocr_snapshot = ${JSON.stringify(ocrSnapshot)}
        WHERE user_id = ${userId}
      `;
    } catch (e) {
      if (
        String(e?.message || "").includes("identity_ocr_snapshot") ||
        String(e?.code || "") === "42703"
      ) {
        await sql`
          UPDATE profiles SET
            identity_verified_at = ${now},
            identity_verified_name_snapshot = ${snapshot},
            identity_document_kind = ${documentKind},
            identity_last_submitted_at = ${now}
          WHERE user_id = ${userId}
        `;
      } else {
        throw e;
      }
    }

    const updated = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;

    if (userEmail) {
      try {
        await sendIdentityVerifiedWelcomeEmail({
          to: userEmail,
          legalName: fullName,
        });
      } catch (mailErr) {
        console.error("[verify-upload] welcome email:", mailErr);
      }
    }

    return Response.json({
      ok: true,
      identityVerifiedAt: updated[0].identity_verified_at,
      identityVerifiedNameSnapshot: snapshot,
    });
  } catch (e) {
    console.error(e);
    if (
      String(e?.message || "").includes("identity_verified_at") ||
      String(e?.code || "") === "42703"
    ) {
      return Response.json(
        {
          error:
            "Database migration required: run db-identity-migration.sql (and db-identity-ocr-migration.sql) on Neon.",
        },
        { status: 503 },
      );
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
