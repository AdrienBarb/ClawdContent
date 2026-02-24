import { NextRequest, NextResponse } from "next/server";
import { errorHandler } from "@/lib/errors/errorHandler";
import {
  deployOpenClawContainer,
  setServiceVariables,
  getDeployments,
  deleteService,
  getProject,
} from "@/lib/railway/mutations";

/**
 * POST /api/test/deploy
 *
 * Phase 0 validation: Deploy an OpenClaw container on Railway via API.
 * Dev-only endpoint.
 *
 * Body:
 *   name?: string          - Service name (default: "test-openclaw-{timestamp}")
 *   image?: string         - Docker image
 *   telegramToken?: string - Telegram bot token (can be set later via PATCH)
 */
export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_APP_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const name = body.name ?? `test-openclaw-${Date.now()}`;
    const image =
      body.image ??
      (process.env.OPENCLAW_IMAGE || "ghcr.io/openclaw/openclaw:latest");

    const envVars: Record<string, string> = {};

    if (body.telegramToken) {
      envVars.TELEGRAM_BOT_TOKEN = body.telegramToken;
    }

    if (process.env.LATE_API_KEY) {
      envVars.LATE_API_KEY = process.env.LATE_API_KEY;
    }

    if (process.env.MOONSHOT_API_KEY) {
      envVars.MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;
    }

    const { service, environmentId } = await deployOpenClawContainer({
      name,
      image,
      envVars,
    });

    return NextResponse.json(
      {
        success: true,
        service: {
          id: service.id,
          name: service.name,
          projectId: service.projectId,
        },
        environmentId,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorHandler(error);
  }
}

/**
 * PATCH /api/test/deploy
 *
 * Update env vars on an existing service (e.g. set bot token from dashboard).
 * Railway auto-redeploys on variable change.
 *
 * Body:
 *   serviceId: string
 *   telegramToken?: string
 */
export async function PATCH(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_APP_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development" },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.serviceId) {
      return NextResponse.json(
        { error: "serviceId is required" },
        { status: 400 }
      );
    }

    const variables: Record<string, string> = {};

    if (body.telegramToken) {
      variables.TELEGRAM_BOT_TOKEN = body.telegramToken;
    }

    if (Object.keys(variables).length === 0) {
      return NextResponse.json(
        { error: "No variables to update" },
        { status: 400 }
      );
    }

    await setServiceVariables({
      serviceId: body.serviceId,
      variables,
    });

    return NextResponse.json({
      success: true,
      message: "Variables updated. Container will redeploy automatically.",
    });
  } catch (error) {
    return errorHandler(error);
  }
}

/**
 * GET /api/test/deploy?serviceId=xxx
 *
 * Check deployment status for a test service.
 */
export async function GET(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_APP_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development" },
        { status: 403 }
      );
    }

    const serviceId = req.nextUrl.searchParams.get("serviceId");

    if (!serviceId) {
      const project = await getProject();
      return NextResponse.json({
        project: {
          id: project.id,
          name: project.name,
          environments: project.environments.edges.map((e) => e.node),
        },
      });
    }

    const deployments = await getDeployments({ serviceId, limit: 3 });

    return NextResponse.json({ serviceId, deployments });
  } catch (error) {
    return errorHandler(error);
  }
}

/**
 * DELETE /api/test/deploy?serviceId=xxx
 *
 * Clean up a test service.
 */
export async function DELETE(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_APP_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development" },
        { status: 403 }
      );
    }

    const serviceId = req.nextUrl.searchParams.get("serviceId");

    if (!serviceId) {
      return NextResponse.json(
        { error: "serviceId query parameter is required" },
        { status: 400 }
      );
    }

    await deleteService(serviceId);

    return NextResponse.json({
      success: true,
      message: `Service ${serviceId} deleted`,
    });
  } catch (error) {
    return errorHandler(error);
  }
}
