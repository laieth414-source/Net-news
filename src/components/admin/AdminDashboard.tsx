import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  AdminArticle,
  AdminBreakingNews,
  AdminCategory,
  NewsletterSubscriber,
  SiteSettings,
  SeoSettings,
  AuditLog,
  AdminTab
} from '../../types/admin';
import {
  ADMIN_EMAIL,
  loginWithGoogle,
  logoutUser,
  saveArticleToFirestore,
  deleteArticleFromFirestore,
  saveBreakingNewsToFirestore,
  deleteBreakingNewsFromFirestore,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  deleteNewsletterSubscriber,
  saveSiteSettingsToFirestore,
  subscribeToNewsletterSubscribers,
  subscribeToSiteSettings,
  subscribeToAuditLogs,
  subscribeToStaticPages,
  saveStaticPageToFirestore,
  deleteStaticPageFromFirestore,
  seedInitialStaticPages,
  DEFAULT_SITE_SETTINGS
} from '../../lib/firebase';
import { STATIC_PAGES_DATA, StaticPageDetail } from '../../data/staticPagesData';
import { AdminOverviewView } from './AdminOverviewView';
import { AdminAnalyticsView } from './AdminAnalyticsView';
import { AdminArticlesView } from './AdminArticlesView';
import { AdminBreakingView } from './AdminBreakingView';
import { AdminCategoriesView } from './AdminCategoriesView';
import { AdminPagesView } from './AdminPagesView';
import { AdminSubscribersView } from './AdminSubscribersView';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminSeoView } from './AdminSeoView';
import { AdminAuditView } from './AdminAuditView';
import { AdminStatusView } from './AdminStatusView';
import { SyncStatusIndicator } from './SyncStatusIndicator';

