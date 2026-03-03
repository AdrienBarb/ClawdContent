import crypto from "crypto";
import dns from "node:dns";
import https from "node:https";
import { Readable } from "node:stream";
import WebSocket from "ws";
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
      "Your bot is not set up yet. Please wait for provisioning to complete."
    );
  }

  if (flyMachine.status !== "running") {
    throw new Error(
      `Your bot is currently ${flyMachine.status}. It needs to be running to chat.`
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

/**
 * Make an RPC call to the OpenClaw gateway via WebSocket.
 * Handles connect handshake, then sends the method call, returns the payload.
 */
async function gatewayRpc(
  config: ChatConfig,
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const hostname = `${config.appName}.fly.dev`;
  const ip = await resolveHost(hostname);

  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ servername: hostname });
    const ws = new WebSocket(`wss://${ip}`, [], {
      headers: {
        Host: hostname,
        "fly-force-instance-id": config.machineId,
      },
      agent,
    });

    const TIMEOUT = 10_000;
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("Gateway RPC timed out"));
    }, TIMEOUT);

    let connected = false;
    const connectId = crypto.randomUUID();
    const rpcId = crypto.randomUUID();

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "req",
          id: connectId,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "cli",
              displayName: "postclaw-dashboard",
              version: "1.0.0",
              platform: "node",
              mode: "cli",
            },
            scopes: ["operator.read"],
            auth: { token: config.gatewayToken },
          },
        })
      );
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // Handle connect response
        if (msg.type === "res" && msg.id === connectId) {
          if (!msg.ok) {
            clearTimeout(timer);
            ws.close();
            reject(
              new Error(`Gateway connect failed: ${JSON.stringify(msg.error)}`)
            );
            return;
          }
          connected = true;
          // Send the actual RPC call
          ws.send(
            JSON.stringify({
              type: "req",
              id: rpcId,
              method,
              params,
            })
          );
          return;
        }

        // Handle RPC response
        if (msg.type === "res" && msg.id === rpcId && connected) {
          clearTimeout(timer);
          ws.close();
          if (msg.ok) {
            resolve(msg.payload);
          } else {
            reject(
              new Error(`Gateway RPC error: ${JSON.stringify(msg.error)}`)
            );
          }
          return;
        }

        // Ignore events (tick, presence, etc.)
      } catch {
        // Ignore parse errors on event frames
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    ws.on("close", () => {
      clearTimeout(timer);
    });
  });
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Fetch chat history from the OpenClaw gateway via WebSocket RPC.
 */
export async function fetchChatHistory(
  config: ChatConfig,
  sessionKey: string
): Promise<ChatMessage[]> {
  const payload = await gatewayRpc(config, "chat.history", {
    sessionKey,
  });

  // Payload is { messages: [...] }, not an array directly
  const raw = payload as { messages?: unknown[] };
  const messages = Array.isArray(raw?.messages) ? raw.messages : [];

  return (messages as Record<string, unknown>[])
    .filter(
      (m) =>
        m.role === "user" || m.role === "assistant"
    )
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        m.role === "user"
          ? stripContextPrefix(extractTextContent(m.content))
          : extractTextContent(m.content),
    }));
}

/**
 * OpenClaw bundles conversation context into each user message like:
 *   [Chat messages since your last reply - for context]
 *   User: ...
 *   Assistant: ...
 *   [Current message - respond to this]
 *   User: actual message here
 *
 * Strip everything before the last "[Current message - respond to this]"
 * and the "User: " prefix to get the real user message.
 */
function stripContextPrefix(content: string): string {
  const marker = "[Current message - respond to this]\n";
  const lastIndex = content.lastIndexOf(marker);
  if (lastIndex === -1) return content;

  let actual = content.substring(lastIndex + marker.length);
  if (actual.startsWith("User: ")) {
    actual = actual.substring(6);
  }
  return actual;
}

/**
 * Extract text from message content which can be a string or
 * an array of content parts (e.g. [{ type: "text", text: "..." }]).
 */
function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part)
          return String(part.text);
        return "";
      })
      .join("");
  }
  return "";
}
