import {
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import {
  ActiveVisitorItem,
  AnalyticsEventItem,
  AnalyticsPeriod,
  AnalyticsMetrics
} from '../types/admin';

// Local storage keys
const STORAGE_KEY_VISITOR_ID = 'netnews_visitor_id';
const STORAGE_KEY_SESSION_ID = 'netnews_session_id';
const STORAGE_KEY_SESSION_TIME = 'netnews_session_last_active';

/**
 * Get or initialize persistent unique visitor ID
 */
export function getOrCreateVisitorId(): string {
  try {
    let vid = localStorage.getItem(STORAGE_KEY_VISITOR_ID);
    if (!vid || vid.length < 5) {
      vid = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY_VISITOR_ID, vid);
    }
    return vid;
  } catch {
    // Fallback if storage is blocked (e.g. private window)
    return 'v_temp_' + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Get or initialize visitor session ID (expires after 30 minutes of inactivity)
 */
export function getOrCreateSessionId(): string {
  try {
    const now = Date.now();
    const lastActive = parseInt(sessionStorage.getItem(STORAGE_KEY_SESSION_TIME) || '0', 10);
    let sid = sessionStorage.getItem(STORAGE_KEY_SESSION_ID);

    // If session expired (more than 30 min) or missing, create a new one
    if (!sid || !lastActive || now - lastActive > 30 * 60 * 1000) {
      sid = 's_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      sessionStorage.setItem(STORAGE_KEY_SESSION_ID, sid);
    }

    sessionStorage.setItem(STORAGE_KEY_SESSION_TIME, String(now));
    return sid;
  } catch {
    return 's_temp_' + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Detect client device type
 */
export function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// In-memory debounce state to prevent duplicate rapid events
let lastTrackedPath = '';
let lastTrackedTime = 0;

/**
 * Track page view in Firestore
 * Records: visitorId, sessionId, path, title, device, timestamp
 */
export async function trackPageView(path: string, title?: string): Promise<void> {
  const now = Date.now();
  if (path === lastTrackedPath && now - lastTrackedTime < 3000) {
    return; // Ignore duplicate calls within 3 seconds
  }
  lastTrackedPath = path;
  lastTrackedTime = now;

  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const deviceType = detectDeviceType();
  const pageTitle = (title || document.title || 'NET NEWS').substring(0, 150);
  const cleanPath = (path || '/').substring(0, 150);

  try {
    // 1. Record immutable pageview event
    await addDoc(collection(db, 'analyticsEvents'), {
      visitorId,
      sessionId,
      path: cleanPath,
      title: pageTitle,
      deviceType,
      timestamp: serverTimestamp(),
    });

    // 2. Upsert active visitor record for live presence
    await setDoc(
      doc(db, 'activeVisitors', visitorId),
      {
        visitorId,
        sessionId,
        path: cleanPath,
        title: pageTitle,
        deviceType,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    // In dev or offline mode, log warning gently without breaking user experience
    console.debug('Analytics event recorded locally:', err);
  }
}

/**
 * Send heartbeat ping for active visitor presence
 */
export async function sendHeartbeat(currentPath?: string): Promise<void> {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return; // Don't ping if window is backgrounded
  }

  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const deviceType = detectDeviceType();

  try {
    await setDoc(
      doc(db, 'activeVisitors', visitorId),
      {
        visitorId,
        sessionId,
        path: (currentPath || lastTrackedPath || '/').substring(0, 150),
        deviceType,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // Silent presence ping failure
  }
}

/**
 * Initialize visitor heartbeat ticker (every 40 seconds)
 */
export function startVisitorHeartbeat(getCurrentPath?: () => string): () => void {
  const interval = setInterval(() => {
    const path = getCurrentPath ? getCurrentPath() : window.location.pathname;
    sendHeartbeat(path);
  }, 40000);

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      const path = getCurrentPath ? getCurrentPath() : window.location.pathname;
      sendHeartbeat(path);
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

/**
 * Subscribe to real-time active visitors (active in last 5 minutes)
 */
export function subscribeToActiveVisitors(
  callback: (activeCount: number, activeList: ActiveVisitorItem[]) => void
): () => void {
  const q = collection(db, 'activeVisitors');

  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const FIVE_MINUTES = 5 * 60 * 1000;
      const activeList: ActiveVisitorItem[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let lastSeenMs = now;

        if (data.lastSeen instanceof Timestamp) {
          lastSeenMs = data.lastSeen.toMillis();
        } else if (typeof data.lastSeen === 'number') {
          lastSeenMs = data.lastSeen;
        } else if (data.lastSeen) {
          lastSeenMs = new Date(data.lastSeen).getTime() || now;
        }

        // Only count if active within the last 5 minutes
        if (now - lastSeenMs <= FIVE_MINUTES) {
          activeList.push({
            visitorId: data.visitorId || docSnap.id,
            sessionId: data.sessionId,
            path: data.path || '/',
            title: data.title,
            deviceType: data.deviceType || 'desktop',
            lastSeen: lastSeenMs,
          });
        }
      });

      // Sort by most recently seen
      activeList.sort((a, b) => Number(b.lastSeen) - Number(a.lastSeen));
      callback(activeList.length, activeList);
    },
    (err) => {
      console.warn('Active visitors listen notice:', err);
      callback(0, []);
    }
  );
}

/**
 * Subscribe to recent analytics events
 */
export function subscribeToAnalyticsEvents(
  callback: (events: AnalyticsEventItem[]) => void,
  maxLimit: number = 600
): () => void {
  const q = query(
    collection(db, 'analyticsEvents'),
    orderBy('timestamp', 'desc'),
    limit(maxLimit)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events: AnalyticsEventItem[] = [];
      const now = Date.now();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let tsMs = now;

        if (data.timestamp instanceof Timestamp) {
          tsMs = data.timestamp.toMillis();
        } else if (typeof data.timestamp === 'number') {
          tsMs = data.timestamp;
        } else if (data.timestamp) {
          tsMs = new Date(data.timestamp).getTime() || now;
        }

        events.push({
          id: docSnap.id,
          visitorId: data.visitorId || 'anon',
          sessionId: data.sessionId || 'session',
          path: data.path || '/',
          title: data.title || '',
          deviceType: data.deviceType || 'desktop',
          timestamp: tsMs,
        });
      });

      callback(events);
    },
    (err) => {
      console.warn('Analytics events listen notice:', err);
      callback([]);
    }
  );
}

/**
 * Compute metrics for specific timeframe
 */
export function calculateAnalyticsMetrics(
  events: AnalyticsEventItem[],
  period: AnalyticsPeriod,
  activeNowCount: number
): AnalyticsMetrics {
  const now = Date.now();
  let timeWindowMs = 24 * 60 * 60 * 1000;

  switch (period) {
    case '12h':
      timeWindowMs = 12 * 60 * 60 * 1000;
      break;
    case '24h':
      timeWindowMs = 24 * 60 * 60 * 1000;
      break;
    case '7d':
      timeWindowMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case '30d':
      timeWindowMs = 30 * 24 * 60 * 60 * 1000;
      break;
    case '365d':
      timeWindowMs = 365 * 24 * 60 * 60 * 1000;
      break;
    case 'all':
      timeWindowMs = Infinity;
      break;
  }

  const filteredEvents = events.filter((e) => {
    if (period === 'all') return true;
    const eTime = typeof e.timestamp === 'number' ? e.timestamp : new Date(e.timestamp).getTime();
    return now - eTime <= timeWindowMs;
  });

  const uniqueVisitorsSet = new Set<string>();
  const sessionsSet = new Set<string>();
  const pathMap = new Map<string, { title: string; count: number }>();
  const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };

  filteredEvents.forEach((ev) => {
    if (ev.visitorId) uniqueVisitorsSet.add(ev.visitorId);
    if (ev.sessionId) sessionsSet.add(ev.sessionId);

    // Path counter
    const p = ev.path || '/';
    const existing = pathMap.get(p) || { title: ev.title || p, count: 0 };
    existing.count += 1;
    if (ev.title && ev.title !== p) {
      existing.title = ev.title;
    }
    pathMap.set(p, existing);

    // Device breakdown
    const dev = ev.deviceType || 'desktop';
    if (dev in deviceCounts) {
      deviceCounts[dev as keyof typeof deviceCounts] += 1;
    } else {
      deviceCounts.desktop += 1;
    }
  });

  const uniqueVisitors = uniqueVisitorsSet.size;
  const sessions = sessionsSet.size;
  const pageViews = filteredEvents.length;
  const viewsPerVisitor = uniqueVisitors > 0 ? Number((pageViews / uniqueVisitors).toFixed(1)) : 0;

  // Top paths
  const topPaths = Array.from(pathMap.entries())
    .map(([path, data]) => ({ path, title: data.title, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Group trend buckets
  const trend = buildTrendBuckets(filteredEvents, period, now);

  return {
    period,
    activeVisitorsNow: activeNowCount,
    uniqueVisitors,
    sessions,
    pageViews,
    viewsPerVisitor,
    topPaths,
    deviceBreakdown: deviceCounts,
    trend,
  };
}

/**
 * Build graph trend buckets based on period
 */
function buildTrendBuckets(
  events: AnalyticsEventItem[],
  period: AnalyticsPeriod,
  now: number
): { label: string; views: number; visitors: number }[] {
  if (period === '12h') {
    // 12 1-hour buckets
    const buckets: { label: string; views: number; visitors: Set<string> }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now - i * 60 * 60 * 1000);
      const hours = d.getHours().toString().padStart(2, '0') + ':00';
      buckets.push({ label: hours, views: 0, visitors: new Set() });
    }
    events.forEach((ev) => {
      const evTime = typeof ev.timestamp === 'number' ? ev.timestamp : new Date(ev.timestamp).getTime();
      const diffHours = Math.floor((now - evTime) / (60 * 60 * 1000));
      if (diffHours >= 0 && diffHours < 12) {
        const bucketIndex = 11 - diffHours;
        if (buckets[bucketIndex]) {
          buckets[bucketIndex].views += 1;
          buckets[bucketIndex].visitors.add(ev.visitorId);
        }
      }
    });
    return buckets.map((b) => ({ label: b.label, views: b.views, visitors: b.visitors.size }));
  }

  if (period === '24h') {
    // 8 3-hour buckets
    const buckets: { label: string; views: number; visitors: Set<string> }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now - i * 3 * 60 * 60 * 1000);
      const hours = d.getHours().toString().padStart(2, '0') + ':00';
      buckets.push({ label: hours, views: 0, visitors: new Set() });
    }
    events.forEach((ev) => {
      const evTime = typeof ev.timestamp === 'number' ? ev.timestamp : new Date(ev.timestamp).getTime();
      const diff3Hours = Math.floor((now - evTime) / (3 * 60 * 60 * 1000));
      if (diff3Hours >= 0 && diff3Hours < 8) {
        const bucketIndex = 7 - diff3Hours;
        if (buckets[bucketIndex]) {
          buckets[bucketIndex].views += 1;
          buckets[bucketIndex].visitors.add(ev.visitorId);
        }
      }
    });
    return buckets.map((b) => ({ label: b.label, views: b.views, visitors: b.visitors.size }));
  }

  if (period === '7d') {
    // 7 1-day buckets
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const buckets: { label: string; views: number; visitors: Set<string> }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const label = dayNames[d.getDay()];
      buckets.push({ label, views: 0, visitors: new Set() });
    }
    events.forEach((ev) => {
      const evTime = typeof ev.timestamp === 'number' ? ev.timestamp : new Date(ev.timestamp).getTime();
      const diffDays = Math.floor((now - evTime) / (24 * 60 * 60 * 1000));
      if (diffDays >= 0 && diffDays < 7) {
        const bucketIndex = 6 - diffDays;
        if (buckets[bucketIndex]) {
          buckets[bucketIndex].views += 1;
          buckets[bucketIndex].visitors.add(ev.visitorId);
        }
      }
    });
    return buckets.map((b) => ({ label: b.label, views: b.views, visitors: b.visitors.size }));
  }

  if (period === '30d') {
    // 6 5-day intervals
    const buckets: { label: string; views: number; visitors: Set<string> }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now - i * 5 * 24 * 60 * 60 * 1000);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      buckets.push({ label, views: 0, visitors: new Set() });
    }
    events.forEach((ev) => {
      const evTime = typeof ev.timestamp === 'number' ? ev.timestamp : new Date(ev.timestamp).getTime();
      const diff5Days = Math.floor((now - evTime) / (5 * 24 * 60 * 60 * 1000));
      if (diff5Days >= 0 && diff5Days < 6) {
        const bucketIndex = 5 - diff5Days;
        if (buckets[bucketIndex]) {
          buckets[bucketIndex].views += 1;
          buckets[bucketIndex].visitors.add(ev.visitorId);
        }
      }
    });
    return buckets.map((b) => ({ label: b.label, views: b.views, visitors: b.visitors.size }));
  }

  // 365d or all: 12 month buckets
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const buckets: { label: string; views: number; visitors: Set<string> }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = monthNames[d.getMonth()];
    buckets.push({ label, views: 0, visitors: new Set() });
  }
  events.forEach((ev) => {
    const evTime = typeof ev.timestamp === 'number' ? ev.timestamp : new Date(ev.timestamp).getTime();
    const d = new Date(evTime);
    const currentD = new Date(now);
    const monthDiff = (currentD.getFullYear() - d.getFullYear()) * 12 + (currentD.getMonth() - d.getMonth());
    if (monthDiff >= 0 && monthDiff < 12) {
      const bucketIndex = 11 - monthDiff;
      if (buckets[bucketIndex]) {
        buckets[bucketIndex].views += 1;
        buckets[bucketIndex].visitors.add(ev.visitorId);
      }
    }
  });
  return buckets.map((b) => ({ label: b.label, views: b.views, visitors: b.visitors.size }));
}
