/**
 * AI Shopping Assistant — efficiency cases.
 *
 * Efficiency here means two things at once:
 *   1. Relevance: up to 5 products, each at least 50% relevant to the photo.
 *   2. Cost/speed: a bad photo stops after the first vision call. A real scan
 *      finishes in one understand + one analysis + at most one rerank.
 *
 * Print the sheet:   node src/scripts/ai-efficiency-cases.js
 * Run against API:   node src/scripts/ai-efficiency-cases.js --live
 *   Images are read from SCOSHA_AI_IMAGES or %TEMP%/scosha-ai-test/images.
 *   Backend must be on http://localhost:5000 (override with SCOSHA_API).
 */
const fs = require('fs')
const path = require('path')

const HOME_TYPES = /cushion-cover|blanket|curtain|bedsheet|mattress-topper|rug|decor/
const FASHION_TYPES = /coat|jacket|pants|tracksuit|cardigan|shirt|shoe|boot|sneaker|sandal|flat|backpack|bag|gloves|vest|suit|jeans|set|sweater|dress|skirt|top|hoodie|scarf|belt|hat|sunglass/

/**
 * Budgets are wall-clock on a healthy Gemini model (one attempt, no 429 retry).
 * gate  = understandImage only (1 call). full = understand + specialist + rerank (2–3 calls).
 */
const BUDGET = {
  gate: { maxMs: 8000, maxCalls: 1 },
  full: { maxMs: 18000, maxCalls: 3 },
}

