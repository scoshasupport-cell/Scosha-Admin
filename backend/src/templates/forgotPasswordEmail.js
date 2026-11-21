function forgotPasswordEmail({ name, resetUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset your password</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="560" style="background:#fff;border-radius:12px;padding:40px;">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:24px;color:#111;">Reset password</h1>
          <p style="color:#333;">Hi ${name || 'there'},</p>
          <p style="color:#555;line-height:1.6;">Click the button below to reset your password. This link expires in 1 hour.</p>
          <p style="margin:28px 0;"><a href="${resetUrl}" style="background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;">Reset password</a></p>
          <p style="color:#999;font-size:13px;">If you did not request this, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { forgotPasswordEmail };
