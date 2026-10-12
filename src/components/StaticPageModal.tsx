import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Printer,
  Check,
  ShieldCheck,
  FileCheck2,
  FileText,
  Lock,
  Mail,
  Building2,
  Info,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Send,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { STATIC_PAGES_DATA, StaticPageDetail } from '../data/staticPagesData';

interface StaticPageModalProps {
  pageSlug: string | null;
  onClose: () => void;
  onSelectPage: (slug: string) => void;
  staticPages?: Record<string, StaticPageDetail>;
}

export const StaticPageModal: React.FC<StaticPageModalProps> = ({
  pageSlug,
  onClose,
  onSelectPage,
  staticPages,
}) => {
  const [copied, setCopied] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    department: 'general',
    message: '',
  });
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!pageSlug) return null;

  // Resolve page data by slug or fallback
  const pagesSource = staticPages || STATIC_PAGES_DATA;
  const page: StaticPageDetail | undefined =
    pagesSource[pageSlug] ||
    Object.values(pagesSource).find((p) => p.slug === pageSlug || p.id === pageSlug) ||
    STATIC_PAGES_DATA[pageSlug] ||
    Object.values(STATIC_PAGES_DATA).find((p) => p.slug === pageSlug || p.id === pageSlug);

  if (!page) return null;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
      setContactForm({
        name: '',
        email: '',
        department: 'general',
        message: '',
      });
    }, 600);
  };

  const getPageIcon = (slug: string) => {
    switch (slug) {
      case 'about-us':
        return <Info className="text-sky-400" size={24} />;
      case 'editorial-code':
        return <ShieldCheck className="text-sky-400" size={24} />;
      case 'corrections-policy':
        return <FileCheck2 className="text-emerald-400" size={24} />;
      case 'terms-of-use':
        return <FileText className="text-amber-400" size={24} />;
      case 'privacy-policy':
        return <Lock className="text-indigo-400" size={24} />;
      case 'contact-us':
        return <Mail className="text-rose-400" size={24} />;
      default:
        return <FileText className="text-sky-400" size={24} />;
    }
  };

  const uniquePages = Object.values(pagesSource).reduce<StaticPageDetail[]>((acc, current) => {
    if (!acc.some((p) => p.slug === current.slug)) {
      acc.push(current);
    }
    return acc;
  }, []);

  const allPagesList = uniquePages
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((p) => ({ slug: p.slug, title: p.title }));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Sticky Header Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
              title="إغلاق والعودة للموقع"
            >
              <ArrowRight size={18} />
              <span className="hidden sm:inline">العودة للرئيسية</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-black font-serif text-[#0f223d] tracking-tight">NET NEWS</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-medium">
                {page.badge}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="مشاركة الرابط"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-emerald-700 hidden sm:inline">تم النسخ</span>
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  <span className="hidden sm:inline">مشاركة</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors hidden sm:flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="طباعة الوثيقة"
            >
              <Printer size={16} />
              <span>طباعة</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Document Content */}
        <div className="overflow-y-auto px-4 sm:px-8 md:px-12 py-6 sm:py-8 space-y-8 flex-1">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <button onClick={onClose} className="hover:text-sky-600 transition-colors">
              الرئيسية
            </button>
            <ChevronRight size={14} className="rotate-180 text-slate-300" />
            <span className="text-slate-500">السياسات والمعايير التحريرية</span>
            <ChevronRight size={14} className="rotate-180 text-slate-300" />
            <span className="text-sky-700 font-semibold">{page.title}</span>
          </nav>

          {/* Hero Document Header */}
          <header className="border-b border-slate-200 pb-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-slate-900 rounded-xl shrink-0 shadow-md">
                {getPageIcon(page.slug)}
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-serif text-slate-900 leading-tight">
                  {page.title}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {page.subtitle}
                </p>
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                <span>آخر تحديث: {page.lastUpdated}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                <span>{page.readingTime}</span>
              </span>
              <span>·</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                وثيقة رسمية معتمدة لشبكة NET NEWS
              </span>
            </div>

            {/* Document Abstract Card */}
            <div className="p-4 bg-slate-50 rounded-xl border-r-4 border-sky-600 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {page.excerpt}
            </div>
          </header>

          {/* Sections Body */}
          <div className="space-y-8 text-slate-800">
            {page.sections.map((section, idx) => (
              <section key={idx} className="space-y-3.5">
                <h2 className="text-lg sm:text-xl font-bold font-serif text-[#0f223d] pb-1 border-b border-slate-100">
                  {section.heading}
                </h2>
                <div className="space-y-3 text-sm sm:text-base leading-relaxed text-slate-700">
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>

                {section.bulletPoints && section.bulletPoints.length > 0 && (
                  <ul className="space-y-2 pt-1 pr-2">
                    {section.bulletPoints.map((point, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-2 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Bureau Cards (for Contact Us if provided) */}
          {page.bureaus && page.bureaus.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-sky-600" />
                <h2 className="text-lg sm:text-xl font-bold font-serif text-[#0f223d]">
                  المكاتب التحريرية الإقليمية
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                شبكة مراسلينا ومكاتبنا في العواصم الإقليمية والدولية الرئيسية:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {page.bureaus.map((bureau, bIdx) => (
                  <div
                    key={bIdx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">
                        مكتب {bureau.city}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {bureau.country}
                      </span>
                    </div>
                    <span className="text-xs text-sky-800 font-medium block">
                      {bureau.role}
                    </span>
                    <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span>{bureau.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span dir="ltr">{bureau.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <a
                          href={`mailto:${bureau.email}`}
                          className="text-sky-600 hover:underline"
                        >
                          {bureau.email}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Contact Form (for Contact Us) */}
          {page.slug === 'contact-us' && (
            <div className="p-6 bg-gradient-to-br from-slate-50 to-sky-50/50 rounded-2xl border border-sky-200 space-y-4">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-sky-600" />
                <h3 className="font-bold text-[#0f223d] text-base sm:text-lg">
                  إرسال رسالة مباشرة إلى هيئة التحرير
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                املأ النموذج التالي وسيتم تحويل رسالتك مباشرة إلى رئيس القسم المعني في غرفة الأخبار:
              </p>

              {isSent ? (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-1">تم إرسال رسالتك بنجاح!</strong>
                    <span>شكراً لتواصلك مع NET NEWS. يقوم فريق التحرير بمراجعة الرسائل والتواصل معك عبر بريدك الإلكتروني.</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitContact} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        الاسم الكامل *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="أدخل اسمك الكريم..."
                        className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        البريد الإلكتروني *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="أدخل بريدك الإلكتروني..."
                        className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-sky-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      القسم المعني بالرسالة
                    </label>
                    <select
                      value={contactForm.department}
                      onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-sky-600"
                    >
                      <option value="general">استفسار عام أو اقتراح</option>
                      <option value="newsdesk">غرفة الأخبار والبيانات الصحفية</option>
                      <option value="opinion">مقالات الرأي والتحليلات</option>
                      <option value="corrections">طلب تصحيح أو تدقيق حقيقة</option>
                      <option value="legal">الشؤون القانونية وحقوق النشر</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      نص الرسالة أو البيان الصحفي *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="اكتب رسالتك أو تفاصيل الخبر المراد إيصاله لهيئة التحرير..."
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      بياناتك محفوظة وفق سياسة الخصوصية لـ NET NEWS.
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Send size={14} />
                      <span>{isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Quick Switcher Between All Legal/Editorial Pages */}
          <div className="pt-6 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              تصفح الوثائق والسياسات الأخرى:
            </h4>
            <div className="flex flex-wrap gap-2">
              {allPagesList.map((item) => {
                const isActive = item.slug === page.slug;
                return (
                  <button
                    key={item.slug}
                    onClick={() => {
                      setIsSent(false);
                      onSelectPage(item.slug);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                      isActive
                        ? 'bg-[#0f223d] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-mono">
            جميع الحقوق محفوظة © {new Date().getFullYear()} NET NEWS | نت نيوز
          </p>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            إغلاق الوثيقة
          </button>
        </div>
      </div>
    </div>
  );
};