const CASES = [
  // --- A. Stop early. Wrong photos must not reach catalog matching. ---
  {
    id: 'A1',
    name: 'Sofa uploaded in Face mode (the original bug)',
    image: 'sofa',
    mode: 'face',
    expect: { status: 'mismatch', count: 0, pipeline: null, budget: 'gate' },
    passIf: 'Message says the photo is furniture and offers Furniture scan. Zero products.',
  },
  {
    id: 'A2',
    name: 'Sofa uploaded in Body mode',
    image: 'sofa',
    mode: 'body',
    extra: { gender: 'women' },
    expect: { status: 'mismatch', count: 0, budget: 'gate' },
    passIf: 'Mismatch, suggests Furniture scan. No clothing is recommended.',
  },
  {
    id: 'A3',
    name: 'Face photo uploaded in Furniture mode',
    image: 'man_face',
    mode: 'furniture',
    expect: { status: 'mismatch', count: 0, budget: 'gate' },
    passIf: 'Mismatch, suggests Face scan. No cushions/curtains.',
  },
  {
    id: 'A4',
    name: 'Sneaker product shot in Furniture mode',
    image: 'partial_body',
    mode: 'furniture',
    expect: { status: 'mismatch', count: 0, budget: 'gate' },
    passIf: 'Mismatch, suggests Body scan.',
  },
  {
    id: 'A5',
    name: 'Car',
    image: 'car',
    mode: 'auto',
    expect: { status: 'unsupported', count: 0, budget: 'gate' },
    passIf: 'Says it is a vehicle. Asks for a face, outfit, or furniture photo.',
  },
  {
    id: 'A6',
    name: 'Food',
    image: 'food',
    mode: 'face',
    expect: { status: 'unsupported', count: 0, budget: 'gate' },
    passIf: 'Says it is food. Zero products.',
  },
  {
    id: 'A7',
    name: 'Animal',
    image: 'dog',
    mode: 'body',
    extra: { gender: 'men' },
    expect: { status: 'unsupported', count: 0, budget: 'gate' },
    passIf: 'Says it is an animal. Zero products.',
  },
  {
    id: 'A8',
    name: 'Landscape',
    image: 'landscape',
    mode: 'furniture',
    expect: { status: 'unsupported', count: 0, budget: 'gate' },
    passIf: 'Says it is a landscape. Does not treat the scene as a room.',
  },
  {
    id: 'A9',
    name: 'Screenshot / laptop screen',
    image: 'screenshot',
    mode: 'auto',
    expect: { status: 'unsupported', count: 0, budget: 'gate' },
    passIf: 'Rejected as a screen or as not a face/outfit/furniture photo.',
  },
  {
    id: 'A10',
    name: 'Blank image',
    image: 'blank',
    mode: 'auto',
    expect: { status: 'unsupported', count: 0, budget: 'gate' },
    passIf: 'Says the image is blank. Zero products.',
  },
  {
    id: 'A11',
    name: 'Blurry noise',
    image: 'blurry_noise',
    mode: 'face',
    expect: { status: 'unsupported', count: 0, budget: 'gate' },
    passIf: 'Rejected as unusable. Does not invent a face or products.',
  },
  {
    id: 'A12',
    name: 'Several people, only hands',
    image: 'group_people',
    mode: 'face',
    expect: { status: ['unsupported', 'unclear', 'mismatch'], count: 0, budget: 'gate' },
    passIf: 'Asks for one person. Does not recommend for the group.',
  },

  // --- B. Face. Report is allowed; products only if the catalog actually has them. ---
  {
    id: 'B1',
    name: 'Man headshot, Face mode',
    image: 'man_face',
    mode: 'face',
    expect: { status: ['no_matches', 'ok'], pipeline: 'face', countMax: 5, budget: 'full', domain: 'beauty-or-none' },
    passIf: 'Face report (shape, tone). No clothing, no furniture. If the catalog has no skincare/sunglasses/hats, count is 0 and the message says so.',
  },
  {
    id: 'B2',
    name: 'Woman headshot, Smart Upload',
    image: 'woman_face',
    mode: 'auto',
    expect: { pipeline: 'face', countMax: 5, budget: 'full', domain: 'beauty-or-none' },
    passIf: 'Auto-routes to face, not body and not furniture.',
  },
  {
    id: 'B3',
    name: 'Face with a shirt visible',
    image: 'woman_face',
    mode: 'face',
    expect: { pipeline: 'face', budget: 'full' },
    passIf: 'Stays on face analysis. May offer "Match my outfit instead". Does not dump random tops.',
  },

  // --- C. Body / fashion. Gender-strict, complements only, size-aware. ---
  {
    id: 'C1',
    name: 'Man outfit, gender not given',
    image: 'man_fullbody',
    mode: 'body',
    expect: { pipeline: 'body', genderAllowed: ['men', 'unisex'], countMax: 5, budget: 'full' },
    passIf: 'Detects men from the photo OR asks "Who are we shopping for?". Never shows women items.',
  },
  {
    id: 'C2',
    name: 'Woman outfit, gender not given',
    image: 'woman_fullbody',
    mode: 'body',
    expect: { pipeline: 'body', genderAllowed: ['women', 'unisex'], countMax: 5, budget: 'full' },
    passIf: 'Women catalog only. Items complement the outfit (not copies of what she already wears, unless it is a product shot).',
  },
  {
    id: 'C3',
    name: 'Woman photo, customer says Men',
    image: 'woman_fullbody',
    mode: 'body',
    extra: { gender: 'men', measurements: { age: 30, unit: 'cm' } },
    expect: { pipeline: 'body', genderAllowed: ['women', 'unisex'], countMax: 5, budget: 'full' },
    passIf: 'The photo is clearly a woman, so matches follow the photo (women), not the entered Men. genderConflict is true. Men items are not shown.',
  },
  {
    id: 'C4',
    name: 'Man with measurements (chest 100, waist 86, shoe 43)',
    image: 'man_fullbody',
    mode: 'body',
    extra: { gender: 'men', measurements: { chest: 100, waist: 86, shoeSize: 43, unit: 'cm' } },
    expect: { pipeline: 'body', genderAllowed: ['men', 'unisex'], countMax: 5, budget: 'full', sizeChecked: true },
    passIf: 'Suggested size is near L. No size that is far from the estimate is offered as a fit. Message mentions size when nothing in that size exists.',
  },
  {
    id: 'C5',
    name: 'Sneaker product shot, no gender',
    image: 'partial_body',
    mode: 'body',
    expect: { status: ['needs_input', 'ok', 'no_matches'], pipeline: 'body', budget: 'full' },
    passIf: 'Asks who we are shopping for before showing gendered shoes.',
  },
  {
    id: 'C6',
    name: 'Sneaker product shot, Women',
    image: 'partial_body',
    mode: 'body',
    extra: { gender: 'women' },
    expect: { pipeline: 'body', genderAllowed: ['women', 'unisex'], countMax: 5, budget: 'full' },
    passIf: 'Women sneakers that share a color with the photo rank first. A white shoe with no grey/yellow is not presented as a strong match.',
  },
  {
    id: 'C7',
    name: 'Shoes-only focus on a full outfit',
    image: 'man_fullbody',
    mode: 'body',
    extra: { gender: 'men', bodyArea: 'shoes' },
    expect: { pipeline: 'body', genderAllowed: ['men', 'unisex'], slots: ['shoes'], countMax: 5, budget: 'full' },
    passIf: 'Only shoes, or an honest no-match. No jackets padded in to reach 5.',
  },

  // --- D. Furniture. Color and type must harmonize. ---
  {
    id: 'D1',
    name: 'Beige sectional sofa',
    image: 'sofa',
    mode: 'furniture',
    expect: { status: ['ok', 'no_matches'], pipeline: 'furniture', domain: 'home', countMax: 5, budget: 'full' },
    passIf: 'Cushion covers / throws in cream, sage, beige, grey, navy. No orange/red clash. No clothing. Count is 2–4, not forced to 5.',
  },
  {
    id: 'D2',
    name: 'Tan leather sofa, Smart Upload',
    image: 'sofa2',
    mode: 'auto',
    expect: { pipeline: 'furniture', domain: 'home', countMax: 5, budget: 'full' },
    passIf: 'Auto-routes to furniture. Same harmony rules as D1.',
  },
  {
    id: 'D3',
    name: 'Vintage armchair',
    image: 'chair',
    mode: 'furniture',
    expect: { pipeline: 'furniture', domain: 'home', countMax: 5, budget: 'full' },
    passIf: 'Cushions, throw, or curtains in the room palette. No bedsheets unless a bed is the subject.',
  },
  {
    id: 'D4',
    name: 'Navy living room',
    image: 'room',
    mode: 'furniture',
    expect: { pipeline: 'furniture', domain: 'home', countMax: 5, budget: 'full' },
    passIf: 'White, grey, or navy textiles. No bright clash treated as a good match.',
  },
  {
    id: 'D5',
    name: 'White kitchen',
    image: 'table',
    mode: 'furniture',
    expect: { pipeline: 'furniture', domain: 'home', countMax: 5, budget: 'full' },
    passIf: 'Only something that belongs (sheer/linen curtains) or an honest "nothing harmonizes". No random cushion dump.',
  },
  {
    id: 'D6',
    name: 'Catalog curtain photo',
    image: 'cat_curtain',
    mode: 'furniture',
    expect: { pipeline: 'furniture', domain: 'home', countMax: 5, budget: 'full' },
    passIf: 'Suggests companions (cushions), not a duplicate of the same curtain listing as the only idea.',
  },

  // --- E. Result discipline (checked on every case above, called out here). ---
  {
    id: 'E1',
    name: 'Never more than 5',
    note: 'Asserted on every live case: recommendationCount <= 5.',
  },
  {
    id: 'E2',
    name: 'Never invent a product',
    note: 'Every id in the response must exist in the Scosha catalog and be in stock with an image.',
  },
  {
    id: 'E3',
    name: 'Two good beats five weak',
    note: 'If the judge would mention a drawback ("misses the color", "wrong season"), that product must not appear.',
  },
  {
    id: 'E4',
    name: 'Busy / quota',
    note: 'When Gemini returns 429, the customer sees "busy, try again in a minute" — not a fabricated list and not a blank error.',
  },
]

