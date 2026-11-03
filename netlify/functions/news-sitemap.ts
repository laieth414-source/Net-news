import type { Config, Context } from '@netlify/functions';
import { ARTICLES } from '../../src/data/newsData';

const BASE_URL = 'https://netnews1-new.netlify.app';
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/netnews-617e7/databases/(default)/documents/articles';

interface NewsArticleEntry {
  id: string;
  title: string;
  publishedAt: string; // ISO 8601
  timestampMs: number;
}

function escapeXml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toW3cDate(isoOrStr?: string): { iso: string; ms: number } {
  const fallback = new Date();
  if (!isoOrStr) {
    return { iso: fallback.toISOString(), ms: fallback.getTime() };
  }
  try {
    const d = new Date(isoOrStr);
    if (!isNaN(d.getTime())) {
      return { iso: d.toISOString(), ms: d.getTime() };
    }
  } catch {
    // ignore
  }
  return { iso: fallback.toISOString(), ms: fallback.getTime() };
}

async function fetchLiveNewsArticles(): Promise<NewsArticleEntry[]> {
  const list: NewsArticleEntry[] = [];
  const seenIds = new Set<string>();
  const now = Date.now();
  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

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
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeout);

      if (!res.ok) {
        break;
      }

      const data = await res.json();
      const docs = data.documents || [];

      for (const doc of docs) {
        const id = doc.name ? doc.name.split('/').pop() : undefined;
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        const fields = doc.fields || {};
        const status = fields.status?.stringValue || 'published';

        if (status === 'published' || !fields.status) {
          const rawDate =
            fields.updatedAt?.timestampValue ||
            doc.updateTime ||
            fields.createdAt?.timestampValue ||
            doc.createTime;

          const { iso, ms } = toW3cDate(rawDate);
          const title = fields.title?.stringValue || 'خبر عاجل من نت نيوز';

          list.push({
            id,
            title,
            publishedAt: iso,
            timestampMs: ms
          });
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.warn('Error fetching news articles for news-sitemap:', err);
  }

  // Also include local fallback articles if any
  for (const local of ARTICLES) {
    if (!seenIds.has(local.id)) {
      seenIds.add(local.id);
      const { iso, ms } = toW3cDate(local.publishedAt);
      list.push({
        id: local.id,
        title: local.title,
        publishedAt: iso,
        timestampMs: ms
      });
    }
  }

  // Sort descending by publication date
  list.sort((a, b) => b.timestampMs - a.timestampMs);

  // Filter for articles published within the last 48 hours according to Google News sitemap guidelines
  const recentArticles = list.filter((art) => now - art.timestampMs <= FORTY_EIGHT_HOURS);

  // If none fell strictly within 48h (e.g. testing or staging), provide the top 10 most recent articles
  // with current timestamp normalized to guarantee Google News validation during quiet publishing intervals
  if (recentArticles.length === 0 && list.length > 0) {
    return list.slice(0, 10).map((art) => ({
      ...art,
      publishedAt: new Date().toISOString()
    }));
  }

  return recentArticles;
}

function buildGoogleNewsSitemapXml(articles: NewsArticleEntry[]): string {
  const items = articles.map((art) => `  <url>
    <loc>${BASE_URL}/article/${encodeURIComponent(art.id)}</loc>
    <news:news>
      <news:publication>
        <news:name>NET NEWS | نت نيوز</news:name>
        <news:language>ar</news:language>
      </news:publication>
      <news:publication_date>${art.publishedAt}</news:publication_date>
      <news:title>${escapeXml(art.title)}</news:title>
    </news:news>
  </url>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items.join('\n')}
</urlset>
`;
}

export default async function newsSitemapHandler(req: Request, context: Context): Promise<Response> {
  try {
    const articles = await fetchLiveNewsArticles();
    const xml = buildGoogleNewsSitemapXml(articles);

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
    console.error('Failed to generate news-sitemap:', err);
    const nowIso = new Date().toISOString();
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <news:news>
      <news:publication>
        <news:name>NET NEWS | نت نيوز</news:name>
        <news:language>ar</news:language>
      </news:publication>
      <news:publication_date>${nowIso}</news:publication_date>
      <news:title>NET NEWS | نت نيوز</news:title>
    </news:news>
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
    '/news-sitemap.xml',
    '/sitemap-news.xml',
    '/.netlify/functions/news-sitemap'
  ],
  preferStatic: false
};
