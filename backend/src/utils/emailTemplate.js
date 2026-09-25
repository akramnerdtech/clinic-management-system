/** Minimal, inline-styled OTP email — kept dependency-free (no templating engine). */
export function otpEmailHtml({ otp, ttlMinutes }) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#faf9ff;padding:32px;color:#263247">
    <div style="max-width:420px;margin:0 auto;background:#ffffff;border:1px solid #edf0f5;border-radius:8px;overflow:hidden">
      <div style="background:#078d81;padding:18px 24px;color:#ffffff;font-weight:700;font-size:14px">
        CuraClinic
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 12px;font-size:13px;color:#263247">Your login verification code is:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#078d81;margin:12px 0">${otp}</div>
        <p style="margin:12px 0 0;font-size:12px;color:#687285">
          This code expires in ${ttlMinutes} minute${ttlMinutes === 1 ? '' : 's'}. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
  </div>`;
}
