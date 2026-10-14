import React, { useState } from 'react';
import { SeoSettings } from '../../types/admin';
import {
  Search,
  Save,
  CheckCircle2,
  Globe,
  Tag,
  Share2,
  Code,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface AdminSeoViewProps {
  seo: SeoSettings;
  onSaveSeo: (seo: Partial<SeoSettings>) => Promise<void>;
}

export const AdminSeoView: React.FC<AdminSeoViewProps> = ({ seo, onSaveSeo }) => {
  const [formData, setFormData] = useState<SeoSettings>({
    metaTitle: seo?.metaTitle || 'NET NEWS | نت نيوز - بوابة الأخبار العربية المستقلة',
    metaDescription:
      seo?.metaDescription ||
      'بوابة إخبارية عربية رصينة تقدم تغطية متكاملة للأحداث العالمية والعربية والخليجية والملفات الاقتصادية والرياضية والتكنولوجية بموضوعية واحترافية.',
    canonicalUrl: seo?.canonicalUrl || 'https://netnews1-new.netlify.app',
    ogImage: seo?.ogImage || '/og-image.png',
    twitterHandle: seo?.twitterHandle || '',
    enableStructuredData: seo?.enableStructuredData !== false,
    keywords: seo?.keywords || ['أخبار عربية', 'نت نيوز', 'عاجل', 'الشرق الأوسط', 'اقتصاد', 'رياضة'],
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKeyword.trim()) {
      e.preventDefault();
      const val = newKeyword.trim();
      if (!formData.keywords.includes(val)) {
        setFormData({ ...formData, keywords: [...formData.keywords, val] });
      }
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== keyword),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await onSaveSeo(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">
            تحسين محركات البحث (SEO) والبيانات المنظمة
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إعدادات وسم Meta وبيانات OpenGraph وSchema.org لضمان تصدر نتائج Google
          </p>
        </div>
        <div className="flex items-center gap-3">
          {success && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={14} />
              <span>تم حفظ معايير SEO بنجاح</span>
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Save size={15} />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات SEO'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Settings (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3 font-heading">
            <Search size={18} className="text-sky-400" />
            <span>الوسوم الوصفية الأساسية (Meta Tags)</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">عنوان الصفحة لمحركات البحث (Meta Title)</label>
                <span className="text-[11px] font-mono text-slate-500">
                  {formData.metaTitle.length}/60 حرفاً
                </span>
              </div>
              <input
                type="text"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">الوصف لمحركات البحث (Meta Description)</label>
                <span className="text-[11px] font-mono text-slate-500">
                  {formData.metaDescription.length}/160 حرفاً
                </span>
              </div>
              <textarea
                rows={3}
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">الرابط المرجعي (Canonical URL)</label>
              <input
                type="url"
                value={formData.canonicalUrl}
                onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                الكلمات الدلالية المفتاحية (Keywords) - اضغط Enter للإضافة
              </label>
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={handleAddKeyword}
                placeholder="أضف كلمة مفتاحية واضغط Enter..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-sky-500 mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {formData.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/70 text-sky-300 border border-sky-800 text-[11px]"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-sky-400 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableStructuredData}
                  onChange={(e) => setFormData({ ...formData, enableStructuredData: e.target.checked })}
                  className="w-4 h-4 accent-sky-500"
                />
                <span className="text-slate-200">تفعيل بيانات Schema.org JSON-LD لمؤسسة إخبارية معتمدة</span>
              </label>
            </div>
          </div>
        </div>

        {/* Live SERP Preview & Schema (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Google Preview */}
          <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3 font-heading">
              <Globe size={18} className="text-emerald-400" />
              <span>معاينة النتيجة على محرك بحث Google</span>
            </div>

            <div className="bg-[#202124] p-4 rounded-xl space-y-1.5 text-right font-sans border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="font-mono text-slate-300">netnews.media</span>
                <span>› ar</span>
              </div>
              <h4 className="text-sm font-semibold text-[#8ab4f8] hover:underline cursor-pointer line-clamp-1">
                {formData.metaTitle || 'NET NEWS | نت نيوز'}
              </h4>
              <p className="text-xs text-[#bdc1c6] line-clamp-2 leading-relaxed">
                {formData.metaDescription || 'وصف الموقع الإخباري في محركات البحث...'}
              </p>
            </div>
          </div>

          {/* Social Share Preview (Card) */}
          <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3 font-heading">
              <Share2 size={18} className="text-purple-400" />
              <span>بطاقة المشاركة على منصات التواصل (OpenGraph)</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-2 pb-3">
              <div className="h-28 bg-gradient-to-r from-sky-950 via-[#0b1a2d] to-slate-900 flex items-center justify-center text-white border-b border-slate-800">
                <div className="text-center">
                  <span className="font-serif font-black text-lg">NET NEWS</span>
                  <span className="text-xs text-sky-400 block">شبكة إخبارية عربية رقمية</span>
                </div>
              </div>
              <div className="px-3 pt-1 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">NETNEWS.MEDIA</span>
                <h5 className="text-xs font-bold text-white line-clamp-1">{formData.metaTitle}</h5>
                <p className="text-[11px] text-slate-400 line-clamp-2">{formData.metaDescription}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