import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  Flame,
  FolderTree,
  Users,
  Settings,
  Search,
  Activity,
  Server,
  Globe,
  BarChart3,
  LogOut,
  LogIn,
  Menu,
  X,
  ShieldCheck,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User | null;
  isAdmin: boolean;
  articles: AdminArticle[];
  breakingNews: AdminBreakingNews[];
  categories: AdminCategory[];
  firestoreArticleCount: number;
  onBackToSite: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  isAdmin,
  articles,
  breakingNews,
  categories,
  firestoreArticleCount,
  onBackToSite,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Trigger quick create from overview
  const [isArticleCreateTriggered, setIsArticleCreateTriggered] = useState(false);
  const [isBreakingCreateTriggered, setIsBreakingCreateTriggered] = useState(false);

  // Firestore live collections for Admin
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [staticPages, setStaticPages] = useState<Record<string, StaticPageDetail>>(STATIC_PAGES_DATA);

  // Toast Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Auth in-progress state
  const [authLoading, setAuthLoading] = useState(false);

  // Real-time subscriptions for admin sections
  useEffect(() => {
    // 1. Subscribers
    const unsubSubs = subscribeToNewsletterSubscribers(
      (list) => setSubscribers(list),
      (err) => console.warn('Subscribers listen notice:', err)
    );

    // 2. Site settings
    const unsubSettings = subscribeToSiteSettings((settings) => {
      setSiteSettings(settings);
    });

    // 3. Audit logs
    const unsubAudit = subscribeToAuditLogs((logs) => {
      setAuditLogs(logs);
    });

    // 4. Static Pages
    const unsubPages = subscribeToStaticPages((pages) => {
      setStaticPages(pages);
    });

    return () => {
      unsubSubs();
      unsubSettings();
      unsubAudit();
      unsubPages();
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Auth handlers
  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user.email === ADMIN_EMAIL) {
        showToast(`مرحباً بك يا مدير الموقع (${user.email}). تم تسجيل الدخول بنجاح!`, 'success');
      } else {
        showToast(`تم تسجيل الدخول كـ (${user.email}). الإدارة مقتصرة على ${ADMIN_EMAIL}.`, 'info');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`فشل تسجيل الدخول: ${msg}`, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await logoutUser();
      showToast('تم تسجيل الخروج بنجاح.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`تعذر تسجيل الخروج: ${msg}`, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  // Article handlers
  const handleSaveArticle = async (article: Partial<AdminArticle>, isNew: boolean) => {
    try {
      const res = await saveArticleToFirestore(article, isNew);
      if (res.success) {
        if (res.status === 'pending') {
          showToast(
            'تم حفظ المقال بنجاح في قاعدة البيانات بحالة «معلّق» وينتظر موافقة الإدارة قبل عرضه للجمهور.',
            'info'
          );
        } else if (res.status === 'draft') {
          showToast('تم حفظ المقال كمسودة في قاعدة البيانات السحابية بنجاح.', 'info');
        } else {
          showToast(
            isNew
              ? 'تم نشر المقال وحفظه في قاعدة البيانات السحابية بنجاح، وهو معروض الآن بالموقع العام ✓'
              : 'تم تحديث المقال وحفظ التعديلات في قاعدة البيانات السحابية بنجاح ✓',
            'success'
          );
        }
      } else {
        const errMsg = res.error || 'تعذر حفظ المقال في قاعدة البيانات';
        showToast(errMsg, 'error');
        throw new Error(errMsg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleDeleteArticle = async (id: string, title?: string) => {
    try {
      const res = await deleteArticleFromFirestore(id, title);
      if (res.success) {
        showToast('تم حذف المقال نهائياً من قاعدة البيانات السحابية بنجاح ✓', 'success');
      } else {
        showToast(`تعذر حذف المقال: ${res.error || 'خطأ غير معروف'}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`حدث خطأ أثناء محاولة حذف المقال: ${msg}`, 'error');
    }
  };

  // Breaking news handlers
  const handleSaveBreaking = async (item: Partial<AdminBreakingNews>, isNew: boolean) => {
    try {
      const res = await saveBreakingNewsToFirestore(item, isNew);
      if (res.success) {
        showToast(
          isNew ? 'تمت إضافة الخبر العاجل وحفظه في Firestore بنجاح ✓' : 'تم تحديث الخبر العاجل في Firestore بنجاح ✓',
          'success'
        );
      } else {
        showToast(`تعذر حفظ الخبر العاجل: ${res.error}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`حدث خطأ أثناء حفظ الخبر العاجل: ${msg}`, 'error');
    }
  };

  const handleDeleteBreaking = async (id: string, text?: string) => {
    try {
      const res = await deleteBreakingNewsFromFirestore(id, text);
      if (res.success) {
        showToast('تم حذف الخبر العاجل من Firestore بنجاح ✓', 'success');
      } else {
        showToast(`تعذر حذف الخبر العاجل: ${res.error}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`حدث خطأ أثناء حذف الخبر العاجل: ${msg}`, 'error');
    }
  };

  // Category handlers
  const handleSaveCategory = async (cat: Partial<AdminCategory>, isNew: boolean) => {
    try {
      const res = await saveCategoryToFirestore(cat, isNew);
      if (res.success) {
        if (res.status === 'queued_offline') {
          showToast('تم حفظ القسم محلياً وسيتم تأكيده في Firebase فور توفر الإنترنت.', 'info');
        } else {
          showToast(isNew ? 'تمت إضافة القسم ومزامنته مباشرة في Firebase' : 'تم تحديث القسم في Firebase', 'success');
        }
      } else {
        showToast(`تعذر حفظ القسم: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء حفظ القسم.', 'error');
    }
  };

  const handleDeleteCategory = async (id: string, name?: string) => {
    try {
      const res = await deleteCategoryFromFirestore(id, name);
      if (res.success) {
        if (res.status === 'queued_offline') {
          showToast('تم تسجيل حذف القسم محلياً وسيتم تأكيده في Firebase عند الاتصال.', 'info');
        } else {
          showToast('تم حذف القسم ومزامنته بنجاح مع Firebase', 'success');
        }
      } else {
        showToast(`تعذر حذف القسم: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء حذف القسم.', 'error');
    }
  };

  // Subscriber handlers
  const handleDeleteSubscriber = async (id: string) => {
    try {
      const res = await deleteNewsletterSubscriber(id);
      if (res.success) {
        showToast('تم إلغاء اشتراك البريد الإلكتروني ومزامنته مع Firebase', 'success');
      } else {
        showToast(`تعذر الحذف: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء إلغاء الاشتراك.', 'error');
    }
  };

  // Settings handlers
  const handleSaveSettings = async (newSettings: Partial<SiteSettings>) => {
    try {
      const res = await saveSiteSettingsToFirestore(newSettings);
      if (res.success) {
        if (res.status === 'queued_offline') {
          showToast('تم حفظ الإعدادات محلياً بانتظار الاتصال بـ Firebase.', 'info');
        } else {
          showToast('تم حفظ إعدادات الموقع وتأكيدها مباشرة في Firebase', 'success');
        }
      } else {
        showToast(`تعذر حفظ الإعدادات: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء حفظ الإعدادات.', 'error');
    }
  };

  // SEO handlers
  const handleSaveSeo = async (seo: Partial<SeoSettings>) => {
    try {
      const res = await saveSiteSettingsToFirestore({ ...siteSettings });
      if (res.success) {
        showToast('تم حفظ معايير محركات البحث (SEO) وتأكيدها في Firebase', 'success');
      } else {
        showToast(`تعذر حفظ الإعدادات: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء حفظ معايير محركات البحث.', 'error');
    }
  };

  // Static Pages Handlers
  const handleSavePage = async (page: Partial<StaticPageDetail>, isNew: boolean) => {
    try {
      const res = await saveStaticPageToFirestore(page, isNew);
      if (res.success) {
        if (res.status === 'queued_offline') {
          showToast('تم حفظ الصفحة وتحديث الموقع بنجاح.', 'info');
        } else {
          showToast(isNew ? 'تمت إضافة صفحة الموقع وتحديثها بنجاح' : 'تم تحديث الصفحة وتأكيد التغييرات بنجاح', 'success');
        }
      } else {
        showToast(`تعذر حفظ الصفحة: ${res.error || 'تحقق من صحة المدخلات'}`, 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء حفظ الصفحة.', 'error');
    }
  };

  const handleDeletePage = async (id: string, title?: string) => {
    try {
      const res = await deleteStaticPageFromFirestore(id, title);
      if (res.success) {
        showToast('تم حذف صفحة الموقع وتحديث الموقع بنجاح', 'success');
      } else {
        showToast(`تعذر حذف الصفحة: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء حذف الصفحة.', 'error');
    }
  };

  const handleSeedPages = async () => {
    try {
      const res = await seedInitialStaticPages();
      if (res.success) {
        showToast(`تمت استعادة وحفظ ${res.count} صفحات أساسية بنجاح!`, 'success');
      } else {
        showToast(`تعذر مزامنة الصفحات: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء استعادة الصفحات.', 'error');
    }
  };

  // Deduplicated list of static pages for management
  const uniqueStaticPagesList = Object.values(staticPages).reduce<StaticPageDetail[]>((acc, current) => {
    if (!acc.some((p) => p.slug === current.slug || p.id === current.id)) {
      acc.push(current);
    }
    return acc;
  }, []);

  // Navigation Items
  const pendingCount = articles.filter((a) => a.status === 'pending').length;
  const navItems = [
    { id: 'overview' as AdminTab, label: 'لوحة المعلومات', icon: <LayoutDashboard size={18} />, badge: null },
    { id: 'analytics' as AdminTab, label: 'إحصائيات الزوار', icon: <BarChart3 size={18} />, badge: 'مباشر' },
    {
      id: 'articles' as AdminTab,
      label: 'المقالات والأخبار',
      icon: <FileText size={18} />,
      badge: pendingCount > 0 ? `${pendingCount} معلّق` : articles.length,
    },
    { id: 'breaking' as AdminTab, label: 'الأخبار العاجلة', icon: <Flame size={18} />, badge: breakingNews.length },
    { id: 'categories' as AdminTab, label: 'الأقسام والتصنيفات', icon: <FolderTree size={18} />, badge: categories.length },
    { id: 'pages' as AdminTab, label: 'إدارة صفحات الموقع', icon: <FileCheck2 size={18} />, badge: uniqueStaticPagesList.length },
    { id: 'subscribers' as AdminTab, label: 'مشتركو النشرة', icon: <Users size={18} />, badge: subscribers.length },
    { id: 'settings' as AdminTab, label: 'إعدادات الموقع', icon: <Settings size={18} />, badge: null },
    { id: 'seo' as AdminTab, label: 'محركات البحث (SEO)', icon: <Search size={18} />, badge: null },
    { id: 'audit' as AdminTab, label: 'سجل التدقيق الإداري', icon: <Activity size={18} />, badge: auditLogs.length },
    { id: 'status' as AdminTab, label: 'حالة النظام وFirebase', icon: <Server size={18} />, badge: null },
  ];

  return (
    <div className="min-h-screen bg-[#071322] text-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200 max-w-md w-[90%] bg-slate-900 border-slate-700 text-white">
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
          ) : (
            <ShieldCheck size={18} className="text-sky-400 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Bar */}
      <header className="sticky top-0 z-30 h-16 bg-[#0b1a2d]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="تبديل القائمة الجانبية"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 select-none cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="p-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-black text-white text-base tracking-tight">NET NEWS</span>
                <span className="text-xs font-bold text-sky-400">| لوحة التحكم</span>
              </div>
              <span className="hidden sm:block text-[10px] text-slate-400 font-mono">
                مشروع: netnews-617e7
              </span>
            </div>
          </div>
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Firebase Sync Status Indicator */}
          <SyncStatusIndicator />

          {/* Back to Live Site Button */}
          <button
            onClick={onBackToSite}
            className="flex items-center gap-1.5 text-xs text-sky-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-3 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Globe size={14} className="text-sky-400" />
            <span className="hidden sm:inline">معاينة الموقع الرئيسي</span>
            <span className="sm:hidden">الموقع</span>
          </button>

          {/* Admin User Info & Auth */}
          {currentUser ? (
            <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-white font-mono truncate max-w-[140px]">
                  {currentUser.email}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  مدير معتمد
                </span>
              </div>
              <button
                onClick={handleLogout}
                disabled={authLoading}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={authLoading}
              className="flex items-center gap-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <LogIn size={14} />
              <span>تسجيل دخول المدير</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-64 bg-[#0b1a2d] border-l border-slate-800 p-4 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="space-y-6">
            <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">أقسام لوحة التحكم</span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-sky-600 text-white font-bold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer info */}
          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>الإصدار:</span>
              <span className="font-mono text-slate-400">v1.2 · 2026</span>
            </div>
            <div className="flex items-center justify-between">
              <span>المشروع:</span>
              <span className="font-mono text-sky-400">netnews-617e7</span>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-xs"
          />
        )}

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {activeTab === 'overview' && (
            <AdminOverviewView
              articles={articles}
              breakingNews={breakingNews}
              categories={categories}
              subscribers={subscribers}
              auditLogs={auditLogs}
              staticPagesCount={uniqueStaticPagesList.length}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenCreateArticle={() => {
                setActiveTab('articles');
                setIsArticleCreateTriggered(true);
              }}
              onOpenCreateBreaking={() => {
                setActiveTab('breaking');
                setIsBreakingCreateTriggered(true);
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <AdminAnalyticsView />
          )}

          {activeTab === 'articles' && (
            <AdminArticlesView
              articles={articles}
              categories={categories}
              onSaveArticle={handleSaveArticle}
              onDeleteArticle={handleDeleteArticle}
              isCreatingOpen={isArticleCreateTriggered}
              onCloseCreateOpen={() => setIsArticleCreateTriggered(false)}
            />
          )}

          {activeTab === 'breaking' && (
            <AdminBreakingView
              breakingNews={breakingNews}
              onSaveBreaking={handleSaveBreaking}
              onDeleteBreaking={handleDeleteBreaking}
              isCreatingOpen={isBreakingCreateTriggered}
              onCloseCreateOpen={() => setIsBreakingCreateTriggered(false)}
            />
          )}

          {activeTab === 'categories' && (
            <AdminCategoriesView
              categories={categories}
              articles={articles}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {activeTab === 'pages' && (
            <AdminPagesView
              pages={uniqueStaticPagesList}
              onSavePage={handleSavePage}
              onDeletePage={handleDeletePage}
              onSeedDefaults={handleSeedPages}
              onPreviewPage={(slug) => {
                if (typeof window !== 'undefined') {
                  window.location.hash = '';
                  window.history.pushState({ pageSlug: slug }, '', `/page/${encodeURIComponent(slug)}`);
                  onBackToSite();
                }
              }}
            />
          )}

          {activeTab === 'subscribers' && (
            <AdminSubscribersView
              subscribers={subscribers}
              onDeleteSubscriber={handleDeleteSubscriber}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsView
              settings={siteSettings}
              onSaveSettings={handleSaveSettings}
            />
          )}

          {activeTab === 'seo' && (
            <AdminSeoView
              seo={{
                metaTitle: siteSettings.siteName,
                metaDescription: siteSettings.siteDescription,
                canonicalUrl: 'https://netnews1.netlify.app',
                ogImage: '/og-image.png',
                twitterHandle: '',
                enableStructuredData: true,
                keywords: ['أخبار عربية', 'نت نيوز', 'عاجل', 'الشرق الأوسط', 'اقتصاد'],
              }}
              onSaveSeo={handleSaveSeo}
            />
          )}

          {activeTab === 'audit' && (
            <AdminAuditView logs={auditLogs} />
          )}

          {activeTab === 'status' && (
            <AdminStatusView
              currentUser={currentUser}
              isAdmin={isAdmin}
              firestoreArticleCount={firestoreArticleCount}
            />
          )}
        </main>
      </div>
    </div>
  );
};
