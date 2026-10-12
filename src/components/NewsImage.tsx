import React from 'react';

interface NewsImageProps {
  category: string;
  title: string;
  imageUrl?: string;
  type?: 'lead' | 'secondary' | 'thumbnail' | 'wide';
  className?: string;
  iconType?: 'diplomacy' | 'gulf' | 'economy' | 'sports' | 'tech' | 'culture' | 'world';
  caption?: string;
}

export const NewsImage: React.FC<NewsImageProps> = ({
  category,
  title,
  imageUrl,
  type = 'secondary',
  className = '',
  iconType = 'world',
  caption,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const showCustomImage = Boolean(imageUrl && !imgError);
  // Editorial visual palettes matching the authentic news motif
  const getTheme = () => {
    switch (category) {
      case 'العالم':
        return {
          bgGradient: 'from-[#0b1a2d] via-[#162d4a] to-[#1e3a8a]',
          accent: '#3b82f6',
          label: 'تغطية دولية',
          pattern: 'grid',
        };
      case 'أخبار عربية':
        return {
          bgGradient: 'from-[#082032] via-[#173a56] to-[#0369a1]',
          accent: '#38bdf8',
          label: 'شؤون عربية',
          pattern: 'dots',
        };
      case 'الخليج':
      case 'الخليج والشرق الأوسط':
        return {
          bgGradient: 'from-[#0a2328] via-[#114b53] to-[#0d9488]',
          accent: '#2dd4bf',
          label: 'الخليج العربي',
          pattern: 'diagonal',
        };
      case 'اقتصاد':
        return {
          bgGradient: 'from-[#1c1917] via-[#292524] to-[#78350f]',
          accent: '#f59e0b',
          label: 'أسواق وطاقة',
          pattern: 'chart',
        };
      case 'رياضة':
        return {
          bgGradient: 'from-[#052e16] via-[#14532d] to-[#15803d]',
          accent: '#4ade80',
          label: 'رياضة وملاعب',
          pattern: 'lines',
        };
      case 'تكنولوجيا':
        return {
          bgGradient: 'from-[#171738] via-[#24245c] to-[#4338ca]',
          accent: '#818cf8',
          label: 'تكنولوجيا وعلوم',
          pattern: 'circuits',
        };
      case 'منوعات':
      case 'منوعات وعلوم':
      case 'منوعات وثقافة':
        return {
          bgGradient: 'from-[#2e1065] via-[#4c1d95] to-[#701a75]',
          accent: '#e879f9',
          label: 'ثقافة واستكشاف',
          pattern: 'stars',
        };
      case 'آراء وتحليلات':
        return {
          bgGradient: 'from-[#1e293b] via-[#334155] to-[#475569]',
          accent: '#94a3b8',
          label: 'رأي وتحليل',
          pattern: 'grid',
        };
      default:
        return {
          bgGradient: 'from-[#0f172a] via-[#1e293b] to-[#0f223d]',
          accent: '#60a5fa',
          label: 'نت نيوز',
          pattern: 'grid',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`relative overflow-hidden bg-slate-900 select-none group ${className}`}
      style={{ aspectRatio: type === 'thumbnail' ? '4/3' : type === 'lead' ? '16/9' : '16/10' }}
    >
      {/* Background Gradient / Custom Image */}
      {showCustomImage ? (
        <img
          src={imageUrl}
          alt={caption || title}
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient} transition-transform duration-700 group-hover:scale-105`} />
      )}

      {/* Editorial Watermark Mesh / Geometric Architectural Grid (only when no custom photo) */}
      {!showCustomImage && (
        <svg
          className="absolute inset-0 w-full h-full opacity-15 mix-blend-overlay pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id={`pattern-${category}`} width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M0 32 L32 0 M0 0 L32 32" fill="none" stroke="currentColor" strokeWidth="0.75" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pattern-${category})`} />
        </svg>
      )}

      {/* Abstract Architectural Editorial Graphic (only when no custom photo) */}
      {!showCustomImage && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
        {category === 'العالم' && (
          <div className="w-full max-w-xs h-32 flex items-center justify-center opacity-30 text-white">
            <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-current fill-none" strokeWidth="1.5">
              <circle cx="50" cy="50" r="42" />
              <ellipse cx="50" cy="50" rx="42" ry="18" />
              <ellipse cx="50" cy="50" rx="18" ry="42" />
              <line x1="8" y1="50" x2="92" y2="50" />
            </svg>
          </div>
        )}

        {(category === 'الخليج' || category === 'الخليج والشرق الأوسط') && (
          <div className="w-full max-w-xs h-32 flex items-center justify-center opacity-30 text-white">
            <svg viewBox="0 0 120 80" className="w-28 h-20 stroke-current fill-none" strokeWidth="1.5">
              <path d="M10 75 L30 25 L45 55 L65 15 L80 45 L95 20 L110 75 Z" />
              <line x1="0" y1="75" x2="120" y2="75" strokeWidth="2" />
            </svg>
          </div>
        )}

        {category === 'اقتصاد' && (
          <div className="w-full max-w-xs h-32 flex items-center justify-center opacity-30 text-white">
            <svg viewBox="0 0 120 70" className="w-28 h-20 stroke-current fill-none" strokeWidth="2">
              <polyline points="10,60 35,45 55,50 80,25 105,15" />
              <circle cx="105" cy="15" r="3" fill="currentColor" />
              <line x1="5" y1="65" x2="115" y2="65" strokeWidth="1" strokeDasharray="3 3" />
            </svg>
          </div>
        )}

        {category === 'رياضة' && (
          <div className="w-full max-w-xs h-32 flex items-center justify-center opacity-30 text-white">
            <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-current fill-none" strokeWidth="1.5">
              <circle cx="50" cy="50" r="40" />
              <polygon points="50,22 62,38 58,54 42,54 38,38" />
              <line x1="50" y1="22" x2="50" y2="10" />
              <line x1="62" y1="38" x2="78" y2="30" />
              <line x1="58" y1="54" x2="72" y2="72" />
              <line x1="42" y1="54" x2="28" y2="72" />
              <line x1="38" y1="38" x2="22" y2="30" />
            </svg>
          </div>
        )}

        {category === 'تكنولوجيا' && (
          <div className="w-full max-w-xs h-32 flex items-center justify-center opacity-30 text-white">
            <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-current fill-none" strokeWidth="1.5">
              <rect x="25" y="25" width="50" height="50" rx="4" />
              <rect x="37" y="37" width="26" height="26" />
              <line x1="15" y1="35" x2="25" y2="35" />
              <line x1="15" y1="50" x2="25" y2="50" />
              <line x1="15" y1="65" x2="25" y2="65" />
              <line x1="75" y1="35" x2="85" y2="35" />
              <line x1="75" y1="50" x2="85" y2="50" />
              <line x1="75" y1="65" x2="85" y2="65" />
              <line x1="35" y1="15" x2="35" y2="25" />
              <line x1="50" y1="15" x2="50" y2="25" />
              <line x1="65" y1="15" x2="65" y2="25" />
              <line x1="35" y1="75" x2="35" y2="85" />
              <line x1="50" y1="75" x2="50" y2="85" />
              <line x1="65" y1="75" x2="65" y2="85" />
            </svg>
          </div>
        )}

        {(category === 'منوعات' || category === 'منوعات وعلوم' || category === 'منوعات وثقافة') && (
          <div className="w-full max-w-xs h-32 flex items-center justify-center opacity-30 text-white">
            <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-current fill-none" strokeWidth="1.5">
              <circle cx="50" cy="50" r="30" />
              <path d="M20 50 Q 50 15 80 50 Q 50 85 20 50" />
              <circle cx="50" cy="50" r="6" fill="currentColor" />
            </svg>
          </div>
        )}
      </div>
      )}

      {/* Editorial Contrast Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

      {/* Editorial Content Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end">
        <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1">
          <span className="inline-flex items-center gap-1.5 text-white/90">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: theme.accent }}
            />
            {theme.label}
          </span>
          <span className="font-mono text-[11px] text-slate-400">NET NEWS PRESS</span>
        </div>

        {type === 'lead' && (
          <p className="text-xs text-slate-300 line-clamp-1 font-light opacity-90 hidden sm:block">
            {caption || title}
          </p>
        )}
      </div>

      {/* Top Tag */}
      <div className="absolute top-3 right-3">
        <span className="text-[11px] font-semibold text-white/95 px-2.5 py-1 bg-black/45 backdrop-blur-sm border border-white/10 rounded tracking-wide">
          {category}
        </span>
      </div>
    </div>
  );
};
