import nodemailer from 'nodemailer';
import { createLogger, errorMeta } from '@/lib/logger';

const mailLog = createLogger('mail');

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

/**
 * Many PaaS hosts (e.g. Render) have no working IPv6 egress. Node may resolve
 * smtp.gmail.com to IPv6 first → ENETUNREACH / ETIMEDOUT. Default to IPv4.
 * Set SMTP_FAMILY=auto (or 0) to use Node's default resolution order.
 */
function smtpSocketFamily() {
  const raw = String(process.env.SMTP_FAMILY ?? '4').trim().toLowerCase();
  if (raw === 'auto' || raw === '0' || raw === 'any') return 0;
  if (raw === '6' || raw === 'ipv6') return 6;
  return 4;
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  const family = smtpSocketFamily();
  const familyOpts = family === 0 ? {} : { family };

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

  if (gmailUser && gmailPass) {
    smtpTransport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      ...familyOpts,
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
      ...familyOpts,
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
    mailLog.error('resend_api_rejected', {
      status: res.status,
      bodyPreview: body.slice(0, 500),
      to,
      subject,
    });
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
  mailLog.info('send_requested', {
    to,
    subject,
    requireDelivery,
    smtpFamily: smtpSocketFamily() || 'auto',
    hasGmail: Boolean(
      process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim(),
    ),
    hasSmtpHost: Boolean(process.env.SMTP_HOST?.trim()),
    hasResend: Boolean(process.env.RESEND_API_KEY?.trim()),
  });

  if (!to || typeof to !== 'string') {
    mailLog.warn('missing_to', { subject, requireDelivery });
    if (requireDelivery) {
      throw mailError(
        'MAIL_MISSING_TO',
        'sendAppEmail requires a `to` email address when delivery is required',
      );
    }
    return false;
  }

  try {
    if (await sendViaSmtp({ to, subject, html, text })) {
      mailLog.info('sent_via_smtp', { to, subject });
      return true;
    }
    if (process.env.RESEND_API_KEY?.trim()) {
      if (await sendViaResend({ to, subject, html, text })) {
        mailLog.info('sent_via_resend', { to, subject });
        return true;
      }
      const message = `Resend send failed for "${subject}" to ${to}`;
      mailLog.error('resend_send_failed', { to, subject, message });
      if (requireDelivery) {
        throw mailError('MAIL_PROVIDER_REJECTED', message);
      }
      return false;
    }
  } catch (e) {
    mailLog.error('send_failed', {
      to,
      subject,
      ...errorMeta(e),
    });
    if (requireDelivery) {
      const originalCode = e?.code ? ` (${e.code})` : '';
      throw mailError(
        'MAIL_DELIVERY_FAILED',
        `Email delivery failed${originalCode}: ${e?.message || 'unknown error'}`,
      );
    }
    return false;
  }

  const noTransportMessage =
    'No transport configured (set GMAIL_USER + GMAIL_APP_PASSWORD, or SMTP_HOST, or RESEND_API_KEY). Email not sent.';
  if (requireDelivery) {
    throw mailError(
      'MAIL_NOT_CONFIGURED',
      `${noTransportMessage} subject="${subject}" to=${to}`,
    );
  }

  mailLog.warn('no_transport_configured', { subject, to, message: noTransportMessage });
  mailLog.warn('html_preview', { preview: stripPreview(html) });
  return false;
}
