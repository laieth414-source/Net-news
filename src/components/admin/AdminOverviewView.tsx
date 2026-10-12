import React from 'react';
import {
  AdminArticle,
  AdminBreakingNews,
  AdminCategory,
  NewsletterSubscriber,
  AuditLog,
  AdminTab
} from '../../types/admin';
import {
  FileText,
  FileCheck2,
  AlertTriangle,
  FolderTree,
  Users,
  Flame,
  Clock,
  ArrowUpLeft,
  CheckCircle2,
  Database,
  Activity,
  Plus,
  BarChart3
} from 'lucide-react';

interface AdminOverviewViewProps {
  articles: AdminArticle[];
  breakingNews: AdminBreakingNews[];
  categories: AdminCategory[];
  subscribers: NewsletterSubscriber[];
  auditLogs: AuditLog[];
  staticPagesCount?: number;
  onNavigateTab: (tab: AdminTab) => void;
  onOpenCreateArticle: () => void;
  onOpenCreateBreaking: () => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  articles,
  breakingNews,
  categories,
  subscribers,
  auditLogs,
  staticPagesCount,
  onNavigateTab,
  onOpenCreateArticle,
  onOpenCreateBreaking,
}) => {
  const publishedArticles = articles.filter((a) => a.status === 'published' || !a.status);
  const pendingArticles = articles.filter((a) => a.status === 'pending');
  const draftArticles = articles.filter((a) => a.status === 'draft');
  const activeBreaking = breakingNews.filter((b) => b.isActive !== false);

  const stats = [
    {
      title: 'المقالات المنشورة',
      value: publishedArticles.length,
      unit: 'مقالاً متاحاً للجمهور',
      icon: <FileText size={20} className="text-emerald-400" />,
      bg: 'bg-emerald-950/40 border-emerald-800/50',
      actionTab: 'articles' as AdminTab,
    },
    {
      title: 'المقالات المعلقة للموافقة',
      value: pendingArticles.length,
      unit: 'مقالاً ينتظر اعتماد الإدارة',
      icon: <Clock size={20} className="text-amber-400" />,
      bg: 'bg-amber-950/40 border-amber-800/50',
      actionTab: 'articles' as AdminTab,
    },
    {
      title: 'المسودات التحريرية',
      value: draftArticles.length,
      unit: 'مسودة غير منشورة',
      icon: <FileCheck2 size={20} className="text-slate-400" />,
      bg: 'bg-slate-900 border-slate-800/80',
      actionTab: 'articles' as AdminTab,
    },
    {
      title: 'الأخبار العاجلة النشطة',
      value: activeBreaking.length,
      unit: `من إجمالي ${breakingNews.length} خبراً`,
      icon: <Flame size={20} className="text-rose-400" />,
      bg: 'bg-rose-950/40 border-rose-800/50',
      actionTab: 'breaking' as AdminTab,
    },
    {
      title: 'الأقسام الإخبارية',
      value: categories.length,
      unit: 'قسماً وتصنيفاً معتمداً',
      icon: <FolderTree size={20} className="text-sky-400" />,
      bg: 'bg-sky-950/40 border-sky-800/50',
      actionTab: 'categories' as AdminTab,
    },
    {
      title: 'صفحات الموقع والسياسات',
      value: staticPagesCount ?? 6,
      unit: 'صفحة مستقلة بتذييل الموقع',
      icon: <FileCheck2 size={20} className="text-teal-400" />,
      bg: 'bg-teal-950/40 border-teal-800/50',
      actionTab: 'pages' as AdminTab,
    },
    {
      title: 'مشتركو النشرة البريدية',
      value: subscribers.length,
      unit: 'مشتركاً مسجلاً في السحابة',
      icon: <Users size={20} className="text-purple-400" />,
      bg: 'bg-purple-950/40 border-purple-800/50',
      actionTab: 'subscribers' as AdminTab,
    },
    {
      title: 'إجمالي التعديلات الإدارية',
      value: auditLogs.length,
      unit: 'إجراءً مسجلاً في السجل',
      icon: <Activity size={20} className="text-blue-400" />,
      bg: 'bg-blue-950/40 border-blue-800/50',
      actionTab: 'audit' as AdminTab,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions Header */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">
            لوحة المعلومات والنشاط الحي
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إحصائيات فورية مستخرجة مباشرة من مجموعات Firestore في مشروع netnews-617e7
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('analytics')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <BarChart3 size={15} />
            <span>إحصائيات الزوار الحية</span>
          </button>
          <button
            onClick={onOpenCreateArticle}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>كتابة مقال جديد</span>
          </button>
          <button
            onClick={onOpenCreateBreaking}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Flame size={15} />
            <span>إضافة خبر عاجل</span>
          </button>
        </div>
      </div>

      {/* Real Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            onClick={() => onNavigateTab(stat.actionTab)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] ${stat.bg}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">{stat.title}</span>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                {stat.icon}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
                {stat.value}
              </span>
              <span className="text-xs text-slate-400">{stat.unit}</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>إدارة هذا القسم</span>
              <ArrowUpLeft size={13} className="text-slate-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Latest Articles & Recent Admin Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Articles (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-sky-400" />
              <h3 className="font-bold text-white text-sm font-heading">
                أحدث المقالات المضافة
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('articles')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium hover:underline flex items-center gap-1"
            >
              <span>عرض كافة المقالات ({articles.length})</span>
              <ArrowUpLeft size={13} />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {articles.slice(0, 5).map((art) => (
              <div key={art.id} className="py-3 flex items-start justify-between gap-3 group">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-semibold text-sky-400">{art.categoryName}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{art.timestamp || art.publishedAt}</span>
                    {art.isLead && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 text-[10px] font-bold border border-amber-800">
                        رئيسي
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-200 line-clamp-1 group-hover:text-sky-300 transition-colors">
                    {art.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{art.deck}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0 mt-1">
                  {art.viewsCount || '0 قراءة'}
                </span>
              </div>
            ))}
            {articles.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                لا توجد مقالات مسجلة حالياً في قاعدة البيانات.
              </div>
            )}
          </div>
        </div>

        {/* Recent Admin Activity / Audit Logs (5 cols) */}
        <div className="lg:col-span-5 bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-emerald-400" />
              <h3 className="font-bold text-white text-sm font-heading">
                سجل النشاط الإداري الأخير
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium hover:underline flex items-center gap-1"
            >
              <span>كامل السجل</span>
              <ArrowUpLeft size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-400">{log.action}</span>
                  <span className="text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-slate-300 line-clamp-1">{log.details}</p>
                <span className="text-[10px] text-slate-500 block truncate">
                  بواسطة: {log.adminEmail}
                </span>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                السجل فارغ. سيتم توثيق أي عملية تحرير أو حذف تلقائياً هنا.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
