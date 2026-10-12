import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { db, auth, ADMIN_EMAIL } from './firebase';

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

export interface PendingSyncItem {
  id: string; // Unique queue operation ID
  collection: 'articles' | 'breakingNews' | 'categories' | 'siteSettings' | 'newsletterSubscribers' | 'staticPages';
  docId: string;
  action: 'upsert' | 'delete';
  data?: Record<string, any>;
  title: string;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: number | null;
  isOnline: boolean;
  isFlushing: boolean;
  pendingItems: PendingSyncItem[];
  lastError: string | null;
}

const STORAGE_KEY_QUEUE = 'netnews_pending_sync_queue';
const STORAGE_KEY_LAST_SYNCED = 'netnews_last_synced_timestamp';

// Listeners set
type SyncListener = (state: SyncState) => void;
const listeners = new Set<SyncListener>();

// Initial in-memory queue loaded from localStorage safely
let pendingQueue: PendingSyncItem[] = loadQueueFromStorage();
let isFlushing = false;
let lastError: string | null = null;
let lastSyncedAt: number | null = loadLastSyncedFromStorage();

function loadQueueFromStorage(): PendingSyncItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse pending sync queue:', err);
    return [];
  }
}

function saveQueueToStorage(queue: PendingSyncItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
  } catch (err) {
    console.warn('Failed to save pending sync queue:', err);
  }
}

function loadLastSyncedFromStorage(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_SYNCED);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

function setLastSyncedTimestamp(ts: number) {
  lastSyncedAt = ts;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_SYNCED, String(ts));
    } catch {
      // ignore
    }
  }
}

export function getIsOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function getCurrentSyncState(): SyncState {
  const online = getIsOnline();
  let status: SyncStatus = 'synced';

  if (!online) {
    status = pendingQueue.length > 0 ? 'pending' : 'offline';
  } else if (isFlushing) {
    status = 'syncing';
  } else if (pendingQueue.length > 0) {
    status = 'pending';
  } else if (lastError) {
    status = 'error';
  }

  return {
    status,
    pendingCount: pendingQueue.length,
    lastSyncedAt,
    isOnline: online,
    isFlushing,
    pendingItems: [...pendingQueue],
    lastError,
  };
}

function notifyListeners() {
  const state = getCurrentSyncState();
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.error('Error in sync listener:', e);
    }
  });
}

