// Generates public/sitemap.xml from the static routes plus every catalogue book.
// SITE_URL env or VITE_SITE_URL sets the domain (default https://bookverse.app).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const SITE = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://bookverse.app').replace(/\/$/, '')
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
const today = new Date().toISOString().slice(0, 10)
const urls = [['/', '1.0', 'weekly'], ['/discover', '0.9', 'daily'], ['/stories', '0.7', 'daily'], ['/community', '0.7', 'daily'], ['/challenges', '0.5', 'weekly'], ['/about', '0.5', 'monthly'], ['/help', '0.4', 'monthly'], ['/legal/terms', '0.2', 'yearly'], ['/legal/privacy', '0.2', 'yearly'], ['/legal/cookies', '0.2', 'yearly']]
  .map(([p, pr, f]) => `<url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`)
if (existsSync('public/catalog.json')) {
  const { results } = JSON.parse(readFileSync('public/catalog.json', 'utf-8'))
  for (const b of results) urls.push(`<url><loc>${SITE}/books/${b.id}/${slug(b.title)}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`)
}
writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`)
console.log(`sitemap.xml: ${urls.length} urls`)
