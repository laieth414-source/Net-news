import React from 'react';
import { CATEGORIES } from '../data/newsData';
import { CategoryId } from '../types/news';

interface NavigationProps {
  activeCategory: CategoryId;
  onSelectCategory: (categoryId: CategoryId) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <nav className="bg-[#0f223d] text-white border-b border-[#1b355d] sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Scrollable nav list */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2 w-full">
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
                  }}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 rounded transition-all duration-150 inline-block text-center ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-200 hover:text-white hover:bg-[#162d4a]'
                  }`}
                >
                  {cat.name}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
