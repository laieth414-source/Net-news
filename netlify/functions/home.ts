import type { Config, Context } from '@netlify/functions';
import fs from 'node:fs';
import path from 'node:path';
import { ARTICLES, BREAKING_NEWS, CATEGORIES } from '../../src/data/newsData';
import { STATIC_PAGES_DATA } from '../../src/data/staticPagesData';

const BASE_URL = 'https://netnews1-new.netlify.app';
const FIRESTORE_ARTICLES_URL = 'https://firestore.googleapis.com/v1/projects/netnews-617e7/databases/(default)/documents/articles';
const FIRESTORE_BREAKING_URL = 'https://firestore.googleapis.com/v1/projects/netnews-617e7/databases/(default)/documents/breakingNews';

interface HomeArticle {
  id: string;
  title: string;
  deck?: string;
  categoryName?: string;
  source?: string;
  publishedAt?: string;
  isLead?: boolean;
  isSecondary?: boolean;
  isBreaking?: boolean;
  timestampMs: number;
}

interface HomeBreaking {
  id: string;
  text: string;
  category?: string;
  articleId?: string;
}

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchLiveHomepageData(): Promise<{ articles: HomeArticle[]; breaking: HomeBreaking[] }> {
  const articles: HomeArticle[] = [];
  const breaking: HomeBreaking[] = [];
  const seenIds = new Set<string>();

  // 1. Fetch articles from Firestore REST
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const url = new URL(FIRESTORE_ARTICLES_URL);
    url.searchParams.set('pageSize', '50');

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (res.ok) {
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
          const ms = rawDate ? new Date(rawDate).getTime() : Date.now();

          articles.push({
            id,
            title: fields.title?.stringValue || 'خبر من نت نيوز',
            deck: fields.deck?.stringValue || '',
            categoryName: fields.categoryName?.stringValue || 'أخبار',
            source: fields.source?.stringValue || 'نت نيوز',
            publishedAt: fields.publishedAt?.stringValue || 'اليوم',
            isLead: Boolean(fields.isLead?.booleanValue),
            isSecondary: Boolean(fields.isSecondary?.booleanValue),
            isBreaking: Boolean(fields.isBreaking?.booleanValue),
            timestampMs: isNaN(ms) ? Date.now() : ms
          });
        }
      }
    }
  } catch (err) {
    console.warn('Notice: Error fetching Firestore articles for home SSR:', err);
  }

  // 2. Fetch Breaking News from Firestore REST
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const url = new URL(FIRESTORE_BREAKING_URL);
    url.searchParams.set('pageSize', '10');

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const docs = data.documents || [];

      for (const doc of docs) {
        const id = doc.name ? doc.name.split('/').pop() : undefined;
        if (!id) continue;
        const fields = doc.fields || {};
        const isActive = fields.isActive?.booleanValue !== false;
        if (isActive) {
          breaking.push({
            id,
            text: fields.text?.stringValue || '',
            category: fields.category?.stringValue || 'عاجل',
            articleId: fields.articleId?.stringValue
          });
        }
      }
    }
  } catch (err) {
    console.warn('Notice: Error fetching Firestore breaking news for home SSR:', err);
  }

  // Fallback to local data
  for (const local of ARTICLES) {
    if (!seenIds.has(local.id)) {
      seenIds.add(local.id);
      articles.push({
        id: local.id,
        title: local.title,
        deck: local.deck,
        categoryName: local.categoryName,
        source: local.source,
        publishedAt: local.publishedAt,
        isLead: local.isLead,
        isSecondary: local.isSecondary,
        isBreaking: local.isBreaking,
        timestampMs: new Date().getTime()
      });
    }
  }

  if (breaking.length === 0) {
    for (const b of BREAKING_NEWS) {
      breaking.push({
        id: b.id,
        text: b.text,
        category: b.category,
        articleId: b.articleId
      });
    }
  }

  // Sort articles descending by timestamp
  articles.sort((a, b) => b.timestampMs - a.timestampMs);

  return { articles, breaking };
}

function loadBaseTemplate(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), 'netlify/functions/base-index.html'),
    path.resolve(process.cwd(), 'dist/index.html'),
    path.resolve(process.cwd(), 'index.html'),
    path.resolve('/var/task/netlify/functions/base-index.html'),
    path.resolve('/var/task/dist/index.html'),
    path.resolve('/app/applet/netlify/functions/base-index.html'),
    path.resolve('/app/applet/dist/index.html')
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf-8');
      }
    } catch {
      // continue
    }
  }

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NET NEWS | نت نيوز</title>
    <meta name="description" content="بوابة إخبارية عربية رصينة تقدم تغطية متكاملة للأحداث العالمية والعربية والخليجية والملفات الاقتصادية والرياضية والتقنية بموضوعية واحترافية." />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${BASE_URL}/" />
    <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
    <link rel="sitemap" type="application/xml" title="Google News Sitemap" href="/news-sitemap.xml" />
  </head>
  <body class="bg-[#f8fafc] text-slate-900 font-sans antialiased">
    <div id="root"></div>
  </body>
