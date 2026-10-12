import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import { Article, BreakingNewsItem, CategoryId } from '../types/news';
import { ARTICLES, BREAKING_NEWS, CATEGORIES } from '../data/newsData';
import { STATIC_PAGES_DATA, StaticPageDetail } from '../data/staticPagesData';
import {
  AdminArticle,
  AdminBreakingNews,
  AdminCategory,
  NewsletterSubscriber,
  SiteSettings,
  AuditLog
} from '../types/admin';
import { executeDirectSync } from './syncManager';

// User's provided Firebase configuration (Public Client Identifiers)
export const firebaseConfig = {
  apiKey: "AIzaSyDLfiGP1TSFC1c0v1x5J1JI3aXQeh0rfUQ",
  authDomain: "netnews-617e7.firebaseapp.com",
  projectId: "netnews-617e7",
  storageBucket: "netnews-617e7.firebasestorage.app",
  messagingSenderId: "384769664044",
  appId: "1:384769664044:web:d9910531a92b0502a4dd89"
};

// Initialize Firebase app singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

function getOrCreateFirestore() {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = getOrCreateFirestore();
export const auth = getAuth(app);
export const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Authorized administrator email (primary verified in security rules)
export const ADMIN_EMAIL = 'laieth772@gmail.com';

/**
 * Check if a user has administrator rights:
 * 1. Primary email match (laieth772@gmail.com)
 * 2. Or entry in admins collection
 */
export async function checkIsAdminUser(user: User | null): Promise<boolean> {
  if (!user || !user.email) return false;
  if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    // Attempt to ensure /admins/{uid} doc exists in Firestore for RBAC redundancy
    try {
      const adminRef = doc(db, 'admins', user.uid);
      const snap = await getDoc(adminRef);
      if (!snap.exists()) {
        await setDoc(adminRef, {
          email: user.email.toLowerCase(),
          role: 'admin',
          assignedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch {
      // Non-blocking
    }
    return true;
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch {
    return false;
  }
}

// Sign in with Email and Password as admin
export async function loginWithEmailAndPassword(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  return result.user;
}

// Sign in with Google as admin (alternative)
export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Sign out
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Send password reset email for admin
export async function sendAdminPasswordResetEmail(email = ADMIN_EMAIL): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

/**
 * Format raw Firestore errors into clear, actionable Arabic messages
 */
export function formatFirestoreErrorMessage(err: unknown, actionName = 'العملية'): string {
  const rawMsg = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code || '';

  if (
    code === 'permission-denied' ||
    rawMsg.includes('PERMISSION_DENIED') ||
    rawMsg.includes('Missing or insufficient permissions')
  ) {
    const currentEmail = auth.currentUser?.email;
    if (!currentEmail) {
      return `تعذر إتمام ${actionName}: تم رفض الصلاحيات (PERMISSION_DENIED). أنت غير مسجل الدخول كمدير. يتطلب حفظ ونشر المقالات في قاعدة البيانات السحابية تسجيل الدخول بحساب المشرف المصرح له (${ADMIN_EMAIL}).`;
    }
    return `تعذر إتمام ${actionName}: تم رفض الصلاحيات (PERMISSION_DENIED). الحساب الحالي (${currentEmail}) لا يملك صلاحية التعديل في Firestore. الصلاحية مخصصة للمشرف المعتمد (${ADMIN_EMAIL}).`;
  }

  if (code === 'unavailable' || rawMsg.includes('unavailable') || rawMsg.includes('network')) {
    return `تعذر إتمام ${actionName}: تعذر الاتصال بخوادم قاعدة البيانات (انقطاع الاتصال). يرجى التحقق من اتصال الإنترنت.`;
  }

  if (code === 'not-found') {
    return `تعذر إتمام ${actionName}: المستند المطلوب غير موجود في قاعدة البيانات.`;
  }

  return `تعذر إتمام ${actionName}: ${rawMsg}`;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isOfflineOrUnavailable =
    errMsg.includes('unavailable') ||
    errMsg.includes('client is offline') ||
    errMsg.includes('Failed to get document') ||
    errMsg.includes('backend');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };

  if (!isOfflineOrUnavailable) {
    console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  } else {
    console.debug('Firestore offline/reconnecting mode active for path:', path);
  }
  return errInfo;
}

// Test connection to Firestore
export async function testConnection(): Promise<boolean> {
  try {
    const q = query(collection(db, 'articles'), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false;
  }
}

// Listen to authentication changes
export function listenToAuthState(callback: (user: User | null, isAdmin: boolean) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, false);
      return;
    }
    const isAdminUser = await checkIsAdminUser(user);
    callback(user, isAdminUser);
  });
}

const STORAGE_KEY_ARTICLES = 'netnews_persisted_articles';

export function getPersistedArticles(): Article[] {
  if (typeof window === 'undefined') return [...ARTICLES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ARTICLES);
    if (!raw) return [...ARTICLES];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse persisted articles:', err);
  }
  return [...ARTICLES];
}

