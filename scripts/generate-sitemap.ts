import fs from 'node:fs';
import path from 'node:path';
import { ARTICLES } from '../src/data/newsData';

const BASE_URL = 'https://netnews1.netlify.app';
const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/netnews-617e7/databases/(default)/documents/articles';

interface ArticleEntry {
  id: string;
  updatedAt?: string;
}

async function fetchFirestoreArticles(): Promise<ArticleEntry[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(FIRESTORE_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Firestore REST returned status ${res.status}. Falling back to newsData.`);
      return ARTICLES.map(a => ({ id: a.id }));
    }

    const data = await res.json();
    const docs = data.documents || [];
    const list: ArticleEntry[] = [];

    for (const doc of docs) {
      const id = doc.name.split('/').pop();
      const fields = doc.fields || {};
      const status = fields.status?.stringValue || 'published';
      
      // Only include published articles
      if (status === 'published' && id) {
        list.push({
          id,
          updatedAt: doc.updateTime || new Date().toISOString(),
        });
      }
    }

    if (list.length > 0) {
      console.log(`Successfully fetched ${list.length} published articles from Firestore.`);
      return list;
    }
  } catch (err) {
    console.warn('Notice: Could not fetch from Firestore REST during build, using newsData:', err);
  }

  return ARTICLES.map(a => ({ id: a.id }));
}

function formatDate(isoOrStr?: string): string {
  if (!isoOrStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(isoOrStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    // fallback
  }
  return new Date().toISOString().split('T')[0];
}

async function generate() {
  const articles = await fetchFirestoreArticles();
  const today = new Date().toISOString().split('T')[0];

  const urls: string[] = [];

  // 1. Homepage
  urls.push(`  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>`);

  // 2. Real published articles
  for (const art of articles) {
    const lastMod = formatDate(art.updatedAt);
    urls.push(`  <url>
    <loc>${BASE_URL}/article/${encodeURIComponent(art.id)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  // 3. Static Legal & Editorial Pages
  const staticPages = [
    'about-us',
    'editorial-code',
    'corrections-policy',
    'terms-of-use',
    'privacy-policy',
    'contact-us'
  ];

  for (const pageSlug of staticPages) {
    const priority = pageSlug === 'about-us' ? '0.7' : '0.5';
    urls.push(`  <url>
    <loc>${BASE_URL}/page/${pageSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`);
  }

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  const robotsContent = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;

  const redirectsContent = `/https:*           /sitemap.xml       301!
/http:*            /sitemap.xml       301!
/sitemap           /sitemap.xml       301
/sitemap_index.xml /sitemap.xml       301
/*                 /index.html        200
`;

  const headersContent = `/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  X-Robots-Tag: all
  Cache-Control: public, max-age=0, must-revalidate
  Access-Control-Allow-Origin: *

/robots.txt
  Content-Type: text/plain; charset=utf-8
  X-Robots-Tag: all
  Cache-Control: public, max-age=0, must-revalidate
  Access-Control-Allow-Origin: *
`;

  // Write to public/ directory (so vite build copies it to dist/)
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, '_redirects'), redirectsContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, '_headers'), headersContent, 'utf-8');

  // Also ensure dist/ gets it if dist already exists
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapContent, 'utf-8');
    fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsContent, 'utf-8');
    fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent, 'utf-8');
    fs.writeFileSync(path.join(distDir, '_headers'), headersContent, 'utf-8');
  }

  console.log(`Generated sitemap.xml with ${urls.length} URLs in public/ and dist/`);
}

generate().catch(err => {
  console.error('Failed to generate sitemap:', err);
  process.exit(1);
});
