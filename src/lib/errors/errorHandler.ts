import { errorMessages } from "@/lib/constants/errorMessage";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function errorHandler(error: unknown) {
  console.error(error);

  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: "Invalid input", errors: error.issues },
      { status: 400 }
    );
  }

  const errorMessage =
    error instanceof Error && error.message
      ? error.message
      : errorMessages.SERVER_ERROR;

  return NextResponse.json({ error: errorMessage }, { status: 500 });
}
