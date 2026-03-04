import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { timezoneSchema } from "@/lib/schemas/user";
import { updateContainerEnvVars } from "@/lib/services/provisioning";

export async function PATCH(req: NextRequest) {
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
    const { timezone } = timezoneSchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { timezone },
    });

    // Push TZ to the user's container if they have one running
    const flyMachine = await prisma.flyMachine.findUnique({
      where: { userId: session.user.id },
    });

    if (flyMachine && flyMachine.status === "running") {
      await updateContainerEnvVars(session.user.id, { TZ: timezone }).catch(
        (err) =>
          console.error(
            `Failed to update TZ on container for user ${session.user.id}:`,
            err
          )
      );
    }

    return NextResponse.json({ timezone }, { status: 200 });
  } catch (error) {
    return errorHandler(error);
  }
}
