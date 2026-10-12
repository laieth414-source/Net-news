/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { BreakingBar } from './components/BreakingBar';
import { MarketBar } from './components/MarketBar';
import { Navigation } from './components/Navigation';
import { HeroSection } from './components/HeroSection';
import { CategorySection } from './components/CategorySection';
import { MostReadSection } from './components/MostReadSection';
import { OpinionSection } from './components/OpinionSection';
import { ArticleModal } from './components/ArticleModal';
import { MobileDrawer } from './components/MobileDrawer';
import { SearchModal } from './components/SearchModal';
import { Footer } from './components/Footer';
import { StaticPageModal } from './components/StaticPageModal';
import { STATIC_PAGES_DATA, StaticPageDetail } from './data/staticPagesData';

import {
  ARTICLES,
  BREAKING_NEWS,
  CATEGORIES,
  MARKET_DATA,
  MOST_READ_ARTICLES,
} from './data/newsData';
import { Article, BreakingNewsItem, CategoryId } from './types/news';
import { AdminArticle, AdminBreakingNews, AdminCategory } from './types/admin';
import {
  subscribeToArticles,
  subscribeToBreakingNews,
  subscribeToCategories,
  subscribeToStaticPages,
  testConnection,
  listenToAuthState,
} from './lib/firebase';
import { User } from 'firebase/auth';
import { AdminModal } from './components/AdminModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginView } from './components/admin/AdminLoginView';
import { trackPageView, startVisitorHeartbeat } from './lib/analytics';
import { updateDocumentSeo } from './lib/seo';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<'site' | 'admin'>(() => {
    return typeof window !== 'undefined' && window.location.hash === '#admin' ? 'admin' : 'site';
  });

  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/article/')) {
        return decodeURIComponent(path.replace(/^\/article\//, '').replace(/\/$/, ''));
      }
    }
    return null;
  });

  const [selectedPageSlug, setSelectedPageSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/page/')) {
        return decodeURIComponent(path.replace(/^\/page\//, '').replace(/\/$/, ''));
      }
      const direct = path.replace(/^\//, '').replace(/\/$/, '');
      if (['about-us', 'about', 'editorial-code', 'corrections-policy', 'terms-of-use', 'privacy-policy', 'contact-us'].includes(direct)) {
        return direct === 'about' ? 'about-us' : direct;
      }
    }
    return null;
  });

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Dynamic news items from Firebase Firestore (with fallback)
  const [articles, setArticles] = useState<Article[]>(ARTICLES);
  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>(BREAKING_NEWS);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [staticPages, setStaticPages] = useState<Record<string, StaticPageDetail>>(STATIC_PAGES_DATA);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean | null>(null);
  const [liveFirestoreCount, setLiveFirestoreCount] = useState<number>(0);

  // Select article with URL sync
  const handleSelectArticle = (id: string | null) => {
    setSelectedArticleId(id);
    if (id) {
      setSelectedPageSlug(null);
    }
    if (typeof window !== 'undefined') {
      if (id) {
        window.history.pushState({ articleId: id }, '', `/article/${encodeURIComponent(id)}`);
      } else {
        if (window.location.pathname.startsWith('/article/')) {
          window.history.pushState(null, '', '/');
        }
      }
    }
  };

  // Open static legal/editorial page with URL sync
  const handleOpenPage = (slug: string | null) => {
    const resolvedSlug = slug === 'about' ? 'about-us' : slug;
    setSelectedPageSlug(resolvedSlug);
    if (resolvedSlug) {
      setSelectedArticleId(null);
    }
    if (typeof window !== 'undefined') {
      if (resolvedSlug) {
        window.history.pushState({ pageSlug: resolvedSlug }, '', `/page/${encodeURIComponent(resolvedSlug)}`);
      } else {
        if (
          window.location.pathname.startsWith('/page/') ||
          ['about-us', 'about', 'editorial-code', 'corrections-policy', 'terms-of-use', 'privacy-policy', 'contact-us'].includes(
            window.location.pathname.replace(/^\//, '').replace(/\/$/, '')
          )
        ) {
          window.history.pushState(null, '', '/');
        }
      }
    }
  };

  // URL hash and history popstate sync
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setViewMode('admin');
      } else if (viewMode === 'admin' && window.location.hash !== '#admin') {
        setViewMode('site');
      }
    };

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/article/')) {
        setSelectedArticleId(decodeURIComponent(path.replace(/^\/article\//, '').replace(/\/$/, '')));
        setSelectedPageSlug(null);
      } else if (path.startsWith('/page/')) {
        setSelectedPageSlug(decodeURIComponent(path.replace(/^\/page\//, '').replace(/\/$/, '')));
        setSelectedArticleId(null);
      } else {
        const direct = path.replace(/^\//, '').replace(/\/$/, '');
        if (direct && (staticPages[direct] || direct in staticPages || ['about-us', 'about', 'editorial-code', 'corrections-policy', 'terms-of-use', 'privacy-policy', 'contact-us'].includes(direct))) {
          setSelectedPageSlug(direct === 'about' ? 'about-us' : direct);
          setSelectedArticleId(null);
        } else {
          setSelectedArticleId(null);
          setSelectedPageSlug(null);
        }
      }
    };

    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [viewMode]);

  const switchToAdmin = () => {
    window.location.hash = 'admin';
    setViewMode('admin');
  };

  const switchToSite = () => {
    window.location.hash = '';
    setViewMode('site');
  };

  // Initialize and listen to Firebase Firestore & Auth
  useEffect(() => {
    // 1. Test connection
    testConnection().then((connected) => {
      setIsFirebaseConnected(connected);
    });

    // 2. Track auth state
    const unsubAuth = listenToAuthState((user, adminStatus) => {
      setCurrentUser(user);
      setIsAdmin(adminStatus);
    });

    // 3. Real-time subscription to articles (read-only for visitors)
    const unsubArticles = subscribeToArticles(
      (updatedArticles) => {
        if (updatedArticles && updatedArticles.length > 0) {
          setArticles(updatedArticles);
        }
      },
      undefined,
      (count) => {
        setLiveFirestoreCount(count);
      }
    );

    // 4. Real-time subscription to breaking news (read-only for visitors)
    const unsubBreaking = subscribeToBreakingNews((updatedBreaking) => {
      if (updatedBreaking && updatedBreaking.length > 0) {
        setBreakingNews(updatedBreaking);
      }
    });

    // 5. Real-time subscription to categories
    const unsubCategories = subscribeToCategories((cats) => {
      setCategories(cats);
    });

    // 6. Real-time subscription to static pages
    const unsubStaticPages = subscribeToStaticPages((loaded) => {
      if (loaded && Object.keys(loaded).length > 0) {
        setStaticPages(loaded);
      }
    });

    return () => {
      unsubAuth();
      unsubArticles();
      unsubBreaking();
      unsubCategories();
      unsubStaticPages();
    };
  }, []);

  // Selected article for reader modal
  const selectedArticle = useMemo(() => {
    if (!selectedArticleId) return null;
    return articles.find((a) => a.id === selectedArticleId) || null;
  }, [selectedArticleId, articles]);

  // Real-time visitor analytics tracking & dynamic SEO meta updates
  useEffect(() => {
    if (viewMode === 'site') {
      if (selectedPageSlug) {
        const page = staticPages[selectedPageSlug] || STATIC_PAGES_DATA[selectedPageSlug];
        const pageTitle = page?.title ? `${page.title} | NET NEWS` : 'صفحة | NET NEWS';
        const pageDesc = page?.subtitle || page?.excerpt || 'بوابة إخبارية عربية رصينة';
        updateDocumentSeo({
          title: pageTitle,
          description: pageDesc,
          canonicalPath: `/page/${selectedPageSlug}`,
          type: 'website'
        });
        trackPageView(`/page/${selectedPageSlug}`, `${page?.title || 'صفحة'} - NET NEWS`);
      } else if (selectedArticleId && selectedArticle) {
        const articleTitle = `${selectedArticle.title} | NET NEWS`;
        const articleDesc = selectedArticle.deck || (Array.isArray(selectedArticle.content) ? selectedArticle.content[0] : '') || 'بوابة إخبارية عربية رصينة';
        updateDocumentSeo({
          title: articleTitle,
          description: articleDesc,
          canonicalPath: `/article/${selectedArticleId}`,
          type: 'article',
          section: selectedArticle.categoryName,
          authorName: selectedArticle.source || 'نت نيوز'
        });
        trackPageView(`/article/${selectedArticleId}`, selectedArticle.title);
      } else if (activeCategory && activeCategory !== 'all') {
        const catObj = categories.find((c) => c.id === activeCategory);
        const catName = catObj?.name || activeCategory;
        const catTitle = `${catName} | NET NEWS`;
        const catDesc = catObj?.description || `أحدث أخبار وتغطيات قسم ${catName} على مدار الساعة.`;
        updateDocumentSeo({
          title: catTitle,
          description: catDesc,
          canonicalPath: `/category/${activeCategory}`,
          type: 'website'
        });
        trackPageView(`/category/${activeCategory}`, `قسم: ${catName}`);
      } else {
        updateDocumentSeo({
          title: 'NET NEWS | نت نيوز',
          description: 'بوابة إخبارية عربية رصينة تقدم تغطية متكاملة للأحداث العالمية والعربية والخليجية والملفات الاقتصادية والرياضية والتقنية بموضوعية واحترافية.',
          canonicalPath: '/',
          type: 'website'
        });
        trackPageView('/', 'الرئيسية - NET NEWS');
      }
    }
  }, [viewMode, selectedPageSlug, selectedArticleId, selectedArticle, activeCategory, categories]);

  // Real-time active presence heartbeat
  useEffect(() => {
    const cleanupHeartbeat = startVisitorHeartbeat(() => {
      if (selectedPageSlug) return `/page/${selectedPageSlug}`;
      if (selectedArticleId) return `/article/${selectedArticleId}`;
      if (activeCategory !== 'all') return `/category/${activeCategory}`;
      return '/';
    });
    return cleanupHeartbeat;
  }, [selectedPageSlug, selectedArticleId, activeCategory]);

  // Public published articles (excludes 'pending' and 'draft' from public visitors)
  const publishedArticles = useMemo(() => {
    return articles.filter((a) => !a.status || a.status === 'published');
  }, [articles]);

  // Related articles for current article modal
  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];
    return publishedArticles.filter(
      (a) => a.id !== selectedArticle.id && a.categoryId === selectedArticle.categoryId
    );
  }, [selectedArticle, publishedArticles]);

  // Lead and secondary articles
  const leadArticle = useMemo(() => {
    return publishedArticles.find((a) => a.isLead) || publishedArticles[0] || ARTICLES[0];
  }, [publishedArticles]);

  const secondaryArticles = useMemo(() => {
    const list = publishedArticles.filter((a) => a.isSecondary);
    if (list.length > 0) return list;
    if (publishedArticles.length > 1) return publishedArticles.slice(1, 3);
    return ARTICLES.slice(1, 3);
  }, [publishedArticles]);

  // Category specific articles
  const worldArticles = useMemo(
    () => publishedArticles.filter((a) => a.categoryId === 'world'),
    [publishedArticles]
  );
  const arabArticles = useMemo(
    () => publishedArticles.filter((a) => a.categoryId === 'arab'),
    [publishedArticles]
  );
  const gulfArticles = useMemo(
    () => publishedArticles.filter((a) => a.categoryId === 'gulf'),
    [publishedArticles]
  );
  const economyArticles = useMemo(
    () => publishedArticles.filter((a) => a.categoryId === 'economy'),
    [publishedArticles]
  );
  const sportsArticles = useMemo(
    () => publishedArticles.filter((a) => a.categoryId === 'sports'),
    [publishedArticles]
  );
  const techArticles = useMemo(
    () => publishedArticles.filter((a) => a.categoryId === 'tech'),
    [publishedArticles]
  );
  const varietyArticles = useMemo(
    () => publishedArticles.filter((a) => a.categoryId === 'variety'),
    [publishedArticles]
  );
  const opinionArticles = useMemo(
    () => publishedArticles.filter((a) => a.categoryId === 'opinions'),
    [publishedArticles]
  );

  const mostReadArticles = useMemo(() => {
    const ranked = publishedArticles.filter((a) => a.isMostRead);
    return ranked.length >= 3 ? ranked : MOST_READ_ARTICLES;
  }, [publishedArticles]);

  const handleSelectCategory = (catId: string) => {
    setActiveCategory(catId as CategoryId);
    if (catId !== 'all') {
      const el = document.getElementById(catId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (viewMode === 'admin') {
    // If not signed in as a verified admin, render the dedicated Arabic Email/Password Admin Login
    if (!currentUser || !isAdmin) {
      return (
        <AdminLoginView
          onBackToSite={switchToSite}
          onLoginSuccess={() => {
            // Once logged in, auth listener updates isAdmin and re-renders AdminDashboard automatically
          }}
        />
      );
    }

    return (
      <AdminDashboard
        currentUser={currentUser}
        isAdmin={isAdmin}
        articles={articles.map((a) => ({
          ...a,
          status: (a as any).status || 'published',
        }))}
        breakingNews={breakingNews.map((b) => ({
          ...b,
          isActive: (b as any).isActive !== false,
        }))}
        categories={categories}
        firestoreArticleCount={liveFirestoreCount}
        onBackToSite={switchToSite}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Admin Status Ribbon if signed in as verified administrator */}
      {isAdmin && (
        <div className="bg-sky-950 text-white text-xs py-1.5 px-4 border-b border-sky-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-sky-400" />
            <span>
              مسجل بصلاحية إدارة NET NEWS: <strong>{currentUser?.email}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={switchToAdmin}
              className="bg-sky-600 hover:bg-sky-500 px-3 py-1 rounded text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck size={13} />
              <span>لوحة التحكم الإدارية</span>
            </button>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="bg-sky-800 hover:bg-sky-700 px-2.5 py-1 rounded text-white text-[11px] font-medium transition-colors cursor-pointer"
            >
              مزامنة سريعة
            </button>
          </div>
        </div>
      )}

      {/* 1. Breaking News Bar */}
      <BreakingBar
        items={breakingNews}
        onSelectArticle={handleSelectArticle}
      />

      {/* 2. Top Header */}
      <Header
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onSelectCategory={handleSelectCategory}
      />

      {/* 3. Horizontal Navigation */}
      <Navigation
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* 4. Financial Market Bar */}
      <MarketBar indices={MARKET_DATA} />

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* If user selected a specific category filter, show filtered banner */}
        {activeCategory !== 'all' && (
          <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sky-900 text-lg">
                تصفح قسم: {CATEGORIES.find((c) => c.id === activeCategory)?.name}
              </span>
              <span className="text-xs text-sky-700 hidden sm:inline">
                {CATEGORIES.find((c) => c.id === activeCategory)?.description}
              </span>
            </div>
            <button
              onClick={() => setActiveCategory('all')}
              className="text-xs font-semibold bg-white text-sky-900 px-3 py-1.5 rounded border border-sky-300 hover:bg-sky-100 transition-colors"
            >
              العودة لكافة الأقسام
            </button>
          </div>
        )}

        {/* 5. Hero & Main Area (الخبر الرئيسي الكبير + الأخبار الثانوية + آخر الأخبار) */}
        {(activeCategory === 'all' || activeCategory === 'gulf') && leadArticle && (
          <HeroSection
            leadArticle={leadArticle}
            secondaryArticles={secondaryArticles}
            onSelectArticle={handleSelectArticle}
          />
        )}

        {/* 6. Dedicated Section: العالم (World) */}
        {(activeCategory === 'all' || activeCategory === 'world') && (
          <CategorySection
            category={CATEGORIES.find((c) => c.id === 'world')!}
            articles={worldArticles}
            onSelectArticle={handleSelectArticle}
            layout="featured-with-list"
          />
        )}

        {/* 7. Dedicated Section: أخبار عربية (Arab World) */}
        {(activeCategory === 'all' || activeCategory === 'arab') && (
          <CategorySection
            category={CATEGORIES.find((c) => c.id === 'arab')!}
            articles={arabArticles}
            onSelectArticle={handleSelectArticle}
            layout="grid"
          />
        )}

        {/* 8. Most Read Section (الأكثر قراءة) */}
        {activeCategory === 'all' && (
          <div id="most-read">
            <MostReadSection
              articles={mostReadArticles}
              onSelectArticle={handleSelectArticle}
            />
          </div>
        )}

        {/* 9. Dedicated Section: الخليج (Gulf) */}
        {(activeCategory === 'all' || activeCategory === 'gulf') && (
          <CategorySection
            category={CATEGORIES.find((c) => c.id === 'gulf')!}
            articles={gulfArticles}
            onSelectArticle={handleSelectArticle}
            layout="featured-with-list"
          />
        )}

        {/* 10. Dedicated Section: اقتصاد (Economy) */}
        {(activeCategory === 'all' || activeCategory === 'economy') && (
          <CategorySection
            category={CATEGORIES.find((c) => c.id === 'economy')!}
            articles={economyArticles}
            onSelectArticle={handleSelectArticle}
            layout="grid"
          />
        )}

        {/* 11. Dedicated Section: رياضة (Sports) */}
        {(activeCategory === 'all' || activeCategory === 'sports') && (
          <CategorySection
            category={CATEGORIES.find((c) => c.id === 'sports')!}
            articles={sportsArticles}
            onSelectArticle={handleSelectArticle}
            layout="featured-with-list"
          />
        )}

        {/* 12. Dedicated Section: تكنولوجيا (Technology) */}
        {(activeCategory === 'all' || activeCategory === 'tech') && (
          <CategorySection
            category={CATEGORIES.find((c) => c.id === 'tech')!}
            articles={techArticles}
            onSelectArticle={handleSelectArticle}
            layout="grid"
          />
        )}

        {/* 13. Dedicated Section: منوعات (Lifestyle & Culture) */}
        {(activeCategory === 'all' || activeCategory === 'variety') && (
          <CategorySection
            category={CATEGORIES.find((c) => c.id === 'variety')!}
            articles={varietyArticles}
            onSelectArticle={handleSelectArticle}
            layout="featured-with-list"
          />
        )}

        {/* 14. Opinions and Analysis (آراء وتحليلات) */}
        {(activeCategory === 'all' || activeCategory === 'opinions') && (
          <div id="opinions">
            <OpinionSection
              articles={opinionArticles}
              onSelectArticle={handleSelectArticle}
            />
          </div>
        )}
      </main>

      {/* 15. Professional Journalistic Footer */}
      <Footer
        onSelectCategory={handleSelectCategory}
        onOpenAdmin={switchToAdmin}
        onOpenPage={handleOpenPage}
        staticPages={staticPages}
      />

      {/* Interactive Modals */}
      {/* Editorial & Legal Static Page Modal */}
      <StaticPageModal
        pageSlug={selectedPageSlug}
        onClose={() => handleOpenPage(null)}
        onSelectPage={handleOpenPage}
        staticPages={staticPages}
      />

      {/* Admin Portal Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={currentUser}
        isAdmin={isAdmin}
        firestoreArticleCount={liveFirestoreCount}
      />

      {/* Article Reader Modal */}
      <ArticleModal
        article={selectedArticle}
        onClose={() => handleSelectArticle(null)}
        onSelectArticle={handleSelectArticle}
        relatedArticles={relatedArticles}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        articles={articles}
        onSelectArticle={handleSelectArticle}
      />

      {/* Mobile Drawer Menu */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        onOpenAdmin={switchToAdmin}
        onOpenPage={handleOpenPage}
        staticPages={staticPages}
      />
    </div>
  );
}