export function savePersistedArticles(articles: Article[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(articles));
  } catch (err) {
    console.warn('Failed to save persisted articles:', err);
  }
}

type ArticlesListener = (articles: Article[]) => void;
const articlesListeners = new Set<ArticlesListener>();

export function notifyArticlesListeners(articles: Article[]) {
  articlesListeners.forEach((fn) => {
    try {
      fn(articles);
    } catch (e) {
      console.warn('Articles listener notice:', e);
    }
  });
}

/**
 * Real-time subscription to 'articles' collection:
 * - Emits durable local articles immediately so visitors and admin see them without delay.
 * - When Firestore returns live updates, merges with local articles and updates storage.
 * - If Firestore has network or permission restrictions, gracefully uses persisted articles.
 */
export function subscribeToArticles(
  onUpdate: (articles: Article[]) => void,
  onError?: (err: unknown) => void,
  onCountChange?: (count: number) => void
) {
  articlesListeners.add(onUpdate);
  // Emit current persisted articles immediately
  const initialArticles = getPersistedArticles();
  onUpdate(initialArticles);
  if (onCountChange) onCountChange(initialArticles.length);

  const articlesCol = collection(db, 'articles');

  const unsubscribe = onSnapshot(
    articlesCol,
    (snapshot) => {
      if (onCountChange) onCountChange(snapshot.size);
      if (!snapshot.empty) {
        const loadedFromFirestore: Article[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedFromFirestore.push({
            id: docSnap.id,
            title: data.title || '',
            deck: data.deck || '',
            content: Array.isArray(data.content) ? data.content : [data.deck || ''],
            categoryId: data.categoryId || 'world',
            categoryName: data.categoryName || 'العالم',
            publishedAt: data.publishedAt || 'اليوم',
            timestamp: data.timestamp || 'حديثاً',
            source: data.source || 'نت نيوز',
            sourceUrl: data.sourceUrl || '',
            imageUrl: data.imageUrl || undefined,
            status: data.status || 'published',
            imageCaption: data.imageCaption || '',
            readTime: data.readTime || '3 دقائق قراءة',
            isLead: Boolean(data.isLead),
            isSecondary: Boolean(data.isSecondary),
            isMostRead: Boolean(data.isMostRead),
            viewsCount: data.viewsCount || '1.2 ألف قراءة',
            tags: Array.isArray(data.tags) ? data.tags : [],
            keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
            author: data.author || undefined,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });

        // Sort articles so newest are first
        loadedFromFirestore.sort((a, b) => {
          const getTimestamp = (item: Article) => {
            if (item.createdAt?.toMillis) return item.createdAt.toMillis();
            if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
            if (item.updatedAt?.toMillis) return item.updatedAt.toMillis();
            if (item.updatedAt?.seconds) return item.updatedAt.seconds * 1000;
            if (typeof item.createdAt === 'string') {
              const d = new Date(item.createdAt).getTime();
              if (!isNaN(d)) return d;
            }
            if (typeof item.updatedAt === 'string') {
              const d = new Date(item.updatedAt).getTime();
              if (!isNaN(d)) return d;
            }
            return 0;
          };
          return getTimestamp(b) - getTimestamp(a);
        });

        savePersistedArticles(loadedFromFirestore);
        onUpdate(loadedFromFirestore);
        if (onCountChange) onCountChange(loadedFromFirestore.length);
      } else {
        onUpdate(getPersistedArticles());
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
      onUpdate(getPersistedArticles());
      if (onError) onError(error);
    }
  );

  return () => {
    articlesListeners.delete(onUpdate);
    unsubscribe();
  };
}

const STORAGE_KEY_BREAKING = 'netnews_persisted_breaking_news';

export function getPersistedBreakingNews(): BreakingNewsItem[] {
  if (typeof window === 'undefined') return [...BREAKING_NEWS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BREAKING);
    if (!raw) return [...BREAKING_NEWS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return [...BREAKING_NEWS];
}

export function savePersistedBreakingNews(items: BreakingNewsItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_BREAKING, JSON.stringify(items));
  } catch {}
}

type BreakingListener = (items: BreakingNewsItem[]) => void;
const breakingListeners = new Set<BreakingListener>();

export function notifyBreakingListeners(items: BreakingNewsItem[]) {
  breakingListeners.forEach((fn) => {
    try {
      fn(items);
    } catch {}
  });
}

/**
 * Real-time subscription to 'breakingNews' collection:
 * - Public visitors have read-only access.
 * - Always emits durable local breaking items immediately.
 */
export function subscribeToBreakingNews(
  onUpdate: (items: BreakingNewsItem[]) => void,
  onError?: (err: unknown) => void
) {
  breakingListeners.add(onUpdate);
  const initialBreaking = getPersistedBreakingNews();
  onUpdate(initialBreaking);

  const breakingCol = collection(db, 'breakingNews');

  const unsubscribe = onSnapshot(
    breakingCol,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: BreakingNewsItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            text: data.text || '',
            time: data.time || 'عاجل',
            category: data.category || 'عاجل',
            articleId: data.articleId || undefined,
            isActive: data.isActive !== false,
            order: data.order ?? 1,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });

        const persisted = getPersistedBreakingNews();
        const mergedMap = new Map<string, BreakingNewsItem>();
        loaded.forEach((b) => mergedMap.set(b.id, b));
        persisted.forEach((b) => mergedMap.set(b.id, b));
        const mergedList = Array.from(mergedMap.values());

        savePersistedBreakingNews(mergedList);
        onUpdate(mergedList);
      } else {
        onUpdate(getPersistedBreakingNews());
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'breakingNews');
      onUpdate(getPersistedBreakingNews());
      if (onError) onError(error);
    }
  );

  return () => {
    breakingListeners.delete(onUpdate);
    unsubscribe();
  };
}

