import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { confirmInputSchema } from "@/lib/schemas/knowledgeBase";

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
    const data = confirmInputSchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        websiteUrl: data.websiteUrl ?? null,
        businessDescription: data.businessDescription ?? null,
        knowledgeBase: data.knowledgeBase,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorHandler(error);
  }
}
