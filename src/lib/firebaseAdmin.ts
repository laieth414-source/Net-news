import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, ADMIN_EMAIL, handleFirestoreError, OperationType } from './firebase';
import {
  AdminArticle,
  AdminBreakingNews,
  AdminCategory,
  StaticPage,
  NewsletterSubscriber,
  SiteSettings,
  SeoSettings,
  AdSlot,
  AdminComment,
  AuditLog
} from '../types/admin';
import { CATEGORIES } from '../data/newsData';

// Helper to assert admin privileges
export function assertAdmin(): string {
  const user = auth.currentUser;
  if (!user || user.email !== ADMIN_EMAIL) {
    throw new Error('غير مصرح لك بتنفيذ هذه العملية الإدارية.');
  }
  return user.email;
}

// Log admin action to auditLogs collection
export async function logAdminAction(
  action: string,
  entity: string,
  details: string,
  entityId?: string,
  status: 'success' | 'failure' = 'success'
): Promise<void> {
  try {
    const adminEmail = auth.currentUser?.email || ADMIN_EMAIL;
    await addDoc(collection(db, 'auditLogs'), {
      action,
      entity,
      entityId: entityId || '',
      adminEmail,
      timestamp: new Date().toISOString(),
      details,
      status,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

// ----------------- Articles Management -----------------
export async function getArticlesAdmin(): Promise<AdminArticle[]> {
  try {
    const snapshot = await getDocs(collection(db, 'articles'));
    const list: AdminArticle[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        title: data.title || '',
        deck: data.deck || '',
        content: Array.isArray(data.content) ? data.content : [data.deck || ''],
        categoryId: data.categoryId || 'world',
        categoryName: data.categoryName || 'العالم',
        publishedAt: data.publishedAt || new Date().toISOString(),
        timestamp: data.timestamp || 'اليوم',
        source: data.source || 'نت نيوز',
        sourceUrl: data.sourceUrl || '',
        author: data.author || { name: 'هيئة التحرير' },
        themeColor: data.themeColor || '#0f223d',
        imageUrl: data.imageUrl || '',
        imageCaption: data.imageCaption || '',
        readTime: data.readTime || '3 دقائق قراءة',
        isLead: Boolean(data.isLead),
        isSecondary: Boolean(data.isSecondary),
        isMostRead: Boolean(data.isMostRead),
        status: data.status || 'published',
        viewsCount: data.viewsCount || '0 قراءة',
        tags: Array.isArray(data.tags) ? data.tags : [],
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'articles');
    return [];
  }
}

export async function saveArticleAdmin(article: Partial<AdminArticle>, isNew: boolean): Promise<string> {
  const adminEmail = assertAdmin();
  const id = isNew ? (article.id || `art-${Date.now()}`) : article.id!;
  const docRef = doc(db, 'articles', id);

  const payload = {
    title: article.title || '',
    deck: article.deck || '',
    content: Array.isArray(article.content) ? article.content : [article.deck || ''],
    categoryId: article.categoryId || 'world',
    categoryName: article.categoryName || 'العالم',
    publishedAt: article.publishedAt || new Date().toLocaleDateString('ar-EG'),
    timestamp: article.timestamp || 'منذ قليل',
    source: article.source || 'نت نيوز',
    sourceUrl: article.sourceUrl || '',
    author: article.author || { name: 'محرر نت نيوز' },
    themeColor: article.themeColor || '#0f223d',
    imageUrl: article.imageUrl || '',
    imageCaption: article.imageCaption || '',
    readTime: article.readTime || '3 دقائق قراءة',
    isLead: Boolean(article.isLead),
    isSecondary: Boolean(article.isSecondary),
    isMostRead: Boolean(article.isMostRead),
    status: article.status || 'published',
    viewsCount: article.viewsCount || '0 قراءة',
    tags: Array.isArray(article.tags) ? article.tags : [],
    keyPoints: Array.isArray(article.keyPoints) ? article.keyPoints : [],
    updatedAt: serverTimestamp(),
    ...(isNew ? { createdAt: serverTimestamp() } : {})
  };

  await setDoc(docRef, payload, { merge: true });
  await logAdminAction(
    isNew ? 'إضافة مقال' : 'تعديل مقال',
    'المقالات والأخبار',
    `تم ${isNew ? 'إضافة' : 'تحديث'} المقال: ${payload.title}`,
    id
  );

  return id;
}

export async function deleteArticleAdmin(id: string, title?: string): Promise<void> {
  assertAdmin();
  await deleteDoc(doc(db, 'articles', id));
  await logAdminAction('حذف مقال', 'المقالات والأخبار', `تم حذف المقال: ${title || id}`, id);
}

// ----------------- Breaking News Management -----------------
export async function getBreakingNewsAdmin(): Promise<AdminBreakingNews[]> {
  try {
    const snapshot = await getDocs(collection(db, 'breakingNews'));
    const list: AdminBreakingNews[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        text: data.text || '',
        time: data.time || 'عاجل',
        category: data.category || 'عاجل',
        articleId: data.articleId || '',
        isActive: data.isActive !== false,
        order: data.order || 0,
        startTime: data.startTime || '',
        endTime: data.endTime || '',
        createdAt: data.createdAt
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'breakingNews');
    return [];
  }
}

export async function saveBreakingNewsAdmin(item: Partial<AdminBreakingNews>, isNew: boolean): Promise<string> {
  assertAdmin();
  const id = isNew ? (item.id || `brk-${Date.now()}`) : item.id!;
  const docRef = doc(db, 'breakingNews', id);

  const payload = {
    text: item.text || '',
    time: item.time || 'منذ دقيقة',
    category: item.category || 'عاجل',
    articleId: item.articleId || '',
    isActive: item.isActive !== false,
    order: item.order || 0,
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    updatedAt: serverTimestamp(),
    ...(isNew ? { createdAt: serverTimestamp() } : {})
  };

  await setDoc(docRef, payload, { merge: true });
  await logAdminAction(
    isNew ? 'إضافة خبر عاجل' : 'تعديل خبر عاجل',
    'الأخبار العاجلة',
    `تم ${isNew ? 'إضافة' : 'تحديث'} الخبر العاجل: ${payload.text}`,
    id
  );

  return id;
}

export async function deleteBreakingNewsAdmin(id: string, text?: string): Promise<void> {
  assertAdmin();
  await deleteDoc(doc(db, 'breakingNews', id));
  await logAdminAction('حذف خبر عاجل', 'الأخبار العاجلة', `تم حذف الخبر العاجل: ${text || id}`, id);
}

// ----------------- Categories Management -----------------
export const DEFAULT_ADMIN_CATEGORIES: AdminCategory[] = CATEGORIES.map((c, index) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  accentColor: c.accentColor,
  description: c.description || '',
  order: index + 1,
  isActive: true,
  showInNav: true
}));

export async function getCategoriesAdmin(): Promise<AdminCategory[]> {
  try {
    const snapshot = await getDocs(collection(db, 'categories'));
    if (snapshot.empty) {
      return DEFAULT_ADMIN_CATEGORIES;
    }
    const list: AdminCategory[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        name: data.name || '',
        slug: data.slug || docSnap.id,
        accentColor: data.accentColor || '#0f223d',
        description: data.description || '',
        icon: data.icon || '',
        order: data.order || 0,
        isActive: data.isActive !== false,
        showInNav: data.showInNav !== false
      });
    });
    return list.sort((a, b) => a.order - b.order);
  } catch (err) {
    return DEFAULT_ADMIN_CATEGORIES;
  }
}