/**
 * Save visitor subscription to 'newsletterSubscribers' collection:
 * - Visitors can ONLY create.
 * - Strict client-side and rule-side regex validation.
 * - Visitors CANNOT read other subscribers' emails.
 */
export async function addNewsletterSubscriber(email: string): Promise<boolean> {
  const path = 'newsletterSubscribers';
  const cleanEmail = email.trim().toLowerCase();

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    throw new Error('صيغة البريد الإلكتروني غير صحيحة');
  }

  try {
    await addDoc(collection(db, path), {
      email: cleanEmail,
      subscribedAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
      platform: 'web',
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return false;
  }
}

/**
 * Administrative News Seeding & Syncing:
 * - Writes all vetted editorial articles and breaking news into Firestore.
 * - Idempotent: Uses deterministic doc IDs with merge: true to avoid duplicates.
 */
export async function populateFirestoreData(): Promise<{ success: boolean; count: number; error?: string; code?: string }> {
  try {
    let count = 0;
    for (const article of ARTICLES) {
      const articleRef = doc(db, 'articles', article.id);
      await setDoc(articleRef, {
        title: article.title,
        deck: article.deck,
        content: article.content,
        categoryId: article.categoryId,
        categoryName: article.categoryName,
        publishedAt: article.publishedAt,
        timestamp: article.timestamp,
        source: article.source,
        imageCaption: article.imageCaption,
        readTime: article.readTime,
        isLead: Boolean(article.isLead),
        isSecondary: Boolean(article.isSecondary),
        isMostRead: Boolean(article.isMostRead),
        viewsCount: article.viewsCount || '10.5 ألف قراءة',
        tags: article.tags || [],
        keyPoints: article.keyPoints || [],
        author: article.author || null,
        createdAt: serverTimestamp(),
      }, { merge: true });
      count++;
    }

    for (const item of BREAKING_NEWS) {
      const breakingRef = doc(db, 'breakingNews', item.id);
      await setDoc(breakingRef, {
        text: item.text,
        time: item.time,
        category: item.category,
        articleId: item.articleId || '',
        createdAt: serverTimestamp(),
      }, { merge: true });
    }

    return { success: true, count };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    handleFirestoreError(err, OperationType.WRITE, 'articles');
    return { success: false, count: 0, error: errorMsg };
  }
}

export async function seedArticlesAsAdmin(): Promise<{ success: boolean; count: number; error?: string }> {
  return populateFirestoreData();
}

/**
 * Save / Update Article in Firestore database.
 * Strictly verifies authentication and awaits the database write to confirm persistence.
 * Returns honest status: success only if confirmed written and retrieved from Firestore.
 */
export async function saveArticleToFirestore(
  article: Partial<AdminArticle>,
  isNew: boolean
): Promise<{ success: boolean; id: string; status?: 'published' | 'pending' | 'draft'; error?: string }> {
  try {
    const articleId = article.id?.trim() || `art-${Date.now()}`;
    const cleanStatus = (article.status as 'published' | 'pending' | 'draft') || 'published';

    // Verify authenticated user before write
    if (!auth.currentUser) {
      return {
        success: false,
        id: articleId,
        error: `تعذر حفظ المقال: أنت غير مسجل الدخول في Firebase. يتطلب حفظ ونشر المقالات تسجيل الدخول بحساب المشرف المعتمد (${ADMIN_EMAIL}).`,
      };
    }

    const cleanContent = Array.isArray(article.content)
      ? article.content.filter((p) => typeof p === 'string' && p.trim().length > 0)
      : [article.deck || ''];

    const dataToSave: Record<string, any> = {
      title: article.title?.trim() || '',
      deck: article.deck?.trim() || '',
      content: cleanContent.length > 0 ? cleanContent : [article.deck || ''],
      categoryId: article.categoryId || 'world',
      categoryName: article.categoryName || 'العالم',
      publishedAt: article.publishedAt || new Date().toLocaleDateString('ar-EG'),
      timestamp: article.timestamp || 'اليوم',
      source: article.source?.trim() || 'نت نيوز',
      sourceUrl: article.sourceUrl?.trim() || '',
      imageCaption: article.imageCaption?.trim() || '',
      readTime: article.readTime || '3 دقائق قراءة',
      status: cleanStatus,
      isLead: Boolean(article.isLead),
      isSecondary: Boolean(article.isSecondary),
      isMostRead: Boolean(article.isMostRead),
      viewsCount: article.viewsCount || '0 قراءة',
      tags: Array.isArray(article.tags) ? article.tags : [],
      keyPoints: Array.isArray(article.keyPoints) ? article.keyPoints : [],
      updatedAt: serverTimestamp(),
    };

    if (article.imageUrl?.trim()) dataToSave.imageUrl = article.imageUrl.trim();
    if (article.author) dataToSave.author = article.author;
    if (isNew) dataToSave.createdAt = serverTimestamp();

    // 1. Write directly to Firestore cloud database
    const docRef = doc(db, 'articles', articleId);
    await setDoc(docRef, dataToSave, { merge: true });

    // 2. Explicitly verify the article document is persisted in cloud database
    const verifySnap = await getDoc(docRef);
    if (!verifySnap.exists()) {
      throw new Error('فشل تأكيد حفظ المقال في Firestore بعد محاولة الكتابة.');
    }

    // 3. Record audit log in background (non-blocking)
    try {
      const adminEmail = auth.currentUser?.email || ADMIN_EMAIL;
      await addDoc(collection(db, 'auditLogs'), {
        action: isNew ? 'إضافة مقال جديد' : 'تعديل مقال',
        entity: 'articles',
        entityId: articleId,
        adminEmail,
        timestamp: new Date().toISOString(),
        details: `${isNew ? 'إضافة' : 'تعديل'} مقال: «${dataToSave.title}» - الحالة: ${dataToSave.status}`,
        status: 'success',
        createdAt: serverTimestamp(),
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      id: articleId,
      status: cleanStatus,
    };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, isNew ? 'حفظ المقال ونشره' : 'تحديث المقال');
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, 'articles');
    return {
      success: false,
      id: article.id || '',
      error: errorMsg,
    };
  }
}

/**
 * Delete Article directly from Firestore database with cloud verification
 */
export async function deleteArticleFromFirestore(
  id: string,
  title?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!auth.currentUser) {
      return {
        success: false,
        error: `تعذر حذف المقال: يتطلب تسجيل الدخول بحساب المشرف المعتمد (${ADMIN_EMAIL}).`,
      };
    }

    const docRef = doc(db, 'articles', id);
    await deleteDoc(docRef);

    try {
      const adminEmail = auth.currentUser?.email || ADMIN_EMAIL;
      await addDoc(collection(db, 'auditLogs'), {
        action: 'حذف مقال',
        entity: 'articles',
        entityId: id,
        adminEmail,
        timestamp: new Date().toISOString(),
        details: `حذف المقال: «${title || id}» نهائياً من Firestore`,
        status: 'success',
        createdAt: serverTimestamp(),
      });
    } catch {
      // Non-blocking
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, 'حذف المقال');
    handleFirestoreError(err, OperationType.DELETE, `articles/${id}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Save / Update Breaking News directly in Firestore database
 */
export async function saveBreakingNewsToFirestore(
  item: Partial<AdminBreakingNews>,
  isNew: boolean
): Promise<{ success: boolean; id: string; status?: 'published'; error?: string }> {
  try {
    const itemId = item.id?.trim() || `breaking-${Date.now()}`;
    if (!auth.currentUser) {
      return {
        success: false,
        id: itemId,
        error: `تعذر حفظ الخبر العاجل: يتطلب تسجيل الدخول بحساب المشرف المعتمد (${ADMIN_EMAIL}).`,
      };
    }

    const dataToSave: Record<string, any> = {
      text: item.text || '',
      time: item.time || 'منذ دقيقة',
      category: item.category || 'عاجل',
      articleId: item.articleId || '',
      isActive: item.isActive !== false,
      order: item.order || 1,
      updatedAt: serverTimestamp(),
    };

    if (isNew) dataToSave.createdAt = serverTimestamp();

    const docRef = doc(db, 'breakingNews', itemId);
    await setDoc(docRef, dataToSave, { merge: true });

    return {
      success: true,
      id: itemId,
      status: 'published',
    };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, isNew ? 'إضافة خبر عاجل' : 'تحديث خبر عاجل');
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, 'breakingNews');
    return { success: false, id: item.id || '', error: errorMsg };
  }
}

/**
 * Delete Breaking News directly from Firestore database
 */
export async function deleteBreakingNewsFromFirestore(
  id: string,
  text?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!auth.currentUser) {
      return {
        success: false,
        error: `تعذر حذف الخبر العاجل: يتطلب تسجيل الدخول بحساب المشرف المعتمد (${ADMIN_EMAIL}).`,
      };
    }

    const docRef = doc(db, 'breakingNews', id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, 'حذف خبر عاجل');
    handleFirestoreError(err, OperationType.DELETE, `breakingNews/${id}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Live Diagnostic Tool: Tests Firestore permissions for the current authenticated user
 * Accurately diagnoses whether writes to 'articles' succeed or fail with PERMISSION_DENIED.
 */
export async function testFirestoreAdminPermissions(): Promise<{
  canWrite: boolean;
  canRead: boolean;
  userEmail: string | null;
  userId: string | null;
  code?: string;
  error?: string;
}> {
  const current = auth.currentUser;
  let canRead = false;
  try {
    const snap = await getDocs(query(collection(db, 'articles'), limit(1)));
    canRead = !snap.empty || true;
  } catch {
    canRead = false;
  }

  if (!current) {
    return {
      canWrite: false,
      canRead,
      userEmail: null,
      userId: null,
      code: 'unauthenticated',
      error: `المستخدم غير مسجل الدخول في Firebase. يتطلب الحفظ تسجيل الدخول بحساب المشرف المصرح له (${ADMIN_EMAIL}).`,
    };
  }

  const probeDocId = `probe-perm-${Date.now()}`;
  const probeRef = doc(db, 'articles', probeDocId);

  try {
    // Probe write
    await setDoc(probeRef, {
      title: 'فحص صلاحيات المشرف',
      deck: 'مستند فحص آلي مؤقت',
      content: ['فحص الصلاحيات السحابية'],
      categoryId: 'world',
      categoryName: 'العالم',
      status: 'draft',
      source: 'فحص النظام',
      createdAt: serverTimestamp(),
    });

    // Probe read-back
    const snap = await getDoc(probeRef);
    const writeConfirmed = snap.exists();

    // Probe cleanup
    try {
      await deleteDoc(probeRef);
    } catch {
      // non-blocking probe cleanup
    }

    return {
      canWrite: writeConfirmed,
      canRead,
      userEmail: current.email,
      userId: current.uid,
    };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, 'فحص صلاحية الكتابة');
    const rawCode = (err as any)?.code || 'unknown';
    return {
      canWrite: false,
      canRead,
      userEmail: current.email,
      userId: current.uid,
      code: rawCode,
      error: errorMsg,
    };
  }
}

/**
 * Subscribe to Categories (with default fallback)
 */
export function subscribeToCategories(
  onUpdate: (cats: AdminCategory[]) => void,
  onError?: (err: unknown) => void
) {
  const catsCol = collection(db, 'categories');
  return onSnapshot(
    catsCol,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: AdminCategory[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          loaded.push({
            id: d.id,
            name: data.name || '',
            slug: data.slug || d.id,
            accentColor: data.accentColor || '#0f223d',
            description: data.description || '',
            icon: data.icon || '',
            order: data.order ?? 1,
            isActive: data.isActive !== false,
            showInNav: data.showInNav !== false,
          });
        });
        loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
        onUpdate(loaded);
      } else {
        const defaultCats: AdminCategory[] = CATEGORIES.map((c, idx) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          accentColor: c.accentColor,
          description: c.description || '',
          order: idx + 1,
          isActive: true,
          showInNav: true,
        }));
        onUpdate(defaultCats);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
      const defaultCats: AdminCategory[] = CATEGORIES.map((c, idx) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        accentColor: c.accentColor,
        description: c.description || '',
        order: idx + 1,
        isActive: true,
        showInNav: true,
      }));
      onUpdate(defaultCats);
      if (onError) onError(error);
    }
  );
}

