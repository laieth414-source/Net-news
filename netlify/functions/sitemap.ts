import type { Config, Context } from '@netlify/functions';
import { ARTICLES } from '../../src/data/newsData';

const BASE_URL = 'https://netnews1.netlify.app';
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/netnews-617e7/databases/(default)/documents/articles';

interface ArticleEntry {
  id: string;
  updatedAt?: string;
}

function formatDate(isoOrStr?: string): string {
  if (!isoOrStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(isoOrStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    // ignore
  }
  return new Date().toISOString().split('T')[0];
}

async function fetchLiveFirestoreArticles(): Promise<ArticleEntry[]> {
  const list: ArticleEntry[] = [];
  const seenIds = new Set<string>();

  try {
    let pageToken: string | undefined = undefined;

    do {
      const url = new URL(FIRESTORE_BASE_URL);
      url.searchParams.set('pageSize', '300');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`Firestore REST returned HTTP ${res.status}`);
        break;
      }

      const data = await res.json();
      const docs = data.documents || [];

      for (const doc of docs) {
        const id = doc.name ? doc.name.split('/').pop() : undefined;
        if (!id || seenIds.has(id)) continue;

        const fields = doc.fields || {};
        const status = fields.status?.stringValue || 'published';

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
  } catch (err) {
    console.warn('Error fetching live articles from Firestore:', err);
  }

  // Include any local fallback articles if not already present
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

function buildSitemapXml(articles: ArticleEntry[]): string {
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
    <loc>${BASE_URL}/article/${encodeURI(art.id)}</loc>
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export default async function sitemapHandler(req: Request, context: Context): Promise<Response> {
  try {
    const articles = await fetchLiveFirestoreArticles();
    const xml = buildSitemapXml(articles);

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'X-Robots-Tag': 'all',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    console.error('Failed to generate live sitemap:', err);
    // Return minimal valid sitemap so search engines never get a 500 error
    const today = new Date().toISOString().split('T')[0];
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'X-Robots-Tag': 'all',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export const config: Config = {
  path: [
    '/sitemap.xml',
    '/sitemap',
    '/sitemap_index.xml',
    '/.netlify/functions/sitemap'
  ],
  preferStatic: false
};
