// Inject a Cloudinary delivery transform so kanban thumbnails aren't the
// full-resolution upload. Falls through unchanged for non-Cloudinary URLs.
export function cloudinaryThumbnail(url: string): string {
  return url.replace("/upload/", "/upload/c_fill,w_400,h_220,q_auto,f_auto/");
}

// Higher-res variant for the full-screen lightbox preview. Caps at 1600px
// wide and preserves aspect ratio (c_limit). Falls through unchanged for
// non-Cloudinary URLs.
export function cloudinaryFull(url: string): string {
  return url.replace("/upload/", "/upload/c_limit,w_1600,q_auto,f_auto/");
}
