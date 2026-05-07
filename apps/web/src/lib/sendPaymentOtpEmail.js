import { sendAppEmail } from '@/lib/mail/sendAppEmail';

export async function sendPaymentOtpEmail({
  to,
  code,
  methodLabel,
  destinationHint,
}) {
  const subject = `Your SurveyTasker payout verification code: ${code}`;
  const html = `
    <p>You are adding <strong>${methodLabel}</strong> for payouts.</p>
    <p>Destination: <strong>${destinationHint}</strong></p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
    <p>This code expires in 15 minutes. If you did not request this, ignore this email.</p>
  `;

  await sendAppEmail({
    to,
    subject,
    html,
    text: `SurveyTasker payout code for ${methodLabel} (${destinationHint}): ${code}. Expires in 15 minutes.`,
  });
}
