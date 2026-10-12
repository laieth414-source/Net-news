import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { X, ShieldCheck, LogIn, LogOut, RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { ADMIN_EMAIL, loginWithGoogle, logoutUser, populateFirestoreData } from '../lib/firebase';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  isAdmin: boolean;
  firestoreArticleCount?: number;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAdmin,
  firestoreArticleCount = 0,
}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string; details?: string } | null>(null);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const user = await loginWithGoogle();
      if (user.email === ADMIN_EMAIL) {
        setMessage({
          type: 'success',
          text: `مرحباً بك يا مدير الموقع (${user.email}). تم تسجيل الدخول بنجاح! يمكنك الآن الضغط على زر رفع الأخبار.`,
        });
      } else {
        setMessage({
          type: 'warning',
          text: `تم تسجيل الدخول بالبريد (${user.email}). لكن إدارة NET NEWS محصورة بالبريد المعتمد (${ADMIN_EMAIL}).`,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('unauthorized-domain')) {
        setMessage({
          type: 'error',
          text: 'يتطلب تسجيل الدخول إضافة نطاق المعاينة الحالي إلى النطاقات المعتمدة (Authorized Domains) في Firebase Console.',
          details: 'توجه إلى Firebase Console > Authentication > Settings > Authorized domains وأضف النطاق الحالي أو اتبع خطوة التغذية المباشرة.',
        });
      } else {
        setMessage({ type: 'error', text: `فشل تسجيل الدخول: ${errMsg}` });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setMessage({ type: 'success', text: 'تم تسجيل الخروج بنجاح.' });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `فشل تسجيل الخروج: ${errMsg}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSync = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await populateFirestoreData();
      if (result.success) {
        setMessage({
          type: 'success',
          text: `تم بنجاح! تم إنشاء وتعبئة ${result.count} مقالاً تحريرياً وخبراً عاجلاً في مجموعتي articles و breakingNews في قاعدة بياناتك (netnews-617e7). يمكنك الآن تحديث الصفحة لرؤيتها مباشرة من السحابة.`,
        });
      } else {
        const isPermissionDenied = result.error?.includes('permission') || result.error?.includes('PERMISSION_DENIED');
        if (isPermissionDenied) {
          setMessage({
            type: 'error',
            text: 'قواعد Firestore الحالية في لوحة تحكمك تمنع الكتابة (PERMISSION_DENIED).',
            details: 'لإدخال البيانات فوراً:\n1. افتح Firebase Console > Firestore Database > Rules.\n2. عدّل القاعدة مؤقتاً لتصبح: allow read, write: if true; واضغط Publish.\n3. ارجع هنا واضغط زر "رفع الأخبار الآن" لتعبئة البيانات في ثانية واحدة.\n4. بعد نجاح الرفع، أعد القواعد الآمنة المعتمدة لحماية موقعك.',
          });
        } else {
          setMessage({
            type: 'error',
            text: result.error || 'تعذرت الكتابة في قاعدة البيانات.',
          });
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: `حدث خطأ غير متوقع: ${errMsg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden my-auto border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0b1a2d] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database size={20} className="text-sky-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base font-heading">
                إدارة وتهيئة قاعدة بيانات NET NEWS
              </h3>
              <p className="text-[11px] text-slate-300">
                مشروع Firebase: netnews-617e7
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Status Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">حالة الربط مع فايربيس:</span>
              <span className="font-semibold text-emerald-700">متصل (Connected) ✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">عدد المقالات المباشرة في Firestore:</span>
              <span className="font-mono font-bold text-slate-900">{firestoreArticleCount} مقالاً</span>
            </div>
            {currentUser && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">الحساب الحالي:</span>
                <span className="font-mono text-slate-800 font-semibold">{currentUser.email}</span>
              </div>
            )}
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`p-4 rounded-lg text-xs leading-relaxed space-y-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : message.type === 'warning'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              <div className="flex items-start gap-2 font-medium">
                {message.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{message.text}</span>
              </div>
              {message.details && (
                <div className="bg-white/80 p-2.5 rounded border border-rose-200/60 font-mono text-[11px] whitespace-pre-line text-slate-800">
                  {message.details}
                </div>
              )}
            </div>
          )}

          {/* Primary Action Button: Seed Data directly */}
          <div className="bg-sky-50/70 border border-sky-100 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sky-950 font-bold text-xs sm:text-sm">
              <RefreshCw size={16} className="text-sky-700" />
              <span>تغذية قاعدة البيانات بالأخبار التحريرية المعتمدة</span>
            </div>
            <p className="text-xs text-sky-900 leading-relaxed">
              يقوم هذا الزر بنقل كافة المقالات والأخبار التحريرية المجهزة (14 مقالاً تحريرياً + 4 أخبار عاجلة) إلى مجموعتي <code className="bg-sky-100 px-1 py-0.5 rounded font-mono">articles</code> و <code className="bg-sky-100 px-1 py-0.5 rounded font-mono">breakingNews</code> في Firestore.
            </p>
            <button
              onClick={handleDirectSync}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'جارٍ رفع الأخبار إلى Firestore...' : 'رفع الأخبار الآن إلى Firestore'}</span>
            </button>
          </div>

          {/* Google Login for Admin */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
            {currentUser ? (
              <button
                onClick={handleLogout}
                disabled={loading}
                className="text-xs text-rose-700 hover:text-rose-800 font-medium flex items-center gap-1.5"
              >
                <LogOut size={13} />
                <span>تسجيل الخروج من ({currentUser.email})</span>
              </button>
            ) : (
              <button
                onClick={handleLogin}
                disabled={loading}
                className="text-xs text-sky-800 hover:text-sky-950 font-medium flex items-center gap-1.5"
              >
                <LogIn size={13} />
                <span>تسجيل الدخول بـ Google كمدير ({ADMIN_EMAIL})</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>NET NEWS · netnews-617e7</span>
          <button
            onClick={onClose}
            className="text-slate-700 hover:text-slate-900 font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
