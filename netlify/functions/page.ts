import type { Config, Context } from '@netlify/functions';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATIC_PAGES_DATA, StaticPageDetail, StaticPageSection } from '../../src/data/staticPagesData';

const BASE_URL = 'https://netnews1-new.netlify.app';
const FIRESTORE_PAGES_URL = 'https://firestore.googleapis.com/v1/projects/netnews-617e7/databases/(default)/documents/static_pages';

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

function cleanText(text?: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
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
    path.join(currentDir, 'base-index.html'),
    path.resolve(process.cwd(), 'netlify/functions/base-index.html'),
    path.resolve(process.cwd(), 'dist/index.html'),
    path.join(currentDir, 'index.html'),
    path.resolve(process.cwd(), 'index.html')
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        if (content && content.includes('id="root"')) {
          cachedBaseHtml = content;
          return cachedBaseHtml;
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback: fetch live deployed index.html
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
      if (text && text.includes('id="root"')) {
        cachedBaseHtml = text;
        return cachedBaseHtml;
      }
    }
  } catch {
    // ignore
  }

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NET NEWS | نت نيوز</title>
    <meta name="description" content="بوابة إخبارية عربية رصينة تقدم تغطية متكاملة للأحداث العالمية والعربية والخليجية والملفات الاقتصادية والرياضية والتقنية بموضوعية واحترافية." />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
    <link rel="canonical" href="https://netnews1-new.netlify.app/" />
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

