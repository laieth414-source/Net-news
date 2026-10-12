import React, { useState, useMemo } from 'react';
import { AuditLog } from '../../types/admin';
import {
  Activity,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Shield,
  FileText,
  Flame,
  FolderTree,
  Settings
} from 'lucide-react';

interface AdminAuditViewProps {
  logs: AuditLog[];
}

export const AdminAuditView: React.FC<AdminAuditViewProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEntity = selectedEntity === 'all' || log.entity === selectedEntity;
      return matchesSearch && matchesEntity;
    });
  }, [logs, searchQuery, selectedEntity]);

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'articles':
        return <FileText size={14} className="text-sky-400" />;
      case 'breakingNews':
        return <Flame size={14} className="text-rose-400" />;
      case 'categories':
        return <FolderTree size={14} className="text-amber-400" />;
      case 'siteSettings':
        return <Settings size={14} className="text-purple-400" />;
      default:
        return <Activity size={14} className="text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-heading">
            سجل التدقيق والنشاط الإداري (Audit Trail)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            توثيق دقيق لكافة عمليات الإنشاء والتعديل والحذف التي تمت من قبل المشرفين المعتمدين
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          إجمالي السجلات: <span className="text-sky-400 font-bold">{logs.length}</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الإجراءات، التفاصيل، أو حساب المدير..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="all">كافة الكيانات والأقسام</option>
              <option value="articles">المقالات والأخبار (articles)</option>
              <option value="breakingNews">الأخبار العاجلة (breakingNews)</option>
              <option value="categories">الأقسام والتصنيفات (categories)</option>
              <option value="siteSettings">إعدادات الموقع (siteSettings)</option>
              <option value="newsletterSubscribers">مشتركو النشرة</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-medium border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">التوقيت والتاريخ</th>
                <th className="py-3 px-4">نوع الإجراء</th>
                <th className="py-3 px-4">الكيان</th>
                <th className="py-3 px-4">تفاصيل العملية</th>
                <th className="py-3 px-4">المدير المنفذ</th>
                <th className="py-3 px-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-500" />
                      <span>
                        {new Date(log.timestamp).toLocaleDateString('ar-EG', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">{log.action}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800">
                      {getEntityIcon(log.entity)}
                      <span>{log.entity}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-300 line-clamp-1 max-w-md">{log.details}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-slate-500" />
                      <span>{log.adminEmail}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                      <CheckCircle2 size={13} />
                      <span>ناجح</span>
                    </span>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Activity size={32} className="mx-auto mb-2 text-slate-600" />
                    <p>لا توجد سجلات نشاط مطابقة حالياً.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
