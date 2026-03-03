import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import {
  getBotStatus,
  setTelegramToken,
  restartBot,
  updateBotImage,
} from "@/lib/services/bot";
import { telegramTokenSchema, botImageSchema } from "@/lib/schemas/bot";

export async function GET() {
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

    const status = await getBotStatus(session.user.id);

    if (!status) {
      return NextResponse.json(
        { error: errorMessages.BOT_NOT_FOUND },
        { status: 404 }
      );
    }

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}

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
    const { token } = telegramTokenSchema.parse(body);

    await setTelegramToken(session.user.id, token);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function PUT(req: NextRequest) {
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
    const { image } = botImageSchema.parse(body);

    await updateBotImage(session.user.id, image);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}

export async function PATCH() {
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

    await restartBot(session.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
