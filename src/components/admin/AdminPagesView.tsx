import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Save,
  X,
  AlertTriangle,
  FileCheck2,
  ListPlus,
  Minus
} from 'lucide-react';
import { StaticPageDetail, StaticPageSection } from '../../data/staticPagesData';

interface AdminPagesViewProps {
  pages: StaticPageDetail[];
  onSavePage: (page: Partial<StaticPageDetail>, isNew: boolean) => Promise<void>;
  onDeletePage: (id: string, title?: string) => Promise<void>;
  onSeedDefaults: () => Promise<void>;
  onPreviewPage?: (slug: string) => void;
}

export const AdminPagesView: React.FC<AdminPagesViewProps> = ({
  pages,
  onSavePage,
  onDeletePage,
  onSeedDefaults,
  onPreviewPage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPage, setEditingPage] = useState<StaticPageDetail | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Form State for Editing/Creating
  const [formData, setFormData] = useState<Partial<StaticPageDetail>>({
    title: '',
    slug: '',
    subtitle: '',
    badge: 'صفحة موقع',
    readingTime: '3 دقائق قراءة',
    excerpt: '',
    showInFooter: true,
    isActive: true,
    order: 1,
    sections: [
      {
        heading: 'مقدمة',
        paragraphs: [''],
        bulletPoints: [],
      },
    ],
  });

  // Filter pages
  const filteredPages = pages.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.title.toLowerCase().includes(term) ||
      p.slug.toLowerCase().includes(term) ||
      p.subtitle?.toLowerCase().includes(term) ||
      p.excerpt?.toLowerCase().includes(term)
    );
  });

  const sortedPages = [...filteredPages].sort((a, b) => (a.order || 0) - (b.order || 0));

  const totalPages = pages.length;
  const footerPagesCount = pages.filter((p) => p.showInFooter !== false).length;
  const activePagesCount = pages.filter((p) => p.isActive !== false).length;

  const handleOpenCreate = () => {
    setIsCreating(true);
    setEditingPage(null);
    setFormData({
      title: '',
      slug: '',
      subtitle: '',
      badge: 'صفحة موقع',
      readingTime: '3 دقائق قراءة',
      excerpt: '',
      showInFooter: true,
      isActive: true,
      order: pages.length + 1,
      sections: [
        {
          heading: 'مقدمة عن الصفحة',
          paragraphs: [''],
          bulletPoints: [],
        },
      ],
    });
  };

  const handleOpenEdit = (page: StaticPageDetail) => {
    setIsCreating(false);
    setEditingPage(page);
    setFormData({
      id: page.id,
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle || '',
      badge: page.badge || 'صفحة موقع',
      readingTime: page.readingTime || '3 دقائق قراءة',
      excerpt: page.excerpt || '',
      showInFooter: page.showInFooter !== false,
      isActive: page.isActive !== false,
      order: typeof page.order === 'number' ? page.order : 1,
      sections:
        Array.isArray(page.sections) && page.sections.length > 0
          ? JSON.parse(JSON.stringify(page.sections))
          : [
              {
                heading: page.title,
                paragraphs: [page.excerpt || ''],
                bulletPoints: [],
              },
            ],
    });
  };

  const handleCloseModal = () => {
    setIsCreating(false);
    setEditingPage(null);
  };

  // Section manipulation helpers
  const handleAddSection = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [
        ...(prev.sections || []),
        {
          heading: `قسم جديد ${(prev.sections?.length || 0) + 1}`,
          paragraphs: [''],
          bulletPoints: [],
        },
      ],
    }));
  };

  const handleRemoveSection = (sectionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: (prev.sections || []).filter((_, idx) => idx !== sectionIndex),
    }));
  };

  const handleSectionHeadingChange = (sectionIndex: number, val: string) => {
    setFormData((prev) => {
      const updated = [...(prev.sections || [])];
      if (updated[sectionIndex]) {
        updated[sectionIndex] = { ...updated[sectionIndex], heading: val };
      }
      return { ...prev, sections: updated };
    });
  };

  const handleAddParagraph = (sectionIndex: number) => {
    setFormData((prev) => {
      const updated = [...(prev.sections || [])];
      if (updated[sectionIndex]) {
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          paragraphs: [...updated[sectionIndex].paragraphs, ''],
        };
      }
      return { ...prev, sections: updated };
    });
  };

  const handleParagraphChange = (sectionIndex: number, pIndex: number, val: string) => {
    setFormData((prev) => {
      const updated = [...(prev.sections || [])];
      if (updated[sectionIndex]) {
        const pList = [...updated[sectionIndex].paragraphs];
        pList[pIndex] = val;
        updated[sectionIndex] = { ...updated[sectionIndex], paragraphs: pList };
      }
      return { ...prev, sections: updated };
    });
  };

  const handleRemoveParagraph = (sectionIndex: number, pIndex: number) => {
    setFormData((prev) => {
      const updated = [...(prev.sections || [])];
      if (updated[sectionIndex]) {
        const pList = updated[sectionIndex].paragraphs.filter((_, idx) => idx !== pIndex);
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          paragraphs: pList.length > 0 ? pList : [''],
        };
      }
      return { ...prev, sections: updated };
    });
  };

  const handleAddBullet = (sectionIndex: number) => {
    setFormData((prev) => {
      const updated = [...(prev.sections || [])];
      if (updated[sectionIndex]) {
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          bulletPoints: [...(updated[sectionIndex].bulletPoints || []), ''],
        };
      }
      return { ...prev, sections: updated };
    });
  };

  const handleBulletChange = (sectionIndex: number, bIndex: number, val: string) => {
    setFormData((prev) => {
      const updated = [...(prev.sections || [])];
      if (updated[sectionIndex]) {
        const bList = [...(updated[sectionIndex].bulletPoints || [])];
        bList[bIndex] = val;
        updated[sectionIndex] = { ...updated[sectionIndex], bulletPoints: bList };
      }
      return { ...prev, sections: updated };
    });
  };

  const handleRemoveBullet = (sectionIndex: number, bIndex: number) => {
    setFormData((prev) => {
      const updated = [...(prev.sections || [])];
      if (updated[sectionIndex]) {
        const bList = (updated[sectionIndex].bulletPoints || []).filter((_, idx) => idx !== bIndex);
        updated[sectionIndex] = { ...updated[sectionIndex], bulletPoints: bList };
      }
      return { ...prev, sections: updated };
    });
  };

  // Quick toggle footer visibility
  const handleToggleFooter = async (page: StaticPageDetail) => {
    try {
      await onSavePage(
        {
          ...page,
          showInFooter: !page.showInFooter,
        },
        false
      );
      setNotice(`تم ${!page.showInFooter ? 'إظهار' : 'إخفاء'} صفحة «${page.title}» في التذييل مباشرة.`);
      setTimeout(() => setNotice(null), 3000);
    } catch {
      // Error handled by parent toast
    }
  };

  // Quick toggle active status
  const handleToggleActive = async (page: StaticPageDetail) => {
    try {
      await onSavePage(
        {
          ...page,
          isActive: !page.isActive,
        },
        false
      );
      setNotice(`تم تغيير حالة نشر صفحة «${page.title}» إلى ${!page.isActive ? 'نشطة' : 'مسودة'}.`);
      setTimeout(() => setNotice(null), 3000);
    } catch {
      // Error handled by parent toast
    }
  };

  // Form submit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    const slug = (formData.slug || formData.title)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0621-\u064A-]/g, '');

    const cleanSections = (formData.sections || [])
      .map((sec) => ({
        heading: sec.heading.trim(),
        paragraphs: sec.paragraphs.map((p) => p.trim()).filter((p) => p.length > 0),
        bulletPoints: (sec.bulletPoints || []).map((b) => b.trim()).filter((b) => b.length > 0),
      }))
      .filter((sec) => sec.heading.length > 0 || sec.paragraphs.length > 0);

    const payload: Partial<StaticPageDetail> = {
      ...formData,
      id: isCreating ? slug : formData.id || slug,
      slug: slug || `page-${Date.now()}`,
      title: formData.title.trim(),
      subtitle: (formData.subtitle || '').trim(),
      badge: (formData.badge || 'صفحة موقع').trim(),
      excerpt: (formData.excerpt || '').trim(),
      readingTime: (formData.readingTime || '3 دقائق قراءة').trim(),
      order: Number(formData.order) || 1,
      showInFooter: Boolean(formData.showInFooter),
      isActive: Boolean(formData.isActive),
      sections: cleanSections.length > 0 ? cleanSections : [
        {
          heading: formData.title.trim(),
          paragraphs: [formData.excerpt || formData.title.trim()],
          bulletPoints: [],
        },
      ],
      lastUpdated: new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };

    setIsSubmitting(true);
    try {
      await onSavePage(payload, isCreating);
      handleCloseModal();
      setNotice(isCreating ? 'تمت إضافة الصفحة بنجاح!' : 'تم تحديث الصفحة وحفظ التعديلات في قاعدة البيانات مباشرة.');
      setTimeout(() => setNotice(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice(`تنبيه: ${msg}`);
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async (id: string, title?: string) => {
    setIsSubmitting(true);
    try {
      await onDeletePage(id, title);
      setDeleteConfirmId(null);
      setNotice(`تم حذف الصفحة بنجاح.`);
      setTimeout(() => setNotice(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice(`تعذر الحذف: ${msg}`);
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeed = async () => {
    if (!window.confirm('هل تريد مزامنة وحفظ كافة الصفحات التأسيسية الست (من نحن، ميثاق الشرف، سياسة التحرير، شروط الاستخدام، سياسة الخصوصية، اتصل بهيئة التحرير) في قاعدة بيانات Firebase؟')) {
      return;
    }
    setIsSeeding(true);
    try {
      await onSeedDefaults();
      setNotice('تمت مزامنة الصفحات التأسيسية الست مع Firebase بنجاح!');
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-[#0f223d] border border-slate-700/60 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-sky-600/20 text-sky-400 rounded-xl border border-sky-500/30">
              <FileCheck2 size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-white flex items-center gap-2">
                <span>إدارة صفحات الموقع</span>
                <span className="text-xs bg-sky-950 border border-sky-600/50 text-sky-300 font-sans px-2.5 py-0.5 rounded-full font-medium">
                  {totalPages} صفحات
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                التحكم بالصفحات المستقلة (من نحن، ميثاق الشرف، السياسات، الشروط) وتعديل محتواها وظهورها في التذييل.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="مزامنة الصفحات التأسيسية الست في Firebase"
          >
            <RefreshCw size={14} className={isSeeding ? 'animate-spin' : ''} />
            <span>{isSeeding ? 'جارٍ المزامنة...' : 'مزامنة الصفحات الأساسية'}</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-sky-900/40 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>إضافة صفحة جديدة</span>
          </button>
        </div>
      </div>

      {/* Notice Banner if any */}
      {notice && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Overview Stats Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="bg-[#112542] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">إجمالي الصفحات</span>
            <span className="text-2xl font-black text-white font-mono">{totalPages}</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-lg text-sky-400">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-[#112542] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">ظاهرة في التذييل (Footer)</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{footerPagesCount}</span>
          </div>
          <div className="p-3 bg-emerald-950/60 rounded-lg text-emerald-400 border border-emerald-800/40">
            <Eye size={20} />
          </div>
        </div>

        <div className="bg-[#112542] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">الصفحات النشطة</span>
            <span className="text-2xl font-black text-sky-400 font-mono">{activePagesCount}</span>
          </div>
          <div className="p-3 bg-sky-950/60 rounded-lg text-sky-400 border border-sky-800/40">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#0f223d] border border-slate-800 rounded-xl p-3 sm:p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث في عناوين الصفحات أو الروابط أو الملخصات..."
            className="w-full bg-[#162d4a] border border-slate-700/80 text-white placeholder:text-slate-400 text-xs sm:text-sm pr-10 pl-4 py-2.5 rounded-lg focus:outline-none focus:border-sky-500"
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded bg-slate-800"
          >
            مسح
          </button>
        )}
      </div>

      {/* Pages List Table / Cards */}
      <div className="bg-[#0f223d] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
            <span>قائمة صفحات الموقع الرسمية</span>
            <span className="text-xs text-slate-400 font-normal">
              ({sortedPages.length} صفحة مطابقة)
            </span>
          </h3>
        </div>

        {sortedPages.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <FileText size={42} className="mx-auto text-slate-600" />
            <h4 className="text-white font-bold text-base">لا توجد صفحات مطابقة</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              لم يتم العثور على صفحات توافق معيار البحث، أو لم تتم مزامنة الصفحات بعد.
            </p>
            <button
              onClick={handleSeed}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-500 transition-colors"
            >
              <RefreshCw size={14} />
              <span>مزامنة الصفحات التأسيسية الآن</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {sortedPages.map((page) => (
              <div
                key={page.id || page.slug}
                className="p-4 sm:p-5 hover:bg-[#132845] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left side (in RTL, Right side info) */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      ترتيب: #{page.order || 1}
                    </span>
                    <h4 className="text-base font-bold text-white font-serif">{page.title}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800/50 font-medium">
                      {page.badge || 'صفحة'}
                    </span>
                    {page.isActive === false ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800/50 flex items-center gap-1">
                        <XCircle size={12} />
                        <span>مسودة</span>
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>نشط</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {page.subtitle || page.excerpt || 'لا يوجد وصف مختصر.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="font-mono text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/30">
                      /page/{page.slug}
                    </span>
                    <span>·</span>
                    <span>الأقسام: {page.sections?.length || 0} أقسام</span>
                    <span>·</span>
                    <span>آخر تحديث: {page.lastUpdated || 'محدث'}</span>
                  </div>
                </div>

                {/* Right side Actions & Toggles */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  {/* Quick Footer Toggle Button */}
                  <button
                    onClick={() => handleToggleFooter(page)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border cursor-pointer ${
                      page.showInFooter !== false
                        ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700'
                    }`}
                    title="التحكم بظهور الصفحة في تذييل الموقع (Footer)"
                  >
                    {page.showInFooter !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>{page.showInFooter !== false ? 'في التذييل' : 'مخفي بالتذييل'}</span>
                  </button>

                  {/* Active Toggle */}
                  <button
                    onClick={() => handleToggleActive(page)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      page.isActive !== false
                        ? 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                        : 'bg-rose-950/50 text-rose-300 border-rose-800/50'
                    }`}
                    title="تغيير حالة النشر"
                  >
                    <span>{page.isActive !== false ? 'منشور' : 'مسودة'}</span>
                  </button>

                  {/* Preview Button */}
                  {onPreviewPage && (
                    <button
                      onClick={() => onPreviewPage(page.slug)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 cursor-pointer"
                      title="معاينة الصفحة على الموقع"
                    >
                      <ExternalLink size={15} />
                    </button>
                  )}

                  {/* Edit Button */}
                  <button
                    onClick={() => handleOpenEdit(page)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>تعديل</span>
                  </button>

                  {/* Delete Button */}
                  {deleteConfirmId === page.id ? (
                    <div className="flex items-center gap-1 bg-rose-950 border border-rose-700 rounded-lg p-1">
                      <button
                        onClick={() => handleConfirmDelete(page.id, page.title)}
                        disabled={isSubmitting}
                        className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-500"
                      >
                        تأكيد الحذف
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 text-slate-400 hover:text-white text-[11px]"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(page.id)}
                      className="p-2 bg-slate-800/80 hover:bg-rose-950 hover:text-rose-400 text-slate-400 rounded-lg transition-colors border border-slate-700 cursor-pointer"
                      title="حذف الصفحة"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Create Full Modal */}
      {(isCreating || editingPage) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0f223d] text-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-700 my-auto flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-[#0b1a2d]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="text-sky-400" size={20} />
                <h3 className="font-bold text-lg font-serif">
                  {isCreating ? 'إضافة صفحة موقع جديدة' : `تعديل صفحة: ${editingPage?.title}`}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitForm} className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    عنوان الصفحة الرئيسي *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: من نحن، سياسة الخصوصية..."
                    className="w-full bg-[#162d4a] border border-slate-700 text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    المعرّف / الرابط اللطيف (Slug) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="about-us, privacy-policy..."
                    className="w-full bg-[#162d4a] border border-slate-700 text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    سيفتح الرابط عبر: /page/{formData.slug || 'slug'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    العنوان الفرعي / الشعار
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="وصف فرعي توضيحي يعلو متن الصفحة..."
                    className="w-full bg-[#162d4a] border border-slate-700 text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    شارة التصنيف (Badge)
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="عن المنصة، المعايير التحريرية..."
                    className="w-full bg-[#162d4a] border border-slate-700 text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Excerpt and Meta */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  الملخص التعريفي للصفحة (Excerpt)
                </label>
                <textarea
                  rows={2}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="موجز يظهر في بطاقة الملخص بأعلى الوثيقة..."
                  className="w-full bg-[#162d4a] border border-slate-700 text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Appearance, Order, Footer Toggles */}
              <div className="p-4 bg-[#0a182c] border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    ترتيب الظهور (Order)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-[#162d4a] border border-slate-700 text-white text-xs sm:text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 sm:pt-0">
                  <input
                    type="checkbox"
                    id="showInFooterCheck"
                    checked={formData.showInFooter !== false}
                    onChange={(e) => setFormData({ ...formData, showInFooter: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded bg-[#162d4a] border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="showInFooterCheck" className="text-xs font-bold text-slate-200 cursor-pointer">
                    ظهور الرابط في تذييل الموقع (Footer)
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2 sm:pt-0">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded bg-[#162d4a] border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs font-bold text-slate-200 cursor-pointer">
                    الصفحة نشطة ومتاحة للزوار (Active)
                  </label>
                </div>
              </div>

              {/* Sections & Content Builder */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Layers size={16} className="text-sky-400" />
                    <span>أقسام ومحتوى الصفحة ({formData.sections?.length || 0})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#162d4a] hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>إضافة قسم جديد</span>
                  </button>
                </div>

                <div className="space-y-5">
                  {(formData.sections || []).map((section, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-4 sm:p-5 bg-[#0b1a2d] border border-slate-800 rounded-xl space-y-3.5 relative"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-sky-400">
                          القسم رقم {sIdx + 1}
                        </span>
                        {formData.sections && formData.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(sIdx)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors text-xs flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            <span>حذف القسم</span>
                          </button>
                        )}
                      </div>

                      {/* Section Heading */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          عنوان القسم
                        </label>
                        <input
                          type="text"
                          required
                          value={section.heading}
                          onChange={(e) => handleSectionHeadingChange(sIdx, e.target.value)}
                          placeholder="مثال: 1. الرؤية والرسالة، 2. المعايير..."
                          className="w-full bg-[#162d4a] border border-slate-700 text-white text-xs sm:text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500 font-bold"
                        />
                      </div>

                      {/* Paragraphs */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-400">
                            فقرات القسم
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddParagraph(sIdx)}
                            className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                          >
                            <Plus size={12} />
                            <span>إضافة فقرة</span>
                          </button>
                        </div>

                        {section.paragraphs.map((p, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-2">
                            <textarea
                              rows={2}
                              value={p}
                              onChange={(e) => handleParagraphChange(sIdx, pIdx, e.target.value)}
                              placeholder={`اكتب نص الفقرة ${pIdx + 1}...`}
                              className="flex-1 bg-[#162d4a] border border-slate-700 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500 leading-relaxed"
                            />
                            {section.paragraphs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveParagraph(sIdx, pIdx)}
                                className="p-2 text-slate-400 hover:text-rose-400 rounded"
                                title="حذف الفقرة"
                              >
                                <Minus size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Bullet points */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-400">
                            نقاط القائمة المحددة (اختياري)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddBullet(sIdx)}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                          >
                            <Plus size={12} />
                            <span>إضافة نقطة</span>
                          </button>
                        </div>

                        {(section.bulletPoints || []).map((point, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                            <input
                              type="text"
                              value={point}
                              onChange={(e) => handleBulletChange(sIdx, bIdx, e.target.value)}
                              placeholder={`نقطة محددة ${bIdx + 1}...`}
                              className="flex-1 bg-[#162d4a] border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveBullet(sIdx, bIdx)}
                              className="p-1 text-slate-400 hover:text-rose-400 rounded"
                              title="حذف النقطة"
                            >
                              <Minus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between sticky bottom-0 bg-[#0f223d] py-2">
                <span className="text-[11px] text-slate-400">
                  سيتم حفظ التغييرات مباشرة في قاعدة بيانات Firebase Firestore.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-md shadow-sky-900/40 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{isSubmitting ? 'جارٍ الحفظ والمزامنة...' : 'حفظ التغييرات الآن'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
