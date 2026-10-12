import React from 'react';
import { MarketIndex } from '../types/news';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketBarProps {
  indices: MarketIndex[];
}

export const MarketBar: React.FC<MarketBarProps> = ({ indices }) => {
  return (
    <div className="bg-[#f1f5f9] border-b border-slate-200 text-xs py-1.5 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 font-semibold shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#b45309]" />
          <span>مؤشرات الأسواق:</span>
        </div>

        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-0.5">
          {indices.map((idx) => (
            <div key={idx.symbol} className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="text-slate-700 font-medium">{idx.name}</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {idx.value}
              </span>
              <span
                className={`flex items-center text-[11px] font-mono font-medium ${
                  idx.isPositive ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {idx.isPositive ? <TrendingUp size={11} className="ml-0.5" /> : <TrendingDown size={11} className="ml-0.5" />}
                {idx.change}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
