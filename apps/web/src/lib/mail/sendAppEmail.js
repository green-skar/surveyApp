import nodemailer from 'nodemailer';

const DEFAULT_FROM = 'SurveyTasker <onboarding@resend.dev>';

function defaultFrom() {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

function stripPreview(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .slice(0, 500);
}

/** Lazy singleton transporter (Gmail or generic SMTP). */
let smtpTransport = null;

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

  if (gmailUser && gmailPass) {
    smtpTransport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
    return smtpTransport;
  }

  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    smtpTransport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      ...(user || pass ? { auth: { user: user || '', pass: pass || '' } } : {}),
    });
    return smtpTransport;
  }

  return null;
}

async function sendViaResend({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const from = defaultFrom();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(text ? { text } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(
      '[SurveyTasker] Resend API rejected the email:',
      res.status,
      body,
    );
  }
  return res.ok;
}

async function sendViaSmtp({ to, subject, html, text }) {
  const transport = getSmtpTransport();
  if (!transport) return false;

  await transport.sendMail({
    from: defaultFrom(),
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  });
  return true;
}

function mailError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/** True if Gmail, generic SMTP, or Resend is configured. */
export function isMailConfigured() {
  const gmail =
    process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim();
  const smtp = process.env.SMTP_HOST?.trim();
  const resend = process.env.RESEND_API_KEY?.trim();
  return Boolean(gmail || smtp || resend);
}

/**
 * Single outbound mail entry for the app.
 * Priority: Gmail (GMAIL_*) or generic SMTP (SMTP_HOST) via Nodemailer, then Resend HTTP, else dev log.
 *
 * @param {{ to: string, subject: string, html: string, text?: string, requireDelivery?: boolean }} params
 */
export async function sendAppEmail({ to, subject, html, text, requireDelivery = false }) {
  if (!to || typeof to !== 'string') {
    console.warn('[SurveyTasker] sendAppEmail: missing `to`');
    if (requireDelivery) {
      throw mailError(
        'MAIL_MISSING_TO',
        'sendAppEmail requires a `to` email address when delivery is required',
      );
    }
    return false;
  }

  try {
    if (await sendViaSmtp({ to, subject, html, text })) return true;
    if (process.env.RESEND_API_KEY?.trim()) {
      if (await sendViaResend({ to, subject, html, text })) return true;
      const message = `[SurveyTasker] Resend send failed for "${subject}" to ${to}`;
      console.error(`${message}; not falling back to dev log.`);
      if (requireDelivery) {
        throw mailError('MAIL_PROVIDER_REJECTED', message);
      }
      return false;
    }
  } catch (e) {
    console.error('[SurveyTasker] sendAppEmail failed:', e);
    if (requireDelivery) {
      throw mailError(
        e?.code || 'MAIL_DELIVERY_FAILED',
        e?.message || 'Email delivery failed',
      );
    }
    return false;
  }

  const noTransportMessage = `[SurveyTasker] No mail transport configured (set GMAIL_USER + GMAIL_APP_PASSWORD, or SMTP_HOST, or RESEND_API_KEY). Email not sent: "${subject}" to ${to}`;
  if (requireDelivery) {
    throw mailError('MAIL_NOT_CONFIGURED', noTransportMessage);
  }

  console.warn(noTransportMessage);
  console.warn(stripPreview(html));
  return false;
}
