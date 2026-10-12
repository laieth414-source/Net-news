import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Server,
  Lock,
  ExternalLink,
  AlertTriangle,
  Code2,
  Copy,
  Check,
  Play
} from 'lucide-react';
import { ADMIN_EMAIL, firebaseConfig, populateFirestoreData, testFirestoreAdminPermissions } from '../../lib/firebase';
import { User } from 'firebase/auth';

interface AdminStatusViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  firestoreArticleCount: number;
}

export const AdminStatusView: React.FC<AdminStatusViewProps> = ({
  currentUser,
  isAdmin,
  firestoreArticleCount,
}) => {
  const [seeding, setSeeding] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);

  // Live Permission Diagnostic State
  const [testingPerms, setTestingPerms] = useState(false);
  const [permTestResult, setPermTestResult] = useState<{
    tested: boolean;
    canWrite: boolean;
    canRead: boolean;
    userEmail: string | null;
    error?: string;
    code?: string;
  } | null>(null);

  const FIRESTORE_RULES_TEXT = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // دوال التحقق الأمنية
    function isSignedIn() {
      return request.auth != null;
    }

    // التحقق من هوية المشرف المعتمد (laieth772@gmail.com):
    function isAuthorizedAdmin() {
      return isSignedIn() && (
        request.auth.token.email == 'laieth772@gmail.com' ||
        request.auth.token.email.matches('(?i)laieth772@gmail[.]com') ||
        exists(/databases/$(database)/documents/admins/$(request.auth.uid))
      );
    }

    // 1. مجموعة الأخبار والمقالات (articles)
    match /articles/{articleId} {
      allow read: if true;
      allow create, update, delete: if isAuthorizedAdmin();
    }

    // 2. مجموعة الأخبار العاجلة (breakingNews)
    match /breakingNews/{newsId} {
      allow read: if true;
      allow create, update, delete: if isAuthorizedAdmin();
    }

    // 3. مجموعة التصنيفات والأقسام (categories)
    match /categories/{categoryId} {
      allow read: if true;
      allow create, update, delete: if isAuthorizedAdmin();
    }

    // 4. إعدادات الموقع العامة (siteSettings)
    match /siteSettings/{settingId} {
      allow read: if true;
      allow create, update, delete: if isAuthorizedAdmin();
    }

    // 5. صفحات الموقع والسياسات (staticPages)
    match /staticPages/{pageId} {
      allow read: if true;
      allow create, update, delete: if isAuthorizedAdmin();
    }

    // 6. مجموعة مشتركي النشرة البريدية (newsletterSubscribers)
    match /newsletterSubscribers/{subscriberId} {
      allow create: if request.resource.data.email is string &&
                    request.resource.data.email.size() >= 5 &&
                    request.resource.data.email.size() <= 200;
      allow read, update, delete: if isAuthorizedAdmin();
    }

    // 7. مجموعة المشرفين المعتمدين (admins)
    match /admins/{adminId} {
      allow read: if isSignedIn();
      allow write: if isAuthorizedAdmin();
    }

    // 8. سجل التدقيق الإداري (auditLogs)
    match /auditLogs/{logId} {
      allow read, create: if isAuthorizedAdmin();
      allow update, delete: if false;
    }

    // 9. أحداث وإحصائيات الزوار (analyticsEvents)
    match /analyticsEvents/{eventId} {
      allow create: if request.resource.data.visitorId is string;
      allow read, update, delete: if isAuthorizedAdmin();
    }

    // 10. الزوار النشطون حالياً (activeVisitors)
    match /activeVisitors/{visitorId} {
      allow create, update: if true;
      allow read, delete: if isAuthorizedAdmin();
    }

    // 11. القفل الافتراضي الشامل
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_TEXT);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
  };

  const handleRunPermDiagnostic = async () => {
    setTestingPerms(true);
    try {
      const res = await testFirestoreAdminPermissions();
      setPermTestResult({
        tested: true,
        canWrite: res.canWrite,
        canRead: res.canRead,
        userEmail: res.userEmail,
        error: res.error,
        code: res.code,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPermTestResult({
        tested: true,
        canWrite: false,
        canRead: false,
        userEmail: currentUser?.email || null,
        error: msg,
      });
    } finally {
      setTestingPerms(false);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    setResultMsg(null);
    try {
      const res = await populateFirestoreData();
      if (res.success) {
        setResultMsg({
          type: 'success',
          text: `تم بنجاح! تم رفع ومزامنة ${res.count} مادة تحريرية إلى مجموعتي articles و breakingNews في قاعدة بياناتك.`,
        });
      } else {
        setResultMsg({
          type: 'error',
          text: `تعذر الرفع: ${res.error || 'تأكد من تطبيق قواعد الأمان المعتمدة في Firebase Console'}.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResultMsg({ type: 'error', text: `خطأ: ${msg}` });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">
            حالة النظام والبنية السحابية لـ Firebase
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            بيانات الربط بقاعدة بيانات Cloud Firestore وحسابات المشرفين المعتمدة
          </p>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Firebase متصل ويعمل</span>
        </div>
      </div>

      {/* Live Permissions Diagnostic Tool Box */}
      <div className="bg-[#0b1a2d] border border-sky-800/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading">
                فاحص صلاحيات الكتابة والنشر وقواعد Firestore المباشر
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                يقوم هذا الفاحص بمحاكاة فورية لعملية كتابة وتأكيد حفظ مستند في Firestore بحساب المشرف الحالي
              </p>
            </div>
          </div>

          <button
            onClick={handleRunPermDiagnostic}
            disabled={testingPerms}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer self-start sm:self-auto"
          >
            {testingPerms ? (
              <>
                <RefreshCw size={15} className="animate-spin text-white" />
                <span>جارٍ فحص الصلاحيات...</span>
              </>
            ) : (
              <>
                <Play size={15} />
                <span>إجراء فحص فوري للصلاحيات</span>
              </>
            )}
          </button>
        </div>

        {/* Test Result Display */}
        {permTestResult && (
          <div
            className={`p-4 rounded-xl text-xs space-y-2 border ${
              permTestResult.canWrite
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/60 border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {permTestResult.canWrite ? (
                <>
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <span>الصلاحيات مؤكدة وتعمل 100% بنجاح ✓</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                  <span>تم رفض إذن الكتابة في Firestore (PERMISSION_DENIED)</span>
                </>
              )}
            </div>

            {permTestResult.canWrite ? (
              <p className="text-xs text-emerald-100 leading-relaxed">
                حساب المشرف ({permTestResult.userEmail}) لديه صلاحيات القراءة والكتابة والحفظ المباشرة على قاعدة البيانات. أي مقال يتم حفظه أو نشره سيُسجل فوراً في السحابة ويبقى دائماً بعد تحديث الصفحة.
              </p>
            ) : (
              <div className="space-y-2 text-xs text-rose-100 leading-relaxed">
                <p>
                  <strong>سبب الخطأ:</strong> قواعد Firestore المنشورة حالياً في Firebase Console لمشروعك ترفض إذن الكتابة (PERMISSION_DENIED).
                </p>
                <div className="p-3 bg-black/40 rounded-lg border border-rose-900/50 space-y-1.5 text-[11px]">
                  <p className="font-semibold text-rose-300">خطوات تفعيل الصلاحية للمشرف (laieth772@gmail.com) في دقيقة واحدة:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>اضغط على زر <strong className="text-white">«نسخ القواعد بالكامل»</strong> أدناه.</li>
                    <li>
                      افتح لوحة تحكم فايربيس عبر الرابط المباشر:{' '}
                      <a
                        href="https://console.firebase.google.com/project/netnews-617e7/firestore/rules"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 underline font-mono inline-flex items-center gap-1 hover:text-sky-300"
                      >
                        Firebase Console &gt; Firestore &gt; Rules
                        <ExternalLink size={11} />
                      </a>
                    </li>
                    <li>استبدل القواعد الحالية بالقواعد المنسوخة واضغط <strong className="text-emerald-400">Publish</strong>.</li>
                    <li>ارجع إلى هذه الصفحة واضغط <strong className="text-sky-300">«إجراء فحص فوري للصلاحيات»</strong> لتتأكد من نجاح الكتابة.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {resultMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
            resultMsg.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          {resultMsg.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
          )}
          <span>{resultMsg.text}</span>
        </div>
      )}

      {/* Grid: Config Details & Security Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Firebase Config Info */}
        <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3 font-heading">
            <Server size={18} className="text-sky-400" />
            <span>معلومات مشروع Firebase الحالي</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">معرّف المشروع (Project ID):</span>
              <span className="font-mono text-sky-400 font-bold select-all">{firebaseConfig.projectId}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">نطاق المصادقة (Auth Domain):</span>
              <span className="font-mono text-slate-200 select-all">{firebaseConfig.authDomain}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">مستودع التخزين (Storage Bucket):</span>
              <span className="font-mono text-slate-200 select-all">{firebaseConfig.storageBucket}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">البريد الإلكتروني المعتمد للإدارة:</span>
              <span className="font-mono text-emerald-400 font-bold select-all">{ADMIN_EMAIL}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">حالة جلسة المدير الحالية:</span>
              <span className="font-semibold text-white">
                {currentUser ? `مسجل (${currentUser.email})` : 'زائر (غير مسجل)'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400">المقالات الحية في Firestore:</span>
              <span className="font-mono font-bold text-sky-400 text-sm">
                {firestoreArticleCount} مقالاً
              </span>
            </div>
          </div>
        </div>

        {/* Database Automatic Sync Status & Seeding Tool */}
        <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3 font-heading">
            <RefreshCw size={18} className="text-emerald-400" />
            <span>نظام الحفظ المباشر وقاعدة البيانات</span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-200">
              <CheckCircle2 size={15} />
              <span>الحفظ السحابي المباشر مفعل ونشط:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              جميع التغييرات التي تجريها في لوحة التحكم (إضافة أو تعديل أو نشر المقالات، الأخبار العاجلة، التصنيفات، والإعدادات) تُحفظ وتُثبت مباشرة في Cloud Firestore وتظهر فوراً للموقع العام دون وسائط تخزين مؤقتة.
            </p>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            الزر أدناه مخصص فقط لتغذية قاعدة البيانات بالمقالات التحريرية الأولية (Initial Seed) عند تدشين الموقع لأول مرة، ولا يلزم استخدامه في العمليات اليومية:
          </p>

          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="w-full flex items-center justify-center gap-2 bg-sky-600/80 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw size={16} className={seeding ? 'animate-spin' : ''} />
            <span>{seeding ? 'جارٍ رفع الأخبار إلى السحابة...' : 'تغذية السحابة بالأخبار الأولية (اختياري)'}</span>
          </button>
        </div>
      </div>

      {/* Firebase Security Rules Quick Copy Card */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm font-heading">
            <Lock size={18} className="text-amber-400" />
            <span>قواعد أمان وصلاحيات Firestore المعتمدة للمشروع</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://console.firebase.google.com/project/netnews-617e7/firestore/rules"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              <span>فتح صفحة القواعد في Console</span>
            </a>
            <button
              onClick={handleCopyRules}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {copiedRules ? (
                <>
                  <Check size={14} className="text-white" />
                  <span>تم نسخ القواعد!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>نسخ القواعد بالكامل</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          قواعد أمان محدثة ومضبوطة بدقة لحساب المشرف (<span className="text-emerald-300 font-mono font-semibold">{ADMIN_EMAIL}</span>) وتمنع أي مستخدم آخر من التعديل، مع إبقاء الزوار للقراءة فقط لجميع أقسام الموقع.
        </p>

        <pre className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed scrollbar-thin select-all">
          {FIRESTORE_RULES_TEXT}
        </pre>
      </div>
    </div>
  );
};
