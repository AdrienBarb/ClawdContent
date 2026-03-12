// GROQ Queries for Sanity Blog

// ============================================
// CATEGORY QUERIES
// ============================================

export const CATEGORIES_QUERY = `*[
  _type == "category"
  && featured == true
] | order(order asc) {
  _id,
  title,
  slug,
  description,
  image,
  "postCount": count(*[_type == "post" && references(^._id)])
}`;

export const ALL_CATEGORIES_QUERY = `*[
  _type == "category"
] | order(order asc) {
  _id,
  title,
  slug,
  description,
  image,
  "postCount": count(*[_type == "post" && references(^._id)])
}`;

export const CATEGORY_BY_SLUG_QUERY = `*[
  _type == "category"
  && slug.current == $slug
][0] {
  _id,
  title,
  slug,
  description,
  image,
  intro,
  seo,
  faq
}`;

export const CATEGORY_SLUGS_QUERY = `*[
  _type == "category"
  && defined(slug.current)
] {
  "slug": slug.current
}`;

// ============================================
// POST QUERIES
// ============================================

export const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
] | order(publishedAt desc) [0...$limit] {
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  category-> {
    _id,
    title,
    slug
  },
  authorName,
  publishedAt,
  readingTime,
  featured,
  primaryKeyword
}`;

export const FEATURED_POSTS_QUERY = `*[
  _type == "post"
  && featured == true
  && defined(slug.current)
] | order(publishedAt desc) [0...3] {
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  category-> {
    _id,
    title,
    slug
  },
  authorName,
  publishedAt,
  readingTime,
  featured,
  primaryKeyword
}`;

export const LATEST_POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
] | order(publishedAt desc) {
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  category-> {
    _id,
    title,
    slug
  },
  authorName,
  publishedAt,
  readingTime,
  primaryKeyword
}`;

export const POSTS_BY_CATEGORY_QUERY = `*[
  _type == "post"
  && category->slug.current == $categorySlug
  && defined(slug.current)
] | order(publishedAt desc) {
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  category-> {
    _id,
    title,
    slug
  },
  authorName,
  publishedAt,
  readingTime,
  primaryKeyword
}`;

export const POST_BY_SLUG_QUERY = `*[
  _type == "post"
  && slug.current == $slug
][0] {
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  category-> {
    _id,
    title,
    slug
  },
  authorName,
  authorBio,
  publishedAt,
  updatedAt,
  readingTime,
  keyTakeaways,
  body,
  faq,
  seo,
  "manualRelatedPosts": relatedPosts[]-> {
    _id,
    title,
    slug,
    excerpt,
    coverImage,
    category-> {
      _id,
      title,
      slug
    },
    publishedAt,
    readingTime,
    primaryKeyword
  }
}`;

export const RELATED_POSTS_QUERY = `*[
  _type == "post"
  && category->slug.current == $categorySlug
  && slug.current != $currentSlug
  && defined(slug.current)
] | order(publishedAt desc) [0...3] {
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  category-> {
    _id,
    title,
    slug
  },
  publishedAt,
  readingTime,
  primaryKeyword
}`;

export const POST_SLUGS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
] {
  "slug": slug.current,
  "categorySlug": category->slug.current
}`;

// ============================================
// SITEMAP QUERIES
// ============================================

export const SITEMAP_POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
] | order(publishedAt desc) {
  "slug": slug.current,
  "updatedAt": coalesce(updatedAt, publishedAt)
}`;

export const SITEMAP_CATEGORIES_QUERY = `*[
  _type == "category"
  && defined(slug.current)
] {
  "slug": slug.current
}`;

// ============================================
// COMPETITOR PAGE QUERIES
// ============================================

export const COMPETITOR_PAGES_QUERY = `*[
  _type == "competitorPage"
  && defined(slug.current)
] | order(order asc, title asc) {
  _id,
  competitorName,
  title,
  slug,
  excerpt,
  logo,
  featured,
  primaryKeyword
}`;

export const FEATURED_COMPETITORS_QUERY = `*[
  _type == "competitorPage"
  && featured == true
  && defined(slug.current)
] | order(title asc) {
  _id,
  title,
  slug,
  excerpt,
  logo
}`;

export const COMPETITOR_BY_SLUG_QUERY = `*[
  _type == "competitorPage"
  && slug.current == $slug
][0] {
  _id,
  competitorName,
  title,
  slug,
  excerpt,
  logo,
  keyTakeaways,
  competitorWebsite,
  competitorPricing,
  pricingModel,
  comparisonTable,
  primaryKeyword,
  authorName,
  authorBio,
  publishedAt,
  updatedAt,
  body,
  faq,
  seo,
  "manualRelatedCompetitors": relatedCompetitors[]-> {
    _id,
    competitorName,
    title,
    "slug": slug.current,
    excerpt,
    primaryKeyword
  },
  "manualRelatedPosts": relatedPosts[]-> {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    primaryKeyword
  }
}`;

export const COMPETITOR_SLUGS_QUERY = `*[
  _type == "competitorPage"
  && defined(slug.current)
] {
  "slug": slug.current
}`;

export const FOOTER_COMPETITORS_QUERY = `*[
  _type == "competitorPage"
  && defined(slug.current)
] | order(order asc, title asc) {
  competitorName,
  title,
  primaryKeyword,
  "slug": slug.current
}`;

export const SITEMAP_COMPETITORS_QUERY = `*[
  _type == "competitorPage"
  && defined(slug.current)
] {
  "slug": slug.current,
  "updatedAt": _updatedAt
}`;

export const RELATED_COMPETITORS_QUERY = `*[
  _type == "competitorPage"
  && slug.current != $currentSlug
  && defined(slug.current)
] | order(order asc, title asc) {
  _id,
  competitorName,
  title,
  "slug": slug.current,
  excerpt,
  primaryKeyword
}`;
