import { flyRequest, getAppName } from "./client";

// ─── Types ──────────────────────────────────────────────────────

interface FlyVolume {
  id: string;
  name: string;
  region: string;
  size_gb: number;
  state: string;
}

interface FlyMachineConfig {
  image: string;
  env?: Record<string, string>;
  guest?: {
    cpu_kind: string;
    cpus: number;
    memory_mb: number;
  };
  mounts?: Array<{
    volume: string;
    path: string;
  }>;
  services?: Array<{
    ports: Array<{ port: number; handlers: string[] }>;
    internal_port: number;
    protocol: string;
  }>;
  restart?: {
    policy: string;
  };
  metadata?: Record<string, string>;
  [key: string]: unknown;
}

export interface FlyMachineResponse {
  id: string;
  name: string;
  state: string;
  region: string;
  config: FlyMachineConfig;
}

// ─── Constants ──────────────────────────────────────────────────

const DEFAULT_REGION = "cdg";
const VOLUME_MOUNT_PATH = "/home/node/.openclaw/";
const HTTP_SERVICES = [
  {
    ports: [
      { port: 443, handlers: ["tls", "http"] },
      { port: 80, handlers: ["http"] },
    ],
    internal_port: 18789,
    protocol: "tcp",
    autostop: "stop",
    autostart: true,
    concurrency: {
      type: "requests",
      soft_limit: 10,
      hard_limit: 25,
    },
  },
];

// ─── Volume Operations ─────────────────────────────────────────

export async function createVolume(
  name: string,
  region: string = DEFAULT_REGION
): Promise<FlyVolume> {
  const app = getAppName();
  return flyRequest<FlyVolume>(`/apps/${app}/volumes`, {
    method: "POST",
    body: { name, region, size_gb: 1 },
  });
}

export async function deleteVolume(volumeId: string): Promise<void> {
  const app = getAppName();
  await flyRequest(`/apps/${app}/volumes/${volumeId}`, {
    method: "DELETE",
  });
}

// ─── Machine Operations ────────────────────────────────────────

export async function createMachine({
  name,
  image,
  env,
  volumeId,
  region = DEFAULT_REGION,
  autoStop = true,
}: {
  name: string;
  image: string;
  env: Record<string, string>;
  volumeId: string;
  region?: string;
  autoStop?: boolean;
}): Promise<FlyMachineResponse> {
  const app = getAppName();
  return flyRequest<FlyMachineResponse>(`/apps/${app}/machines`, {
    method: "POST",
    body: {
      name,
      region,
      config: {
        image,
        env,
        guest: {
          cpu_kind: "shared",
          cpus: 2,
          memory_mb: 2048,
        },
        restart: { policy: "on-failure" },
        mounts: [{ volume: volumeId, path: VOLUME_MOUNT_PATH }],
        services: [{ ...HTTP_SERVICES[0], autostop: autoStop ? "stop" : "off" }],
        metadata: { managed_by: "postclaw" },
      },
    },
  });
}

export async function getMachine(
  machineId: string
): Promise<FlyMachineResponse> {
  const app = getAppName();
  return flyRequest<FlyMachineResponse>(
    `/apps/${app}/machines/${machineId}`
  );
}

export async function updateMachineEnv(
  machineId: string,
  env: Record<string, string>
): Promise<FlyMachineResponse> {
  const app = getAppName();

  // Fetch current config, merge env vars, POST back
  const current = await getMachine(machineId);

  return flyRequest<FlyMachineResponse>(
    `/apps/${app}/machines/${machineId}`,
    {
      method: "POST",
      body: {
        config: {
          ...current.config,
          env: { ...current.config.env, ...env },
          services: current.config.services ?? HTTP_SERVICES,
        },
      },
    }
  );
}

export async function updateMachineImage(
  machineId: string,
  image: string
): Promise<FlyMachineResponse> {
  const app = getAppName();

  const current = await getMachine(machineId);

  return flyRequest<FlyMachineResponse>(
    `/apps/${app}/machines/${machineId}`,
    {
      method: "POST",
      body: {
        config: {
          ...current.config,
          image,
          env: { ...current.config.env, OVERWRITE_SOUL: "true" },
          services: current.config.services ?? HTTP_SERVICES,
        },
      },
    }
  );
}

export async function stopMachine(machineId: string): Promise<void> {
  const app = getAppName();
  await flyRequest(`/apps/${app}/machines/${machineId}/stop`, {
    method: "POST",
  });
}

export async function startMachine(machineId: string): Promise<void> {
  const app = getAppName();
  await flyRequest(`/apps/${app}/machines/${machineId}/start`, {
    method: "POST",
  });
}

export async function deleteMachine(machineId: string): Promise<void> {
  const app = getAppName();
  await flyRequest(`/apps/${app}/machines/${machineId}?force=true`, {
    method: "DELETE",
  });
}

// ─── Status Mapping ─────────────────────────────────────────────

export function mapFlyState(flyState: string): string {
  switch (flyState) {
    case "started":
      return "running";
    case "starting":
    case "created":
    case "replacing":
      return "deploying";
    case "stopped":
    case "stopping":
    case "suspended":
      return "sleeping";
    case "destroyed":
      return "failed";
    default:
      return "running";
  }
}