</html>`;
}

export default async function homeHandler(req: Request, context: Context): Promise<Response> {
  const { articles, breaking } = await fetchLiveHomepageData();
  let html = loadBaseTemplate();

  // Combine breaking items: from breaking collection + any article marked isBreaking
  const breakingList: { text: string; articleId?: string; category?: string }[] = [...breaking];
  for (const art of articles) {
    if (art.isBreaking && !breakingList.some((b) => b.articleId === art.id)) {
      breakingList.unshift({
        text: art.title,
        articleId: art.id,
        category: art.categoryName || 'عاجل'
      });
    }
  }

  const latestArticles = articles.slice(0, 24);

  // Structured Data (Schema.org WebSite & NewsMediaOrganization)
  const homeSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsMediaOrganization',
        '@id': `${BASE_URL}/#organization`,
        'name': 'NET NEWS | نت نيوز',
        'url': BASE_URL,
        'logo': {
          '@type': 'ImageObject',
          'url': `${BASE_URL}/logo.png`,
          'width': 512,
          'height': 512
        },
        'sameAs': [
          'https://twitter.com/netnews',
          'https://facebook.com/netnews'
        ]
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        'url': BASE_URL,
        'name': 'NET NEWS | نت نيوز',
        'description': 'بوابة إخبارية عربية رصينة تقدم تغطية متكاملة للأحداث العالمية والعربية والخليجية والملفات الاقتصادية والرياضية والتقنية.',
        'publisher': {
          '@id': `${BASE_URL}/#organization`
        },
        'inLanguage': 'ar'
      },
      {
        '@type': 'CollectionPage',
        '@id': `${BASE_URL}/#webpage`,
        'url': BASE_URL,
        'name': 'NET NEWS | نت نيوز - الصفحة الرئيسية',
        'isPartOf': {
          '@id': `${BASE_URL}/#website`
        },
        'about': {
          '@id': `${BASE_URL}/#organization`
        },
        'inLanguage': 'ar'
      }
    ]
  };

  const schemaScript = `    <script type="application/ld+json">
${JSON.stringify(homeSchema, null, 2)}
    </script>`;

  if (!html.includes('schema.org') && !html.includes('NewsMediaOrganization')) {
    html = html.replace('</head>', `${schemaScript}\n  </head>`);
  }

  // Ensure canonical is strictly /
  if (!html.includes('rel="canonical"')) {
    html = html.replace('</head>', `    <link rel="canonical" href="${BASE_URL}/" />\n  </head>`);
  }

  // Build semantic, crawlable SSR content inside <div id="root">
  const homeSsrContent = `
    <div id="root">
      <header class="bg-[#0f223d] text-white py-4 border-b border-[#1b355d]" dir="rtl">
        <div class="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <a href="/" class="text-2xl font-black text-white hover:opacity-90">NET NEWS | نت نيوز</a>
          <nav class="flex items-center gap-3 overflow-x-auto text-xs sm:text-sm font-semibold">
            ${CATEGORIES.map((c) => `<a href="${c.id === 'all' ? '/' : `/#${encodeURIComponent(c.id)}`}" class="text-slate-200 hover:text-white px-2 py-1">${escapeHtml(c.name)}</a>`).join('\n            ')}
          </nav>
        </div>
      </header>

      <!-- Breaking News Bar (Live Crawlable Links) -->
      ${breakingList.length > 0 ? `
      <section class="bg-[#0f172a] text-slate-100 border-b border-slate-800 text-xs py-2 px-4" dir="rtl" aria-label="أخبار عاجلة">
        <div class="max-w-7xl mx-auto flex items-center gap-3 overflow-hidden">
          <span class="bg-[#dc2626] text-white px-2.5 py-0.5 font-bold rounded-xs shrink-0 uppercase tracking-wider">عاجل</span>
          <div class="flex items-center gap-4 truncate">
            ${breakingList.map((b) => {
              const href = b.articleId ? `/article/${encodeURIComponent(b.articleId)}` : '/';
              return `<a href="${href}" class="hover:underline truncate text-slate-200 font-medium">[${escapeHtml(b.category || 'عاجل')}] ${escapeHtml(b.text)}</a>`;
            }).join('<span class="text-slate-600">·</span>')}
          </div>
        </div>
      </section>` : ''}

      <main class="max-w-7xl mx-auto px-4 py-8" dir="rtl">
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 mb-6 font-heading">أحدث الأخبار والتقارير المنشورة</h1>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${latestArticles.map((art) => `
            <article class="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span class="text-xs font-bold text-sky-800 mb-1.5 block">${escapeHtml(art.categoryName || 'أخبار')}</span>
                <h2 class="text-base sm:text-lg font-bold text-slate-950 mb-2 leading-snug">
                  <a href="/article/${encodeURIComponent(art.id)}" class="hover:text-sky-900 hover:underline">${escapeHtml(art.title)}</a>
                </h2>
                ${art.deck ? `<p class="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed mb-3">${escapeHtml(art.deck)}</p>` : ''}
              </div>
              <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>${escapeHtml(art.source || 'نت نيوز')}</span>
                <a href="/article/${encodeURIComponent(art.id)}" class="text-sky-800 font-semibold hover:underline">قراءة التفاصيل &larr;</a>
              </div>
            </article>
          `).join('\n          ')}
        </div>

        <footer class="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap gap-4">
          ${(Object.values(STATIC_PAGES_DATA) as any[]).map((p: any) => `<a href="/page/${p.slug}" class="hover:underline">${escapeHtml(p.title)}</a>`).join(' · ')}
        </footer>
      </main>
    </div>`;

  html = html.replace(/<div id="root"><\/div>/, homeSsrContent);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'X-Robots-Tag': 'all, index, follow',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export const config: Config = {
  path: [
    '/',
    '/.netlify/functions/home'
  ],
  preferStatic: false
};