export async function saveCategoryAdmin(cat: Partial<AdminCategory>, isNew: boolean): Promise<string> {
  assertAdmin();
  const id = isNew ? (cat.id || cat.slug || `cat-${Date.now()}`) : cat.id!;
  const docRef = doc(db, 'categories', id);

  const payload = {
    name: cat.name || '',
    slug: cat.slug || id,
    accentColor: cat.accentColor || '#0f223d',
    description: cat.description || '',
    icon: cat.icon || '',
    order: cat.order || 1,
    isActive: cat.isActive !== false,
    showInNav: cat.showInNav !== false,
    updatedAt: serverTimestamp()
  };

  await setDoc(docRef, payload, { merge: true });
  await logAdminAction(
    isNew ? 'إضافة قسم' : 'تعديل قسم',
    'الأقسام والتصنيفات',
    `تم ${isNew ? 'إنشاء' : 'تعديل'} القسم: ${payload.name}`,
    id
  );
  return id;
}

export async function deleteCategoryAdmin(id: string, name?: string): Promise<void> {
  assertAdmin();
  await deleteDoc(doc(db, 'categories', id));
  await logAdminAction('حذف قسم', 'الأقسام والتصنيفات', `تم حذف القسم: ${name || id}`, id);
}

// ----------------- Static Pages Management -----------------
export const DEFAULT_STATIC_PAGES: StaticPage[] = [
  {
    id: 'about',
    slug: 'about-us',
    title: 'من نحن',
    content: 'شبكة نت نيوز (NET NEWS) هي منصة إعلامية رقمية عربية مستقلة تقدم تغطية إخبارية مهنية متوازنة وموضوعية، تلتزم بأعلى معايير الدقة والنزاهة الصحفية ومواكبة الأحداث الإقليمية والعالمية لحظة بلحظة.',
    excerpt: 'نبذة عن شبكة نت نيوز وتأسيسها ورؤيتها الإعلامية المستقلة.',
    isPublished: true,
    lastUpdated: '2026-10-09',
    showInFooter: true,
    order: 1
  },
  {
    id: 'contact',
    slug: 'contact-us',
    title: 'اتصل بهيئة التحرير',
    content: 'يمكنكم التواصل مع غرفة الأخبار وهيئة التحرير للمشاركات والبيانات الصحفية واستفسارات القراء عبر نموذج المراسلة المباشر المتاح في صفحة التواصل بالموقع.',
    excerpt: 'قنوات التواصل المباشرة مع هيئة تحرير نت نيوز.',
    isPublished: true,
    lastUpdated: '2026-10-10',
    showInFooter: true,
    order: 2
  },
  {
    id: 'privacy',
    slug: 'privacy-policy',
    title: 'سياسة الخصوصية',
    content: 'نحن في نت نيوز نحترم خصوصية زوارنا تماماً ولا نقوم بجمع أي معلومات شخصية دون موافقتهم الصريحة. لا يتم مشاركة بيانات النشرة البريدية مع أي طرف ثالث تحت أي ظرف.',
    excerpt: 'سياسة حماية بيانات الزوار والسرية والخصوصية الرقمية.',
    isPublished: true,
    lastUpdated: '2026-10-09',
    showInFooter: true,
    order: 3
  },
  {
    id: 'terms',
    slug: 'terms-of-use',
    title: 'شروط الاستخدام',
    content: 'تخضع جميع المواد المنشورة على نت نيوز لحقوق الملكية الفكرية. يُسمح بالاقتباس المحدود للأغراض الصحفية بشرط الإشارة الصريحة للمصدر ووضع رابط مباشر للخبر الأصلي.',
    excerpt: 'الشروط القانونية للاستخدام وحقوق النشر للمحتوى.',
    isPublished: true,
    lastUpdated: '2026-10-09',
    showInFooter: true,
    order: 4
  },
  {
    id: 'editorial-code',
    slug: 'editorial-code',
    title: 'ميثاق الشرف المهني',
    content: 'تلتزم نت نيوز بمبادئ التحقق من الأخبار من مصدرين مستقلين على الأقل قبل النشر، والفصل التام بين الخبر والتحليل والرأي، والامتناع عن الإثارة الرخيصة والتضليل الإعلامي.',
    excerpt: 'المعايير التحريرية ومبادئ النزاهة الصحفية المعتمدة.',
    isPublished: true,
    lastUpdated: '2026-10-09',
    showInFooter: true,
    order: 5
  },
  {
    id: 'corrections',
    slug: 'corrections-policy',
    title: 'سياسة التحرير والتصحيح',
    content: 'نؤمن في نت نيوز بحق الرد وتصحيح الأخطاء بشفافية تامة. في حال حدوث أي خطأ غير مقصود في بيانات أي خبر، يتم تصحيحه فوراً مع وضع إشعار صريح في نهاية المادة يوضح تاريخ وطبيعة التصحيح.',
    excerpt: 'آلية معالجة الأخطاء وحق الرد والتصحيح الفوري.',
    isPublished: true,
    lastUpdated: '2026-10-09',
    showInFooter: true,
    order: 6
  }
];