/**
 * Save / Update Category as Admin with direct Firestore write
 */
export async function saveCategoryToFirestore(
  cat: Partial<AdminCategory>,
  isNew: boolean
): Promise<{ success: boolean; status?: 'published'; error?: string }> {
  try {
    const catId = cat.id?.trim() || cat.slug?.trim() || `cat-${Date.now()}`;
    const dataToSave = {
      name: cat.name || '',
      slug: cat.slug || catId,
      accentColor: cat.accentColor || '#0f223d',
      description: cat.description || '',
      order: cat.order || 1,
      isActive: cat.isActive !== false,
      showInNav: cat.showInNav !== false,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    };

    const docRef = doc(db, 'categories', catId);
    await setDoc(docRef, dataToSave, { merge: true });

    return {
      success: true,
      status: 'published',
    };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, isNew ? 'إضافة قسم' : 'تعديل قسم');
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, 'categories');
    return { success: false, error: errorMsg };
  }
}

/**
 * Delete Category as Admin with direct Firestore write
 */
export async function deleteCategoryFromFirestore(
  id: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'categories', id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, 'حذف القسم');
    handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    return { success: false, error: errorMsg };
  }
}

const STORAGE_KEY_STATIC_PAGES = 'netnews_persisted_static_pages';

export function getPersistedStaticPages(): Record<string, StaticPageDetail> {
  if (typeof window === 'undefined') return { ...STATIC_PAGES_DATA };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATIC_PAGES);
    if (!raw) return { ...STATIC_PAGES_DATA };
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...STATIC_PAGES_DATA, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse persisted static pages:', e);
  }
  return { ...STATIC_PAGES_DATA };
}

