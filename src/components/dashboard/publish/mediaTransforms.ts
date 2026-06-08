// Media is served straight from Supabase Storage. Image transformations
// (resized thumbnails) require Supabase's imgproxy — a Pro-plan feature, and
// not enabled on the local stack — so for now we serve the original asset.
// To enable: swap to the `/render/image/public/<bucket>/<path>?width=&quality=`
// route once image transformation is turned on.

export function mediaThumbnail(url: string): string {
  return url;
}

export function mediaFull(url: string): string {
  return url;
}
