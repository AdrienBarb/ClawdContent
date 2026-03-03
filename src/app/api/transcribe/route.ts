import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { transcribeAudio } from "@/lib/services/transcription";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (OpenAI limit)

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

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: errorMessages.MISSING_FIELDS },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Audio file exceeds 25 MB limit" },
        { status: 400 }
      );
    }

    const text = await transcribeAudio(audioFile);

    return NextResponse.json({ text });
  } catch (error) {
    return errorHandler(error);
  }
}
