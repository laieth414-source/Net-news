import React from 'react';
import { Article } from '../types/news';
import { NewsImage } from './NewsImage';
import { Clock, Eye, Share2, Bookmark, Flame, ArrowUpLeft } from 'lucide-react';
import { LATEST_STREAM } from '../data/newsData';

interface HeroSectionProps {
  leadArticle: Article;
  secondaryArticles: Article[];
  onSelectArticle: (articleId: string) => void;
  onBookmark?: (article: Article) => void;
  isBookmarked?: (articleId: string) => boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  leadArticle,
  secondaryArticles = [],
  onSelectArticle,
  onBookmark,
  isBookmarked,
}) => {
  if (!leadArticle) return null;

  return (
    <section className="my-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Area (8 Columns on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Lead Story (الخبر الرئيسي الكبير) */}
          <article
            onClick={() => onSelectArticle(leadArticle.id)}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer group"
          >
            {/* Visual Hero Container */}
            <div className="relative">
              <NewsImage
                category={leadArticle.categoryName}
                title={leadArticle.title}
                imageUrl={leadArticle.imageUrl}
                type="lead"
                iconType="gulf"
                caption={leadArticle.imageCaption}
              />
            </div>

            {/* Lead Story Body */}
            <div className="p-5 sm:p-7">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2.5">
                <span className="font-semibold text-sky-800">
                  {leadArticle.categoryName}
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {leadArticle.timestamp}
                </span>
                <span aria-hidden="true">·</span>
                <span>{leadArticle.source}</span>
                <span aria-hidden="true">·</span>
                <span>{leadArticle.readTime}</span>
              </div>

              {/* Lead Headline */}
              <h1 className="text-2xl sm:text-3xl lg:text-3.5xl font-bold text-slate-950 group-hover:text-sky-900 transition-colors leading-tight mb-3">
                {leadArticle.title}
              </h1>

              {/* Excerpt / Deck */}
              <p className="text-slate-700 text-sm sm:text-base leading-relaxed mb-4">
                {leadArticle.deck}
              </p>

              {/* Key Bullet Highlights if available */}
              {leadArticle.keyPoints && leadArticle.keyPoints.length > 0 && (
                <div className="bg-[#f8fafc] border border-slate-200/80 rounded-md p-4 mb-4">
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-700" />
                    أبرز نقاط البيان:
                  </h4>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700">
                    {leadArticle.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-sky-700 font-bold shrink-0 mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer bar of lead story */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  {leadArticle.author && (
                    <span className="font-medium text-slate-800">
                      بقلم: {leadArticle.author.name}
                    </span>
                  )}
                  {leadArticle.viewsCount && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Eye size={12} />
                        {leadArticle.viewsCount}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sky-800 font-semibold group-hover:translate-x-[-3px] transition-transform">
                  <span>قراءة التغطية كاملة</span>
                  <ArrowUpLeft size={16} />
                </div>
              </div>
            </div>
          </article>

          {/* Secondary Featured Stories (أخبار ثانوية متقدمة) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {secondaryArticles.slice(0, 2).map((article) => (
              <article
                key={article.id}
                onClick={() => onSelectArticle(article.id)}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <NewsImage
                    category={article.categoryName}
                    title={article.title}
                    imageUrl={article.imageUrl}
                    type="secondary"
                    caption={article.imageCaption}
                  />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <span className="font-semibold text-sky-800">
                        {article.categoryName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {article.timestamp}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-950 group-hover:text-sky-900 transition-colors leading-snug mb-2">
                      {article.title}
                    </h3>

                    <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                      {article.deck}
                    </p>
                  </div>
                </div>

                <div className="px-4 sm:px-5 pb-4 pt-1 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                  <span className="truncate max-w-[200px]">{article.source}</span>
                  <span className="text-sky-800 font-medium group-hover:underline flex items-center gap-0.5">
                    التفاصيل
                    <ArrowUpLeft size={13} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Sidebar Area: Latest News Stream (آخر الأخبار - 4 Columns on desktop) */}
        <aside className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-5 shadow-xs sticky top-16">
          {/* Header of Latest Stream */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                آخر الأخبار
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">تحديث مستمر</span>
          </div>

          {/* Timeline Feed */}
          <div className="divide-y divide-slate-100">
            {LATEST_STREAM.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  // Find matching article if any, or open lead
                  onSelectArticle(leadArticle.id);
                }}
                className="py-3 hover:bg-slate-50 -mx-2 px-2 rounded transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-xs font-mono font-bold text-sky-800 tabular-nums shrink-0 mt-0.5 bg-sky-50 px-1.5 py-0.5 rounded">
                    {item.time}
                  </span>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      {item.category}
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-slate-900 group-hover:text-sky-900 leading-snug">
                      {item.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Feed Action */}
          <div className="pt-4 mt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => onSelectArticle(secondaryArticles[0]?.id || leadArticle.id)}
              className="text-xs text-sky-800 hover:text-sky-950 font-semibold inline-flex items-center gap-1 hover:underline"
            >
              <span>عرض أرشيف آخر الأخبار بالكامل</span>
              <ArrowUpLeft size={13} />
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
};
