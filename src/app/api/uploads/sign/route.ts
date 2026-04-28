import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const bodySchema = z.object({
  resourceType: z.enum(["image", "video"]),
});

// 25 MB images, 200 MB videos — must match the client-side preflight in
// MediaUploadModal so users get a friendly error before we waste a signature.
const MAX_BYTES_BY_KIND = {
  image: 25 * 1024 * 1024,
  video: 200 * 1024 * 1024,
} as const;

const ALLOWED_FORMATS_BY_KIND = {
  image: ["jpg", "jpeg", "png", "gif", "webp"],
  video: ["mp4", "mov"],
} as const;

// POST /api/uploads/sign — returns short-lived Cloudinary upload params
// scoped to the current user. Replaces the unsigned upload preset which
// allowed anyone with the bundle to write into the bucket.
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    if (
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET ||
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    ) {
      return NextResponse.json(
        { error: "Upload service not configured" },
        { status: 503 }
      );
    }

    const { resourceType } = bodySchema.parse(await req.json());

    const timestamp = Math.floor(Date.now() / 1000);
    // Per-user folder lets us trace + clean up on account deletion.
    const folder = `postclaw/users/${session.user.id}`;
    const allowedFormats = ALLOWED_FORMATS_BY_KIND[resourceType].join(",");
    const maxBytes = MAX_BYTES_BY_KIND[resourceType];

    // Note: Cloudinary doesn't accept a `bytes` upload param — file size is
    // enforced via upload preset settings on their side, plus the client-side
    // preflight in useCloudinaryUpload / MediaUploadModal. We still expose
    // `maxBytes` to the client so the preflight error message stays in sync.
    const paramsToSign = {
      timestamp,
      folder,
      allowed_formats: allowedFormats,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return NextResponse.json({
      signature,
      timestamp,
      folder,
      allowedFormats,
      maxBytes,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      resourceType,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
