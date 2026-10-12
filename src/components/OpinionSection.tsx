import React from 'react';
import { Article } from '../types/news';
import { SectionHeader } from './SectionHeader';
import { Quote, Feather } from 'lucide-react';

interface OpinionSectionProps {
  articles: Article[];
  onSelectArticle: (articleId: string) => void;
}

export const OpinionSection: React.FC<OpinionSectionProps> = ({
  articles,
  onSelectArticle,
}) => {
  return (
    <section className="my-10">
      <SectionHeader
        title="آراء وتحليلات"
        subtitle="وجهات نظر استراتيجية ورؤى فكرية بأقلام نخبة من الكتاب والخبراء"
        accentColor="#475569"
        onViewMore={() => articles[0] && onSelectArticle(articles[0].id)}
        viewMoreText="جميع المقالات"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {articles.map((item) => (
          <article
            key={item.id}
            onClick={() => onSelectArticle(item.id)}
            className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow cursor-pointer group flex flex-col justify-between"
          >
            <div>
              {/* Author header */}
              <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-sky-300 flex items-center justify-center font-bold text-base font-serif shrink-0 border-2 border-slate-200">
                  {item.author?.name ? item.author.name.charAt(0) : <Feather size={18} />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-900 transition-colors">
                    {item.author?.name || 'كاتب رأي'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {item.author?.role || 'محلل استراتيجي'}
                  </p>
                </div>
              </div>

              {/* Column Title */}
              <h3 className="text-base sm:text-lg font-bold text-slate-950 group-hover:text-sky-900 transition-colors leading-snug mb-3">
                {item.title}
              </h3>

              {/* Excerpt */}
              <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-4">
                «{item.deck}»
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
              <span>{item.readTime}</span>
              <span className="text-sky-800 font-semibold group-hover:underline">
                قراءة المقال بالكامل
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
