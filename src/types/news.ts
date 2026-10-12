export type CategoryId = 
  | 'all'
  | 'world'
  | 'arab'
  | 'gulf'
  | 'economy'
  | 'sports'
  | 'tech'
  | 'variety'
  | 'opinions';

export interface Category {
  id: CategoryId;
  name: string;
  slug: string;
  accentColor: string;
  description?: string;
}

export interface Article {
  id: string;
  title: string;
  deck: string;
  content: string[];
  categoryId: CategoryId;
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
  imageUrl?: string;
  themeColor?: string;
  iconType?: 'diplomacy' | 'gulf' | 'economy' | 'sports' | 'tech' | 'culture' | 'world';
  imageCaption: string;
  readTime: string;
  isLead?: boolean;
  isSecondary?: boolean;
  isMostRead?: boolean;
  status?: 'published' | 'pending' | 'draft' | 'archived';
  rank?: number;
  viewsCount?: string;
  tags?: string[];
  keyPoints?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface BreakingNewsItem {
  id: string;
  text: string;
  time: string;
  category: string;
  articleId?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: string;
  change: string;
  isPositive: boolean;
}

export interface WeatherReport {
  city: string;
  temp: number;
  condition: string;
}
