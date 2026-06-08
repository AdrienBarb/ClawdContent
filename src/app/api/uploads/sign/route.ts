import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import {
  MEDIA_BUCKET,
  buildUserPath,
  createSignedUpload,
  isStorageConfigured,
  sanitizeExt,
} from "@/lib/supabase/storage";

// Node runtime: the signed-upload SDK targets Node, not Edge.
export const runtime = "nodejs";

const bodySchema = z.object({
  resourceType: z.enum(["image", "video"]),
  fileName: z.string().max(256).optional(),
});

const DEFAULT_EXT = { image: "jpg", video: "mp4" } as const;

// POST /api/uploads/sign — returns a short-lived Supabase signed upload URL
// scoped to a per-user path. The browser uploads the file directly to Supabase
// Storage with the returned token (keeps large videos off our serverless body).
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

    const { resourceType, fileName } = bodySchema.parse(await req.json());

    const ext = fileName ? sanitizeExt(fileName) : DEFAULT_EXT[resourceType];
    const path = buildUserPath(session.user.id, { ext });
    const { token, publicUrl } = await createSignedUpload(path);

    return NextResponse.json({
      bucket: MEDIA_BUCKET,
      path,
      token,
      publicUrl,
      resourceType,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
