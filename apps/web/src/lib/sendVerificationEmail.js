import { sendAppEmail } from '@/lib/mail/sendAppEmail';

function appOrigin() {
  const base =
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_CREATE_BASE_URL ||
    'http://localhost:4000';
  return base.replace(/\/$/, '');
}

/**
 * Sends email verification link via Nodemailer (Gmail/SMTP), Resend, or logs in dev.
 */
export async function sendVerificationEmail({ to, token }) {
  const verifyUrl = `${appOrigin()}/account/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
  const preheader = "Activate your SurveyTasker account to start earning.";

  await sendAppEmail({
    to,
    subject: "Confirm your email for SurveyTasker",
    html: `
      <div style="background:#f3f5f7;padding:28px 0;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
          <div style="padding:24px 28px;background:#0f5132;color:#ffffff;">
            <div style="font-size:18px;font-weight:700;">SurveyTasker</div>
            <div style="font-size:13px;opacity:.9;margin-top:4px;">${preheader}</div>
          </div>
          <div style="padding:28px;">
            <h1 style="font-size:24px;line-height:1.3;margin:0 0 14px 0;">Verify your email address</h1>
            <p style="font-size:15px;line-height:1.7;margin:0 0 12px 0;">Welcome to SurveyTasker. Confirm your email to activate your account and complete sign in.</p>
            <p style="font-size:15px;line-height:1.7;margin:0 0 24px 0;"><strong>Account:</strong> ${to}</p>
            <a href="${verifyUrl}" style="display:inline-block;background:#0f5132;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Verify email</a>
            <p style="font-size:13px;line-height:1.7;color:#6b7280;margin:22px 0 0;">
              This link expires in 24 hours. If the button does not work, paste this URL into your browser:
            </p>
            <p style="word-break:break-all;font-size:12px;line-height:1.6;color:#374151;margin:8px 0 0;">${verifyUrl}</p>
          </div>
          <div style="padding:18px 28px;border-top:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.7;">
            If you did not create this account, you can ignore this message.
          </div>
        </div>
      </div>
    `,
    text: [
      "SurveyTasker - Verify your email address",
      "",
      `Account: ${to}`,
      "Activate your account by opening the link below:",
      verifyUrl,
      "",
      "This link expires in 24 hours.",
      "If you did not create this account, you can safely ignore this email.",
    ].join("\n"),
  });
}