export async function getStaticPagesAdmin(): Promise<StaticPage[]> {
  try {
    const snapshot = await getDocs(collection(db, 'staticPages'));
    if (snapshot.empty) {
      return DEFAULT_STATIC_PAGES;
    }
    const list: StaticPage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        slug: data.slug || docSnap.id,
        title: data.title || '',
        content: data.content || '',
        excerpt: data.excerpt || '',
        isPublished: data.isPublished !== false,
        lastUpdated: data.lastUpdated || '2026-10-09',
        showInFooter: data.showInFooter !== false,
        order: data.order || 0
      });
    });
    return list.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (err) {
    return DEFAULT_STATIC_PAGES;
  }
}

export async function saveStaticPageAdmin(page: Partial<StaticPage>, isNew: boolean): Promise<string> {
  assertAdmin();
  const id = isNew ? (page.id || page.slug || `page-${Date.now()}`) : page.id!;
  const docRef = doc(db, 'staticPages', id);

  const payload = {
    slug: page.slug || id,
    title: page.title || '',
    content: page.content || '',
    excerpt: page.excerpt || '',
    isPublished: page.isPublished !== false,
    lastUpdated: new Date().toLocaleDateString('ar-EG'),
    showInFooter: page.showInFooter !== false,
    order: page.order || 1,
    updatedAt: serverTimestamp()
  };

  await setDoc(docRef, payload, { merge: true });
  await logAdminAction(
    isNew ? 'إضافة صفحة ثابتة' : 'تعديل صفحة ثابتة',
    'الصفحات الثابتة',
    `تم ${isNew ? 'إنشاء' : 'تحديث'} الصفحة: ${payload.title}`,
    id
  );
  return id;
}

