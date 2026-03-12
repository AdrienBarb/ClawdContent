import imageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";
import { client } from "./client";

const { projectId, dataset } = client.config();

const builder = imageUrlBuilder({ projectId: projectId!, dataset: dataset! });

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export function getImageUrl(
  source: SanityImageSource | undefined,
  width: number = 800,
  height?: number
): string | null {
  if (!source) return null;

  let imageBuilder = urlFor(source).width(width);

  if (height) {
    imageBuilder = imageBuilder.height(height);
  }

  return imageBuilder.url();
}
