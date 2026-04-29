import { errorMessages } from "@/lib/constants/errorMessage";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UsageLimitError } from "./UsageLimitError";

export function errorHandler(error: unknown) {
  console.error(error);

  if (error instanceof UsageLimitError) {
    return NextResponse.json(
      {
        error: "USAGE_LIMIT_REACHED",
        attemptedType: error.payload.attemptedType,
        percentageRemaining: error.payload.percentageRemaining,
        resetAt: error.payload.resetAt
          ? error.payload.resetAt.toISOString()
          : null,
        isPaid: error.payload.isPaid,
      },
      { status: 402 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: "Invalid input", errors: error.issues },
      { status: 400 }
    );
  }

  // Never leak internal error messages to the client.
  // The real error is already logged above via console.error.
  return NextResponse.json(
    { error: errorMessages.SERVER_ERROR },
    { status: 500 }
  );
}