export async function deleteStaticPageAdmin(id: string, title?: string): Promise<void> {
  assertAdmin();
  await deleteDoc(doc(db, 'staticPages', id));
  await logAdminAction('حذف صفحة ثابتة', 'الصفحات الثابتة', `تم حذف الصفحة: ${title || id}`, id);
}

// ----------------- Newsletter Subscribers Management -----------------
export async function getSubscribersAdmin(): Promise<NewsletterSubscriber[]> {
  assertAdmin();
  try {
    const snapshot = await getDocs(collection(db, 'newsletterSubscribers'));
    const list: NewsletterSubscriber[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        email: data.email || '',
        subscribedAt: data.subscribedAt || '',
        platform: data.platform || 'web'
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'newsletterSubscribers');
    return [];
  }
}

export async function deleteSubscriberAdmin(id: string, email?: string): Promise<void> {
  assertAdmin();
  await deleteDoc(doc(db, 'newsletterSubscribers', id));
  await logAdminAction('حذف مشترك', 'النشرة البريدية', `تم حذف المشترك: ${email || id}`, id);
}

// ----------------- Site Settings Management -----------------
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'NET NEWS | نت نيوز',
  siteSubtitle: 'شبكة إخبارية عربية رقمية مستقلة',
  siteDescription: 'بوابة إخبارية عربية رصينة تقدم تغطية متكاملة للأحداث العالمية والعربية والخليجية والملفات الاقتصادية والرياضية والتقنية بموضوعية واحترافية.',
  contactEmail: '',
  contactPhone: '',
  officeLocation: '',
  timezone: 'Asia/Riyadh (GMT+3)',
  dateFormat: 'ar-EG (ميلادي وهجري)',
  maintenanceMode: false,
  maintenanceMessage: 'الموقع يخضع حالياً لأعمال الصيانة الدورية وتحديث الخوادم. سنعود إليكم خلال دقائق.',
  socialLinks: {
    twitter: '',
    facebook: '',
    telegram: '',
    youtube: '',
    linkedin: ''
  },
  footerText: 'جميع الحقوق محفوظة لشبكة نت نيوز الإخبارية © 2026',
  breakingNewsEnabled: true,
  marketBarEnabled: true,
  opinionsEnabled: true,
  mostReadEnabled: true
};