export function subscribeToSyncState(callback: SyncListener): () => void {
  listeners.add(callback);
  callback(getCurrentSyncState());
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Execute an administrative operation with direct Firebase sync & offline queue fallback.
 * Strictly guarantees idempotency:
 * - Upserts write to deterministic docId using { merge: true }.
 * - Deletes target docId.
 * - Queue deduplication prevents repeat items.
 */
export async function executeDirectSync(params: {
  collection: 'articles' | 'breakingNews' | 'categories' | 'siteSettings' | 'newsletterSubscribers' | 'staticPages';
  docId: string;
  action: 'upsert' | 'delete';
  data?: Record<string, any>;
  title: string;
}): Promise<{
  success: boolean;
  status: 'confirmed' | 'queued_offline';
  docId: string;
  error?: string;
}> {
  const { collection: colName, docId, action, data, title } = params;
  const online = getIsOnline();

  // If currently offline, queue immediately without waiting for timeout
  if (!online) {
    enqueueOperation({
      collection: colName,
      docId,
      action,
      data,
      title,
    });
    notifyListeners();
    return {
      success: true,
      status: 'queued_offline',
      docId,
    };
  }

  // If online, perform direct write to Firebase and confirm
  notifyListeners();
  try {
    await performFirebaseWrite(colName, docId, action, data);

    // Record audit log if authenticated admin
    try {
      const adminEmail = auth.currentUser?.email || ADMIN_EMAIL;
      await addDoc(collection(db, 'auditLogs'), {
        action: action === 'upsert' ? `حفظ/تحديث (${colName})` : `حذف (${colName})`,
        entity: colName,
        entityId: docId,
        adminEmail,
        timestamp: new Date().toISOString(),
        details: `${title} - تم التأكيد والمزامنة مباشرة مع Firebase`,
        status: 'success',
        createdAt: serverTimestamp(),
      });
    } catch {
      // Audit log non-blocking
    }

    setLastSyncedTimestamp(Date.now());
    lastError = null;
    notifyListeners();

    return {
      success: true,
      status: 'confirmed',
      docId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Safely queue for automatic retry upon reconnection or rule update
    enqueueOperation({
      collection: colName,
      docId,
      action,
      data,
      title,
      lastError: errorMsg,
    });
    lastError = errorMsg;
    notifyListeners();

    return {
      success: true,
      status: 'queued_offline',
      docId,
      error: errorMsg,
    };
  }
}

/**
 * Idempotently enqueue an operation.
 * De-duplicates operations for the same collection:docId.
 */
function enqueueOperation(item: {
  collection: 'articles' | 'breakingNews' | 'categories' | 'siteSettings' | 'newsletterSubscribers' | 'staticPages';
  docId: string;
  action: 'upsert' | 'delete';
  data?: Record<string, any>;
  title: string;
  lastError?: string;
}) {
  const queueKey = `${item.collection}:${item.docId}`;

  // Filter out any prior pending action for the exact same document
  const existingIdx = pendingQueue.findIndex(
    (q) => `${q.collection}:${q.docId}` === queueKey
  );

  const newItem: PendingSyncItem = {
    id: `sync-op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    collection: item.collection,
    docId: item.docId,
    action: item.action,
    data: item.data,
    title: item.title,
    createdAt: Date.now(),
    retryCount: 0,
    lastError: item.lastError,
  };

  if (existingIdx >= 0) {
    // If the existing was upsert and new is delete, replace with delete
    // If both were upsert, update with latest merged data
    pendingQueue[existingIdx] = newItem;
  } else {
    pendingQueue.push(newItem);
  }

  saveQueueToStorage(pendingQueue);
}

/**
 * Perform actual atomic Firestore write
 */
async function performFirebaseWrite(
  colName: string,
  docId: string,
  action: 'upsert' | 'delete',
  data?: Record<string, any>
) {
  const docRef = doc(db, colName, docId);
  if (action === 'delete') {
    await deleteDoc(docRef);
  } else {
    const payload = {
      ...(data || {}),
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: true });
  }
}

/**
 * Retry and flush all pending operations in sequential order
 */
export async function flushPendingQueue(): Promise<{
  syncedCount: number;
  remainingCount: number;
  errors: string[];
}> {
  if (isFlushing || pendingQueue.length === 0 || !getIsOnline()) {
    return {
      syncedCount: 0,
      remainingCount: pendingQueue.length,
      errors: [],
    };
  }

  isFlushing = true;
  notifyListeners();

  let syncedCount = 0;
  const errors: string[] = [];
  const remaining: PendingSyncItem[] = [];

  for (const item of [...pendingQueue]) {
    try {
      await performFirebaseWrite(item.collection, item.docId, item.action, item.data);
      syncedCount++;
      setLastSyncedTimestamp(Date.now());
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      item.retryCount += 1;
      item.lastError = errorMsg;
      remaining.push(item);
      errors.push(`${item.title}: ${errorMsg}`);
    }
  }

  pendingQueue = remaining;
  saveQueueToStorage(pendingQueue);
  isFlushing = false;
  lastError = errors.length > 0 ? errors[0] : null;

  notifyListeners();

  return {
    syncedCount,
    remainingCount: pendingQueue.length,
    errors,
  };
}

/**
 * Discard a specific queued item by user request
 */
export function removePendingItem(opId: string) {
  pendingQueue = pendingQueue.filter((item) => item.id !== opId);
  saveQueueToStorage(pendingQueue);
  notifyListeners();
}

/**
 * Clear the entire pending queue
 */
export function clearPendingQueue() {
  pendingQueue = [];
  saveQueueToStorage(pendingQueue);
  notifyListeners();
}

// Automatically bind window online / offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyListeners();
    // Safely attempt flush with 1-second delay for network stability
    setTimeout(() => {
      flushPendingQueue();
    }, 1000);
  });

  window.addEventListener('offline', () => {
    notifyListeners();
  });

  // Background interval: every 30 seconds, if online and items exist, flush
  setInterval(() => {
    if (getIsOnline() && pendingQueue.length > 0 && !isFlushing) {
      flushPendingQueue();
    }
  }, 30000);
}
