import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { userContextSchema } from "@/lib/schemas/user";
import {
  updateContainerEnvVars,
  formatUserContextFromData,
} from "@/lib/services/provisioning";
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
      },
    });

    return NextResponse.json({
      role: user.onboardingRole,
      niche: user.onboardingNiche,
      topics: user.onboardingTopics,
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
      },
    });

    // Push updated USER_CONTEXT to the container if running
    const flyMachine = await prisma.flyMachine.findUnique({
      where: { userId: session.user.id },
    });

    if (flyMachine && flyMachine.status === "running") {
      const userContext = formatUserContextFromData({
        onboardingRole: data.role,
        onboardingNiche: data.niche,
        onboardingTopics: data.topics,
      });
      await updateContainerEnvVars(session.user.id, {
        USER_CONTEXT: userContext,
      }).catch((err) =>
        console.error(
          `Failed to update USER_CONTEXT on container for user ${session.user.id}:`,
          err
        )
      );
    }

    // Regenerate personalized chat suggestions (non-blocking)
    generateAndStoreSuggestions(
      session.user.id,
      data.role ?? null,
      data.niche ?? null,
      data.topics ?? []
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
