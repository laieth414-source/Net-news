import React, { useState } from 'react';
import { SiteSettings } from '../../types/admin';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  Sliders,
  Share2,
  Mail,
  ShieldAlert,
  Flame,
  TrendingUp,
  Quote
} from 'lucide-react';

interface AdminSettingsViewProps {
  settings: SiteSettings;
  onSaveSettings: (settings: Partial<SiteSettings>) => Promise<void>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<SiteSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
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
            إعدادات الموقع والهوية الصحفية
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            التحكم في المعلمات العامة لشبكة NET NEWS وعناصر الواجهة الرئيسية
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1.5 rounded-lg animate-in fade-in">
              <CheckCircle2 size={14} />
              <span>تم حفظ الإعدادات بنجاح</span>
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Save size={15} />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: General Identity */}
        <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3 font-heading">
            <Globe size={18} className="text-sky-400" />
            <span>الهوية ومعلومات التحرير</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">اسم الشبكة الإخبارية</label>
              <input
                type="text"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">الشعار اللفظي (العنوان الفرعي)</label>
              <input
                type="text"
                value={formData.siteSubtitle}
                onChange={(e) => setFormData({ ...formData, siteSubtitle: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">الوصف والرسالة الصحفية</label>
              <textarea
                rows={3}
                value={formData.siteDescription}
                onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">البريد الإلكتروني للتحرير</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-medium">هاتف غرفة الأخبار</label>
                <input
                  type="text"
                  value={formData.contactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">المكاتب والعواصم التحريرية</label>
              <input
                type="text"
                value={formData.officeLocation || ''}
                onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Layout Modules Toggles */}
        <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3 font-heading">
            <Sliders size={18} className="text-emerald-400" />
            <span>تفعيل وتعطيل وحدات الواجهة الرئيسية</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Breaking News Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Flame size={18} className="text-rose-400" />
                <div>
                  <span className="font-semibold text-white block">شريط الأخبار العاجلة (Breaking Bar)</span>
                  <span className="text-[11px] text-slate-400">إظهار التنبيهات العاجلة أعلى الموقع</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.breakingNewsEnabled}
                onChange={(e) => setFormData({ ...formData, breakingNewsEnabled: e.target.checked })}
                className="w-4 h-4 accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Market Bar Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <TrendingUp size={18} className="text-emerald-400" />
                <div>
                  <span className="font-semibold text-white block">شريط أسواق المال والسلع (Market Bar)</span>
                  <span className="text-[11px] text-slate-400">عرض مؤشرات النفط والذهب والبورصات</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.marketBarEnabled}
                onChange={(e) => setFormData({ ...formData, marketBarEnabled: e.target.checked })}
                className="w-4 h-4 accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Opinions Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Quote size={18} className="text-purple-400" />
                <div>
                  <span className="font-semibold text-white block">قسم آراء وتحليلات كتاب الأعمدة</span>
                  <span className="text-[11px] text-slate-400">إظهار مقالات الرأي والتحليل السياسي</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.opinionsEnabled}
                onChange={(e) => setFormData({ ...formData, opinionsEnabled: e.target.checked })}
                className="w-4 h-4 accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Maintenance Mode */}
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <ShieldAlert size={16} />
                  <span>وضع الصيانة والتحديث الدوري</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.maintenanceMode}
                  onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
              {formData.maintenanceMode && (
                <div>
                  <label className="block text-[11px] text-amber-200 mb-1">رسالة الصيانة المعروضة للزوار:</label>
                  <input
                    type="text"
                    value={formData.maintenanceMessage}
                    onChange={(e) => setFormData({ ...formData, maintenanceMessage: e.target.value })}
                    className="w-full bg-slate-900 border border-amber-800/80 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Social Media Links */}
        <div className="lg:col-span-2 bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3 font-heading">
            <Share2 size={18} className="text-purple-400" />
            <span>حسابات التواصل الاجتماعي وشبكات البث</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">منصة إكس (Twitter/X)</label>
              <input
                type="url"
                value={formData.socialLinks?.twitter || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, twitter: e.target.value },
                  })
                }
                placeholder="أدخل رابط الحساب..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">قناة تيليجرام (Telegram)</label>
              <input
                type="url"
                value={formData.socialLinks?.telegram || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, telegram: e.target.value },
                  })
                }
                placeholder="أدخل رابط القناة..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">صفحة فيسبوك (Facebook)</label>
              <input
                type="url"
                value={formData.socialLinks?.facebook || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, facebook: e.target.value },
                  })
                }
                placeholder="أدخل رابط الصفحة..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">قناة يوتيوب (YouTube)</label>
              <input
                type="url"
                value={formData.socialLinks?.youtube || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socialLinks: { ...formData.socialLinks, youtube: e.target.value },
                  })
                }
                placeholder="أدخل رابط القناة..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
