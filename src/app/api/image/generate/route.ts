import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { imageGenerateSchema } from "@/lib/schemas/imageGeneration";
import {
  generateImage,
  AccessError,
  InsufficientCreditsError,
} from "@/lib/services/imageGeneration";

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
    const data = imageGenerateSchema.parse(body);
    const result = await generateImage({
      userId: session.user.id,
      prompt: data.prompt,
      size: data.size,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return errorHandler(error);
  }
}
