import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/lib/sanity/image";
import type { CategoryPreview } from "@/lib/sanity/types";
import { ArrowRight } from "lucide-react";

interface BlogCategoryCardProps {
  category: CategoryPreview;
}

export default function BlogCategoryCard({ category }: BlogCategoryCardProps) {
  const imageUrl = getImageUrl(category.image, 400, 250);

  return (
    <Link
      href={`/blog/category/${category.slug.current}`}
      className="group block bg-[#151929] rounded-2xl border border-[#1e2233] overflow-hidden hover:border-[#e8614d]/30 transition-all"
    >
      {/* Image */}
      {imageUrl ? (
        <div className="aspect-video overflow-hidden">
          <Image
            src={imageUrl}
            alt={category.title}
            width={400}
            height={250}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-[#e8614d]/20 to-[#e8614d]/5 flex items-center justify-center">
          <span className="text-4xl font-bold text-[#e8614d]/40">
            {category.title.charAt(0)}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-white group-hover:text-[#e8614d] transition-colors">
            {category.title}
          </h3>
          <ArrowRight className="w-4 h-4 text-[#555a6b] group-hover:text-[#e8614d] group-hover:translate-x-1 transition-all" />
        </div>

        {category.description && (
          <p className="mt-2 text-sm text-[#7a7f94] line-clamp-2">
            {category.description}
          </p>
        )}

        {category.postCount !== undefined && (
          <p className="mt-3 text-xs text-[#555a6b]">
            {category.postCount}{" "}
            {category.postCount === 1 ? "article" : "articles"}
          </p>
        )}
      </div>
    </Link>
  );
}