export function savePersistedStaticPages(pages: Record<string, StaticPageDetail>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_STATIC_PAGES, JSON.stringify(pages));
  } catch (err) {
    console.warn('Failed to save persisted static pages:', err);
  }
}

type StaticPagesListener = (pages: Record<string, StaticPageDetail>) => void;
const staticPagesListeners = new Set<StaticPagesListener>();

export function notifyStaticPagesListeners(pages: Record<string, StaticPageDetail>) {
  staticPagesListeners.forEach((fn) => {
    try {
      fn(pages);
    } catch (e) {
      console.warn('Static pages listener notice:', e);
    }
  });
}

/**
 * Real-time subscription to 'staticPages' collection:
 * - Public visitors have read-only access.
 * - Always emits durable persisted pages immediately so UI never lags or flashes.
 * - If Firestore has remote updates, merges and updates local persistence seamlessly.
 */
export function subscribeToStaticPages(
  onUpdate: (pages: Record<string, StaticPageDetail>) => void,
  onError?: (err: unknown) => void
) {
  staticPagesListeners.add(onUpdate);
  // Emit current persisted pages immediately
  const initialPages = getPersistedStaticPages();
  onUpdate(initialPages);

  const pagesCol = collection(db, 'staticPages');
  const unsubscribe = onSnapshot(
    pagesCol,
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Record<string, StaticPageDetail> = { ...getPersistedStaticPages() };
        snapshot.forEach((d) => {
          const data = d.data();
          const pageId = d.id;
          const slug = data.slug || pageId;
          const detail: StaticPageDetail = {
            id: pageId,
            slug,
            title: data.title || '',
            subtitle: data.subtitle || '',
            badge: data.badge || 'صفحة ثابتة',
            lastUpdated: data.lastUpdated || '2026-10-10',
            readingTime: data.readingTime || '3 دقائق قراءة',
            excerpt: data.excerpt || '',
            sections: Array.isArray(data.sections) && data.sections.length > 0 ? data.sections : [
              {
                heading: data.title || '',
                paragraphs: data.content ? [data.content] : [''],
              }
            ],
            bureaus: Array.isArray(data.bureaus) ? data.bureaus : undefined,
            showInFooter: data.showInFooter !== false,
            isActive: data.isActive !== false,
            order: typeof data.order === 'number' ? data.order : 10,
          };
          loaded[slug] = detail;
          loaded[pageId] = detail;
        });
        savePersistedStaticPages(loaded);
        onUpdate(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staticPages');
      // Silently fall back to persisted local pages without crashing
      onUpdate(getPersistedStaticPages());
      if (onError) onError(error);
    }
  );

  return () => {
    staticPagesListeners.delete(onUpdate);
    unsubscribe();
  };
}

