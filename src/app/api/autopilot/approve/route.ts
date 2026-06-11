import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { approveBatch } from "@/lib/services/autopilot/approve";

export const maxDuration = 120; // commits a whole staged week to Zernio

const bodySchema = z.object({ batchId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { batchId } = bodySchema.parse(body);

    const result = await approveBatch({ userId: session.user.id, batchId });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "not_found" ? 404 : 409 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return errorHandler(error);
  }
}
