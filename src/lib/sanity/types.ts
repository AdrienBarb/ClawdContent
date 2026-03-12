export interface SanitySlug {
  current: string;
  _type: "slug";
}

export interface SanityImage {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  hotspot?: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
}

export interface SanityBlock {
  _type: "block";
  _key: string;
  children: Array<{
    _type: "span";
    _key: string;
    text: string;
    marks?: string[];
  }>;
  markDefs?: Array<{
    _type: string;
    _key: string;
    href?: string;
  }>;
  style?: string;
}

export interface FAQItem {
  _key: string;
  question: string;
  answer: string;
}

export interface FAQBlock {
  title: string;
  items: FAQItem[];
}

export interface SEO {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: SanityImage;
  noindex?: boolean;
}

export interface Category {
  _id: string;
  _type: "category";
  title: string;
  slug: SanitySlug;
  description?: string;
  image?: SanityImage;
  intro?: SanityBlock[];
  featured?: boolean;
  seo?: SEO;
  faq?: FAQBlock;
  order?: number;
}

export interface Post {
  _id: string;
  _type: "post";
  title: string;
  slug: SanitySlug;
  excerpt?: string;
  coverImage?: SanityImage;
  category: Category;
  authorName: string;
  authorBio?: string;
  publishedAt: string;
  updatedAt?: string;
  readingTime?: number;
  featured?: boolean;
  keyTakeaways?: string[];
  body: Array<SanityBlock | SanityImage>;
  faq?: FAQBlock;
  seo?: SEO;
  manualRelatedPosts?: PostPreview[];
  internalNotes?: string;
}

// For list views (partial data)
export interface PostPreview {
  _id: string;
  title: string;
  slug: SanitySlug;
  excerpt?: string;
  coverImage?: SanityImage;
  category: {
    _id: string;
    title: string;
    slug: SanitySlug;
  };
  authorName?: string;
  publishedAt: string;
  readingTime?: number;
  featured?: boolean;
  primaryKeyword?: string;
}

export interface CategoryPreview {
  _id: string;
  title: string;
  slug: SanitySlug;
  description?: string;
  image?: SanityImage;
  postCount?: number;
}

// ============================================
// COMPETITOR PAGE TYPES
// ============================================

export interface ComparisonRow {
  feature: string;
  competitor: string;
  postclaw: string;
}

export interface CompetitorPage {
  _id: string;
  _type: "competitorPage";
  competitorName: string;
  title: string;
  slug: SanitySlug;
  excerpt?: string;
  logo?: SanityImage;
  keyTakeaways?: string[];
  competitorWebsite?: string;
  competitorPricing?: string;
  pricingModel?:
    | "per-action"
    | "subscription"
    | "one-time"
    | "credits"
    | "freemium";
  comparisonTable?: ComparisonRow[];
  primaryKeyword?: string;
  authorName: string;
  authorBio?: string;
  publishedAt: string;
  updatedAt?: string;
  body: Array<SanityBlock | SanityImage>;
  faq?: FAQBlock;
  seo: SEO;
  featured?: boolean;
  manualRelatedCompetitors?: RelatedCompetitor[];
  manualRelatedPosts?: RelatedPost[];
  internalNotes?: string;
}

export interface CompetitorPreview {
  _id: string;
  competitorName?: string;
  title: string;
  slug: SanitySlug;
  excerpt?: string;
  logo?: SanityImage;
  featured?: boolean;
  primaryKeyword?: string;
}

export interface RelatedCompetitor {
  _id: string;
  competitorName?: string;
  title: string;
  slug: string;
  excerpt?: string;
  primaryKeyword?: string;
}

export interface RelatedPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  primaryKeyword?: string;
}
