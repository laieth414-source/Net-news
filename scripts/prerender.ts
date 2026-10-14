import fs from 'node:fs';
import path from 'node:path';
import { ARTICLES, CATEGORIES } from '../src/data/newsData';
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
  author?: any;
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
            author: fields.author?.stringValue || fields.author?.mapValue?.fields?.name?.stringValue,
            readTime: fields.readTime?.stringValue,
            viewsCount: fields.viewsCount?.stringValue,
            imageCaption: fields.imageCaption?.stringValue,
            imageUrl: fields.imageUrl?.stringValue,
            createdAt: fields.createdAt?.timestampValue || doc.createTime,
            updatedAt: fields.updatedAt?.timestampValue || doc.updateTime || doc.createTime,
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
        author: local.author,
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

    const authorName = (typeof art.author === 'object' ? art.author?.name : art.author) || art.source || 'نت نيوز';
    const publishedIso = art.createdAt || '2026-10-09T13:51:00Z';
    const modifiedIso = art.updatedAt || art.createdAt || publishedIso;

    const jsonLd: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
      },
      "headline": art.title,
      "description": description,
      "articleSection": art.categoryName || "أخبار",
      "inLanguage": "ar",
      "datePublished": publishedIso,
      "dateModified": modifiedIso,
      "author": {
        "@type": "Person",
        "name": authorName
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

    if (art.imageUrl) {
      jsonLd.image = [art.imageUrl];
    }

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
    prerendered = prerendered.replace(/<meta property="og:type"[^>]*>/i, `<meta property="og:type" content="article" />\n    <meta property="og:url" content="${canonicalUrl}" />\n    <meta property="article:published_time" content="${publishedIso}" />\n    <meta property="article:modified_time" content="${modifiedIso}" />\n    <meta property="article:section" content="${escapeHtml(art.categoryName || 'أخبار')}" />`);

    if (art.imageUrl) {
      if (prerendered.includes('property="og:image"')) {
        prerendered = prerendered.replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapeHtml(art.imageUrl)}" />`);
      } else {
        prerendered = prerendered.replace('</head>', `    <meta property="og:image" content="${escapeHtml(art.imageUrl)}" />\n  </head>`);
      }
      if (prerendered.includes('name="twitter:image"')) {
        prerendered = prerendered.replace(/<meta name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${escapeHtml(art.imageUrl)}" />`);
      } else {
        prerendered = prerendered.replace('</head>', `    <meta name="twitter:image" content="${escapeHtml(art.imageUrl)}" />\n  </head>`);
      }
    }

    // Replace or insert Twitter cards
    if (prerendered.includes('name="twitter:title"')) {
      prerendered = prerendered.replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`);
    } else {
      prerendered = prerendered.replace('</head>', `    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />\n  </head>`);
    }
    if (prerendered.includes('name="twitter:description"')) {
      prerendered = prerendered.replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
    } else {
      prerendered = prerendered.replace('</head>', `    <meta name="twitter:description" content="${escapeHtml(description)}" />\n  </head>`);
    }

    // Inject JSON-LD Schema
    const jsonLdScript = `    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n`;
    prerendered = prerendered.replace('</head>', `${jsonLdScript}  </head>`);

    // Compute 3-5 related articles (same category first, excluding current)
    const allArticlesList = Array.from(articleMap.values());
    const relatedList = allArticlesList
      .filter((other) => other.id !== id && (other.categoryId === art.categoryId || other.categoryName === art.categoryName))
      .concat(allArticlesList.filter((other) => other.id !== id && other.categoryId !== art.categoryId && other.categoryName !== art.categoryName))
      .slice(0, 4);

    const relatedHtml = relatedList.length > 0 ? `
        <aside class="mt-8 pt-8 border-t border-slate-200">
          <h2 class="text-lg font-bold text-slate-900 mb-4">قد يهمك أيضاً في هذا السياق</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${relatedList.map((rel) => `
              <div class="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <span class="text-xs font-semibold text-sky-800 block mb-1">${escapeHtml(rel.categoryName || 'أخبار')}</span>
                <h3 class="text-sm font-bold text-slate-900 line-clamp-2">
                  <a href="/article/${encodeURIComponent(rel.id)}" class="hover:text-sky-900 hover:underline">${escapeHtml(rel.title)}</a>
                </h3>
                <span class="text-xs text-slate-400 mt-2 block">${escapeHtml(rel.publishedAt || '')}</span>
              </div>
            `).join('\n')}
          </div>
        </aside>
    ` : '';

    // Pre-populate readable server-side HTML inside <div id="root">
    const ssrContent = `
    <div id="root">
      <main class="max-w-4xl mx-auto px-4 py-8" dir="rtl">
        <nav class="text-xs text-sky-800 mb-4 flex items-center gap-2">
          <a href="/" class="hover:underline">الرئيسية</a>
          <span>&gt;</span>
          <a href="/#${encodeURIComponent(art.categoryId || 'news')}" class="hover:underline">${escapeHtml(art.categoryName || 'أخبار')}</a>
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
          ${relatedHtml}
        </article>
      </main>
    </div>`;

    prerendered = prerendered.replace(/<div id="root"><\/div>/, ssrContent);

    // Write file to dist/article/${id}/index.html and dist/article/${id}.html
    const articlesDir = path.join(distDir, 'article');
    if (!fs.existsSync(articlesDir)) {
      fs.mkdirSync(articlesDir, { recursive: true });
    }
    const targetDir = path.join(articlesDir, id);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'index.html'), prerendered, 'utf-8');
    fs.writeFileSync(path.join(articlesDir, `${id}.html`), prerendered, 'utf-8');
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

    // Write both dist/page/${slug}/index.html and dist/page/${slug}.html
    // This allows web servers to serve /page/${slug} directly without trailing slash 301 redirects
    const pagesDir = path.join(distDir, 'page');
    if (!fs.existsSync(pagesDir)) {
      fs.mkdirSync(pagesDir, { recursive: true });
    }
    const targetDir = path.join(pagesDir, slug);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'index.html'), prerendered, 'utf-8');
    fs.writeFileSync(path.join(pagesDir, `${slug}.html`), prerendered, 'utf-8');
  }

  // Also update homepage index.html with canonical URL and initial crawlable HTML links (top 20 articles + categories)
  const homeCanonical = `${BASE_URL}/`;
  let homeHtml = baseHtml;
  if (!homeHtml.includes('rel="canonical"')) {
    homeHtml = homeHtml.replace('</head>', `    <link rel="canonical" href="${homeCanonical}" />\n  </head>`);
  }

  // Pre-populate readable initial HTML inside <div id="root"> for the homepage
  // Contains crawlable links for search engine crawlers before JS runs
  const latestArticlesForHome = Array.from(articleMap.values()).slice(0, 20);

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
      <main class="max-w-7xl mx-auto px-4 py-8" dir="rtl">
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 mb-6">أحدث الأخبار والتقارير المنشورة</h1>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${latestArticlesForHome.map((art) => `
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
          ${Object.values(STATIC_PAGES_DATA).map((p) => `<a href="/page/${p.slug}" class="hover:underline">${escapeHtml(p.title)}</a>`).join(' · ')}
        </footer>
      </main>
    </div>`;

  homeHtml = homeHtml.replace(/<div id="root"><\/div>/, homeSsrContent);
  fs.writeFileSync(indexHtmlPath, homeHtml, 'utf-8');

  console.log(`Prerendering completed successfully! Generated static HTML files for direct indexing.`);
}
