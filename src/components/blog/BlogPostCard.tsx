import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/lib/sanity/image";
import type { PostPreview } from "@/lib/sanity/types";
import { formatDistanceToNow } from "date-fns";

interface BlogPostCardProps {
  post: PostPreview;
  featured?: boolean;
}

export default function BlogPostCard({
  post,
  featured = false,
}: BlogPostCardProps) {
  const imageUrl = getImageUrl(post.coverImage, 600, 340);

  return (
    <article
      className={`group bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/30 transition-all ${
        featured ? "md:col-span-2 md:grid md:grid-cols-2" : ""
      }`}
    >
      {/* Image */}
      <Link
        href={`/blog/${post.slug.current}`}
        className={`block overflow-hidden ${featured ? "md:h-full" : "aspect-video"}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.title}
            width={600}
            height={340}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center min-h-[200px]">
            <span className="text-muted-foreground">No image</span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className={`p-6 ${featured ? "flex flex-col justify-center" : ""}`}>
        {/* Category */}
        <Link
          href={`/blog/category/${post.category.slug.current}`}
          className="text-xs font-medium text-primary hover:text-primary uppercase tracking-wide"
        >
          {post.category.title}
        </Link>

        {/* Title */}
        <h3
          className={`mt-2 font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 ${
            featured ? "text-2xl" : "text-lg"
          }`}
        >
          <Link href={`/blog/${post.slug.current}`}>
            {post.primaryKeyword || post.title}
          </Link>
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p
            className={`mt-2 text-muted-foreground line-clamp-2 ${
              featured ? "text-base" : "text-sm"
            }`}
          >
            {post.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{post.authorName}</span>
          <span>&middot;</span>
          <time dateTime={post.publishedAt}>
            {formatDistanceToNow(new Date(post.publishedAt), {
              addSuffix: true,
            })}
          </time>
          {post.readingTime && (
            <>
              <span>&middot;</span>
              <span>{post.readingTime} min read</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
