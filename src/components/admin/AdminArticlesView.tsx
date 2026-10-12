import React, { useState, useMemo, useRef } from 'react';
import { AdminArticle, AdminCategory, ArticleStatus } from '../../types/admin';
import { uploadArticleImage } from '../../lib/firebase';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpDown,
  FileCheck,
  FileX,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

interface AdminArticlesViewProps {
  articles: AdminArticle[];
  categories: AdminCategory[];
  onSaveArticle: (article: Partial<AdminArticle>, isNew: boolean) => Promise<void>;
  onDeleteArticle: (id: string, title?: string) => Promise<void>;
  isCreatingOpen?: boolean;
  onCloseCreateOpen?: () => void;
}

export const AdminArticlesView: React.FC<AdminArticlesViewProps> = ({
  articles,
  categories,
  onSaveArticle,
  onDeleteArticle,
  isCreatingOpen,
  onCloseCreateOpen,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Editor Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<AdminArticle> | null>(null);
  const [isNewArticle, setIsNewArticle] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Image Upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Preview Modal state
  const [previewArticle, setPreviewArticle] = useState<AdminArticle | null>(null);

  // Delete Confirmation state
  const [deleteConfirmArticle, setDeleteConfirmArticle] = useState<AdminArticle | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Open editor if triggered from parent
  React.useEffect(() => {
    if (isCreatingOpen) {
      handleOpenCreate();
      if (onCloseCreateOpen) onCloseCreateOpen();
    }
  }, [isCreatingOpen]);

  // Filtered and Paginated Articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesSearch =
        !searchQuery ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.deck.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || art.categoryId === selectedCategory;
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'published' && (art.status === 'published' || !art.status)) ||
        art.status === selectedStatus;
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [articles, searchQuery, selectedCategory, selectedStatus]);

  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage) || 1;
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredArticles.slice(start, start + itemsPerPage);
  }, [filteredArticles, currentPage]);

  const handleOpenCreate = () => {
    setEditingArticle({
      title: '',
      deck: '',
      content: [''],
      categoryId: categories[0]?.id || 'world',
      categoryName: categories[0]?.name || 'العالم',
      source: 'نت نيوز',
      sourceUrl: '',
      author: { name: 'محرر نت نيوز', role: 'صحفي معتمد' },
      imageCaption: '',
      imageUrl: '',
      readTime: '3 دقائق قراءة',
      status: 'published',
      isLead: false,
      isSecondary: false,
      isMostRead: false,
      tags: [],
      keyPoints: [],
    });
    setIsNewArticle(true);
    setFormError(null);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadingImage(false);
    setUploadProgress(0);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (art: AdminArticle) => {
    setEditingArticle({ ...art });
    setIsNewArticle(false);
    setFormError(null);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadingImage(false);
    setUploadProgress(0);
    setIsEditorOpen(true);
  };

  // Upload image from user device to Firebase Storage
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);
    setUploadingImage(true);
    setUploadProgress(0);

    // Immediate local preview so the admin sees the selected photo right away
    const localPreviewUrl = URL.createObjectURL(file);
    setEditingArticle((prev) => (prev ? { ...prev, imageUrl: localPreviewUrl } : null));

    try {
      const downloadUrl = await uploadArticleImage(file, (info) => {
        setUploadProgress(info.percent);
      });

      // Update article image with the Firebase Storage public download URL
      setEditingArticle((prev) => (prev ? { ...prev, imageUrl: downloadUrl } : null));
      setUploadSuccess('تم رفع الصورة بنجاح إلى Firebase Storage وحفظ رابطها السحابي تلقائياً!');
    } catch (err: unknown) {
      console.error('Storage upload error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(msg);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    // Validation
    if (!editingArticle.title?.trim()) {
      setFormError('يرجى إدخال عنوان المقال الرئيسي.');
      return;
    }
    if (!editingArticle.deck?.trim()) {
      setFormError('يرجى إدخال ملخص/العنوان الفرعي للمقال.');
      return;
    }
    const cleanContent = (editingArticle.content || []).filter((p) => p && p.trim().length > 0);
    if (cleanContent.length === 0) {
      setFormError('يرجى كتابة فقرة واحدة على الأقل في نص المقال.');
      return;
    }

    setSaving(true);
    try {
      const selectedCatObj = categories.find((c) => c.id === editingArticle.categoryId);
      const toSave = {
        ...editingArticle,
        content: cleanContent,
        categoryName: selectedCatObj?.name || editingArticle.categoryName || 'العالم',
        publishedAt: editingArticle.publishedAt || new Date().toLocaleDateString('ar-EG'),
        timestamp: editingArticle.timestamp || 'اليوم',
      };
      await onSaveArticle(toSave, isNewArticle);
      setIsEditorOpen(false);
      setEditingArticle(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(`فشل حفظ المقال: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmArticle) return;
    setDeleting(true);
    try {
      await onDeleteArticle(deleteConfirmArticle.id, deleteConfirmArticle.title);
      setDeleteConfirmArticle(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white font-heading">
              إدارة الأخبار والمقالات
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              إجمالي {articles.length} مقالاً مسجلاً في السحابة
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>إضافة مقال جديد</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ابحث بالعنوان، الملخص، أو المصدر..."
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 text-xs rounded-xl pr-10 pl-4 py-2.5 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">كافة الأقسام</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500"
            >
              <option value="all">كافة الحالات</option>
              <option value="published">منشور فقط</option>
              <option value="pending">معلّق فقط (بانتظار الموافقة)</option>
              <option value="draft">مسودة فقط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-[#0b1a2d] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] font-semibold">
              <tr>
                <th className="p-4">عنوان المقال</th>
                <th className="p-4">القسم</th>
                <th className="p-4">المصدر / الكاتب</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">التصنيف البارز</th>
                <th className="p-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {paginatedArticles.map((art) => (
                <tr key={art.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-4 max-w-sm">
                    <div className="font-bold text-white text-sm line-clamp-1">{art.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{art.deck}</div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-medium">
                      {art.categoryName}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="text-white font-medium">{art.author?.name || art.source}</div>
                    <div className="text-[10px] text-slate-500">{art.publishedAt}</div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {art.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80 shadow-xs">
                        <Clock size={11} className="text-amber-400 shrink-0" />
                        <span>معلّق (ينتظر الموافقة)</span>
                      </span>
                    ) : art.status === 'draft' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        مسودة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                        <span>منشور</span>
                      </span>
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap space-x-1 space-x-reverse">
                    {art.isLead && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 text-[10px] font-bold border border-sky-800">
                        خبر رئيسي
                      </span>
                    )}
                    {art.isSecondary && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-400 text-[10px] font-bold border border-purple-800">
                        ثانوي
                      </span>
                    )}
                    {art.isMostRead && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-bold border border-rose-800">
                        الأكثر قراءة
                      </span>
                    )}
                    {!art.isLead && !art.isSecondary && !art.isMostRead && (
                      <span className="text-slate-500 text-[11px]">عادي</span>
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {art.status === 'pending' && (
                        <button
                          onClick={() => onSaveArticle({ ...art, status: 'published' }, false)}
                          title="موافقة ونشر المقال فوراً على الموقع العام"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs shrink-0"
                        >
                          <CheckCircle2 size={13} />
                          <span>نشر الآن</span>
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewArticle(art)}
                        title="معاينة المقال"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(art)}
                        title="تعديل المقال"
                        className="p-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmArticle(art)}
                        title="حذف المقال"
                        className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedArticles.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    لا توجد مقالات تطابق معايير البحث والتصفية المحددة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            صفحة {currentPage} من إجمالي {totalPages} ({filteredArticles.length} مقالاً)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Full Article Editor Modal */}
      {isEditorOpen && editingArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-[#0b1a2d] text-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <h3 className="font-bold text-white text-base font-heading">
                {isNewArticle ? 'إضافة مقال إخباري جديد' : `تعديل المقال: ${editingArticle.title || ''}`}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-200">
                    <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                  {formError.includes('PERMISSION_DENIED') && (
                    <div className="p-2.5 rounded-lg bg-black/40 border border-rose-900/50 text-[11px] text-slate-300 space-y-1">
                      <p className="font-semibold text-rose-300">
                        لحل مشكلة رفض الصلاحيات فوراً في Firebase:
                      </p>
                      <p>
                        توجه إلى تبويب <strong className="text-white">«حالة النظام وFirebase»</strong> في القائمة الجانبية لنسخ قواعد الحماية المعتمدة، ثم الصقها في{' '}
                        <a
                          href="https://console.firebase.google.com/project/netnews-617e7/firestore/rules"
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 underline inline-flex items-center gap-0.5"
                        >
                          Firebase Console &gt; Rules
                          <ExternalLink size={10} />
                        </a>{' '}
                        واضغط Publish.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Title & Category Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    عنوان المقال الرئيسي *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingArticle.title || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                    placeholder="أدخل عنواناً إخبارياً رصيناً..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    القسم الإخباري *
                  </label>
                  <select
                    value={editingArticle.categoryId || 'world'}
                    onChange={(e) => {
                      const catObj = categories.find((c) => c.id === e.target.value);
                      setEditingArticle({
                        ...editingArticle,
                        categoryId: e.target.value,
                        categoryName: catObj?.name || 'العالم',
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Deck / Summary */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  الملخص / العنوان الفرعي (Deck) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingArticle.deck || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, deck: e.target.value })}
                  placeholder="موجز صحفي يوضح أهم ما ورد في التغطية..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Author & Source Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">اسم الكاتب/المحرر</label>
                  <input
                    type="text"
                    value={editingArticle.author?.name || ''}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        author: { ...(editingArticle.author || {}), name: e.target.value },
                      })
                    }
                    placeholder="مثال: عبدالرحمن الشهري"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">المصدر التحريري</label>
                  <input
                    type="text"
                    value={editingArticle.source || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, source: e.target.value })}
                    placeholder="مثال: رويترز ونت نيوز"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">وقت القراءة المقدر</label>
                  <input
                    type="text"
                    value={editingArticle.readTime || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, readTime: e.target.value })}
                    placeholder="مثال: 4 دقائق قراءة"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Content Body */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  نص المقال الكامل (افصل بين الفقرات بسطر فارغ) *
                </label>
                <textarea
                  rows={8}
                  required
                  value={(editingArticle.content || []).join('\n\n')}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      content: e.target.value.split('\n\n'),
                    })
                  }
                  placeholder="اكتب تفاصيل التقرير الإخباري هنا..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              {/* Media & Image Upload from Device */}
              <div className="space-y-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                      <ImageIcon size={15} className="text-sky-400" />
                      <span>صورة المقال الرئيسية (Media & Upload)</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ارفع صورة مباشرة من جهازك إلى Firebase Storage أو أدخل رابطاً سحابياً
                    </p>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {/* Upload button from device */}
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => {
                      setUploadError(null);
                      setUploadSuccess(null);
                      fileInputRef.current?.click();
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                      uploadingImage
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white shadow-sky-600/20'
                    }`}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-sky-300" />
                        <span>جارٍ رفع الصورة ({uploadProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} />
                        <span>رفع صورة من الجهاز (المعرض / الملفات)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Upload Progress Bar */}
                {uploadingImage && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-[11px] text-slate-300">
                      <span>جارٍ النقل إلى Firebase Storage...</span>
                      <span className="font-bold text-sky-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${uploadProgress}%` }}
                        className="h-full bg-sky-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                )}

                {/* Upload Success Alert */}
                {uploadSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {/* Upload Error Alert with Console Instructions */}
                {uploadError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                      <span>تعذر الرفع إلى Firebase Storage</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-200/90">
                      {uploadError}
                    </p>
                    <p className="text-[10px] text-slate-400 pt-1 border-t border-rose-900/50">
                      ملاحظة: إذا لم تكن خدمة Firebase Storage مفعّلة بعد في مشروعك (netnews-617e7)، يلزم فتح Firebase Console &gt; Storage &gt; Get Started. في هذه الأثناء، يمكنك استخدام رابط صورة خارجي أو المتابعة بالمعاينة المحلية.
                    </p>
                  </div>
                )}

                {/* Live Image Preview Box */}
                {editingArticle.imageUrl && (
                  <div className="relative p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-40 h-28 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                      <img
                        src={editingArticle.imageUrl}
                        alt="معاينة الصورة"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-2 text-right w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          <span>معاينة الصورة الحالية للمقال</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingArticle({ ...editingArticle, imageUrl: '' })}
                          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 p-1 rounded hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>إزالة الصورة</span>
                        </button>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 truncate max-w-md" dir="ltr">
                        {editingArticle.imageUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                      >
                        استبدال بصورة أخرى من الجهاز...
                      </button>
                    </div>
                  </div>
                )}

                {/* URL and Caption Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      رابط الصورة المباشر (URL أو الرابط السحابي)
                    </label>
                    <input
                      type="text"
                      value={editingArticle.imageUrl || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, imageUrl: e.target.value })}
                      placeholder="أدخل رابط الصورة أو ارفعها من جهازك أعلاه"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      الوصف التحريري للصورة (Caption)
                    </label>
                    <input
                      type="text"
                      value={editingArticle.imageCaption || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, imageCaption: e.target.value })}
                      placeholder="مثال: جانب من تغطية مراسلي نت نيوز الميدانية..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Badges & Placement Flags */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 block">موضع وأهمية النشر:</span>
                <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingArticle.isLead)}
                      onChange={(e) => setEditingArticle({ ...editingArticle, isLead: e.target.checked })}
                      className="rounded accent-sky-500"
                    />
                    <span>تعيين كـ «خبر رئيسي كبير»</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingArticle.isSecondary)}
                      onChange={(e) => setEditingArticle({ ...editingArticle, isSecondary: e.target.checked })}
                      className="rounded accent-purple-500"
                    />
                    <span>تعيين كـ «خبر ثانوي بارز»</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingArticle.isMostRead)}
                      onChange={(e) => setEditingArticle({ ...editingArticle, isMostRead: e.target.checked })}
                      className="rounded accent-rose-500"
                    />
                    <span>إدراج في قائمة «الأكثر قراءة»</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-300">حالة النشر:</span>
                    <select
                      value={editingArticle.status || 'published'}
                      onChange={(e) =>
                        setEditingArticle({
                          ...editingArticle,
                          status: e.target.value as ArticleStatus,
                        })
                      }
                      className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-white font-semibold focus:outline-none focus:border-sky-500"
                    >
                      <option value="published">منشور فوري (يظهر فوراً على الموقع العام)</option>
                      <option value="pending">معلّق (ينتظر مراجعة وموافقة الإدارة)</option>
                      <option value="draft">مسودة مؤقتة (مخفية عن الزوار)</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-sky-200" />
                      <span>جارٍ الحفظ والتوثيق في Firestore...</span>
                    </>
                  ) : editingArticle.status === 'pending' ? (
                    'حفظ المقال كمعلّق'
                  ) : editingArticle.status === 'draft' ? (
                    'حفظ كمسودة'
                  ) : isNewArticle ? (
                    'نشر المقال فورياً'
                  ) : (
                    'حفظ ونشر التعديلات'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto">
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-sky-900">معاينة ظهور المقال على الموقع الحي</span>
              <button
                onClick={() => setPreviewArticle(null)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <span className="text-xs font-bold text-sky-800">{previewArticle.categoryName}</span>
              <h1 className="text-2xl font-bold font-heading text-slate-950">{previewArticle.title}</h1>
              <p className="text-sm text-slate-700 leading-relaxed font-normal border-r-2 border-sky-800 pr-3">
                {previewArticle.deck}
              </p>
              <div className="text-xs text-slate-500 py-2 border-y border-slate-100 flex justify-between">
                <span>{previewArticle.author?.name || previewArticle.source}</span>
                <span>{previewArticle.publishedAt}</span>
              </div>
              <div className="space-y-3 text-sm text-slate-800 leading-relaxed pt-2">
                {previewArticle.content.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0b1a2d] border border-slate-800 text-white w-full max-w-md rounded-2xl p-6 shadow-2xl my-auto space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-base font-heading">تأكيد حذف المقال نهائياً</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف المقال: <strong className="text-white">«{deleteConfirmArticle.title}»</strong> من قاعدة البيانات السحابية؟
              لا يمكن التراجع عن هذه العملية بعد التأكيد.
            </p>
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmArticle(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
