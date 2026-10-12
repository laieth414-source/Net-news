export type ArticleStatus = 'published' | 'pending' | 'draft' | 'archived';

export interface AdminArticle {
  id: string;
  title: string;
  deck: string;
  content: string[];
  categoryId: string;
  categoryName: string;
  publishedAt: string;
  timestamp: string;
  source: string;
  sourceUrl?: string;
  author?: {
    name: string;
    role?: string;
    avatar?: string;
  };
  themeColor?: string;
  imageUrl?: string;
  imageCaption: string;
  readTime: string;
  isLead?: boolean;
  isSecondary?: boolean;
  isMostRead?: boolean;
  status: ArticleStatus;
  viewsCount?: string;
  tags?: string[];
  keyPoints?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface AdminBreakingNews {
  id: string;
  text: string;
  time: string;
  category: string;
  articleId?: string;
  isActive: boolean;
  order?: number;
  startTime?: string;
  endTime?: string;
  createdAt?: any;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  description?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  showInNav: boolean;
  articlesCount?: number;
}

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  isPublished: boolean;
  lastUpdated: string;
  showInFooter?: boolean;
  order?: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
  platform?: string;
}

export interface SiteSettings {
  siteName: string;
  siteSubtitle: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone?: string;
  officeLocation?: string;
  timezone: string;
  dateFormat: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  socialLinks: {
    twitter?: string;
    facebook?: string;
    telegram?: string;
    youtube?: string;
    linkedin?: string;
  };
  footerText: string;
  breakingNewsEnabled: boolean;
  marketBarEnabled: boolean;
  opinionsEnabled: boolean;
  mostReadEnabled: boolean;
}

export interface SeoSettings {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  twitterHandle: string;
  enableStructuredData: boolean;
  keywords: string[];
}

export interface AdSlot {
  id: string;
  name: string;
  location: 'header' | 'sidebar' | 'inArticle' | 'footer';
  isEnabled: boolean;
  codeSnippet: string;
  bannerImageUrl?: string;
  bannerLink?: string;
  notes?: string;
}

export interface AdminComment {
  id: string;
  articleId: string;
  articleTitle: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  adminEmail: string;
  timestamp: string;
  details: string;
  status: 'success' | 'failure';
}

export interface ActiveVisitorItem {
  visitorId: string;
  sessionId?: string;
  path: string;
  title?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  lastSeen: string | number;
}

export interface AnalyticsEventItem {
  id: string;
  visitorId: string;
  sessionId: string;
  path: string;
  title?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  timestamp: string | number;
}

export type AnalyticsPeriod = '12h' | '24h' | '7d' | '30d' | '365d' | 'all';

export interface AnalyticsMetrics {
  period: AnalyticsPeriod;
  activeVisitorsNow: number;
  uniqueVisitors: number;
  sessions: number;
  pageViews: number;
  viewsPerVisitor: number;
  topPaths: { path: string; title: string; count: number }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  trend: { label: string; views: number; visitors: number }[];
}

export type AdminTab =
  | 'overview'
  | 'analytics'
  | 'articles'
  | 'breaking'
  | 'categories'
  | 'pages'
  | 'navigation'
  | 'media'
  | 'subscribers'
  | 'homepage'
  | 'settings'
  | 'seo'
  | 'ads'
  | 'comments'
  | 'account'
  | 'audit'
  | 'status';
