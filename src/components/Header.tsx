import React, { useState, useEffect } from 'react';
import { Menu, Search, Sun, Moon, Volume2, Globe, Clock, CloudSun } from 'lucide-react';
import { WEATHER_DATA } from '../data/newsData';

interface HeaderProps {
  onOpenDrawer: () => void;
  onOpenSearch: () => void;
  onSelectCategory: (catId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDrawer,
  onOpenSearch,
  onSelectCategory,
}) => {
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [activeWeatherIndex, setActiveWeatherIndex] = useState(0);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Arabic formatted date
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      const dateText = new Intl.DateTimeFormat('ar-EG', options).format(now);
      const timeText = new Intl.DateTimeFormat('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(now);

      setCurrentDateStr(dateText);
      setCurrentTimeStr(timeText);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const weatherTimer = setInterval(() => {
      setActiveWeatherIndex((prev) => (prev + 1) % WEATHER_DATA.length);
    }, 4500);
    return () => clearInterval(weatherTimer);
  }, []);

  const currentWeather = WEATHER_DATA[activeWeatherIndex];

  return (
    <header className="w-full bg-[#0b1a2d] text-white border-b border-[#162d4a]">
      {/* Top Utility Bar */}
      <div className="border-b border-[#162d4a]/80 text-[11px] sm:text-xs py-1.5 px-4 text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Date & Time */}
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-200">{currentDateStr}</span>
            <span className="hidden sm:inline-block text-slate-400">·</span>
            <span className="hidden sm:flex items-center gap-1 font-mono text-slate-400 tabular-nums">
              <Clock size={12} />
              {currentTimeStr} بتوقيت مكة
            </span>
          </div>

          {/* Weather & Capital Ticker */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-300">
              <CloudSun size={13} className="text-amber-400" />
              <span>{currentWeather.city}:</span>
              <span className="font-semibold text-white font-mono">{currentWeather.temp}°م</span>
              <span className="text-slate-400 text-[10px] hidden md:inline">({currentWeather.condition})</span>
            </div>
            <div className="hidden lg:flex items-center gap-3 text-slate-400 border-r border-[#162d4a] pr-3 mr-1">
              <span className="text-slate-400">طبعة:</span>
              <button className="text-white hover:underline">الشرق الأوسط</button>
              <span>/</span>
              <button className="hover:text-white transition-colors">الدولية</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Brand & Action Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          {/* Right Zone (in RTL): Menu drawer button & Navigation shortcut */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenDrawer}
              className="flex items-center gap-2 px-3 py-2 bg-[#162d4a] hover:bg-[#1f3d64] text-white rounded transition-colors text-xs sm:text-sm font-medium border border-slate-700/50"
              aria-label="القائمة الجانبية"
            >
              <Menu size={18} />
              <span className="hidden sm:inline">الأقسام</span>
            </button>
          </div>

          {/* Center Zone: Textual Brand Logo */}
          <a
            href="/"
            className="text-center cursor-pointer select-none block"
            onClick={(e) => {
              e.preventDefault();
              onSelectCategory('all');
            }}
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight font-serif text-white">
                NET NEWS
              </span>
              <span className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-sky-400 font-sans">
                | نت نيوز
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-300 font-light tracking-widest mt-0.5">
              شبكة إخبارية عربية رقمية مستقلة · تأسست عام 2026
            </p>
          </a>

          {/* Left Zone (in RTL): Live Search trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-2 bg-[#162d4a] hover:bg-[#1f3d64] text-slate-200 hover:text-white rounded transition-colors text-xs sm:text-sm border border-slate-700/50"
              aria-label="بحث في الأخبار"
            >
              <Search size={16} />
              <span className="hidden md:inline">بحث في الأخبار...</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
