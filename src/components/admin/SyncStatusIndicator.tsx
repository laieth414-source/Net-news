import React, { useState, useEffect } from 'react';
import {
  subscribeToSyncState,
  SyncState,
  flushPendingQueue,
  removePendingItem,
  clearPendingQueue
} from '../../lib/syncManager';
import {
  CloudCheck,
  RefreshCw,
  WifiOff,
  Clock,
  AlertTriangle,
  ChevronDown,
  X,
  CheckCircle2,
  Database,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

export const SyncStatusIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    pendingCount: 0,
    lastSyncedAt: null,
    isOnline: true,
    isFlushing: false,
    pendingItems: [],
    lastError: null,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flushingNotice, setFlushingNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToSyncState((state) => {
      setSyncState(state);
    });
    return () => unsub();
  }, []);

  const handleManualFlush = async () => {
    setFlushingNotice('جارٍ فحص الاتصال ومزامنة العمليات المعلقة...');
    try {
      const res = await flushPendingQueue();
      if (res.syncedCount > 0) {
        setFlushingNotice(`تمت مزامنة ${res.syncedCount} عملية بنجاح مع Firebase!`);
      } else if (res.errors.length > 0) {
        setFlushingNotice(`تعذر إتمام المزامنة: ${res.errors[0]}`);
      } else {
        setFlushingNotice('جميع التغييرات متزامنة ومؤكدة بالفعل في السحابة.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFlushingNotice(`خطأ: ${msg}`);
    }
    setTimeout(() => {
      setFlushingNotice(null);
    }, 4500);
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'منذ قليل';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 10) return 'الآن';
    if (diff < 60) return `منذ ${diff} ثانية`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `منذ ${mins} دقيقة`;
    return new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = () => {
    if (!syncState.isOnline) {
      return {
        label: syncState.pendingCount > 0 ? `غير متصل (${syncState.pendingCount} معلق)` : 'غير متصل بالإنترنت',
        dotColor: 'bg-amber-400',
        bgColor: 'bg-amber-950/60 border-amber-800/80 text-amber-300',
        icon: <WifiOff size={13} className="text-amber-400 shrink-0" />,
      };
    }

    if (syncState.isFlushing || syncState.status === 'syncing') {
      return {
        label: 'جارٍ المزامنة والتأكيد...',
        dotColor: 'bg-sky-400 animate-ping',
        bgColor: 'bg-sky-950/60 border-sky-800/80 text-sky-300',
        icon: <RefreshCw size={13} className="text-sky-400 animate-spin shrink-0" />,
      };
    }

    if (syncState.pendingCount > 0) {
      return {
        label: `قيد المعالجة (${syncState.pendingCount} بالانتظار)`,
        dotColor: 'bg-sky-400 animate-pulse',
        bgColor: 'bg-sky-950/60 border-sky-800/80 text-sky-300',
        icon: <RefreshCw size={13} className="text-sky-400 animate-spin shrink-0" />,
      };
    }

    if (syncState.status === 'error' && syncState.lastError) {
      return {
        label: 'تنبيه مزامنة',
        dotColor: 'bg-rose-400',
        bgColor: 'bg-rose-950/60 border-rose-800/80 text-rose-300',
        icon: <AlertTriangle size={13} className="text-rose-400 shrink-0" />,
      };
    }

    return {
      label: 'متزامن مباشرة مع Firebase',
      dotColor: 'bg-emerald-400',
      bgColor: 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300',
      icon: <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />,
    };
  };

  const badge = getStatusBadge();

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        title="انقر لعرض تفاصيل المزامنة التلقائية مع Firebase"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.02] cursor-pointer shadow-xs ${badge.bgColor}`}
      >
        <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
        {badge.icon}
        <span className="hidden sm:inline font-medium">{badge.label}</span>
        <span className="sm:hidden font-medium">
          {syncState.pendingCount > 0 ? `${syncState.pendingCount} بالانتظار` : 'متزامن'}
        </span>
        <ChevronDown size={12} className="opacity-70" />
      </button>

      {/* Sync Status Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div
            className="bg-[#0b1a2d] border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 text-right font-sans text-slate-100"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-950/50 border border-sky-800 text-sky-400">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-heading">
                    حالة المزامنة المباشرة مع Firebase
                  </h3>
                  <p className="text-xs text-slate-400">
                    نظام حفظ وتأكيد فوري دون الحاجة لترحيل يدوي
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 block">حالة الاتصال بالسحابة:</span>
                <span className="text-xs font-bold flex items-center gap-1.5 text-white">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      syncState.isOnline ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  {syncState.isOnline ? 'متصل بالإنترنت' : 'غير متصل (يعمل محلياً)'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 block">آخر مزامنة مؤكدة:</span>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {formatLastSync(syncState.lastSyncedAt)}
                </span>
              </div>
            </div>

            {/* Notice / Feedback */}
            {flushingNotice && (
              <div className="p-3 rounded-xl bg-sky-950/70 border border-sky-800 text-xs text-sky-200 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-sky-400 shrink-0" />
                <span>{flushingNotice}</span>
              </div>
            )}

            {/* Explanatory Box */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-200/90 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <ShieldCheck size={16} />
                <span>مزامنة فورية وتلقائية بالكامل:</span>
              </div>
              <p className="leading-relaxed text-[11px] text-slate-300">
                أي إجراء يتم تأكيده في لوحة التحكم (إضافة أو تعديل أو حذف المقالات، الأخبار العاجلة، الأقسام، الصور، والإعدادات) يُرسل تلقائياً ومباشرة إلى Firebase ويُوثق فوراً. لا توجد حاجة للضغط على زر حفظ إضافي أو إجراء ترحيل يدوي.
              </p>
            </div>

            {/* Pending Changes Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  التغييرات المعلّقة في قائمة الانتظار ({syncState.pendingCount})
                </span>
                {syncState.pendingCount > 0 && (
                  <button
                    onClick={() => clearPendingQueue()}
                    className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                  >
                    مسح القائمة
                  </button>
                )}
              </div>

              {syncState.pendingCount === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center text-xs text-slate-400 space-y-1">
                  <CheckCircle2 size={20} className="mx-auto text-emerald-400 mb-1" />
                  <p className="font-semibold text-white">لا توجد أي تغييرات معلقة</p>
                  <p className="text-[11px] text-slate-500">
                    كافة تعديلاتك وبياناتك محفوظة ومؤكدة بنجاح داخل Firebase.
                  </p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 divide-y divide-slate-800/60 pr-1">
                  {syncState.pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-200 block truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.collection} · {item.action} · محاولات: {item.retryCount}
                        </span>
                      </div>
                      <button
                        onClick={() => removePendingItem(item.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="إلغاء هذا التغيير"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                يُعاد الاتصال والمزامنة تلقائياً بمجرد توفر الإنترنت.
              </span>
              <button
                onClick={handleManualFlush}
                disabled={syncState.isFlushing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw size={14} className={syncState.isFlushing ? 'animate-spin' : ''} />
                <span>{syncState.isFlushing ? 'جارٍ المزامنة...' : 'مزامنة وإعادة المحاولة الآن'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
