import { sendAppEmail } from '@/lib/mail/sendAppEmail';

function appOrigin() {
  const base =
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_CREATE_BASE_URL ||
    'http://localhost:5173';
  return base.replace(/\/$/, '');
}

/** After identity verification succeeds (first time). */
export async function sendIdentityVerifiedWelcomeEmail({ to, legalName }) {
  const name = String(legalName || '').trim() || 'there';
  const dashboardUrl = `${appOrigin()}/dashboard`;
  await sendAppEmail({
    to,
    subject: 'Welcome to SurveyTasker — identity verified',
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Your identity verification is complete. You can continue onboarding or head to your dashboard.</p>
<p><a href="${dashboardUrl}">Open dashboard</a></p>
<p>Thanks for joining SurveyTasker.</p>`,
    text: `Hi ${name}, your identity is verified. Open your dashboard: ${dashboardUrl}`,
  });
}

/** After payout method OTP verification succeeds. */
export async function sendPaymentMethodVerifiedEmail({ to, methodLabel }) {
  const label = String(methodLabel || 'Payout method').trim();
  const payoutsUrl = `${appOrigin()}/payouts`;
  await sendAppEmail({
    to,
    subject: 'Payment method verified',
    html: `<p>Your ${escapeHtml(label)} has been verified and saved on SurveyTasker.</p>
<p><a href="${payoutsUrl}">View payouts</a></p>`,
    text: `Your ${label} has been verified on SurveyTasker. Payouts: ${payoutsUrl}`,
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
