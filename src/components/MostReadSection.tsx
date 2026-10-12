import React from 'react';
import { Article } from '../types/news';
import { SectionHeader } from './SectionHeader';
import { TrendingUp, Eye, Clock } from 'lucide-react';

interface MostReadSectionProps {
  articles: Article[];
  onSelectArticle: (articleId: string) => void;
}

export const MostReadSection: React.FC<MostReadSectionProps> = ({
  articles = [],
  onSelectArticle,
}) => {
  if (!articles || articles.length === 0) return null;

  return (
    <section className="my-10 bg-slate-900 text-white rounded-xl p-6 sm:p-8">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-600/30 text-sky-400 rounded">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading">
              الأكثر قراءة وتفاعلاً
            </h2>
            <p className="text-xs text-slate-400">
              المقالات والتقارير الأكثر تداولاً خلال الساعات الـ 24 الماضية
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          ترتيب حسب التفاعل
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {articles.map((item, index) => {
          const rankNum = (index + 1).toString().padStart(2, '0');
          return (
            <article
              key={item.id}
              onClick={() => onSelectArticle(item.id)}
              className="flex flex-col justify-between group cursor-pointer border-b lg:border-b-0 lg:border-l border-slate-800 pb-5 lg:pb-0 lg:pl-5 last:border-none"
            >
              <div>
                {/* Ranking Number */}
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold text-slate-700 group-hover:text-sky-400 transition-colors tabular-nums">
                    {rankNum}
                  </span>
                  <span className="text-[11px] font-semibold text-sky-400">
                    {item.categoryName}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-sky-300 transition-colors leading-snug line-clamp-3 mb-2">
                  <a
                    href={`/article/${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectArticle(item.id);
                    }}
                    className="hover:underline"
                  >
                    {item.title}
                  </a>
                </h3>
              </div>

              {/* Metrics */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 mt-3">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {item.timestamp}
                </span>
                {item.viewsCount && (
                  <span className="flex items-center gap-1 font-mono tabular-nums">
                    <Eye size={11} />
                    {item.viewsCount}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
