/**
 * Smoke tests for the catalog index + strict gender filtering (no Gemini image required).
 */
require('dotenv').config()
const ai = require('../services/aiRecommend.service')
const catalog = require('../services/catalogIndex.service')
const { prisma } = require('../config/prisma')

async function main() {
  const index = await catalog.getCatalogIndex({ force: true })
  const fashion = index.items.filter((p) => p.domain === 'fashion' && p.sellable)
  console.log('catalog', catalog.summarizeIndex(index))

  const menPass = fashion.filter((p) => catalog.passesGenderFilter(p, 'men'))
  const womenPass = fashion.filter((p) => catalog.passesGenderFilter(p, 'women'))
  const menLeak = menPass.filter((p) => p.gender === 'women')
  const womenLeak = womenPass.filter((p) => p.gender === 'men')
  console.log('gender filter', {
    menPass: menPass.length,
    womenPass: womenPass.length,
    menLeakWomen: menLeak.length,
    womenLeakMen: womenLeak.length,
  })
  if (menLeak.length || womenLeak.length) {
    console.error('FAIL gender leak', {
      menLeak: menLeak.slice(0, 3).map((p) => p.name),
      womenLeak: womenLeak.slice(0, 3).map((p) => p.name),
    })
    process.exit(1)
  }

  const unclassified = index.items.filter((p) => p.sellable && (p.productType === 'unknown' || !p.slot))
  console.log('unclassified sellable items', unclassified.length, unclassified.slice(0, 5).map((p) => p.name))

  const menMatches = await ai.matchCatalogProducts({ gender: 'men', bodyArea: 'upper', colors: ['black', 'navy'], limit: 5 })
  const womenInMen = menMatches.filter((m) => m.productGender === 'women')
  console.log('men matches', menMatches.map((m) => `${m.productGender}:${m.title.slice(0, 40)}`))
  if (womenInMen.length) {
    console.error('FAIL women in men matches')
    process.exit(1)
  }

  const womenMatches = await ai.matchCatalogProducts({ gender: 'women', bodyArea: 'upper', colors: ['black', 'pink'], limit: 5 })
  const menInWomen = womenMatches.filter((m) => m.productGender === 'men')
  console.log('women matches', womenMatches.map((m) => `${m.productGender}:${m.title.slice(0, 40)}`))
  if (menInWomen.length) {
    console.error('FAIL men in women matches')
    process.exit(1)
  }

  console.log('PASS')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
