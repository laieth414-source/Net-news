import React, { useState } from 'react';
import { AdminCategory, AdminArticle } from '../../types/admin';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';

interface AdminCategoriesViewProps {
  categories: AdminCategory[];
  articles: AdminArticle[];
  onSaveCategory: (category: Partial<AdminCategory>, isNew: boolean) => Promise<void>;
  onDeleteCategory: (id: string, name?: string) => Promise<void>;
}

export const AdminCategoriesView: React.FC<AdminCategoriesViewProps> = ({
  categories,
  articles,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<AdminCategory> | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<AdminCategory | null>(null);

  const getArticlesCountForCategory = (catId: string) => {
    return articles.filter((a) => a.categoryId === catId).length;
  };

  const handleOpenCreate = () => {
    setEditingCat({
      id: '',
      name: '',
      slug: '',
      accentColor: '#0f223d',
      description: '',
      order: categories.length + 1,
      isActive: true,
      showInNav: true,
    });
    setIsNew(true);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (cat: AdminCategory) => {
    setEditingCat({ ...cat });
    setIsNew(false);
    setIsEditorOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.name?.trim()) return;

    setSaving(true);
    try {
      const slug = editingCat.slug || editingCat.name.toLowerCase().replace(/\s+/g, '-');
      await onSaveCategory(
        {
          ...editingCat,
          slug,
          id: editingCat.id || slug,
        },
        isNew
      );
      setIsEditorOpen(false);
      setEditingCat(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmCat) return;
    try {
      await onDeleteCategory(deleteConfirmCat.id, deleteConfirmCat.name);
      setDeleteConfirmCat(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree size={20} className="text-sky-400" />
            <h2 className="text-xl font-bold text-white font-heading">
              إدارة الأقسام والتصنيفات التحريرية
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            إدارة تبويبات الأخبار وشريط التنقل الرئيسي في شبكة نت نيوز
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>إضافة قسم جديد</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] font-semibold">
              <tr>
                <th className="p-4">اسم القسم</th>
                <th className="p-4">المعرف (Slug)</th>
                <th className="p-4">اللون المميز</th>
                <th className="p-4">المقالات المرتبطة</th>
                <th className="p-4">شريط التنقل</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {categories.map((cat) => {
                const linkedCount = getArticlesCountForCategory(cat.id);
                return (
                  <tr key={cat.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-4 font-bold text-white text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.accentColor || '#0f223d' }}
                        />
                        <span>{cat.name}</span>
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-slate-400 font-normal mt-0.5">{cat.description}</p>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-400">{cat.slug || cat.id}</td>
                    <td className="p-4">
                      <span className="font-mono text-xs text-slate-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {cat.accentColor || '#0f223d'}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <FileText size={13} className="text-slate-500" />
                        {linkedCount} مقالاً
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {cat.showInNav !== false ? (
                        <span className="text-emerald-400 font-medium">ظاهر بالقائمة</span>
                      ) : (
                        <span className="text-slate-500">مخفي من القائمة</span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {cat.isActive !== false ? (
                        <span className="text-emerald-400 font-medium">نشط</span>
                      ) : (
                        <span className="text-slate-500">معطل</span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmCat(cat)}
                          className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && editingCat && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-[#0b1a2d] text-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 my-auto overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h3 className="font-bold text-white text-base font-heading">
                {isNew ? 'إضافة قسم إخباري جديد' : `تعديل قسم: ${editingCat.name || ''}`}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">اسم القسم بالعربية *</label>
                <input
                  type="text"
                  required
                  value={editingCat.name || ''}
                  onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                  placeholder="مثال: الشرق الأوسط أو الاقتصاد الرقمي"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">المعرّف بالإنجليزية (Slug) *</label>
                  <input
                    type="text"
                    required
                    value={editingCat.slug || ''}
                    onChange={(e) => setEditingCat({ ...editingCat, slug: e.target.value })}
                    placeholder="e.g. middle-east"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">اللون المميز (Hex Code)</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingCat.accentColor || '#0f223d'}
                      onChange={(e) => setEditingCat({ ...editingCat, accentColor: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer border border-slate-700 bg-transparent"
                    />
                    <input
                      type="text"
                      value={editingCat.accentColor || '#0f223d'}
                      onChange={(e) => setEditingCat({ ...editingCat, accentColor: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">الوصف التحريري للقسم</label>
                <textarea
                  rows={2}
                  value={editingCat.description || ''}
                  onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })}
                  placeholder="وصف مختصر لطبيعة الأخبار والتقارير في هذا القسم..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingCat.showInNav !== false}
                    onChange={(e) => setEditingCat({ ...editingCat, showInNav: e.target.checked })}
                    className="rounded accent-sky-600"
                  />
                  <span>إظهار في شريط الأقسام العلوي بالموقع</span>
                </label>

                <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingCat.isActive !== false}
                    onChange={(e) => setEditingCat({ ...editingCat, isActive: e.target.checked })}
                    className="rounded accent-emerald-600"
                  />
                  <span>تفعيل القسم في النظام</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ القسم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog with Linked Articles Warning */}
      {deleteConfirmCat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex justify-center p-4">
          <div className="bg-[#0b1a2d] border border-slate-800 text-white w-full max-w-md rounded-2xl p-6 my-auto space-y-4">
            <h3 className="font-bold text-base text-rose-400">تأكيد حذف القسم</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف قسم: <strong className="text-white">«{deleteConfirmCat.name}»</strong>؟
            </p>
            {getArticlesCountForCategory(deleteConfirmCat.id) > 0 && (
              <div className="p-3 bg-amber-950/70 border border-amber-800 rounded-xl text-xs text-amber-300 leading-relaxed flex items-start gap-2">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
                <span>
                  تحذير: هذا القسم مرتبط حالياً بـ <strong>{getArticlesCountForCategory(deleteConfirmCat.id)}</strong> مقالاً منشوراً.
                  سيؤدي الحذف إلى إبقاء المقالات بدون تصنيف رئيسي. يرجى نقل المقالات أولاً إن أمكن.
                </span>
              </div>
            )}
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmCat(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 bg-slate-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white cursor-pointer"
              >
                تأكيد حذف القسم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
