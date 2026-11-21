/**
 * Rename existing order numbers AMZ-* → SCO-*
 * Usage: node src/scripts/rename-order-prefix-sco.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { prisma } = require('../config/prisma')

async function main() {
  const orders = await prisma.order.findMany({
    where: { orderNumber: { startsWith: 'AMZ-' } },
    select: { id: true, orderNumber: true },
  })
  console.log('Orders to rename:', orders.length)
  let updated = 0
  for (const o of orders) {
    const next = o.orderNumber.replace(/^AMZ-/, 'SCO-')
    await prisma.order.update({
      where: { id: o.id },
      data: { orderNumber: next },
    })
    updated += 1
    console.log(o.orderNumber, '→', next)
  }
  console.log('Done:', updated)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
