function otpEmail({ name, otp }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify your email</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="560" style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
        <tr><td>
          <h1 style="margin:0 0 8px;font-size:24px;color:#111;">SCOSHA</h1>
          <p style="color:#666;margin:0 0 24px;">Email verification</p>
          <p style="color:#333;font-size:16px;">Hi ${name || 'there'},</p>
          <p style="color:#555;line-height:1.6;">Use this code to verify your email address. It expires in <strong>10 minutes</strong>.</p>
          <div style="margin:32px 0;text-align:center;">
            <span style="display:inline-block;letter-spacing:8px;font-size:32px;font-weight:700;color:#111;background:#f3f4f6;padding:16px 28px;border-radius:8px;">${otp}</span>
          </div>
          <p style="color:#999;font-size:13px;">If you did not create an account, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { otpEmail };
