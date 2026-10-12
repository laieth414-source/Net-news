import React, { useState, useMemo } from 'react';
import { NewsletterSubscriber } from '../../types/admin';
import {
  Users,
  Search,
  Download,
  Trash2,
  Mail,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';

interface AdminSubscribersViewProps {
  subscribers: NewsletterSubscriber[];
  onDeleteSubscriber: (id: string) => Promise<void>;
}

export const AdminSubscribersView: React.FC<AdminSubscribersViewProps> = ({
  subscribers,
  onDeleteSubscriber,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((sub) =>
      sub.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subscribers, searchQuery]);

  const handleExportCSV = () => {
    if (subscribers.length === 0) return;
    const header = 'المعرف,البريد الإلكتروني,تاريخ الاشتراك,المنصة\n';
    const rows = subscribers
      .map(
        (s) =>
          `"${s.id}","${s.email}","${s.subscribedAt || ''}","${s.platform || 'web'}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `netnews_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await onDeleteSubscriber(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">
            مشتركو النشرة البريدية
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إدارة قائمة المشتركين المسجلين في قاعدة بيانات Firestore (مجموعة newsletterSubscribers)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={subscribers.length === 0}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors border border-slate-700 cursor-pointer"
          >
            <Download size={15} />
            <span>تصدير ملف CSV ({subscribers.length})</span>
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في عناوين المشتركين..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="text-xs text-slate-400 self-end sm:self-auto">
            عرض <span className="font-bold text-white font-mono">{filteredSubscribers.length}</span> من أصل{' '}
            <span className="font-bold text-sky-400 font-mono">{subscribers.length}</span> مشترك
          </div>
        </div>

        {/* Subscribers Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-medium border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">البريد الإلكتروني</th>
                <th className="py-3 px-4">تاريخ الاشتراك</th>
                <th className="py-3 px-4">المنصة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredSubscribers.map((sub, idx) => (
                <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-sky-400 shrink-0" />
                      <span className="font-mono text-white select-all">{sub.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {sub.subscribedAt
                      ? new Date(sub.subscribedAt).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'غير محدد'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800">
                      {sub.platform || 'web'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setDeleteConfirmId(sub.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="إلغاء الاشتراك"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSubscribers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Users size={32} className="mx-auto mb-2 text-slate-600" />
                    <p>لا يوجد مشتركون مطابقون للبحث في قاعدة البيانات.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-white text-base">تأكيد حذف المشترك</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف هذا المشترك من قائمة النشرة البريدية؟ لن يتلقى أي رسائل أو تحديثات إخبارية لاحقاً.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                {isDeleting ? 'جارٍ الحذف...' : 'نعم، حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
