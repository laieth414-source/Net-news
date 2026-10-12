import React, { useState, useEffect } from 'react';
import { BreakingNewsItem } from '../types/news';
import { ChevronRight, ChevronLeft, Pause, Play } from 'lucide-react';

interface BreakingBarProps {
  items: BreakingNewsItem[];
  onSelectArticle: (articleId: string) => void;
}

export const BreakingBar: React.FC<BreakingBarProps> = ({ items = [], onSelectArticle }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Reset index if items change and index is out of bounds
  useEffect(() => {
    if (items && currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [items, currentIndex]);

  // Rotate items
  useEffect(() => {
    if (isPaused || !items || items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, items]);

  if (!items || items.length === 0) return null;

  const safeIndex = items.length > 0 ? Math.min(currentIndex, items.length - 1) : 0;
  const current = items[safeIndex];

  if (!current) return null;

  const handleNext = () => {
    if (items.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }
  };

  const handlePrev = () => {
    if (items.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    }
  };

  return (
    <div className="bg-[#0f172a] text-slate-100 border-b border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-10 gap-3">
          {/* Breaking Label */}
          <div className="flex items-center gap-1.5 bg-[#dc2626] text-white px-3 py-1 font-bold text-xs uppercase tracking-wider shrink-0 rounded-xs shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>عاجل</span>
          </div>

          {/* Ticker Content */}
          <div className="flex-1 overflow-hidden">
            <div
              key={current.id || safeIndex}
              onClick={() => current.articleId && onSelectArticle(current.articleId)}
              className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors group truncate"
            >
              <span className="text-red-400 text-xs font-semibold shrink-0">
                [{current.category || 'عاجل'}]
              </span>
              {current.articleId ? (
                <a
                  href={`/article/${current.articleId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectArticle(current.articleId!);
                  }}
                  className="truncate text-xs sm:text-sm text-slate-200 group-hover:underline"
                >
                  {current.text || ''}
                </a>
              ) : (
                <p className="truncate text-xs sm:text-sm text-slate-200 group-hover:underline">
                  {current.text || ''}
                </p>
              )}
              {current.time && (
                <span className="text-slate-500 text-xs shrink-0 font-light hidden md:inline">
                  {current.time}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0 text-slate-400">
            <button
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'تشغيل الشريط' : 'إيقاف مؤقت'}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
              aria-label={isPaused ? 'استئناف' : 'إيقاف'}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
            </button>
            <button
              onClick={handlePrev}
              title="الخبر السابق"
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
              aria-label="السابق"
            >
              <ChevronRight size={15} />
            </button>
            <button
              onClick={handleNext}
              title="الخبر التالي"
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
              aria-label="التالي"
            >
              <ChevronLeft size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
