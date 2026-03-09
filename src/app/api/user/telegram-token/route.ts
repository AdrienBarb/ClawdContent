import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const tokenSchema = z.object({
  token: z.string().min(1),
});

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
    const { token } = tokenSchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { telegramBotToken: token },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
