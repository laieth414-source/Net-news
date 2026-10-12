import React from 'react';
import { Article, Category } from '../types/news';
import { SectionHeader } from './SectionHeader';
import { NewsImage } from './NewsImage';
import { Clock, ArrowUpLeft, Eye } from 'lucide-react';

interface CategorySectionProps {
  category: Category;
  articles: Article[];
  onSelectArticle: (articleId: string) => void;
  layout?: 'grid' | 'featured-with-list' | 'columns';
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  articles,
  onSelectArticle,
  layout = 'featured-with-list',
}) => {
  if (!articles || articles.length === 0) return null;

  const lead = articles[0];
  const others = articles.slice(1);

  return (
    <section id={category.id} className="my-10">
      <SectionHeader
        title={category.name}
        subtitle={category.description}
        accentColor={category.accentColor}
        onViewMore={() => onSelectArticle(lead.id)}
      />

      {layout === 'featured-with-list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Category Feature (7 cols) */}
          <div className="lg:col-span-7">
            <article
              onClick={() => onSelectArticle(lead.id)}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer group h-full flex flex-col justify-between"
            >
              <div>
                <NewsImage
                  category={category.name}
                  title={lead.title}
                  imageUrl={lead.imageUrl}
                  type="wide"
                  caption={lead.imageCaption}
                />
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-slate-700">{lead.source}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {lead.timestamp}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{lead.readTime}</span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-950 group-hover:text-sky-900 transition-colors leading-snug mb-2.5">
                    <a
                      href={`/article/${lead.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectArticle(lead.id);
                      }}
                      className="hover:underline"
                    >
                      {lead.title}
                    </a>
                  </h3>

                  <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                    {lead.deck}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-4 pt-1 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                <span>{lead.viewsCount || 'تغطية مستمرة'}</span>
                <a
                  href={`/article/${lead.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectArticle(lead.id);
                  }}
                  className="text-sky-800 font-semibold group-hover:underline flex items-center gap-1"
                >
                  اقرأ التقرير
                  <ArrowUpLeft size={13} />
                </a>
              </div>
            </article>
          </div>

          {/* Secondary List (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 justify-between">
            {others.map((item) => (
              <article
                key={item.id}
                onClick={() => onSelectArticle(item.id)}
                className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer group flex gap-3.5 items-start"
              >
                <div className="w-24 sm:w-28 shrink-0 rounded overflow-hidden">
                  <NewsImage
                    category={category.name}
                    title={item.title}
                    imageUrl={item.imageUrl}
                    type="thumbnail"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                    <span>{item.timestamp}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.readTime}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-sky-900 leading-snug line-clamp-2 mb-1">
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
                  </h4>
                  <p className="text-slate-500 text-xs line-clamp-1 hidden sm:block">
                    {item.deck}
                  </p>
                </div>
              </article>
            ))}

            {others.length === 0 && (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 text-center text-slate-500 text-sm">
                متابعة حية ومستمرة لكافة مستجدات {category.name} على مدار الساعة.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3-Column Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((item) => (
            <article
              key={item.id}
              onClick={() => onSelectArticle(item.id)}
              className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <NewsImage
                  category={category.name}
                  title={item.title}
                  imageUrl={item.imageUrl}
                  type="secondary"
                  caption={item.imageCaption}
                />
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span>{item.timestamp}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.readTime}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-900 transition-colors leading-snug mb-2">
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
                  <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                    {item.deck}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-4 pt-1 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                <span className="truncate max-w-[160px]">{item.source}</span>
                <a
                  href={`/article/${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectArticle(item.id);
                  }}
                  className="text-sky-800 font-semibold group-hover:underline flex items-center gap-1"
                >
                  التفاصيل
                  <ArrowUpLeft size={13} />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