function cleanSlug(raw?: string | null): string | null {
  if (!raw) return null;
  let val = decodeURIComponent(raw.trim());
  val = val.replace(/^\/+|\/+$/g, '');
  val = val.replace(/^page\//, '');
  val = val.replace(/^functions\//, '');
  val = val.replace(/\.html$/, '');
  if (!val || val === 'page' || val === 'functions') return null;
  return val;
}

function extractPageSlug(req: Request, context: Context): string | null {
  if (context.params?.slug) {
    const cleaned = cleanSlug(context.params.slug);
    if (cleaned) return cleaned;
  }
  if (context.params?.splat) {
    const cleaned = cleanSlug(context.params.splat);
    if (cleaned) return cleaned;
  }
  const wildcard = (context.params as any)?.['*'];
  if (wildcard) {
    const cleaned = cleanSlug(wildcard);
    if (cleaned) return cleaned;
  }

  try {
    const url = new URL(req.url);
    const querySlug = url.searchParams.get('slug') || url.searchParams.get('splat') || url.searchParams.get('id');
    if (querySlug) {
      const cleaned = cleanSlug(querySlug);
      if (cleaned) return cleaned;
    }

    const forwardedUri = req.headers.get('x-forwarded-uri') || req.headers.get('x-original-url') || req.headers.get('x-nf-original-path');
    if (forwardedUri) {
      const match = forwardedUri.match(/\/page\/([^/?#]+)/i);
      if (match && match[1]) {
        const cleaned = cleanSlug(match[1]);
        if (cleaned) return cleaned;
      }
    }

    const match = url.pathname.match(/\/page\/([^/?#]+)/i);
    if (match && match[1]) {
      const cleaned = cleanSlug(match[1]);
      if (cleaned) return cleaned;
    }

    const fnMatch = url.pathname.match(/\/\.netlify\/functions\/page\/([^/?#]+)/i);
    if (fnMatch && fnMatch[1]) {
      const cleaned = cleanSlug(fnMatch[1]);
      if (cleaned) return cleaned;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      const cleaned = cleanSlug(last);
      if (cleaned) return cleaned;
    }
  } catch {
    // ignore
  }

  return null;
}

async function fetchPageData(slug: string): Promise<StaticPageDetail | null> {
  // Normalize alias
  const normalizedSlug = slug === 'about' ? 'about-us' : slug;

  // 1. Try Firestore REST API
  try {
    const url = `${FIRESTORE_PAGES_URL}/${encodeURIComponent(normalizedSlug)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const doc = await res.json();
      const fields = doc.fields || {};

      const sections: StaticPageSection[] = [];
      const rawSections = fields.sections?.arrayValue?.values || [];
      for (const s of rawSections) {
        const m = s.mapValue?.fields || {};
        const heading = m.heading?.stringValue || '';
        const rawParas = m.paragraphs?.arrayValue?.values || [];
        const paragraphs = rawParas.map((p: any) => p.stringValue).filter(Boolean);
        const rawBps = m.bulletPoints?.arrayValue?.values || [];
        const bulletPoints = rawBps.map((b: any) => b.stringValue).filter(Boolean);
        sections.push({
          heading,
          paragraphs: paragraphs.length > 0 ? paragraphs : [''],
          bulletPoints: bulletPoints.length > 0 ? bulletPoints : undefined
        });
      }

      return {
        id: normalizedSlug,
        slug: normalizedSlug,
        title: fields.title?.stringValue || 'صفحة',
        subtitle: fields.subtitle?.stringValue || '',
        badge: fields.badge?.stringValue || 'معلومات',
        lastUpdated: fields.lastUpdated?.stringValue || 'محدّث',
        readingTime: fields.readingTime?.stringValue || '3 دقائق قراءة',
        excerpt: fields.excerpt?.stringValue || '',
        sections: sections.length > 0 ? sections : (STATIC_PAGES_DATA[normalizedSlug]?.sections || []),
        showInFooter: fields.showInFooter?.booleanValue ?? true,
        isActive: fields.isActive?.booleanValue ?? true
      };
    }
  } catch (err) {
    console.warn(`Error querying Firestore for page ${normalizedSlug}:`, err);
  }

  // 2. Fallback to local STATIC_PAGES_DATA
  if (STATIC_PAGES_DATA[normalizedSlug]) {
    return STATIC_PAGES_DATA[normalizedSlug];
  }

  return null;
}

function buildNotFoundResponse(slug: string): Response {
  const notFoundHtml = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>الصفحة غير متوفرة | NET NEWS | نت نيوز</title>
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
      <div style="font-size: 3rem; margin-bottom: 1rem;">📄</div>
      <h1>الصفحة المطلوبة غير متوفرة</h1>
      <p>عذراً، لم نتمكن من العثور على الصفحة المطلوبة (/page/${escapeHtml(slug)}). ربما تم نقلها أو تغيير مسارها.</p>
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

export default async function pageHandler(req: Request, context: Context): Promise<Response> {
  const rawPath = req.headers.get('x-forwarded-uri') || req.headers.get('x-original-url') || req.headers.get('x-nf-original-path') || new URL(req.url).pathname;
  const slug = extractPageSlug(req, context);

  // Normalize trailing slash: /page/about-us/ -> /page/about-us (301 Permanent Redirect)
  if (slug && rawPath.includes('/page/') && rawPath.endsWith('/')) {
    return new Response(null, {
      status: 301,
      headers: {
        'Location': `/page/${encodeURIComponent(slug)}`,
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  }

  if (!slug) {
    return new Response(null, {
      status: 301,
      headers: {
        'Location': '/'
      }
    });
  }

  try {
    const page = await fetchPageData(slug);
    if (!page) {
      return buildNotFoundResponse(slug);
    }

    const canonicalUrl = `${BASE_URL}/page/${encodeURIComponent(page.slug)}`;
    const pageTitle = `${page.title} | NET NEWS | نت نيوز`;
    const description = cleanText(page.subtitle || page.excerpt || 'منصة إخبارية عربية رقمية مستقلة تُعنى بنقل الأخبار والمعلومات بوضوح وموضوعية.');

    // Schema.org structured data
    const schemaType = page.slug === 'about-us' ? 'AboutPage' : page.slug === 'contact-us' ? 'ContactPage' : 'WebPage';
    const jsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': canonicalUrl
      },
      'name': page.title,
      'headline': page.title,
      'description': description,
      'inLanguage': 'ar',
      'url': canonicalUrl,
      'publisher': {
        '@type': 'NewsMediaOrganization',
        'name': 'NET NEWS',
        'url': BASE_URL,
        'logo': {
          '@type': 'ImageObject',
          'url': `${BASE_URL}/logo.png`
        }
      }
    };

    const baseHtml = await getBaseHtml();
    let html = baseHtml;

    // 1. Update <title>
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    // 2. Canonical tag: ALWAYS point strictly to this page's URL
    if (html.includes('rel="canonical"')) {
      html = html.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
    } else {
      html = html.replace('</head>', `    <link rel="canonical" href="${canonicalUrl}" />\n  </head>`);
    }

    // 3. Robots meta tag
    if (html.includes('name="robots"')) {
      html = html.replace(/<meta name="robots"[^>]*>/i, `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`);
    } else {
      html = html.replace('</head>', `    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />\n  </head>`);
    }

    // 4. Meta description
    if (html.includes('name="description"')) {
      html = html.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
    } else {
      html = html.replace('</head>', `    <meta name="description" content="${escapeHtml(description)}" />\n  </head>`);
    }

    // 5. Open Graph meta tags
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
      html = html.replace(/<meta property="og:type"[^>]*>/i, `<meta property="og:type" content="website" />\n    <meta property="og:url" content="${canonicalUrl}" />`);
    } else {
      html = html.replace('</head>', `    <meta property="og:type" content="website" />\n    <meta property="og:url" content="${canonicalUrl}" />\n  </head>`);
    }

    // 6. Twitter cards
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

    // 7. Inject Schema.org JSON-LD
    const jsonLdTag = `    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n`;
    html = html.replace('</head>', `${jsonLdTag}  </head>`);

    // 8. Inject initial readable semantic HTML inside <div id="root">
    const sectionsHtml = (page.sections || [])
      .map((s) => `
        <section class="mb-8">
          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 mb-3 border-r-4 border-[#0f223d] pr-3">${escapeHtml(s.heading)}</h2>
          ${(s.paragraphs || []).map((p) => `<p class="mb-4 text-base sm:text-lg leading-relaxed text-slate-700">${escapeHtml(p)}</p>`).join('\n          ')}
          ${s.bulletPoints && s.bulletPoints.length > 0 ? `
            <ul class="list-disc list-inside space-y-2 text-slate-700 pr-3 my-4">
              ${s.bulletPoints.map((bp) => `<li class="leading-relaxed">${escapeHtml(bp)}</li>`).join('\n              ')}
            </ul>
          ` : ''}
        </section>
      `)
      .join('\n');

    const otherPages = Object.values(STATIC_PAGES_DATA).filter((p) => p.slug !== page.slug);
    const otherPagesHtml = `
      <nav class="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap gap-4" aria-label="روابط سريعة">
        <span class="font-bold text-slate-700">صفحات أخرى:</span>
        ${otherPages.map((p) => `<a href="/page/${p.slug}" class="hover:text-sky-900 hover:underline">${escapeHtml(p.title)}</a>`).join(' · ')}
      </nav>
    `;

    const ssrContent = `
    <div id="root">
      <header class="bg-[#0f223d] text-white py-4 border-b border-[#1b355d]" dir="rtl">
        <div class="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <a href="/" class="flex items-center gap-2 text-2xl font-black text-white hover:opacity-90">
            <span class="w-2.5 h-6 bg-sky-500 rounded-sm inline-block"></span>
            NET NEWS | نت نيوز
          </a>
          <nav class="flex items-center gap-4 text-xs sm:text-sm font-semibold">
            <a href="/" class="text-slate-200 hover:text-white">الصفحة الرئيسية</a>
            <a href="/#news" class="text-slate-200 hover:text-white">الأخبار</a>
            <a href="/page/about-us" class="text-slate-200 hover:text-white ${page.slug === 'about-us' ? 'underline font-bold' : ''}">من نحن</a>
            <a href="/page/contact-us" class="text-slate-200 hover:text-white ${page.slug === 'contact-us' ? 'underline font-bold' : ''}">اتصل بنا</a>
          </nav>
        </div>
      </header>
      <main class="max-w-4xl mx-auto px-4 py-8" dir="rtl">
        <nav class="text-xs text-sky-800 mb-6 flex items-center gap-2" aria-label="مسار التصفح">
          <a href="/" class="hover:underline">الرئيسية</a>
          <span>&gt;</span>
          <span class="text-slate-500">${escapeHtml(page.title)}</span>
        </nav>
        <article class="bg-white p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm">
          <header class="mb-8 border-b border-slate-100 pb-6">
            <div class="flex items-center gap-3 text-xs text-slate-500 mb-3">
              <span class="bg-slate-100 text-[#0f223d] font-bold px-2.5 py-1 rounded">${escapeHtml(page.badge || 'معلومات')}</span>
              <span>·</span>
              <span>${escapeHtml(page.readingTime || '3 دقائق قراءة')}</span>
              <span>·</span>
              <span>آخر تحديث: ${escapeHtml(page.lastUpdated || '2026')}</span>
            </div>
            <h1 class="text-2xl sm:text-4xl font-black text-slate-900 leading-tight mb-4">
              ${escapeHtml(page.title)}
            </h1>
            ${page.subtitle ? `<p class="text-base sm:text-xl text-slate-600 font-medium leading-relaxed">${escapeHtml(page.subtitle)}</p>` : ''}
          </header>
          <div class="prose max-w-none text-slate-800">
            ${sectionsHtml}
          </div>
          ${otherPagesHtml}
        </article>
      </main>
    </div>`;

    if (html.includes('<div id="root">')) {
      html = html.replace(/<div id="root">[\s\S]*?<\/div>/, ssrContent);
    } else if (html.includes('id="root"')) {
      html = html.replace(/<div[^>]*id="root"[^>]*>[\s\S]*?<\/div>/, ssrContent);
    } else {
      html = html.replace('</body>', `${ssrContent}\n</body>`);
    }

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
    console.error(`Error processing page ${slug}:`, err);
    return buildNotFoundResponse(slug);
  }
}

export const config: Config = {
  path: [
    '/page/:slug',
    '/page/:slug/',
    '/.netlify/functions/page/:slug',
    '/.netlify/functions/page/:slug/',
    '/.netlify/functions/page'
  ],
  preferStatic: false
};
