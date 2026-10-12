import React, { useState, useMemo } from 'react';
import { Article } from '../types/news';
import { Search, X, Clock, ArrowUpLeft } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  onSelectArticle: (articleId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  articles,
  onSelectArticle,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filteredResults = useMemo(() => {
    if (!query.trim() && selectedCat === 'all') {
      return articles.slice(0, 6);
    }
    const q = query.trim().toLowerCase();
    return articles.filter((art) => {
      const matchesCat = selectedCat === 'all' || art.categoryId === selectedCat;
      const matchesText =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.deck.toLowerCase().includes(q) ||
        art.categoryName.toLowerCase().includes(q) ||
        (art.tags && art.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesCat && matchesText;
    });
  }, [query, selectedCat, articles]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden my-auto border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الأخبار والتقارير والملفات الاستراتيجية..."
            autoFocus
            className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              مسح
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Category Filters */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="text-slate-400 shrink-0">تصفية:</span>
          {[
            { id: 'all', label: 'الكل' },
            { id: 'world', label: 'العالم' },
            { id: 'arab', label: 'عربية' },
            { id: 'gulf', label: 'الخليج' },
            { id: 'economy', label: 'اقتصاد' },
            { id: 'sports', label: 'رياضة' },
            { id: 'tech', label: 'تكنولوجيا' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                selectedCat === c.id
                  ? 'bg-sky-800 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Results List */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>
              {query.trim()
                ? `النتائج المطابقة (${filteredResults.length})`
                : 'أحدث التغطيات الإخبارية'}
            </span>
          </div>

          {filteredResults.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">لم يتم العثور على نتائج تطابق «{query}»</p>
              <p className="text-xs text-slate-400 mt-1">
                جرب البحث بكلمات دلالية مختلفة أو اختر أحد الأقسام الرئيسية
              </p>
            </div>
          ) : (
            filteredResults.map((art) => (
              <div
                key={art.id}
                onClick={() => {
                  onSelectArticle(art.id);
                  onClose();
                }}
                className="p-3.5 rounded-lg border border-slate-100 hover:border-sky-300 hover:bg-sky-50/40 transition-all cursor-pointer group flex justify-between items-start gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-sky-800">{art.categoryName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {art.timestamp}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-900 leading-snug">
                    {art.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-1">{art.deck}</p>
                </div>
                <ArrowUpLeft
                  size={16}
                  className="text-slate-400 group-hover:text-sky-800 shrink-0 mt-1 transition-transform group-hover:translate-x-[-2px]"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
