import sql from "@/app/api/utils/sql";
import { sendAppEmail } from "@/lib/mail/sendAppEmail";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

const MAX_MESSAGE = 8000;

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

export async function POST(request) {
  const log = createLogger("api_contact", {
    requestId: getRequestId(request),
  });
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!email || !isValidEmail(email)) {
      return Response.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!message || message.length < 10) {
      return Response.json(
        { error: "Please enter a message (at least 10 characters)" },
        { status: 400 },
      );
    }
    if (message.length > MAX_MESSAGE) {
      return Response.json({ error: "Message is too long" }, { status: 400 });
    }

    await sql`
      INSERT INTO contact_submissions (email, message) VALUES (${email}, ${message})
    `;

    const inbox =
      process.env.GMAIL_USER?.trim() || process.env.CONTACT_INBOX_EMAIL?.trim();
    if (inbox) {
      await sendAppEmail({
        to: inbox,
        subject: `[SurveyTasker] Contact from ${email}`,
        html: `
          <p><strong>From:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <pre style="white-space:pre-wrap;font-family:inherit">${message.replace(/</g, "&lt;")}</pre>
        `,
        text: [`From: ${email}`, "", message].join("\n"),
      });
    } else {
      log.warn("inbox_not_configured", {
        message: "Contact saved but not emailed (no GMAIL_USER / CONTACT_INBOX_EMAIL).",
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
