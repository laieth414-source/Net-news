import React, { useState } from 'react';
import {
  ShieldCheck,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  Globe,
  Lock,
  Mail,
  Loader2,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import {
  loginWithEmailAndPassword,
  loginWithGoogle,
  checkIsAdminUser,
  logoutUser,
  sendAdminPasswordResetEmail,
  ADMIN_EMAIL
} from '../../lib/firebase';

interface AdminLoginViewProps {
  onBackToSite: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onBackToSite,
  onLoginSuccess
}) => {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Google One-Click Sign In
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);

    try {
      const user = await loginWithGoogle();
      const isAdmin = await checkIsAdminUser(user);

      if (isAdmin) {
        onLoginSuccess();
      } else {
        await logoutUser();
        setErrorMsg(
          `تم تسجيل الدخول بالبريد (${user.email}) بنجاح، لكن هذا الحساب لا يملك صلاحية إدارة الموقع. الوصول مخصص لمدير الموقع (${ADMIN_EMAIL}).`
        );
      }
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      const code = errObj.code || '';
      const rawMsg = errObj.message || String(err);

      if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
        setErrorMsg(
          'نطاق المعاينة الحالي غير مضاف إلى النطاقات المعتمدة (Authorized Domains) في مشروع Firebase. يرجى إضافة النطاق من Firebase Console > Authentication > Settings > Authorized domains، أو استخدام تسجيل الدخول بالبريد وكلمة المرور أدناه.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('قام المتصفح بحجب النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      } else {
        setErrorMsg(`تعذر تسجيل الدخول بواسطة Google: ${rawMsg}`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 2. Email & Password Sign In
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني للمدير.');
      return;
    }

    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور.');
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate with Firebase Email/Password
      const user = await loginWithEmailAndPassword(cleanEmail, password);

      // 2. Authorize admin rights
      const isAdmin = await checkIsAdminUser(user);

      if (isAdmin) {
        onLoginSuccess();
      } else {
        // Sign out unauthorized regular user immediately
        await logoutUser();
        setErrorMsg(
          `تم تسجيل الدخول بالبريد (${user.email}) بنجاح، ولكن هذا الحساب لا يملك صلاحية إدارة الموقع. الوصول مخصص للمدير المصرح له (${ADMIN_EMAIL}).`
        );
      }
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      const code = errObj.code || '';
      const rawMsg = errObj.message || String(err);

      // Map Firebase Auth error codes to clear Arabic messages
      switch (code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          setErrorMsg(
            'بيانات الدخول غير صحيحة أو أن هذا البريد مسجل بواسطة حساب Google. يمكنك الضغط على زر "تسجيل الدخول السريع بحساب Google" بالأعلى أو استخدام رابط تعيين كلمة المرور أدناه.'
          );
          break;
        case 'auth/invalid-email':
          setErrorMsg('صيغة البريد الإلكتروني غير صالحة.');
          break;
        case 'auth/user-disabled':
          setErrorMsg('تم تعطيل هذا الحساب الإداري. يرجى مراجعة Firebase Console.');
          break;
        case 'auth/too-many-requests':
          setErrorMsg('تم حظر المحاولات مؤقتاً بسبب تكرار الإدخال الخاطئ. يرجى الانتظار دقيقة والمحاولة مجدداً.');
          break;
        case 'auth/operation-not-allowed':
          setErrorMsg(
            'طريقة تسجيل الدخول بالبريد وكلمة المرور غير مفعلة بعد في Firebase Console. يرجى تفعيلها من Authentication > Sign-in method.'
          );
          break;
        case 'auth/network-request-failed':
          setErrorMsg('تعذر الاتصال بخوادم النظام. يرجى التحقق من اتصالك بالإنترنت.');
          break;
        default:
          setErrorMsg(`فشل تسجيل الدخول: ${rawMsg}`);
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Password Reset
  const handlePasswordReset = async () => {
    const targetEmail = email.trim() || ADMIN_EMAIL;
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetLoading(true);

    try {
      await sendAdminPasswordResetEmail(targetEmail);
      setSuccessMsg(
        `تم إرسال رابط تعيين كلمة المرور بنجاح إلى البريد (${targetEmail}). تفقد صندوق الوارد والبريد غير الهام (Spam).`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`تعذر إرسال رابط التعيين: ${msg}`);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071322] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100" dir="rtl">
      {/* Background ambient accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-sky-900/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-[#0b1a2d] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-sky-950/80 text-sky-400 border border-sky-800/60 shadow-inner mb-2">
            <ShieldCheck size={36} className="text-sky-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-serif tracking-tight text-white">
            NET NEWS <span className="text-sky-400 font-sans font-bold">| تسجيل الدخول</span>
          </h1>
          <p className="text-xs text-slate-400">
            بوابة الإدارة المركزية المستقلة لشبكة نت نيوز الإخبارية
          </p>
        </div>

        {/* Success notification banner */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1">
              <span className="font-medium">{successMsg}</span>
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <span className="font-medium">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* 1. Primary Google Sign In Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={googleLoading || loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <>
                <Loader2 size={18} className="animate-spin text-sky-600" />
                <span>جارٍ التحقق بحساب Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>الدخول السريع بحساب Google ({ADMIN_EMAIL})</span>
              </>
            )}
          </button>

          {/* Separator */}
          <div className="relative flex items-center justify-center py-2">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-[#0b1a2d] px-3 text-[11px] text-slate-500 whitespace-nowrap">
              أو بالبريد الإلكتروني وكلمة المرور
            </span>
            <div className="border-t border-slate-800 w-full"></div>
          </div>
        </div>

        {/* 2. Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div className="space-y-1.5 text-right">
            <label className="block text-xs font-semibold text-slate-300">
              البريد الإلكتروني للمدير
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="laieth772@gmail.com"
                disabled={loading || googleLoading}
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pr-10 pl-3.5 text-sm text-white placeholder-slate-500 transition-colors disabled:opacity-50 text-left font-mono"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5 text-right">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                كلمة المرور
              </label>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetLoading}
                className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
              >
                {resetLoading ? 'جارٍ الإرسال...' : 'نسيت كلمة المرور؟'}
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading || googleLoading}
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2.5 pr-10 pl-11 text-sm text-white placeholder-slate-500 transition-colors disabled:opacity-50 text-left font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-sky-600/25 text-sm cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>جارٍ التحقق وتوثيق الدخول...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>تسجيل الدخول بالبريد وكلمة المرور</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Site Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToSite}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white py-2.5 px-4 rounded-xl text-xs transition-colors border border-slate-800 cursor-pointer"
          >
            <Globe size={14} />
            <span>العودة إلى الواجهة الرئيسية للموقع</span>
          </button>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Lock size={12} className="text-emerald-500" />
          <span>جلسة مشفرة ومحمية بقواعد أمان Firestore الحصرية للمدير</span>
        </div>
      </div>
    </div>
  );
};
