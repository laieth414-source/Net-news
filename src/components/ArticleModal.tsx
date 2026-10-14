import React, { useState } from 'react';
import { Article } from '../types/news';
import { NewsImage } from './NewsImage';
import {
  X,
  Clock,
  Eye,
  Share2,
  Printer,
  Bookmark,
  Check,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

interface ArticleModalProps {
  article: Article | null;
  onClose: () => void;
  onSelectArticle: (articleId: string) => void;
  relatedArticles: Article[];
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  article,
  onClose,
  onSelectArticle,
  relatedArticles,
}) => {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [copied, setCopied] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  if (!article) return null;

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

  const fontClass =
    fontSize === 'xlarge'
      ? 'text-xl leading-loose'
      : fontSize === 'large'
      ? 'text-lg leading-relaxed'
      : 'text-base leading-relaxed';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden my-auto border border-slate-200 flex flex-col max-h-[95vh]">
        {/* Sticky Utility Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded">
              {article.categoryName}
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">·</span>
            <span className="text-xs text-slate-500 hidden sm:inline">{article.source}</span>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 text-slate-600">
            {/* Font size toggles */}
            <div className="flex items-center border border-slate-200 rounded p-0.5 text-xs">
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-1 rounded ${fontSize === 'normal' ? 'bg-slate-100 font-bold text-slate-900' : 'hover:bg-slate-50'}`}
                title="حجم خط عادي"
              >
                أ
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2 py-1 rounded ${fontSize === 'large' ? 'bg-slate-100 font-bold text-slate-900' : 'hover:bg-slate-50'}`}
                title="حجم خط متوسط"
              >
                أ+
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-2 py-1 rounded ${fontSize === 'xlarge' ? 'bg-slate-100 font-bold text-slate-900' : 'hover:bg-slate-50'}`}
                title="حجم خط كبير"
              >
                أ++
              </button>
            </div>

            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              title={isBookmarked ? 'تم الحفظ' : 'حفظ المقال'}
              className={`p-2 rounded hover:bg-slate-100 transition-colors ${isBookmarked ? 'text-sky-800' : ''}`}
            >
              <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleShare}
              title="نسخ الرابط"
              className="p-2 rounded hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
              {copied && <span className="text-emerald-700 text-[11px]">تم النسخ</span>}
            </button>

            <button
              onClick={handlePrint}
              title="طباعة المقال"
              className="p-2 rounded hover:bg-slate-100 transition-colors hidden sm:block"
            >
              <Printer size={16} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors ml-1"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Article Body */}
        <div className="overflow-y-auto px-4 sm:px-8 md:px-12 py-6 sm:py-8 space-y-6">
          {/* Headline and Deck */}
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-950 font-heading leading-tight mb-4">
              {article.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-700 font-normal leading-relaxed border-r-2 border-sky-800 pr-3.5 mb-6">
              {article.deck}
            </p>

            {/* Bylines and Source */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                {article.author ? (
                  <div>
                    <span className="font-semibold text-slate-800">{article.author.name}</span>
                    {article.author.role && (
                      <span className="text-slate-400 block text-[11px]">{article.author.role}</span>
                    )}
                  </div>
                ) : (
                  <span className="font-semibold text-slate-800">{article.source}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {article.publishedAt}
                </span>
                <span aria-hidden="true">·</span>
                <span>{article.readTime}</span>
                {article.viewsCount && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {article.viewsCount}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Featured Graphic */}
          <div className="rounded-lg overflow-hidden border border-slate-200">
            <NewsImage
              category={article.categoryName}
              title={article.title}
              imageUrl={article.imageUrl}
              type="lead"
              caption={article.imageCaption}
            />
            {article.imageCaption && (
              <p className="bg-slate-50 px-4 py-2 text-xs text-slate-500 font-light border-t border-slate-200">
                {article.imageCaption}
              </p>
            )}
          </div>

          {/* Key Points Box */}
          {article.keyPoints && article.keyPoints.length > 0 && (
            <div className="bg-sky-50/70 border border-sky-100 rounded-lg p-5">
              <h3 className="text-sm font-bold text-sky-950 mb-2">أبرز النقاط والمحاور:</h3>
              <ul className="space-y-2 text-sm text-sky-900">
                {article.keyPoints.map((kp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-sky-700 font-bold mt-0.5">•</span>
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Paragraphs */}
          <div className={`space-y-5 text-slate-800 font-normal ${fontClass}`}>
            {article.content.map((p, idx) => (
              <p key={idx} className="leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-200">
              <span className="text-xs font-semibold text-slate-500 block mb-2">المواضيع ذات الصلة:</span>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded transition-colors"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related Articles Strip */}
          {relatedArticles.length > 0 && (
            <div className="pt-8 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 font-heading mb-4">
                قد يهمك أيضاً في هذا السياق
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedArticles.slice(0, 4).map((rel) => (
                  <a
                    key={rel.id}
                    href={`/article/${encodeURIComponent(rel.id)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectArticle(rel.id);
                    }}
                    className="border border-slate-200 rounded-lg p-4 hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer group block text-right"
                  >
                    <span className="text-[11px] font-semibold text-sky-800 block mb-1">
                      {rel.categoryName}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-900 line-clamp-2">
                      {rel.title}
                    </h4>
                    <span className="text-xs text-slate-400 mt-2 block">{rel.timestamp}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>NET NEWS | نت نيوز · شبكة إخبارية مستقلة</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-medium transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