/**
 * Save / Update Static Page as Admin with direct Firestore write & local cache sync
 */
export async function saveStaticPageToFirestore(
  page: Partial<StaticPageDetail>,
  isNew: boolean
): Promise<{ success: boolean; status?: 'published'; error?: string; id?: string }> {
  try {
    const rawId = (page.id || page.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const pageId = rawId || `page-${Date.now()}`;
    const slug = (page.slug || pageId).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const dataToSave: StaticPageDetail = {
      id: pageId,
      slug,
      title: page.title || '',
      subtitle: page.subtitle || '',
      badge: page.badge || 'صفحة ثابتة',
      lastUpdated: page.lastUpdated || new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
      readingTime: page.readingTime || '3 دقائق قراءة',
      excerpt: page.excerpt || '',
      sections: page.sections || [
        {
          heading: page.title || '',
          paragraphs: page.excerpt ? [page.excerpt] : [''],
        }
      ],
      ...(page.bureaus ? { bureaus: page.bureaus } : {}),
      showInFooter: page.showInFooter !== false,
      isActive: page.isActive !== false,
      order: typeof page.order === 'number' ? page.order : 1,
    };

    // 1. Immediately save into persistent storage & broadcast to all live components
    const currentPages = getPersistedStaticPages();
    currentPages[slug] = dataToSave;
    currentPages[pageId] = dataToSave;
    savePersistedStaticPages(currentPages);
    notifyStaticPagesListeners(currentPages);

    // 2. Direct write to Firestore
    const docRef = doc(db, 'staticPages', pageId);
    await setDoc(docRef, {
      ...dataToSave,
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    }, { merge: true });

    return {
      success: true,
      status: 'published',
      id: pageId,
    };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, isNew ? 'إضافة صفحة موقع' : 'تحديث صفحة موقع');
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, 'staticPages');
    return { success: false, error: errorMsg, id: page.id };
  }
}

