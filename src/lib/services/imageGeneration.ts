import { prisma } from "@/lib/db/prisma";
import { openai } from "@/lib/openai/client";
import { uploadBase64Image } from "@/lib/cloudinary/upload";
import { deductCredit, refundCredit } from "@/lib/services/credits";
import { errorMessages } from "@/lib/constants/errorMessage";
import type { PlanId } from "@/lib/constants/plans";

interface GenerateImageParams {
  userId: string;
  prompt: string;
  size: "1024x1024" | "1792x1024" | "1024x1792";
}

export async function generateImage({ userId, prompt, size }: GenerateImageParams) {
  // Check subscription eligibility
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || subscription.status !== "active") {
    throw new AccessError(errorMessages.SUBSCRIPTION_REQUIRED);
  }

  if ((subscription.planId as PlanId) === "starter") {
    throw new AccessError(errorMessages.STARTER_NO_GENERATION);
  }

  // Deduct credit
  const deduction = await deductCredit(userId);
  if (!deduction.success) {
    throw new InsufficientCreditsError(errorMessages.INSUFFICIENT_CREDITS);
  }

  // Create generation record
  const generation = await prisma.imageGeneration.create({
    data: { userId, prompt, size, status: "pending" },
  });

  try {
    // Call OpenAI GPT-Image-1
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      n: 1,
      output_format: "png",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("No image data returned from OpenAI");
    }

    // Upload to Cloudinary
    const uploaded = await uploadBase64Image(b64, "postclaw/generated");

    // Save media record
    await prisma.media.create({
      data: {
        userId,
        cloudinaryId: uploaded.publicId,
        url: uploaded.url,
        resourceType: "image",
        format: "png",
        bytes: 0,
        width: uploaded.width,
        height: uploaded.height,
      },
    });

    // Update generation record
    await prisma.imageGeneration.update({
      where: { id: generation.id },
      data: { status: "completed", imageUrl: uploaded.url },
    });

    return { imageUrl: uploaded.url, generationId: generation.id };
  } catch (error) {
    // Refund credit on failure
    await refundCredit(userId, deduction.pool!, generation.id);

    await prisma.imageGeneration.update({
      where: { id: generation.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    if (error instanceof AccessError || error instanceof InsufficientCreditsError) {
      throw error;
    }

    throw new Error(errorMessages.GENERATION_FAILED);
  }
}

export class AccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessError";
  }
}

export class InsufficientCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}
