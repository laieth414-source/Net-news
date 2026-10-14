import React from 'react';
import { CATEGORIES } from '../data/newsData';
import { CategoryId } from '../types/news';
import { X, ChevronLeft, Globe, Radio, Bookmark, Mail, ShieldCheck } from 'lucide-react';
import { STATIC_PAGES_DATA, StaticPageDetail } from '../data/staticPagesData';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: CategoryId;
  onSelectCategory: (categoryId: CategoryId) => void;
  onOpenAdmin?: () => void;
  onOpenPage?: (pageSlug: string) => void;
  staticPages?: Record<string, StaticPageDetail>;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeCategory,
  onSelectCategory,
  onOpenAdmin,
  onOpenPage,
  staticPages,
}) => {
  if (!isOpen) return null;

  const pagesSource = staticPages || STATIC_PAGES_DATA;
  const uniquePages = Object.values(pagesSource).reduce<StaticPageDetail[]>((acc, current) => {
    if (!acc.some((p) => p.slug === current.slug)) {
      acc.push(current);
    }
    return acc;
  }, []);

  const drawerPages = uniquePages
    .filter((p) => p.showInFooter !== false && p.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#0b1a2d] text-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#162d4a] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold font-serif text-lg tracking-tight">
              <span>NET NEWS</span>
              <span className="text-sky-400 font-sans">| نت نيوز</span>
            </div>
            <p className="text-[11px] text-slate-400">بوابة الأخبار العربية المستقلة</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#162d4a] text-slate-400 hover:text-white transition-colors"
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Categories List */}
        <div className="p-4 space-y-1 flex-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-3 py-1">
            الأقسام الرئيسية
          </span>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const href = cat.id === 'all' ? '/' : `/#${cat.id}`;
            return (
              <a
                key={cat.id}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectCategory(cat.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded text-sm font-semibold transition-colors text-right ${
                  isActive
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-300 hover:bg-[#162d4a] hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
                <ChevronLeft size={16} className="text-slate-400" />
              </a>
            );
          })}

          <div className="pt-4 mt-4 border-t border-[#162d4a]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-3 py-1 mb-1">
              خدمات المحتوى
            </span>
            <div className="space-y-1 text-sm text-slate-300">
              <a
                href="#most-read"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#162d4a] rounded transition-colors"
              >
                <Globe size={16} className="text-sky-400" />
                <span>الأكثر قراءة وتداولاً</span>
              </a>
              <a
                href="#opinions"
                onClick={onClose}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#162d4a] rounded transition-colors"
              >
                <Radio size={16} className="text-emerald-400" />
                <span>أعمدة الرأي والتحليلات</span>
              </a>
              {onOpenAdmin && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#162d4a] rounded transition-colors text-right text-sky-400 font-semibold cursor-pointer"
                >
                  <ShieldCheck size={16} className="text-sky-400" />
                  <span>لوحة تحكم الإدارة</span>
                </button>
              )}
            </div>

            {onOpenPage && (
              <div className="pt-3 mt-3 border-t border-[#162d4a]">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-3 py-1 mb-1">
                  المعايير والسياسات التحريرية
                </span>
                <div className="space-y-1 text-xs text-slate-300">
                  {drawerPages.map((page) => (
                    <button
                      key={page.slug || page.id}
                      onClick={() => {
                        onClose();
                        onOpenPage(page.slug);
                      }}
                      className="w-full text-right px-3 py-1.5 hover:text-sky-400 hover:bg-[#162d4a] rounded transition-colors block cursor-pointer font-medium"
                    >
                      {page.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-5 border-t border-[#162d4a] bg-[#071322] text-xs text-slate-400 space-y-3">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck size={14} className="text-sky-400" />
            <span>التزام كامل بالمعايير الصحفية والمهنية</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            جميع الحقوق محفوظة لشبكة نت نيوز الإخبارية © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};
