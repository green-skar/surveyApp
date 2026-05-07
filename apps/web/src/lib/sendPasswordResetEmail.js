import { sendAppEmail } from '@/lib/mail/sendAppEmail';

function appOrigin() {
  const base =
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_CREATE_BASE_URL ||
    'http://localhost:5173';
  return base.replace(/\/$/, '');
}

export async function sendPasswordResetEmail({ to, token, email }) {
  const resetUrl = `${appOrigin()}/account/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  await sendAppEmail({
    to,
    subject: 'Reset your SurveyTasker password',
    html: `<p>You asked to reset your password.</p><p><a href="${resetUrl}">Choose a new password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
    text: `Reset your SurveyTasker password: ${resetUrl} (expires in 1 hour)`,
  });
}
