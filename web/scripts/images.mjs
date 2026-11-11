// Builds the site's images from BANZA's originals (../../banza photography): WebP at two widths for
// every portfolio photo, the logo marks, and the social/share images. Writes public/img/* and
// src/lib/gallery.json (sizes + categories, read by the site). Run: npm run images
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC = path.resolve('..', '..', 'banza photography')
const OUT = path.resolve('public', 'img')
const wa = (t) => path.join(SRC, `WhatsApp Image 2026-10-31 at ${t}.jpeg`)
mkdirSync(path.join(OUT, 'work'), { recursive: true })
mkdirSync(path.join(OUT, 'brand'), { recursive: true })

// Portfolio: id, source, category, alt text, focal point for crops (object-position).
const WORK = [
  ['lilac-gown', '13.17.33 (1)', 'Matric farewell', 'Matric farewell portrait in a lilac beaded gown beside a classic car', '50% 35%'],
  ['emerald-gown', '13.17.36', 'Matric farewell', 'Matric farewell portrait in an emerald gown, looking back over her shoulder', '50% 30%'],
  ['emerald-story', '13.17.35 (1)', 'Matric farewell', 'Matric farewell story layout: three frames in an emerald gown', '50% 40%'],
  ['lilac-story', '13.17.35 (2)', 'Matric farewell', 'Matric farewell story layout: three frames in a lilac gown', '50% 40%'],
  ['blazer-portrait', '13.17.33', 'Portraits', 'Studio portrait in a checked blazer', '50% 30%'],
  ['beanie-crouch', '13.17.34 (2)', 'Portraits', 'Outdoor lifestyle portrait in a knitted beanie', '50% 35%'],
  ['beanie-smile', '13.17.34', 'Portraits', 'Candid smiling portrait in a knitted beanie', '50% 30%'],
  ['hands-detail', '13.17.34 (1)', 'Portraits', 'Detail shot of hands with gold bracelets', '50% 50%'],
  ['curbside-bw', '13.17.35', 'Street & editorial', 'Black-and-white street portrait seated on a curb', '50% 45%'],
  ['cap-bw', '13.17.38', 'Street & editorial', 'Black-and-white editorial portrait against a car, cap over the eyes', '50% 40%'],
  ['stay-patient', '13.17.38 (1)', 'Street & editorial', 'Editorial street frame by a hatchback, with a script overlay', '50% 55%'],
  ['neon', '13.17.37', 'Street & editorial', 'Abstract night frame: a blue neon line on dark marble', '50% 50%'],
  ['birthday-laugh', '13.17.39 (1)', 'Birthdays & events', 'Birthday celebrant laughing in a crown', '50% 35%'],
  ['birthday-cake', '13.17.39', 'Birthdays & events', 'Birthday cake topped with a jewelled crown', '50% 45%'],
  ['city-day', '13.17.36 (1)', 'City', 'Rooftops and mountains under a blue sky, film date stamp', '50% 50%'],
  ['city-night', '13.17.36 (2)', 'City', 'City lights at night, film date stamp', '50% 50%'],
]

const gallery = []
for (const [id, t, category, alt, focus] of WORK) {
  const img = sharp(wa(t)).rotate()
  const meta = await img.metadata()
  for (const w of [640, 1280]) {
    await sharp(wa(t)).rotate().resize({ width: Math.min(w, meta.width), withoutEnlargement: true }).webp({ quality: w === 640 ? 74 : 80, effort: 6 }).toFile(path.join(OUT, 'work', `${id}-${w}.webp`))
  }
  gallery.push({ id, category, alt, focus, w: meta.width, h: meta.height })
  console.log(id, `${meta.width}x${meta.height}`)
}
writeFileSync(path.resolve('src', 'lib', 'gallery.json'), JSON.stringify(gallery, null, 1))

// Brand marks on black: the chrome wordmark and the BP monogram (screen-blended on the dark site).
await sharp(wa('13.17.40 (1)')).webp({ quality: 88 }).toFile(path.join(OUT, 'brand', 'wordmark.webp'))
await sharp(wa('13.17.40 (2)')).webp({ quality: 88 }).toFile(path.join(OUT, 'brand', 'monogram.webp'))
// The monogram crop (just the BP mark), for the icon and favicon.
const mono = sharp(wa('13.17.40 (2)'))
await mono.clone().extract({ left: 398, top: 252, width: 452, height: 452 }).resize(512, 512).png().toFile(path.join(OUT, 'brand', 'icon-512.png'))
await sharp(path.join(OUT, 'brand', 'icon-512.png')).resize(180, 180).png().toFile(path.resolve('public', 'apple-touch-icon.png'))
await sharp(path.join(OUT, 'brand', 'icon-512.png')).resize(64, 64).png().toFile(path.resolve('public', 'icon.png'))

// Share image (1200 × 630): the emerald gown on the left, the wordmark on black.
const share = await sharp(wa('13.17.36')).resize(520, 630, { fit: 'cover', position: 'attention' }).toBuffer()
const word = await sharp(wa('13.17.40 (1)')).resize(620).toBuffer()
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#000000' } })
  .composite([{ input: share, left: 0, top: 0 }, { input: word, left: 550, top: 210 }])
  .png().toFile(path.resolve('public', 'og.png'))
console.log('brand + share images written')

// Transparent logos: the files are chrome on pure black, so luminance becomes alpha (an exact
// "un-screen"): the logo then sits cleanly on glass, photos or any colour.
async function unscreen(input, output, width) {
  const { data, info } = await sharp(input).resize({ width }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = Math.max(r, g, b)
    const k = a < 8 ? 0 : 255 / a
    out[j] = Math.min(255, r * k); out[j + 1] = Math.min(255, g * k); out[j + 2] = Math.min(255, b * k); out[j + 3] = a < 8 ? 0 : a
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 90, alphaQuality: 100 }).toFile(output)
}
await unscreen(wa('13.17.40 (1)'), path.join(OUT, 'brand', 'wordmark-alpha.webp'), 1200)
await unscreen(wa('13.17.40 (2)'), path.join(OUT, 'brand', 'monogram-alpha.webp'), 1000)
console.log('transparent logos written')
