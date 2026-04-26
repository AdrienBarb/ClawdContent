import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  generateSuggestions,
  type SuggestionWithAccount,
} from "@/lib/services/postSuggestions";

export const maxDuration = 60;

const generateInputSchema = z.object({
  topic: z.string().optional(),
  accountId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: errorMessages.UNAUTHORIZED },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const input = generateInputSchema.parse(body);

    const lateProfile = await prisma.lateProfile.findUnique({
      where: { userId: session.user.id },
      include: { socialAccounts: { where: { status: "active" } } },
    });

    if (!lateProfile || lateProfile.socialAccounts.length === 0) {
      return NextResponse.json(
        { error: "No connected accounts" },
        { status: 400 }
      );
    }

    const accounts = input.accountId
      ? lateProfile.socialAccounts.filter((a) => a.id === input.accountId)
      : lateProfile.socialAccounts;

    if (accounts.length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const allSuggestions: SuggestionWithAccount[] = [];
    for (const account of accounts) {
      const created = await generateSuggestions(account.id, {
        topic: input.topic,
      });
      allSuggestions.push(...created);
    }

    return NextResponse.json({ suggestions: allSuggestions });
  } catch (error) {
    return errorHandler(error);
  }
}