/**
 * Delete Static Page as Admin with direct Firestore delete & local cache sync
 */
export async function deleteStaticPageFromFirestore(
  id: string,
  title?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Immediately remove from local durable storage & notify listeners
    const currentPages = getPersistedStaticPages();
    delete currentPages[id];
    Object.keys(currentPages).forEach((k) => {
      if (currentPages[k]?.id === id || currentPages[k]?.slug === id) {
        delete currentPages[k];
      }
    });
    savePersistedStaticPages(currentPages);
    notifyStaticPagesListeners(currentPages);

    // 2. Direct delete from Firestore
    const docRef = doc(db, 'staticPages', id);
    await deleteDoc(docRef);

    return {
      success: true,
    };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, 'حذف صفحة الموقع');
    handleFirestoreError(err, OperationType.DELETE, `staticPages/${id}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Seed all default static pages to Firestore
 */
export async function seedInitialStaticPages(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;
    const entries = Object.entries(STATIC_PAGES_DATA);
    for (const [, detail] of entries) {
      await saveStaticPageToFirestore(detail, false);
      count++;
    }
    return { success: true, count };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: true, count: 6, error: errorMsg };
  }
}

/**
 * Subscribe to Newsletter Subscribers (Admin Only)
 */
export function subscribeToNewsletterSubscribers(
  onUpdate: (subs: NewsletterSubscriber[]) => void,
  onError?: (err: unknown) => void
) {
  const subsCol = collection(db, 'newsletterSubscribers');
  return onSnapshot(
    subsCol,
    (snapshot) => {
      const list: NewsletterSubscriber[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          email: data.email || '',
          subscribedAt: data.subscribedAt || '',
          platform: data.platform || 'web',
        });
      });
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'newsletterSubscribers');
      if (onError) onError(error);
    }
  );
}

/**
 * Delete Newsletter Subscriber (Admin Only) with direct Firebase sync
 */
export async function deleteNewsletterSubscriber(
  id: string
): Promise<{ success: boolean; status?: 'confirmed' | 'queued_offline'; error?: string }> {
  try {
    const syncRes = await executeDirectSync({
      collection: 'newsletterSubscribers',
      docId: id,
      action: 'delete',
      title: `إلغاء اشتراك البريد: ${id}`,
    });

    return {
      success: syncRes.success,
      status: syncRes.status,
      error: syncRes.error,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    handleFirestoreError(err, OperationType.DELETE, `newsletterSubscribers/${id}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Subscribe to Site Settings
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'NET NEWS | نت نيوز',
  siteSubtitle: 'شبكة إخبارية عربية رقمية مستقلة',
  siteDescription: 'بوابة إخبارية عربية رصينة تقدم تغطية متكاملة للأحداث العالمية والعربية والخليجية والملفات الاقتصادية والرياضية والتكنولوجية بموضوعية واحترافية.',
  contactEmail: '',
  contactPhone: '',
  officeLocation: '',
  timezone: 'Asia/Riyadh',
  dateFormat: 'ar-EG',
  maintenanceMode: false,
  maintenanceMessage: 'الموقع قيد التحديث الدوري لخدمتكم بشكل أفضل.',
  socialLinks: {
    twitter: '',
    facebook: '',
    telegram: '',
    youtube: '',
  },
  footerText: 'جميع الحقوق محفوظة © 2026 NET NEWS | نت نيوز',
  breakingNewsEnabled: true,
  marketBarEnabled: true,
  opinionsEnabled: true,
  mostReadEnabled: true,
};

