import dns from "node:dns";
import https from "node:https";
import { Readable } from "node:stream";
import { errorMessages } from "@/lib/constants/errorMessage";
import { errorHandler } from "@/lib/errors/errorHandler";
import { auth } from "@/lib/better-auth/auth";
import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getChatConfig } from "@/lib/services/chat";

// Use public DNS so local/ISP negative caching can't block Fly lookups.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

function resolveHost(hostname: string): Promise<string> {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      resolve(err || addresses.length === 0 ? hostname : addresses[0]);
    });
  });
}

/**
 * Custom fetch that resolves DNS via public resolvers and connects
 * with the correct TLS servername. Works around local DNS caching
 * issues that prevent *.fly.dev from resolving.
 */
function createFlyFetch(hostname: string, ip: string): typeof globalThis.fetch {
  if (ip === hostname) return globalThis.fetch;

  return async (input, init) => {
    const url = new URL(typeof input === "string" ? input : (input as Request).url);
    const reqHeaders: Record<string, string> = { Host: hostname };
    const initHeaders = init?.headers;
    if (initHeaders) {
      const entries =
        initHeaders instanceof Headers
          ? initHeaders.entries()
          : Object.entries(initHeaders as Record<string, string>);
      for (const [k, v] of entries) reqHeaders[k] = v;
    }

    return new Promise<Response>((resolve, reject) => {
      const req = https.request(
        {
          hostname: ip,
          port: 443,
          path: url.pathname + url.search,
          method: init?.method ?? "GET",
          headers: reqHeaders,
          servername: hostname,
        },
        (res) => {
          const webStream = Readable.toWeb(res) as ReadableStream;
          resolve(
            new Response(webStream, {
              status: res.statusCode ?? 500,
              headers: res.headers as Record<string, string>,
            })
          );
        }
      );
      req.on("error", reject);
      if (init?.body) req.write(init.body);
      req.end();
    });
  };
}

export const maxDuration = 60;

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

    const { messages }: { messages: UIMessage[] } = await req.json();

    const { machineId, gatewayToken, appName } = await getChatConfig(
      session.user.id
    );

    const hostname = `${appName}.fly.dev`;
    const ip = await resolveHost(hostname);

    const provider = createOpenAICompatible({
      name: "openclaw",
      baseURL: `https://${hostname}/v1`,
      apiKey: gatewayToken,
      headers: { "fly-force-instance-id": machineId },
      fetch: createFlyFetch(hostname, ip),
    });

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: provider.chatModel("kimi-k2.5"),
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return errorHandler(error);
  }
}
