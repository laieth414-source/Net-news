/**
 * Utility to keep document SEO meta tags, canonical link, and JSON-LD schema in sync with active view.
 */

const BASE_URL = 'https://netnews1-new.netlify.app';

export function updateDocumentSeo(options: {
  title: string;
  description: string;
  canonicalPath: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  authorName?: string;
}) {
  if (typeof document === 'undefined') return;

  const {
    title,
    description,
    canonicalPath,
    type = 'website',
    publishedTime,
    modifiedTime,
    section,
    authorName = 'نت نيوز'
  } = options;

  // 1. Title
  document.title = title;

  // 2. Helper to set meta name or property
  const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:url', `${BASE_URL}${canonicalPath}`);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);

  // 3. Canonical link
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', `${BASE_URL}${canonicalPath}`);

  // 4. JSON-LD schema
  let scriptEl = document.getElementById('dynamic-jsonld') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'dynamic-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }

  const fullUrl = `${BASE_URL}${canonicalPath}`;

  if (type === 'article') {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': fullUrl
      },
      'headline': title,
      'description': description,
      'articleSection': section || 'أخبار',
      'datePublished': publishedTime || '2026-10-09T13:51:00Z',
      'dateModified': modifiedTime || publishedTime || '2026-10-09T13:51:00Z',
      'author': {
        '@type': 'Organization',
        'name': authorName
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
    scriptEl.textContent = JSON.stringify(jsonLd);
  } else {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'NET NEWS | نت نيوز',
      'url': BASE_URL,
      'description': description,
      'potentialAction': {
        '@type': 'SearchAction',
        'target': `${BASE_URL}/#search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };
    scriptEl.textContent = JSON.stringify(jsonLd);
  }
}