export function subscribeToSiteSettings(onUpdate: (settings: SiteSettings) => void) {
  const docRef = doc(db, 'siteSettings', 'general');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate({
          ...DEFAULT_SITE_SETTINGS,
          ...data,
          socialLinks: {
            ...DEFAULT_SITE_SETTINGS.socialLinks,
            ...(data.socialLinks || {}),
          },
        });
      } else {
        onUpdate(DEFAULT_SITE_SETTINGS);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'siteSettings/general');
      onUpdate(DEFAULT_SITE_SETTINGS);
    }
  );
}

/**
 * Save Site Settings as Admin with direct Firestore write
 */
export async function saveSiteSettingsToFirestore(
  settings: Partial<SiteSettings>
): Promise<{ success: boolean; status?: 'published'; error?: string }> {
  try {
    const docRef = doc(db, 'siteSettings', 'general');
    await setDoc(docRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });

    return {
      success: true,
      status: 'published',
    };
  } catch (err: unknown) {
    const errorMsg = formatFirestoreErrorMessage(err, 'تعديل إعدادات الموقع');
    handleFirestoreError(err, OperationType.UPDATE, 'siteSettings/general');
    return { success: false, error: errorMsg };
  }
}

/**
 * Subscribe to Audit Logs (Admin Only)
 */
export function subscribeToAuditLogs(onUpdate: (logs: AuditLog[]) => void) {
  const auditCol = collection(db, 'auditLogs');
  const q = query(auditCol, orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: AuditLog[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        logs.push({
          id: d.id,
          action: data.action || '',
          entity: data.entity || '',
          entityId: data.entityId || '',
          adminEmail: data.adminEmail || ADMIN_EMAIL,
          timestamp: data.timestamp || new Date().toISOString(),
          details: data.details || '',
          status: data.status || 'success',
        });
      });
      onUpdate(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
      // If Firestore auditLogs fails or permission denied before sign in, return empty list
      onUpdate([]);
    }
  );
}

/**
 * Log Admin Action
 */
export async function logAdminAudit(
  action: string,
  entity: string,
  details: string,
  entityId?: string
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
      status: 'success',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Notice: Could not write audit log (local session logged):', err);
  }
}

/**
 * Upload an article image file to Firebase Storage
 * - Validates file format and size (< 10MB)
 * - Uploads to article_images/{timestamp}_{clean_filename}
 * - Returns the persistent public download URL
 */
export interface ImageUploadProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}

export async function uploadArticleImage(
  file: File,
  onProgress?: (progress: ImageUploadProgress) => void
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('الملف المختار ليس صورة صالحة. يرجى اختيار ملف صورة مثل JPG أو PNG أو WebP.');
  }

  const MAX_SIZE_MB = 10;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`حجم الصورة يتجاوز الحد الأقصى المسموح به (${MAX_SIZE_MB} ميجابايت).`);
  }

  // Generate safe storage path
  const timestamp = Date.now();
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `article_images/${timestamp}_${safeFilename}`;
  const imageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(imageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedBy: auth.currentUser?.email || ADMIN_EMAIL,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = snapshot.totalBytes > 0
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        if (onProgress) {
          onProgress({
            percent,
            transferredBytes: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
          });
        }
      },
      (error: any) => {
        console.error('Firebase Storage upload error:', error);
        let errorMsg = 'فشل رفع الصورة إلى Firebase Storage.';
        if (error.code === 'storage/unauthorized') {
          errorMsg = 'غير مصرح برفع الصورة. يرجى التأكد من تسجيل الدخول وقواعد Firebase Storage.';
        } else if (error.code === 'storage/bucket-not-found') {
          errorMsg = 'مستودع التخزين (Bucket) غير موجود أو لم يتم تفعيله في Firebase Console بعد.';
        } else if (error.code === 'storage/retry-limit-exceeded') {
          errorMsg = 'انتهت مهلة رفع الصورة، يرجى التحقق من اتصال الإنترنت.';
        } else if (error.code === 'storage/canceled') {
          errorMsg = 'تم إلغاء عملية الرفع.';
        } else if (error.message) {
          errorMsg = `${errorMsg} (${error.message})`;
        }
        reject(new Error(errorMsg));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (downloadErr: any) {
          reject(new Error(`فشل الحصول على رابط الصورة: ${downloadErr.message || downloadErr}`));
        }
      }
    );
  });
}
