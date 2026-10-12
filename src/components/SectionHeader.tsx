import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  onViewMore?: () => void;
  viewMoreText?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  accentColor = '#0f223d',
  onViewMore,
  viewMoreText = 'المزيد من القسم',
}) => {
  return (
    <div className="flex items-end justify-between border-b-2 border-slate-200 pb-2 mb-5">
      <div className="flex items-center gap-3">
        <span
          className="w-1.5 h-6 rounded-xs"
          style={{ backgroundColor: accentColor }}
        />
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 font-normal mt-0.5 hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {onViewMore && (
        <button
          onClick={onViewMore}
          className="text-xs sm:text-sm font-semibold text-sky-800 hover:text-sky-950 flex items-center gap-1 group transition-colors"
        >
          <span>{viewMoreText}</span>
          <ChevronLeft size={15} className="group-hover:translate-x-[-2px] transition-transform" />
        </button>
      )}
    </div>
  );
};
