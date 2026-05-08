import dns from 'node:dns/promises';
import net from 'node:net';
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

/**
 * Nodemailer resolves both A and AAAA, merges them, then picks a **random** address.
 * On hosts without IPv6 egress (e.g. Render), that still selects IPv6 half the time.
 * `family` on createTransport is not used by nodemailer's resolver.
 *
 * When SMTP_FAMILY=4 (default), we pre-resolve A records and connect by IPv4 literal,
 * passing `servername` so STARTTLS/SNI still matches the real hostname.
 *
 * Set SMTP_FAMILY=auto to pass the hostname through and use nodemailer's default DNS.
 */
function smtpSocketFamily() {
  const raw = String(process.env.SMTP_FAMILY ?? '4').trim().toLowerCase();
  if (raw === 'auto' || raw === '0' || raw === 'any') return 0;
  if (raw === '6' || raw === 'ipv6') return 6;
  return 4;
}

/**
 * @param {string} targetHost
 * @returns {Promise<{ connectHost: string, servername?: string }>}
 */
async function smtpConnectHost(targetHost) {
  if (net.isIP(targetHost)) {
    return { connectHost: targetHost };
  }

  const family = smtpSocketFamily();
  if (family === 0) {
    return { connectHost: targetHost };
  }

  if (family === 4) {
    try {
      const addrs = await dns.resolve4(targetHost);
      if (addrs.length > 0) {
        const connectHost = addrs[Math.floor(Math.random() * addrs.length)];
        return { connectHost, servername: targetHost };
      }
    } catch (e) {
      mailLog.warn('smtp_resolve4_failed', {
        targetHost,
        ...errorMeta(e),
      });
    }
    return { connectHost: targetHost };
  }

  if (family === 6) {
    try {
      const addrs = await dns.resolve6(targetHost);
      if (addrs.length > 0) {
        const connectHost = addrs[Math.floor(Math.random() * addrs.length)];
        return { connectHost, servername: targetHost };
      }
    } catch (e) {
      mailLog.warn('smtp_resolve6_failed', {
        targetHost,
        ...errorMeta(e),
      });
    }
    return { connectHost: targetHost };
  }

  return { connectHost: targetHost };
}

/** @type {import('nodemailer').Transporter | null | undefined} */
let smtpTransport = undefined;

async function ensureSmtpTransport() {
  if (smtpTransport !== undefined) return smtpTransport;

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

  if (gmailUser && gmailPass) {
    const { connectHost, servername } = await smtpConnectHost('smtp.gmail.com');
    mailLog.info('smtp_transport_gmail', {
      connectHost,
      servername: servername ?? null,
      smtpFamilyPreference: smtpSocketFamily(),
      port,
    });
    smtpTransport = nodemailer.createTransport({
      host: connectHost,
      port,
      secure: false,
      ...(servername ? { servername } : {}),
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
    const { connectHost, servername } = await smtpConnectHost(host);
    mailLog.info('smtp_transport_custom', {
      connectHost,
      servername: servername ?? null,
      smtpFamilyPreference: smtpSocketFamily(),
      port,
      secure,
    });
    smtpTransport = nodemailer.createTransport({
      host: connectHost,
      port,
      secure,
      ...(servername ? { servername } : {}),
      ...(user || pass ? { auth: { user: user || '', pass: pass || '' } } : {}),
    });
    return smtpTransport;
  }

  smtpTransport = null;
  return smtpTransport;
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
  const transport = await ensureSmtpTransport();
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
    smtpFamilyPreference: smtpSocketFamily() || 'auto',
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
