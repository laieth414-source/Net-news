import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Activity,
  Eye,
  Clock,
  Compass,
  Smartphone,
  Monitor,
  Tablet,
  Calendar,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Flame,
  ArrowUpRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import {
  ActiveVisitorItem,
  AnalyticsEventItem,
  AnalyticsPeriod,
  AnalyticsMetrics
} from '../../types/admin';
import {
  subscribeToActiveVisitors,
  subscribeToAnalyticsEvents,
  calculateAnalyticsMetrics
} from '../../lib/analytics';

export const AdminAnalyticsView: React.FC = () => {
  const [activeCount, setActiveCount] = useState<number>(0);
  const [activeList, setActiveList] = useState<ActiveVisitorItem[]>([]);
  const [events, setEvents] = useState<AnalyticsEventItem[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('24h');
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Real-time subscription to active visitors and events
  useEffect(() => {
    // 1. Subscribe to real-time active visitors (within 5 minutes)
    const unsubActive = subscribeToActiveVisitors((count, list) => {
      setActiveCount(count);
      setActiveList(list);
      setLastRefreshed(new Date());
    });

    // 2. Subscribe to recent analytics events
    const unsubEvents = subscribeToAnalyticsEvents((allEvents) => {
      setEvents(allEvents);
      setLoading(false);
      setLastRefreshed(new Date());
    });

    return () => {
      unsubActive();
      unsubEvents();
    };
  }, []);

  // Compute metrics for the selected period
  const metrics: AnalyticsMetrics = useMemo(() => {
    return calculateAnalyticsMetrics(events, selectedPeriod, activeCount);
  }, [events, selectedPeriod, activeCount]);

  const periods: { id: AnalyticsPeriod; label: string; subtitle: string }[] = [
    { id: '12h', label: 'آخر 12 ساعة', subtitle: 'توزيع ساعي' },
    { id: '24h', label: 'آخر 24 ساعة', subtitle: 'اليوم الحالي' },
    { id: '7d', label: 'آخر 7 أيام', subtitle: 'الأسبوع الأخير' },
    { id: '30d', label: 'آخر 30 يوماً', subtitle: 'الشهر الحالي' },
    { id: '365d', label: 'آخر 365 يوماً', subtitle: 'عام كامل' },
    { id: 'all', label: 'كافة البيانات', subtitle: 'منذ التفعيل' },
  ];

  // Device percentages
  const totalDeviceViews =
    metrics.deviceBreakdown.desktop +
    metrics.deviceBreakdown.mobile +
    metrics.deviceBreakdown.tablet || 1;

  const mobilePercent = Math.round((metrics.deviceBreakdown.mobile / totalDeviceViews) * 100);
  const desktopPercent = Math.round((metrics.deviceBreakdown.desktop / totalDeviceViews) * 100);
  const tabletPercent = Math.round((metrics.deviceBreakdown.tablet / totalDeviceViews) * 100);

  // Maximum views in trend for chart scaling
  const maxTrendViews = useMemo(() => {
    return Math.max(...metrics.trend.map((t) => t.views), 1);
  }, [metrics.trend]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header with Live Indicator */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                <BarChart3 size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-heading">
                  إحصائيات وتحليلات الزوار الحقيقية
                </h2>
                <p className="text-xs text-slate-400">
                  تتبع مباشر ومحمي عبر سحابة Firebase • تمييز دقيق بين الزوار والجلسات والمشاهدات
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>مباشر • تحديث تلقائي</span>
            </div>

            <span className="text-[11px] text-slate-500 hidden md:inline">
              آخر تحديث: {lastRefreshed.toLocaleTimeString('ar-EG')}
            </span>
          </div>
        </div>

        {/* Timeframe Selector Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Calendar size={14} className="text-sky-400" />
              <span>اختر النطاق الزمني للإحصائيات:</span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {periods.map((p) => {
              const isActive = selectedPeriod === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`p-2.5 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer border ${
                    isActive
                      ? 'bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-600/20'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <div>{p.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isActive ? 'text-sky-100' : 'text-slate-500'}`}>
                    {p.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real-Time Active Visitors Card (الزوار النشطون حالياً) */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-[#0b1a2d] border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center">
              <Activity size={28} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  الزوار النشطون حالياً
                </span>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/50">
                  آخر 5 دقائق
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {activeCount}
                </span>
                <span className="text-xs text-slate-400">
                  {activeCount === 1 ? 'زائر يتصفح الموقع الآن' : 'زوار يتصفحون الموقع الآن'}
                </span>
              </div>
            </div>
          </div>

          {/* Active users paths preview */}
          <div className="flex-1 max-w-xl bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">
              الصفحات المفتوحة حالياً من الزوار:
            </span>
            {activeList.length === 0 ? (
              <p className="text-slate-500 text-[11px] italic">
                لا يوجد زوار نشطون في اللحظة الراهنة. تظهر البيانات فور تصفح أي زائر للموقع.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {activeList.slice(0, 5).map((u, i) => (
                  <span
                    key={u.visitorId + i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-[11px]"
                  >
                    {u.deviceType === 'mobile' ? (
                      <Smartphone size={12} className="text-sky-400" />
                    ) : (
                      <Monitor size={12} className="text-emerald-400" />
                    )}
                    <span className="truncate max-w-[150px]">
                      {u.title || u.path}
                    </span>
                  </span>
                ))}
                {activeList.length > 5 && (
                  <span className="text-[11px] text-slate-500 self-center">
                    +{activeList.length - 5} زوار آخرين
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Primary Distinguishing Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Unique Visitors */}
        <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">الزوار الفريدون</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-heading">
            {metrics.uniqueVisitors.toLocaleString('ar-EG')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            أجهزة ومستخدمون حقيقيون مختلفون
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-sky-400">
            محدد بهوية جهاز فريدة (Visitor ID)
          </div>
        </div>

        {/* Metric 2: Sessions */}
        <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">الجلسات (Sessions)</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <Compass size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-heading">
            {metrics.sessions.toLocaleString('ar-EG')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            إجمالي جلسات التصفح المستقلة
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-purple-400">
            تتجدد الجلسة بعد 30 دقيقة خمول
          </div>
        </div>

        {/* Metric 3: Page Views */}
        <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">مشاهدات الصفحات</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Eye size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-heading">
            {metrics.pageViews.toLocaleString('ar-EG')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            إجمالي استعراض المقالات والأقسام
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-amber-400">
            تسجيل حقيقي لحظة فتح المحتوى
          </div>
        </div>

        {/* Metric 4: Views per Visitor */}
        <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">معدل التصفح / زائر</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-heading">
            {metrics.viewsPerVisitor}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            متوسط عدد المشاهدات لكل زائر
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-emerald-400">
            مؤشر تفاعل واهتمام القراء
          </div>
        </div>
      </div>

      {/* Trend Chart Visualization */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
              <BarChart3 size={16} className="text-sky-400" />
              <span>توزيع المشاهدات والزوار على مدار الفترة ({periods.find((p) => p.id === selectedPeriod)?.label})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              مقارنة بين عدد مشاهدات الصفحات (بالأزرق) وعدد الزوار الفريدين (بالأخضر)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500"></span>
              <span>المشاهدات</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              <span>الزوار</span>
            </span>
          </div>
        </div>

        {/* Visual Bar Columns */}
        <div className="pt-6 pb-2">
          {metrics.trend.length === 0 || metrics.pageViews === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl text-center p-6 text-slate-500 text-xs">
              <BarChart3 size={32} className="text-slate-600 mb-2" />
              <span>لا توجد مشاهدات مسجلة في هذا النطاق الزمني بعد.</span>
              <span className="text-[11px] text-slate-600 mt-1">
                تُسجَّل المشاهدات آلياً وتظهر في هذا المخطط فور تصفح القراء.
              </span>
            </div>
          ) : (
            <div className="h-48 flex items-end gap-2 sm:gap-3 px-2">
              {metrics.trend.map((bucket, idx) => {
                const viewHeightPercent = maxTrendViews > 0
                  ? Math.max(Math.round((bucket.views / maxTrendViews) * 100), bucket.views > 0 ? 8 : 2)
                  : 2;
                const visitorHeightPercent = maxTrendViews > 0
                  ? Math.max(Math.round((bucket.visitors / maxTrendViews) * 100), bucket.visitors > 0 ? 6 : 1)
                  : 1;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                      {bucket.label}: {bucket.views} مشاهدة • {bucket.visitors} زائر
                    </div>

                    <div className="w-full flex items-end justify-center gap-1 h-36">
                      {/* Views bar */}
                      <div
                        style={{ height: `${viewHeightPercent}%` }}
                        className="w-1/2 max-w-[14px] bg-sky-500 hover:bg-sky-400 rounded-t-sm transition-all"
                        title={`المشاهدات: ${bucket.views}`}
                      />
                      {/* Visitors bar */}
                      <div
                        style={{ height: `${visitorHeightPercent}%` }}
                        className="w-1/2 max-w-[14px] bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all"
                        title={`الزوار: ${bucket.visitors}`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">
                      {bucket.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row: Devices Breakdown & Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Device Types Breakdown */}
        <div className="lg:col-span-5 bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
              <Smartphone size={16} className="text-sky-400" />
              <span>أنواع الأجهزة المستخدمة</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              إجمالي {totalDeviceViews} تصفحاً
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Mobile */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <Smartphone size={15} className="text-sky-400" />
                  <span>الهواتف الذكية (Mobile)</span>
                </span>
                <span className="font-bold text-white">
                  {metrics.deviceBreakdown.mobile} ({mobilePercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  style={{ width: `${mobilePercent}%` }}
                  className="h-full bg-sky-500 rounded-full transition-all"
                />
              </div>
            </div>

            {/* Desktop */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <Monitor size={15} className="text-purple-400" />
                  <span>أجهزة الكمبيوتر (Desktop)</span>
                </span>
                <span className="font-bold text-white">
                  {metrics.deviceBreakdown.desktop} ({desktopPercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  style={{ width: `${desktopPercent}%` }}
                  className="h-full bg-purple-500 rounded-full transition-all"
                />
              </div>
            </div>

            {/* Tablet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <Tablet size={15} className="text-amber-400" />
                  <span>الأجهزة اللوحية (Tablet)</span>
                </span>
                <span className="font-bold text-white">
                  {metrics.deviceBreakdown.tablet} ({tabletPercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  style={{ width: `${tabletPercent}%` }}
                  className="h-full bg-amber-500 rounded-full transition-all"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-300 block">توافق التصفح:</span>
            <span>تصميم NET NEWS يتكيف تلقائياً مع كافة الأبعاد ونسب الشاشات.</span>
          </div>
        </div>

        {/* Top Visited Pages & Articles */}
        <div className="lg:col-span-7 bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
              <Flame size={16} className="text-rose-400" />
              <span>المحتوى والصفحات الأكثر زيارة</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              أعلى {metrics.topPaths.length} مسارات
            </span>
          </div>

          {metrics.topPaths.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              لم تُسجّل زيارات لصفحات محددة خلال الفترة المختارة حتى الآن.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 overflow-hidden">
              {metrics.topPaths.map((item, index) => (
                <div
                  key={item.path + index}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-900 text-slate-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate max-w-sm">
                        {item.title || item.path}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate" dir="ltr">
                        {item.path}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-bold text-[11px]">
                      {item.count} مشاهدة
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Live Stream */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
            <Clock size={16} className="text-sky-400" />
            <span>سجل الزيارات المباشرة الأحدث</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            إجمالي {events.length} حركة مسجلة في السحابة
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            في انتظار أولى زيارات الزوار لحفظها لحظياً في قاعدة البيانات...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">الوقت</th>
                  <th className="py-2.5 px-3">الصفحة / المقال</th>
                  <th className="py-2.5 px-3">الجهاز</th>
                  <th className="py-2.5 px-3">معرّف الزائر الفريد</th>
                  <th className="py-2.5 px-3">الجلسة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {events.slice(0, 10).map((ev) => {
                  const evDate = new Date(ev.timestamp);
                  return (
                    <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {evDate.toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-white truncate max-w-xs block">
                          {ev.title || ev.path}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                          {ev.deviceType === 'mobile' ? (
                            <Smartphone size={13} className="text-sky-400" />
                          ) : ev.deviceType === 'tablet' ? (
                            <Tablet size={13} className="text-amber-400" />
                          ) : (
                            <Monitor size={13} className="text-emerald-400" />
                          )}
                          <span>
                            {ev.deviceType === 'mobile'
                              ? 'هاتف'
                              : ev.deviceType === 'tablet'
                              ? 'لوحي'
                              : 'كمبيوتر'}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {ev.visitorId.substring(0, 12)}...
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {ev.sessionId.substring(0, 12)}...
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Protection & Anti-Tampering Footer Notice */}
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-start gap-3 text-xs text-slate-400">
        <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-200 block">
            حماية الإحصائيات ومنع التلاعب (Security & Anti-Tampering)
          </span>
          <p className="text-[11px] leading-relaxed">
            تُحفظ الإحصائيات مباشرة في مجموعات Firestore المشفرة بقواعد أمان صارمة تسمح بتسجيل الزيارات الحقيقية فقط دون إمكانية التعديل أو الحذف، وقراءة الإحصائيات محصورة بحساب المدير المعتمد فقط. النظام مجاني بالكامل ولا يعتمد على خدمات مدفوعة ولا يخترق خصوصية الزوار.
          </p>
        </div>
      </div>
    </div>
  );
};
