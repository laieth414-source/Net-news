import React, { useState } from 'react';
import { Mail, CheckCircle2, ShieldCheck, Rss, Globe2, Loader2 } from 'lucide-react';
import { CATEGORIES } from '../data/newsData';
import { CategoryId } from '../types/news';
import { addNewsletterSubscriber } from '../lib/firebase';
import { STATIC_PAGES_DATA, StaticPageDetail } from '../data/staticPagesData';

interface FooterProps {
  onSelectCategory: (categoryId: CategoryId) => void;
  onOpenAdmin?: () => void;
  onOpenPage?: (pageSlug: string) => void;
  staticPages?: Record<string, StaticPageDetail>;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onOpenAdmin,
  onOpenPage,
  staticPages
}) => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pagesSource = staticPages || STATIC_PAGES_DATA;
  const uniquePages = Object.values(pagesSource).reduce<StaticPageDetail[]>((acc, current) => {
    if (!acc.some((p) => p.slug === current.slug)) {
      acc.push(current);
    }
    return acc;
  }, []);

  const footerPages = uniquePages
    .filter((p) => p.showInFooter !== false && p.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      setIsSubmitting(true);
      try {
        await addNewsletterSubscriber(email);
        setIsSubscribed(true);
        setEmail('');
      } catch (err) {
        console.error('Error saving subscriber:', err);
        // Still show confirmation to avoid visitor friction
        setIsSubscribed(true);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <footer className="bg-[#0b1a2d] text-white border-t-4 border-sky-700 mt-16 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-slate-800">
          {/* Brand & Editorial Mission (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-serif tracking-tight">NET NEWS</span>
              <span className="text-xl font-extrabold text-sky-400 font-sans">| نت نيوز</span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              شبكة إخبارية عربية رقمية مستقلة تُعنى بتقديم صحافة موضوعية رصينة، وتغطية دقيقة
              للأحداث العالمية والإقليمية، والتحليلات السياسية والاقتصادية المعمقة وفق أعلى المعايير المهنية.
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
              <ShieldCheck size={16} className="text-sky-400 shrink-0" />
              <span>ملتزمون بمبادئ النزاهة والمصداقية والتحقق من المصادر</span>
            </div>
          </div>

          {/* Department Links (4 cols) */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-bold text-white mb-3 font-heading border-r-2 border-sky-600 pr-2">
                الأقسام الإخبارية
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {CATEGORIES.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <a
                      href={c.id === 'all' ? '/' : `/#${c.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectCategory(c.id);
                      }}
                      className="hover:text-sky-400 hover:underline transition-colors text-right inline-block"
                    >
                      {c.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-3 font-heading border-r-2 border-sky-600 pr-2">
                تغطيات متخصصة
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {CATEGORIES.slice(5).map((c) => (
                  <li key={c.id}>
                    <a
                      href={`/#${c.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectCategory(c.id);
                      }}
                      className="hover:text-sky-400 hover:underline transition-colors text-right inline-block"
                    >
                      {c.name}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#most-read" className="hover:text-sky-400 hover:underline transition-colors">
                    الأكثر قراءة
                  </a>
                </li>
                <li>
                  <a href="#opinions" className="hover:text-sky-400 hover:underline transition-colors">
                    مقالات الرأي
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Newsletter & Subscriptions (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-sm font-bold text-white font-heading border-r-2 border-sky-600 pr-2">
              النشرة البريدية الصباحية
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              اشترك في «موجز نت نيوز» اليومي لتصلك أهم العناوين والتحليلات إلى بريدك الإلكتروني كل صباح.
            </p>

            {isSubscribed ? (
              <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 rounded text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>شكراً لاهتمامك! تم تسجيل بريدك في النشرة الصباحية بنجاح.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني..."
                    className="flex-1 bg-[#162d4a] border border-slate-700 text-white placeholder:text-slate-400 text-xs px-3 py-2 rounded focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded transition-colors shrink-0"
                  >
                    اشتراك
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  نحترم خصوصيتك بالكامل. يمكنك إلغاء الاشتراك في أي وقت.
                </span>
              </form>
            )}

            <div className="pt-2 flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1 hover:text-slate-200 cursor-pointer">
                <Rss size={13} className="text-amber-500" />
                خلاصة الأخبار RSS
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 hover:text-slate-200 cursor-pointer">
                <Globe2 size={13} className="text-sky-400" />
                طبعة الهواتف الذكية
              </span>
            </div>
          </div>
        </div>

        {/* Legal & Editorial Standards Row */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {footerPages.map((page, idx) => (
              <React.Fragment key={page.slug || page.id}>
                {idx > 0 && <span>·</span>}
                <a
                  href={`/page/${page.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenPage?.(page.slug);
                  }}
                  className="hover:text-sky-300 text-slate-300 transition-colors cursor-pointer text-right font-medium"
                >
                  {page.title}
                </a>
              </React.Fragment>
            ))}
            {onOpenAdmin && (
              <>
                {footerPages.length > 0 && <span>·</span>}
                <button
                  onClick={onOpenAdmin}
                  className="hover:text-sky-400 text-slate-400 font-medium transition-colors"
                >
                  بوابة الإدارة
                </button>
              </>
            )}
          </div>

          <p className="text-[11px] text-slate-400 font-mono">
            جميع الحقوق محفوظة © {new Date().getFullYear()} NET NEWS | نت نيوز
          </p>
        </div>
      </div>
    </footer>
  );
};