export async function getSiteSettingsAdmin(): Promise<SiteSettings> {
  try {
    const docSnap = await getDoc(doc(db, 'siteSettings', 'general'));
    if (docSnap.exists()) {
      return { ...DEFAULT_SITE_SETTINGS, ...docSnap.data() } as SiteSettings;
    }
    return DEFAULT_SITE_SETTINGS;
  } catch (err) {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function saveSiteSettingsAdmin(settings: SiteSettings): Promise<void> {
  assertAdmin();
  const docRef = doc(db, 'siteSettings', 'general');
  await setDoc(docRef, {
    ...settings,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await logAdminAction('تحديث إعدادات الموقع', 'الإعدادات العامة', 'تم تحديث الإعدادات العامة للموقع بنجاح');
}

// ----------------- SEO Settings Management -----------------
export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  metaTitle: 'NET NEWS | نت نيوز - شبكة إخبارية عربية مستقلة',
  metaDescription: 'آخر الأخبار السياسية والاقتصادية والرياضية والتقنية في العالم والشرق الأوسط والخليج العربي لحظة بلحظة.',
  canonicalUrl: 'https://netnews1.netlify.app',
  ogImage: '/og-image.png',
  twitterHandle: '',
  enableStructuredData: true,
  keywords: ['أخبار', 'نت نيوز', 'العالم', 'الخليج', 'اقتصاد', 'رياضة', 'تكنولوجيا']
};

export async function getSeoSettingsAdmin(): Promise<SeoSettings> {
  try {
    const docSnap = await getDoc(doc(db, 'siteSettings', 'seo'));
    if (docSnap.exists()) {
      return { ...DEFAULT_SEO_SETTINGS, ...docSnap.data() } as SeoSettings;
    }
    return DEFAULT_SEO_SETTINGS;
  } catch (err) {
    return DEFAULT_SEO_SETTINGS;
  }
}

export async function saveSeoSettingsAdmin(seo: SeoSettings): Promise<void> {
  assertAdmin();
  const docRef = doc(db, 'siteSettings', 'seo');
  await setDoc(docRef, {
    ...seo,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await logAdminAction('تحديث إعدادات SEO', 'محركات البحث SEO', 'تم تحديث إعدادات الأرشفة والبيانات الوصفية');
}

// ----------------- Ads Management -----------------
export const DEFAULT_AD_SLOTS: AdSlot[] = [
  {
    id: 'header-banner',
    name: 'بانر أعلى الصفحة (Top Header)',
    location: 'header',
    isEnabled: false,
    codeSnippet: '<!-- Google AdSense Responsive Header Unit -->\n<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="1234567890" data-ad-format="auto"></ins>',
    notes: 'يظهر أسفل شريط الأخبار العاجلة على كامل العرض.'
  },
  {
    id: 'sidebar-ad',
    name: 'إعلان الشريط الجانبي (Sidebar Ad)',
    location: 'sidebar',
    isEnabled: false,
    codeSnippet: '<!-- Sidebar 300x250 Medium Rectangle Unit -->',
    notes: 'يظهر بجانب تيار آخر الأخبار أو الأكثر قراءة.'
  },
  {
    id: 'in-article-ad',
    name: 'إعلان وسط المقال (In-Article)',
    location: 'inArticle',
    isEnabled: false,
    codeSnippet: '<!-- In-Article Native Ad Unit -->',
    notes: 'يظهر تلقائياً بين فقرات قراءة المقال في النافذة المنبثقة.'
  },
  {
    id: 'footer-banner',
    name: 'بانر أسفل الصفحة (Footer Banner)',
    location: 'footer',
    isEnabled: false,
    codeSnippet: '<!-- Bottom Leaderboard Unit -->',
    notes: 'يظهر قبل التذييل النهائي للموقع.'
  }
];

export async function getAdSlotsAdmin(): Promise<AdSlot[]> {
  try {
    const snapshot = await getDocs(collection(db, 'adSlots'));
    if (snapshot.empty) {
      return DEFAULT_AD_SLOTS;
    }
    const list: AdSlot[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as AdSlot);
    });
    return list;
  } catch (err) {
    return DEFAULT_AD_SLOTS;
  }
}

export async function saveAdSlotAdmin(slot: AdSlot): Promise<void> {
  assertAdmin();
  const docRef = doc(db, 'adSlots', slot.id);
  await setDoc(docRef, { ...slot, updatedAt: serverTimestamp() }, { merge: true });
  await logAdminAction('تحديث موضع إعلاني', 'الإعلانات والربح', `تم تحديث الموضع الإعلاني: ${slot.name}`, slot.id);
}

// ----------------- Comments Management -----------------
export async function getCommentsAdmin(): Promise<AdminComment[]> {
  try {
    const snapshot = await getDocs(collection(db, 'comments'));
    const list: AdminComment[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as AdminComment);
    });
    return list;
  } catch (err) {
    return [];
  }
}

export async function updateCommentStatusAdmin(id: string, status: 'approved' | 'rejected'): Promise<void> {
  assertAdmin();
  const docRef = doc(db, 'comments', id);
  await setDoc(docRef, { status, updatedAt: serverTimestamp() }, { merge: true });
  await logAdminAction('تغيير حالة تعليق', 'إدارة التعليقات', `تم تعديل حالة التعليق إلى ${status}`, id);
}

export async function deleteCommentAdmin(id: string): Promise<void> {
  assertAdmin();
  await deleteDoc(doc(db, 'comments', id));
  await logAdminAction('حذف تعليق', 'إدارة التعليقات', `تم حذف التعليق رقم: ${id}`, id);
}

// ----------------- Audit Logs Management -----------------
export async function getAuditLogsAdmin(): Promise<AuditLog[]> {
  assertAdmin();
  try {
    const logsQuery = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(logsQuery);
    const list: AuditLog[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        action: data.action || '',
        entity: data.entity || '',
        entityId: data.entityId,
        adminEmail: data.adminEmail || '',
        timestamp: data.timestamp || '',
        details: data.details || '',
        status: data.status || 'success'
      });
    });
    return list;
  } catch (err) {
    // If index or query fails, try without orderBy
    try {
      const snapshot = await getDocs(collection(db, 'auditLogs'));
      const list: AuditLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          action: data.action || '',
          entity: data.entity || '',
          entityId: data.entityId,
          adminEmail: data.adminEmail || '',
          timestamp: data.timestamp || '',
          details: data.details || '',
          status: data.status || 'success'
        });
      });
      return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch {
      return [];
    }
  }
}
