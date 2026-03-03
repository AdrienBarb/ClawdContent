import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { mediaUploadSchema } from "@/lib/schemas/media";
import { saveMediaUpload } from "@/lib/services/media";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = mediaUploadSchema.parse(body);
    const media = await saveMediaUpload({ userId: session.user.id, data });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    return errorHandler(error);
  }
}