function printSheet() {
  console.log('AI efficiency cases\n')
  console.log(`Budgets: gate (wrong photo) <= ${BUDGET.gate.maxMs}ms and ${BUDGET.gate.maxCalls} Gemini call; full scan <= ${BUDGET.full.maxMs}ms and ${BUDGET.full.maxCalls} calls.\n`)
  for (const c of CASES) {
    const how = c.image ? `${c.mode} · ${c.image}.jpg` : 'rule'
    console.log(`${c.id}  ${c.name}`)
    console.log(`    setup: ${how}`)
    console.log(`    pass:  ${c.passIf || c.note}`)
    if (c.expect?.budget) console.log(`    budget: ${c.expect.budget}`)
    console.log('')
  }
  console.log(`${CASES.length} cases. Run with --live to score them against the API.`)
}

function imageDir() {
  return process.env.SCOSHA_AI_IMAGES || path.join(process.env.TEMP || '/tmp', 'scosha-ai-test', 'images')
}

async function runLive() {
  const dir = imageDir()
  const api = process.env.SCOSHA_API || 'http://localhost:5000/api/v1/ai-assistant/analyze'
  const runnable = CASES.filter((c) => c.image)
  let pass = 0
  const times = []
  for (const c of runnable) {
    const file = path.join(dir, `${c.image}.jpg`)
    if (!fs.existsSync(file)) {
      console.log(`SKIP ${c.id} missing ${file}`)
      continue
    }
    const fd = new FormData()
    const buf = fs.readFileSync(file)
    fd.append('image', new Blob([buf], { type: 'image/jpeg' }), path.basename(file))
    fd.append('mode', c.mode)
    for (const [k, v] of Object.entries(c.extra || {})) {
      fd.append(k, typeof v === 'string' ? v : JSON.stringify(v))
    }
    const t0 = Date.now()
    let json
    let http = 0
    try {
      const res = await fetch(api, { method: 'POST', body: fd })
      http = res.status
      json = await res.json()
    } catch (err) {
      console.log(`FAIL ${c.id} ${c.name}: ${err.message}`)
      continue
    }
    const d = json.data || json
    const recs = d.recommendations || []
    const ms = Date.now() - t0
    times.push(ms)
    const problems = []
    const exp = c.expect || {}
    if (http !== 200) problems.push(`http ${http}`)
    if (exp.status) {
      const ok = Array.isArray(exp.status) ? exp.status.includes(d.status) : d.status === exp.status
      if (!ok) problems.push(`status=${d.status} want ${exp.status}`)
    }
    if (exp.pipeline && d.pipeline !== exp.pipeline && !['unsupported', 'mismatch', 'unclear', 'error'].includes(d.status)) {
      problems.push(`pipeline=${d.pipeline} want ${exp.pipeline}`)
    }
    if (exp.count === 0 && recs.length) problems.push(`count ${recs.length} want 0`)
    if (exp.countMax != null && recs.length > exp.countMax) problems.push(`count ${recs.length} > ${exp.countMax}`)
    if (recs.length > 5) problems.push('more than 5')
    if (!d.message) problems.push('no customer message')
    if (exp.genderAllowed && recs.length) {
      for (const p of recs) {
        if (FASHION_TYPES.test(p.productType || '') && p.productGender && !exp.genderAllowed.includes(p.productGender)) {
          problems.push(`gender leak ${p.productGender}: ${String(p.title).slice(0, 40)}`)
        }
      }
    }
    if (exp.domain === 'home') {
      for (const p of recs) {
        if (!HOME_TYPES.test(p.productType || '')) problems.push(`not home: ${p.productType} ${String(p.title).slice(0, 40)}`)
      }
    }
    if (exp.domain === 'beauty-or-none') {
      for (const p of recs) {
        if (HOME_TYPES.test(p.productType || '') || FASHION_TYPES.test(p.productType || '')) {
          problems.push(`face scan returned ${p.productType}`)
        }
      }
    }
    if (exp.slots) {
      for (const p of recs) {
        if (p.slot && !exp.slots.includes(p.slot)) problems.push(`slot ${p.slot} not in ${exp.slots}`)
      }
    }
    const budget = BUDGET[exp.budget]
    const slow = budget && ms > budget.maxMs
    if (slow && d.status !== 'error') problems.push(`slow ${ms}ms > ${budget.maxMs}ms`)
    const ok = problems.length === 0
    if (ok) pass += 1
    console.log(`${ok ? 'PASS' : 'FAIL'} ${c.id} ${c.name}  ${d.status} n=${recs.length} ${ms}ms ${problems.join('; ')}`)
    if (d.message) console.log(`     ${d.message}`)
  }
  times.sort((a, b) => a - b)
  const mid = times.length ? times[Math.floor(times.length / 2)] : 0
  console.log(`\n${pass}/${runnable.length} passed. median ${mid}ms, slowest ${times[times.length - 1] || 0}ms.`)
  if (pass !== runnable.length) process.exitCode = 1
}

if (process.argv.includes('--live')) {
  runLive()
} else {
  printSheet()
}
