import type { Config, Context } from '@netlify/functions';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICLES } from '../../src/data/newsData';

const BASE_URL = 'https://netnews1.netlify.app';
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/netnews-617e7/databases/(default)/documents/articles';

let cachedBaseHtml: string | null = null;

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toIsoDate(val?: string): string {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {
    // ignore
  }
  return new Date().toISOString();
}

function getCurrentDir(): string {
  try {
    if (typeof __dirname !== 'undefined' && __dirname) return __dirname;
    if (typeof import.meta !== 'undefined' && import.meta?.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // ignore
  }
  return process.cwd();
}

async function getBaseHtml(): Promise<string> {
  if (cachedBaseHtml) return cachedBaseHtml;

  const currentDir = getCurrentDir();

  const candidatePaths = [
    path.resolve(process.cwd(), 'dist/index.html'),
    path.join(currentDir, 'base-index.html'),
    path.resolve(process.cwd(), 'netlify/functions/base-index.html'),
    path.join(currentDir, 'index.html'),
    path.resolve(process.cwd(), 'index.html')
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        if (content && content.includes('<div id="root">')) {
          cachedBaseHtml = content;
          return cachedBaseHtml;
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback: fetch live deployed index.html for hashed asset filenames
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${BASE_URL}/index.html`, {
      signal: controller.signal,
      headers: { 'Accept': 'text/html' }
    });
    clearTimeout(timeout);
    if (res.ok) {
      const text = await res.text();
      if (text && text.includes('<div id="root">')) {
        cachedBaseHtml = text;
        return cachedBaseHtml;
      }
    }
  } catch {
    // ignore
  }

  // Minimal standalone fallback
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NET NEWS | نت نيوز</title>
    <meta name="description" content="بوابة إخبارية عربية رصينة تقدم تغطية متكاملة للأحداث العالمية والعربية والخليجية والملفات الاقتصادية والرياضية والتقنية بموضوعية واحترافية." />
    <meta name="google-site-verification" content="ZoVgz7xkH-XyPbmf_Mqc9MKwD10c0NOKnNdOXYNHj-k" />
    <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
    <link rel="canonical" href="https://netnews1.netlify.app/" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-[#0f223d] selection:text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

interface ArticleData {
  id: string;
  title: string;
  deck: string;
  paragraphs: string[];
  categoryName: string;
  publishedAt: string;
  source: string;
  author: string;
  readTime: string;
  viewsCount: string;
  imageUrl: string;
  imageCaption: string;
  createdAt: string;
  updatedAt: string;
}

function extractArticleId(req: Request, context: Context): string | null {
  if (context.params?.id) {
    return context.params.id;
  }
  try {
    const url = new URL(req.url);
    const queryId = url.searchParams.get('id');
    if (queryId) return queryId;

    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last !== 'article' && last !== 'functions') {
      return decodeURIComponent(last);
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchArticleById(id: string): Promise<{ data?: ArticleData; notFound?: boolean; unpublished?: boolean }> {
  // 1. Try Firestore REST API
  try {
    const url = `${FIRESTORE_BASE_URL}/${encodeURIComponent(id)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (res.status === 404) {
      // Check local fallbacks before declaring not found
    } else if (res.ok) {
      const doc = await res.json();
      const fields = doc.fields || {};
      const status = fields.status?.stringValue || 'published';

      if (status !== 'published') {
        return { unpublished: true };
      }

      const rawContent = fields.content?.arrayValue?.values || [];
      const paragraphs: string[] = [];
      for (const val of rawContent) {
        if (val.stringValue) {
          const lines = val.stringValue.split(/\r?\n+/).map((l: string) => l.trim()).filter(Boolean);
          paragraphs.push(...lines);
        }
      }

      const deck = fields.deck?.stringValue || '';
      if (paragraphs.length === 0 && deck) {
        paragraphs.push(deck);
      }

      const authorName =
        fields.author?.mapValue?.fields?.name?.stringValue ||
        fields.author?.stringValue ||
        fields.source?.stringValue ||
        'محرر نت نيوز';

      return {
        data: {
          id,
          title: fields.title?.stringValue || 'خبر عاجل',
          deck,
          paragraphs: paragraphs.length > 0 ? paragraphs : ['التفاصيل قيد المتابعة والتحديث.'],
          categoryName: fields.categoryName?.stringValue || 'أخبار',
          publishedAt: fields.publishedAt?.stringValue || '',
          source: fields.source?.stringValue || 'نت نيوز',
          author: authorName,
          readTime: fields.readTime?.stringValue || '3 دقائق قراءة',
          viewsCount: fields.viewsCount?.stringValue || '',
          imageUrl: fields.imageUrl?.stringValue || '',
          imageCaption: fields.imageCaption?.stringValue || '',
          createdAt: fields.createdAt?.timestampValue || doc.createTime || new Date().toISOString(),
          updatedAt: fields.updatedAt?.timestampValue || doc.updateTime || doc.createTime || new Date().toISOString()
        }
      };
    }
  } catch (err) {
    console.warn(`Error querying Firestore for article ${id}:`, err);
  }

  // 2. Check local fallback articles
  const local = ARTICLES.find((a) => a.id === id);
  if (local) {
    const rawParagraphs = Array.isArray(local.content) ? local.content : [local.content || ''];
    const paragraphs: string[] = [];
    for (const p of rawParagraphs) {
      const lines = p.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
      paragraphs.push(...lines);
    }

    return {
      data: {
        id: local.id,
        title: local.title,
        deck: local.deck || '',
        paragraphs: paragraphs.length > 0 ? paragraphs : ['التفاصيل قيد المتابعة.'],
        categoryName: local.categoryName || 'أخبار',
        publishedAt: local.publishedAt || '',
        source: local.source || 'نت نيوز',
        author: (typeof local.author === 'object' ? local.author?.name : local.author) || local.source || 'نت نيوز',
        readTime: local.readTime || '3 دقائق قراءة',
        viewsCount: local.viewsCount || '',
        imageUrl: local.imageUrl || '',
        imageCaption: local.imageCaption || '',
        createdAt: '2026-10-09T13:51:00Z',
        updatedAt: '2026-10-12T15:51:00Z'
      }
    };
  }

  return { notFound: true };
}

async function fetchRelatedArticles(currentId: string, categoryName: string): Promise<Array<{ id: string; title: string; categoryName: string; publishedAt?: string }>> {
  const related: Array<{ id: string; title: string; categoryName: string; publishedAt?: string }> = [];
  const seen = new Set<string>([currentId]);

  // 1. Try Firestore REST first for published articles in this category or overall
  try {
    const url = `${FIRESTORE_BASE_URL}?pageSize=20`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      for (const doc of data.documents || []) {
        const id = doc.name ? doc.name.split('/').pop() : undefined;
        if (!id || seen.has(id)) continue;
        const fields = doc.fields || {};
        const status = fields.status?.stringValue || 'published';
        if (status === 'published' || !fields.status) {
          const cat = fields.categoryName?.stringValue || 'أخبار';
          seen.add(id);
          related.push({
            id,
            title: fields.title?.stringValue || 'خبر عاجل',
            categoryName: cat,
            publishedAt: fields.publishedAt?.stringValue || ''
          });
          if (related.length >= 4) break;
        }
      }
    }
  } catch {
    // fallback to local
  }

  // 2. Fallback to local published articles
  if (related.length < 4) {
    for (const local of ARTICLES) {
      if (!seen.has(local.id)) {
        seen.add(local.id);
        related.push({
          id: local.id,
          title: local.title,
          categoryName: local.categoryName,
          publishedAt: local.publishedAt
        });
        if (related.length >= 4) break;
      }
    }
  }

  return related.slice(0, 4);
}

function buildNotFoundResponse(message: string, isUnpublished = false): Response {
  const notFoundHtml = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>المقال غير متوفر | NET NEWS | نت نيوز</title>
    <meta name="robots" content="noindex, nofollow" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" />
    <style>
      body { font-family: 'Cairo', system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 2rem 1rem; }
      .card { max-width: 520px; margin: 4rem auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 2.5rem 2rem; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      h1 { font-size: 1.5rem; font-weight: 800; color: #0f223d; margin: 0 0 1rem; }
      p { font-size: 1rem; color: #64748b; line-height: 1.6; margin: 0 0 2rem; }
      .btn { display: inline-block; background: #0f223d; color: #ffffff; text-decoration: none; padding: 0.75rem 1.75rem; border-radius: 0.5rem; font-weight: 700; font-size: 0.95rem; }
      .btn:hover { opacity: 0.9; }
    </style>
  </head>
  <body>
    <div class="card">
      <div style="font-size: 3rem; margin-bottom: 1rem;">📰</div>
      <h1>${isUnpublished ? 'المقال غير متاح حالياً' : 'المقال غير متوفر'}</h1>
      <p>${escapeHtml(message)}</p>
      <a href="/" class="btn">العودة إلى الصفحة الرئيسية</a>
    </div>
  </body>
</html>`;

  return new Response(notFoundHtml, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

export default async function articleHandler(req: Request, context: Context): Promise<Response> {
  // Normalize trailing slashes: e.g. /article/art-123/ -> /article/art-123 (301 Permanent Redirect)
  try {
    const rawPath = req.headers.get('x-forwarded-uri') || req.headers.get('x-original-url') || new URL(req.url).pathname;
    if (rawPath.startsWith('/article/') && rawPath.endsWith('/') && rawPath.length > '/article/'.length) {
      const cleanPath = rawPath.replace(/\/+$/, '');
      return new Response(null, {
        status: 301,
        headers: {
          'Location': cleanPath,
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }
  } catch {
    // ignore
  }

  const articleId = extractArticleId(req, context);

  if (!articleId) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/'
      }
    });
  }

  try {
    const { data: art, notFound, unpublished } = await fetchArticleById(articleId);

    if (unpublished) {
      return buildNotFoundResponse('هذا المقال غير منشور حالياً أو تم إلغاء نشره من قِبل هيئة التحرير.', true);
    }

    if (notFound || !art) {
      return buildNotFoundResponse('عذراً، لم يتم العثور على المقال المطلوب. ربما تم نقله أو حذفه.');
    }

    const canonicalUrl = `${BASE_URL}/article/${encodeURIComponent(art.id)}`;
    const pageTitle = `${art.title} | NET NEWS | نت نيوز`;
    const description = art.deck || art.paragraphs[0] || 'بوابة إخبارية عربية رصينة تقدم تغطية متكاملة للأحداث.';
    const publishedIso = toIsoDate(art.createdAt);
    const modifiedIso = toIsoDate(art.updatedAt || art.createdAt);

    // Schema.org NewsArticle
    const jsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': canonicalUrl
      },
      'headline': art.title,
      'description': description,
      'articleSection': art.categoryName || 'أخبار',
      'inLanguage': 'ar',
      'datePublished': publishedIso,
      'dateModified': modifiedIso,
      'author': {
        '@type': 'Person',
        'name': art.author || art.source || 'نت نيوز'
      },
      'publisher': {
        '@type': 'NewsMediaOrganization',
        'name': 'NET NEWS',
        'url': BASE_URL,
        'logo': {
          '@type': 'ImageObject',
          'url': `${BASE_URL}/favicon.ico`
        }
      }
    };

    if (art.imageUrl) {
      jsonLd.image = [art.imageUrl];
    }

    const baseHtml = await getBaseHtml();
    let html = baseHtml;

    // 1. Update <title>
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    // 2. Canonical tag: ALWAYS point strictly to this article's URL
    if (html.includes('rel="canonical"')) {
      html = html.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
    } else {
      html = html.replace('</head>', `    <link rel="canonical" href="${canonicalUrl}" />\n  </head>`);
    }

    // 3. Meta description
    if (html.includes('name="description"')) {
      html = html.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
    } else {
      html = html.replace('</head>', `    <meta name="description" content="${escapeHtml(description)}" />\n  </head>`);
    }

    // 4. Open Graph meta tags
    if (html.includes('property="og:title"')) {
      html = html.replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
    } else {
      html = html.replace('</head>', `    <meta property="og:title" content="${escapeHtml(pageTitle)}" />\n  </head>`);
    }

    if (html.includes('property="og:description"')) {
      html = html.replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
    } else {
      html = html.replace('</head>', `    <meta property="og:description" content="${escapeHtml(description)}" />\n  </head>`);
    }

    if (html.includes('property="og:type"')) {
      html = html.replace(/<meta property="og:type"[^>]*>/i, `<meta property="og:type" content="article" />\n    <meta property="og:url" content="${canonicalUrl}" />\n    <meta property="article:published_time" content="${publishedIso}" />\n    <meta property="article:modified_time" content="${modifiedIso}" />\n    <meta property="article:section" content="${escapeHtml(art.categoryName)}" />`);
    } else {
      html = html.replace('</head>', `    <meta property="og:type" content="article" />\n    <meta property="og:url" content="${canonicalUrl}" />\n  </head>`);
    }

    if (art.imageUrl) {
      if (html.includes('property="og:image"')) {
        html = html.replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapeHtml(art.imageUrl)}" />`);
      } else {
        html = html.replace('</head>', `    <meta property="og:image" content="${escapeHtml(art.imageUrl)}" />\n  </head>`);
      }
    }

    // 5. Twitter cards
    if (html.includes('name="twitter:title"')) {
      html = html.replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`);
    } else {
      html = html.replace('</head>', `    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />\n  </head>`);
    }

    if (html.includes('name="twitter:description"')) {
      html = html.replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
    } else {
      html = html.replace('</head>', `    <meta name="twitter:description" content="${escapeHtml(description)}" />\n  </head>`);
    }

    if (art.imageUrl) {
      if (html.includes('name="twitter:image"')) {
        html = html.replace(/<meta name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${escapeHtml(art.imageUrl)}" />`);
      } else {
        html = html.replace('</head>', `    <meta name="twitter:image" content="${escapeHtml(art.imageUrl)}" />\n  </head>`);
      }
    }

    // 6. Inject Schema.org JSON-LD
    const jsonLdTag = `    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n`;
    html = html.replace('</head>', `${jsonLdTag}  </head>`);

    // 7. Inject initial readable semantic HTML inside <div id="root">
    const paragraphsHtml = art.paragraphs
      .map((p) => `<p class="text-base sm:text-lg leading-relaxed text-slate-800 mb-4">${escapeHtml(p)}</p>`)
      .join('\n            ');

    const imageHtml = art.imageUrl
      ? `
          <figure class="my-6 rounded-lg overflow-hidden border border-slate-200">
            <img src="${escapeHtml(art.imageUrl)}" alt="${escapeHtml(art.title)}" class="w-full max-h-[500px] object-cover" />
            ${art.imageCaption ? `<figcaption class="bg-slate-50 px-4 py-2 text-xs text-slate-500 border-t border-slate-200">${escapeHtml(art.imageCaption)}</figcaption>` : ''}
          </figure>`
      : '';

    const relatedList = await fetchRelatedArticles(art.id, art.categoryName);
    const relatedHtml = relatedList.length > 0 ? `
        <aside class="mt-8 pt-8 border-t border-slate-200">
          <h2 class="text-lg font-bold text-slate-900 mb-4">قد يهمك أيضاً في هذا السياق</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${relatedList.map((rel) => `
              <div class="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <span class="text-xs font-semibold text-sky-800 block mb-1">${escapeHtml(rel.categoryName)}</span>
                <h3 class="text-sm font-bold text-slate-900 line-clamp-2">
                  <a href="/article/${encodeURIComponent(rel.id)}" class="hover:text-sky-900 hover:underline">${escapeHtml(rel.title)}</a>
                </h3>
                <span class="text-xs text-slate-400 mt-2 block">${escapeHtml(rel.publishedAt || '')}</span>
              </div>
            `).join('\n')}
          </div>
        </aside>
    ` : '';

    const ssrContent = `
    <div id="root">
      <header class="bg-white border-b border-slate-200">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between" dir="rtl">
          <a href="/" class="flex items-center gap-2 text-sky-950 font-black text-xl hover:opacity-90">
            <span class="w-2.5 h-6 bg-[#0f223d] rounded-sm inline-block"></span>
            NET NEWS | نت نيوز
          </a>
          <a href="/" class="text-xs text-sky-800 hover:underline">الرئيسية</a>
        </div>
      </header>
      <main class="max-w-4xl mx-auto px-4 py-8" dir="rtl">
        <nav class="text-xs text-sky-800 mb-4 flex items-center gap-2" aria-label="مسار التصفح">
          <a href="/" class="hover:underline">الرئيسية</a>
          <span>&gt;</span>
          <a href="/#${encodeURIComponent(art.categoryName || 'news')}" class="hover:underline">${escapeHtml(art.categoryName || 'أخبار')}</a>
          <span>&gt;</span>
          <span class="text-slate-500 truncate max-w-xs">${escapeHtml(art.title)}</span>
        </nav>
        <article class="bg-white p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm">
          <div class="mb-4 text-xs sm:text-sm text-slate-500 flex flex-wrap items-center gap-3">
            <span class="font-bold text-sky-800">${escapeHtml(art.categoryName || 'أخبار')}</span>
            <span>·</span>
            <span>${escapeHtml(art.publishedAt || '')}</span>
            <span>·</span>
            <span>${escapeHtml(art.author || art.source || 'نت نيوز')}</span>
            ${art.readTime ? `<span>·</span><span>${escapeHtml(art.readTime)}</span>` : ''}
            ${art.viewsCount ? `<span>·</span><span>${escapeHtml(art.viewsCount)}</span>` : ''}
          </div>
          <h1 class="text-2xl sm:text-4xl font-black text-slate-900 leading-tight mb-4">
            ${escapeHtml(art.title)}
          </h1>
          ${art.deck ? `<p class="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed mb-6 border-r-4 border-sky-600 pr-4">${escapeHtml(art.deck)}</p>` : ''}
          ${imageHtml}
          <div class="prose max-w-none text-slate-800 border-t border-slate-100 pt-6">
            ${paragraphsHtml}
          </div>
          ${relatedHtml}
        </article>
      </main>
    </div>`;

    html = html.replace(/<div id="root"><\/div>/, ssrContent);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'X-Robots-Tag': 'all, index, follow',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    console.error(`Error processing article ${articleId}:`, err);
    return buildNotFoundResponse('تعذر تحميل تفاصيل المقال في الوقت الحالي. يرجى المحاولة لاحقاً.');
  }
}

export const config: Config = {
  path: [
    '/article/:id',
    '/article/:id/',
    '/.netlify/functions/article/:id',
    '/.netlify/functions/article/:id/',
    '/.netlify/functions/article'
  ],
  preferStatic: false
};
