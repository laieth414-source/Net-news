import fs from 'node:fs';
import path from 'node:path';
import { ARTICLES } from '../src/data/newsData';

const BASE_URL = 'https://netnews1-new.netlify.app';
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/netnews-617e7/databases/(default)/documents/articles';

interface ArticleEntry {
  id: string;
  updatedAt?: string;
}

async function fetchFirestoreArticles(): Promise<ArticleEntry[]> {
  const list: ArticleEntry[] = [];
  const seenIds = new Set<string>();

  try {
    let pageToken: string | undefined = undefined;
    let pageCount = 0;

    do {
      pageCount++;
      const url = new URL(FIRESTORE_BASE_URL);
      url.searchParams.set('pageSize', '300');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`Firestore REST returned status ${res.status} on page ${pageCount}.`);
        break;
      }

      const data = await res.json();
      const docs = data.documents || [];

      for (const doc of docs) {
        const id = doc.name ? doc.name.split('/').pop() : undefined;
        if (!id || seenIds.has(id)) continue;

        const fields = doc.fields || {};
        const status = fields.status?.stringValue || 'published';

        // Only include published articles (or default published)
        if (status === 'published' || !fields.status) {
          seenIds.add(id);
          const updateTime =
            fields.updatedAt?.timestampValue ||
            doc.updateTime ||
            fields.createdAt?.timestampValue ||
            doc.createTime ||
            new Date().toISOString();

          list.push({
            id,
            updatedAt: updateTime,
          });
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    console.log(`Fetched ${list.length} published articles from Firestore across ${pageCount} page(s).`);
  } catch (err) {
    console.warn('Notice: Error fetching articles from Firestore REST:', err);
  }

  // Merge any local fallback articles that aren't already in Firestore
  for (const local of ARTICLES) {
    if (!seenIds.has(local.id)) {
      seenIds.add(local.id);
      list.push({
        id: local.id,
        updatedAt: undefined,
      });
    }
  }

  return list;
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
  console.log('Generating sitemap.xml...');
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

  const redirectsContent = `/https:*           /sitemap.xml                        301!
/http:*            /sitemap.xml                        301!
/sitemap           /sitemap.xml                        301!
/sitemap_index.xml /sitemap.xml                        301!
/sitemap.xml       /.netlify/functions/sitemap         200!
/article/*         /.netlify/functions/article/:splat  200!
/page/:slug/       /page/:slug                         301!
/*                 /index.html                         200
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

/article/*
  Content-Type: text/html; charset=utf-8
  X-Robots-Tag: all, index, follow
  Cache-Control: public, max-age=0, must-revalidate
  Access-Control-Allow-Origin: *

/page/*
  Content-Type: text/html; charset=utf-8
  X-Robots-Tag: all, index, follow
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
