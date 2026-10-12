import fs from 'node:fs';
import path from 'node:path';
import { ARTICLES } from '../src/data/newsData';
import { STATIC_PAGES_DATA } from '../src/data/staticPagesData';

const BASE_URL = 'https://netnews1.netlify.app';
const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/netnews-617e7/databases/(default)/documents/articles';

interface RemoteArticle {
  id: string;
  title?: string;
  deck?: string;
  content?: string[];
  categoryName?: string;
  categoryId?: string;
  publishedAt?: string;
  source?: string;
  readTime?: string;
  viewsCount?: string;
  imageCaption?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchFirestoreArticles(): Promise<RemoteArticle[]> {
  const list: RemoteArticle[] = [];
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

        if (status === 'published' || !fields.status) {
          seenIds.add(id);
          const rawContent = fields.content?.arrayValue?.values || [];
          const content = rawContent.map((v: any) => v.stringValue).filter(Boolean);

          list.push({
            id,
            title: fields.title?.stringValue,
            deck: fields.deck?.stringValue,
            content: content.length > 0 ? content : undefined,
            categoryName: fields.categoryName?.stringValue,
            categoryId: fields.categoryId?.stringValue,
            publishedAt: fields.publishedAt?.stringValue,
            source: fields.source?.stringValue,
            readTime: fields.readTime?.stringValue,
            viewsCount: fields.viewsCount?.stringValue,
            imageCaption: fields.imageCaption?.stringValue,
            imageUrl: fields.imageUrl?.stringValue,
            createdAt: fields.createdAt?.timestampValue || doc.createTime,
            updatedAt: fields.updatedAt?.timestampValue || doc.updateTime || new Date().toISOString(),
          });
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    console.log(`Fetched ${list.length} articles from Firestore across ${pageCount} page(s) for prerendering.`);
  } catch (err) {
    console.warn('Notice: Error fetching articles for prerendering:', err);
  }

  // Merge any local fallback articles that aren't already in Firestore
  for (const local of ARTICLES) {
    if (!seenIds.has(local.id)) {
      seenIds.add(local.id);
      list.push({
        id: local.id,
        title: local.title,
        deck: local.deck,
        content: local.content,
        categoryName: local.categoryName,
        categoryId: local.categoryId,
        publishedAt: local.publishedAt,
        source: local.source,
        readTime: local.readTime,
        viewsCount: local.viewsCount,
        imageCaption: local.imageCaption,
        imageUrl: local.imageUrl,
        createdAt: undefined,
        updatedAt: undefined
      });
    }
  }

  return list;
}

export async function prerenderPrerenderedRoutes() {
  const distDir = path.resolve(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.log('Skipping prerender: dist/index.html not found yet.');
    return;
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  const articles = await fetchFirestoreArticles();

  // Merge Firestore articles with local fallback for complete metadata
  const articleMap = new Map<string, any>();
  for (const local of ARTICLES) {
    articleMap.set(local.id, local);
  }
  for (const remote of articles) {
    const existing = articleMap.get(remote.id) || {};
    articleMap.set(remote.id, { ...existing, ...remote });
  }

  console.log(`Prerendering ${articleMap.size} articles and static pages for direct crawler indexation...`);

  // 1. Prerender each article: /article/{id}/index.html
  for (const [id, art] of articleMap.entries()) {
    const canonicalUrl = `${BASE_URL}/article/${encodeURIComponent(id)}`;
    const pageTitle = `${art.title} | NET NEWS | نت نيوز`;
    const description = art.deck || (Array.isArray(art.content) ? art.content[0] : '') || 'بوابة إخبارية عربية رصينة';
    const contentHtml = (Array.isArray(art.content) ? art.content : [])
      .map((p: string) => `<p class="mb-4 text-base sm:text-lg leading-relaxed text-slate-800">${escapeHtml(p)}</p>`)
      .join('\n');

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
      },
      "headline": art.title,
      "description": description,
      "articleSection": art.categoryName || "أخبار",
      "datePublished": art.createdAt || "2026-10-09T13:51:00Z",
      "dateModified": art.updatedAt || art.createdAt || "2026-10-09T13:51:00Z",
      "author": {
        "@type": "Organization",
        "name": art.source || "NET NEWS"
      },
      "publisher": {
        "@type": "NewsMediaOrganization",
        "name": "NET NEWS",
        "url": BASE_URL,
        "logo": {
          "@type": "ImageObject",
          "url": `${BASE_URL}/favicon.ico`
        }
      }
    };

    let prerendered = baseHtml;

    // Replace title
    prerendered = prerendered.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    // Replace or insert canonical link
    if (prerendered.includes('rel="canonical"')) {
      prerendered = prerendered.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
    } else {
      prerendered = prerendered.replace('</head>', `    <link rel="canonical" href="${canonicalUrl}" />\n  </head>`);
    }

    // Replace meta description & OpenGraph
    prerendered = prerendered.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
    prerendered = prerendered.replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
    prerendered = prerendered.replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
    prerendered = prerendered.replace(/<meta property="og:type"[^>]*>/i, `<meta property="og:type" content="article" />\n    <meta property="og:url" content="${canonicalUrl}" />`);

    // Inject JSON-LD Schema
    const jsonLdScript = `    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n`;
    prerendered = prerendered.replace('</head>', `${jsonLdScript}  </head>`);

    // Pre-populate readable server-side HTML inside <div id="root">
    const ssrContent = `
    <div id="root">
      <main class="max-w-4xl mx-auto px-4 py-8" dir="rtl">
        <nav class="text-xs text-sky-800 mb-4 flex items-center gap-2">
          <a href="/" class="hover:underline">الرئيسية</a>
          <span>&gt;</span>
          <span>${escapeHtml(art.categoryName || 'أخبار')}</span>
        </nav>
        <article class="bg-white p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm">
          <div class="mb-4 text-xs sm:text-sm text-slate-500 flex flex-wrap items-center gap-3">
            <span class="font-bold text-sky-800">${escapeHtml(art.categoryName || 'أخبار')}</span>
            <span>·</span>
            <span>${escapeHtml(art.publishedAt || '')}</span>
            <span>·</span>
            <span>${escapeHtml(art.source || 'نت نيوز')}</span>
          </div>
          <h1 class="text-2xl sm:text-4xl font-black text-slate-900 leading-tight mb-4">
            ${escapeHtml(art.title)}
          </h1>
          ${art.deck ? `<p class="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed mb-6 border-r-4 border-sky-600 pr-4">${escapeHtml(art.deck)}</p>` : ''}
          <div class="prose max-w-none text-slate-800 border-t border-slate-100 pt-6">
            ${contentHtml}
          </div>
        </article>
      </main>
    </div>`;

    prerendered = prerendered.replace(/<div id="root"><\/div>/, ssrContent);

    // Write file to dist/article/${id}/index.html
    const targetDir = path.join(distDir, 'article', id);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'index.html'), prerendered, 'utf-8');
  }

  // 2. Prerender static pages: /page/{slug}/index.html
  for (const [slug, p] of Object.entries(STATIC_PAGES_DATA)) {
    const canonicalUrl = `${BASE_URL}/page/${slug}`;
    const pageTitle = `${p.title} | NET NEWS | نت نيوز`;
    const description = p.subtitle || p.excerpt || 'بوابة إخبارية عربية رصينة';

    let prerendered = baseHtml;
    prerendered = prerendered.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    if (prerendered.includes('rel="canonical"')) {
      prerendered = prerendered.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
    } else {
      prerendered = prerendered.replace('</head>', `    <link rel="canonical" href="${canonicalUrl}" />\n  </head>`);
    }

    prerendered = prerendered.replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
    prerendered = prerendered.replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
    prerendered = prerendered.replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);

    const sectionsHtml = (p.sections || [])
      .map(s => `
        <section class="mb-6">
          <h2 class="text-xl font-bold text-slate-900 mb-2">${escapeHtml(s.heading)}</h2>
          ${(s.paragraphs || []).map(para => `<p class="mb-3 text-slate-700 leading-relaxed">${escapeHtml(para)}</p>`).join('\n')}
          ${s.bulletPoints && s.bulletPoints.length > 0 ? `
            <ul class="list-disc list-inside space-y-1 text-slate-700 pr-2">
              ${s.bulletPoints.map(bp => `<li>${escapeHtml(bp)}</li>`).join('\n')}
            </ul>
          ` : ''}
        </section>
      `).join('\n');

    const ssrContent = `
    <div id="root">
      <main class="max-w-4xl mx-auto px-4 py-8" dir="rtl">
        <article class="bg-white p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm">
          <h1 class="text-3xl font-black text-slate-900 mb-2">${escapeHtml(p.title)}</h1>
          <p class="text-slate-600 mb-6 font-medium">${escapeHtml(p.subtitle)}</p>
          <div class="border-t border-slate-100 pt-6">
            ${sectionsHtml}
          </div>
        </article>
      </main>
    </div>`;

    prerendered = prerendered.replace(/<div id="root"><\/div>/, ssrContent);

    const targetDir = path.join(distDir, 'page', slug);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'index.html'), prerendered, 'utf-8');
  }

  // Also update homepage index.html with canonical URL
  const homeCanonical = `${BASE_URL}/`;
  let homeHtml = baseHtml;
  if (!homeHtml.includes('rel="canonical"')) {
    homeHtml = homeHtml.replace('</head>', `    <link rel="canonical" href="${homeCanonical}" />\n  </head>`);
    fs.writeFileSync(indexHtmlPath, homeHtml, 'utf-8');
  }

  console.log(`Prerendering completed successfully! Generated static HTML files for direct indexing.`);
}
