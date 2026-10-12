import React, { useState } from 'react';
import { AdminBreakingNews } from '../../types/admin';
import {
  Flame,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';

interface AdminBreakingViewProps {
  breakingNews: AdminBreakingNews[];
  onSaveBreaking: (item: Partial<AdminBreakingNews>, isNew: boolean) => Promise<void>;
  onDeleteBreaking: (id: string, text?: string) => Promise<void>;
  isCreatingOpen?: boolean;
  onCloseCreateOpen?: () => void;
}

export const AdminBreakingView: React.FC<AdminBreakingViewProps> = ({
  breakingNews,
  onSaveBreaking,
  onDeleteBreaking,
  isCreatingOpen,
  onCloseCreateOpen,
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<AdminBreakingNews> | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<AdminBreakingNews | null>(null);

  React.useEffect(() => {
    if (isCreatingOpen) {
      handleOpenCreate();
      if (onCloseCreateOpen) onCloseCreateOpen();
    }
  }, [isCreatingOpen]);

  const handleOpenCreate = () => {
    setEditingItem({
      text: '',
      time: 'منذ دقيقة',
      category: 'عاجل',
      articleId: '',
      isActive: true,
      order: breakingNews.length + 1,
    });
    setIsNew(true);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: AdminBreakingNews) => {
    setEditingItem({ ...item });
    setIsNew(false);
    setIsEditorOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.text?.trim()) return;

    setSaving(true);
    try {
      await onSaveBreaking(editingItem, isNew);
      setIsEditorOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      await onDeleteBreaking(deleteConfirmItem.id, deleteConfirmItem.text);
      setDeleteConfirmItem(null);
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
            <Flame size={20} className="text-red-500" />
            <h2 className="text-xl font-bold text-white font-heading">
              إدارة الأخبار العاجلة والشريط الحي
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            الأخبار التي تظهر في شريط «عاجل» أعلى الموقع الرئيسي للمستخدمين
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>إضافة خبر عاجل جديد</span>
        </button>
      </div>

      {/* List Table */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] font-semibold">
              <tr>
                <th className="p-4">نص الخبر العاجل</th>
                <th className="p-4">التصنيف</th>
                <th className="p-4">الوقت المعروض</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {breakingNews.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-4 font-bold text-white text-sm max-w-lg">
                    {item.text}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 font-semibold border border-red-800 text-[11px]">
                      {item.category || 'عاجل'}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                    {item.time || 'عاجل'}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {item.isActive !== false ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 size={14} />
                        نشط بالشريط
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                        <XCircle size={14} />
                        معطل مؤقتاً
                      </span>
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                        title="تعديل"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmItem(item)}
                        className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {breakingNews.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    لا توجد أخبار عاجلة مسجلة حالياً. اضغط على زر الإضافة لإنشاء أول خبر.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-[#0b1a2d] text-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 my-auto overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h3 className="font-bold text-white text-base font-heading">
                {isNew ? 'إضافة خبر عاجل جديد' : 'تعديل الخبر العاجل'}
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
                <label className="text-xs font-semibold text-slate-300 block">نص الخبر العاجل *</label>
                <textarea
                  rows={3}
                  required
                  value={editingItem.text || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
                  placeholder="اكتب التطور العاجل بأسلوب صحفي دقيق..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">التصنيف أو المصدر</label>
                  <input
                    type="text"
                    value={editingItem.category || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    placeholder="مثال: العالم أو الخليج"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">الوقت المكتوب</label>
                  <input
                    type="text"
                    value={editingItem.time || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, time: e.target.value })}
                    placeholder="مثال: منذ 10 دقائق"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingItem.isActive !== false}
                    onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                    className="rounded accent-red-600"
                  />
                  <span>تفعيل وعرض في الشريط فوراً</span>
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ ونشر العاجل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex justify-center p-4">
          <div className="bg-[#0b1a2d] border border-slate-800 text-white w-full max-w-md rounded-2xl p-6 my-auto space-y-4">
            <h3 className="font-bold text-base text-rose-400">تأكيد حذف الخبر العاجل</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف هذا الخبر: «{deleteConfirmItem.text}»؟
            </p>
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 bg-slate-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white cursor-pointer"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
