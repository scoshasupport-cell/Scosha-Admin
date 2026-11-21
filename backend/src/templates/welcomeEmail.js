function welcomeEmail({ name }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to SCOSHA</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="560" style="background:#fff;border-radius:12px;padding:40px;">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:24px;color:#111;">Welcome to SCOSHA</h1>
          <p style="color:#333;font-size:16px;">Hi ${name || 'there'},</p>
          <p style="color:#555;line-height:1.6;">Your account is verified. Explore new arrivals, bestsellers, and exclusive collections.</p>
          <p style="margin-top:28px;"><a href="${process.env.STOREFRONT_URL || 'http://localhost:5173'}" style="background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;">Start shopping</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { welcomeEmail };
