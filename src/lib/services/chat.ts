import crypto from "crypto";
import dns from "node:dns";
import https from "node:https";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db/prisma";
import { updateMachineEnv } from "@/lib/fly/mutations";
import { getAppName } from "@/lib/fly/client";

// Use public DNS so local/ISP negative caching can't block Fly lookups.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

export interface ChatConfig {
  machineId: string;
  gatewayToken: string;
  appName: string;
}

export function resolveHost(hostname: string): Promise<string> {
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
export function createFlyFetch(
  hostname: string,
  ip: string
): typeof globalThis.fetch {
  if (ip === hostname) return globalThis.fetch;

  return async (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : (input as Request).url
    );
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

export function getSessionKey(userId: string): string {
  return `webchat:${userId}`;
}

export async function getChatConfig(userId: string): Promise<ChatConfig> {
  const flyMachine = await prisma.flyMachine.findUnique({
    where: { userId },
  });

  if (!flyMachine || flyMachine.machineId === "pending") {
    throw new Error(
      "Your AI social media manager is not set up yet. Please wait for provisioning to complete."
    );
  }

  if (flyMachine.status !== "running") {
    throw new Error(
      `Your AI social media manager is currently ${flyMachine.status}. It needs to be running to chat.`
    );
  }

  // Lazy migration: generate gateway token for existing machines
  if (!flyMachine.gatewayToken) {
    const token = await ensureGatewayToken(userId, flyMachine.machineId);
    return {
      machineId: flyMachine.machineId,
      gatewayToken: token,
      appName: getAppName(),
    };
  }

  return {
    machineId: flyMachine.machineId,
    gatewayToken: flyMachine.gatewayToken,
    appName: getAppName(),
  };
}

async function ensureGatewayToken(
  userId: string,
  machineId: string
): Promise<string> {
  const gatewayToken = crypto.randomUUID();

  await updateMachineEnv(machineId, {
    OPENCLAW_GATEWAY_TOKEN: gatewayToken,
  });

  await prisma.flyMachine.update({
    where: { userId },
    data: { gatewayToken },
  });

  return gatewayToken;
}

