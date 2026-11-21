const { prisma } = require('../config/prisma');

async function main() {
  const s = await prisma.setting.findFirst();
  if (!s) {
    console.log('no settings row');
    return;
  }
  const socialLinks = {
    ...((s.socialLinks && typeof s.socialLinks === 'object' && !Array.isArray(s.socialLinks)
      ? s.socialLinks
      : {})),
    instagram: 'https://www.instagram.com/scosha.lb',
    facebook: 'https://www.facebook.com/share/1aJYKZbcoN/',
    whatsapp: 'https://wa.me/message/XO72WXVTPGZGL1',
  };
  const updated = await prisma.setting.update({
    where: { id: s.id },
    data: {
      email: 'scosha.support@gmail.com',
      phone: '+961 81 428 503',
      adminEmail: 'scosha.support@gmail.com',
      socialLinks,
    },
  });
  console.log({
    email: updated.email,
    phone: updated.phone,
    adminEmail: updated.adminEmail,
    socialLinks: updated.socialLinks,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
