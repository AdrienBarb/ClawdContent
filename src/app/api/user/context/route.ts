import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { userContextSchema } from "@/lib/schemas/user";
import { generateAndStoreSuggestions } from "@/lib/services/suggestions";

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

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        onboardingRole: true,
        onboardingNiche: true,
        onboardingTopics: true,
        onboardingGoal: true,
      },
    });

    return NextResponse.json({
      role: user.onboardingRole,
      niche: user.onboardingNiche,
      topics: user.onboardingTopics,
      goal: user.onboardingGoal,
    });
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
    const data = userContextSchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingRole: data.role,
        onboardingNiche: data.niche,
        onboardingTopics: data.topics,
        ...(data.goal !== undefined && { onboardingGoal: data.goal }),
      },
    });

    // Regenerate personalized chat suggestions (non-blocking)
    generateAndStoreSuggestions(
      session.user.id,
      data.role ?? null,
      data.niche ?? null,
      data.topics ?? [],
      data.goal ?? null
    ).catch((err) =>
      console.error(
        `Failed to regenerate suggestions for user ${session.user.id}:`,
        err
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorHandler(error);
  }
}
