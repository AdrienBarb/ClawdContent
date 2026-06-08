import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import {
  buildUserPath,
  isStorageConfigured,
  sanitizeExt,
  uploadBuffer,
} from "@/lib/supabase/storage";

// Node runtime: uses Buffer + the Node-targeting Supabase SDK.
export const runtime = "nodejs";

// Kept under Vercel's serverless request-body limit (4.5 MB). Brand logos are
// small; raster types only, matching the `media` bucket's allowed MIME list.
const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// POST /api/branding/logo — multipart upload of a brand logo to Supabase
// Storage. Returns the public URL to store in knowledgeBase.branding.logoUrl.
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    if (!isStorageConfigured()) {
      return NextResponse.json(
        { error: "Upload service not configured" },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPG, PNG, GIF, or WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: "Logo too large (max 4 MB)." },
        { status: 400 }
      );
    }

    const ext = sanitizeExt(file.name);
    const path = buildUserPath(session.user.id, { sub: "logo", ext });
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadBuffer(path, buffer, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    return errorHandler(error);
  }
}
