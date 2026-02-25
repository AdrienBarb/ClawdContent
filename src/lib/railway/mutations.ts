import { railwayQuery } from "./client";

// ─── Types ──────────────────────────────────────────────────────

interface RailwayService {
  id: string;
  name: string;
  projectId: string;
}

interface RailwayDeployment {
  id: string;
  status: string;
  createdAt: string;
}

interface RailwayEnvironment {
  id: string;
  name: string;
}

interface RailwayProject {
  id: string;
  name: string;
  environments: {
    edges: Array<{ node: RailwayEnvironment }>;
  };
}

// ─── Queries ────────────────────────────────────────────────────

const GET_PROJECT = `
  query getProject($projectId: String!) {
    project(id: $projectId) {
      id
      name
      environments {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  }
`;

const GET_DEPLOYMENTS = `
  query getDeployments($serviceId: String!, $environmentId: String!, $first: Int) {
    deployments(
      input: {
        serviceId: $serviceId
        environmentId: $environmentId
      }
      first: $first
    ) {
      edges {
        node {
          id
          status
          createdAt
        }
      }
    }
  }
`;

// ─── Mutations ──────────────────────────────────────────────────

const SERVICE_CREATE = `
  mutation serviceCreate($input: ServiceCreateInput!) {
    serviceCreate(input: $input) {
      id
      name
      projectId
    }
  }
`;

const VARIABLE_COLLECTION_UPSERT = `
  mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
    variableCollectionUpsert(input: $input)
  }
`;

const SERVICE_INSTANCE_UPDATE = `
  mutation serviceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
    serviceInstanceUpdate(
      serviceId: $serviceId
      environmentId: $environmentId
      input: $input
    )
  }
`;

const ENVIRONMENT_TRIGGERS_DEPLOY = `
  mutation environmentTriggersDeploy($input: EnvironmentTriggersDeployInput!) {
    environmentTriggersDeploy(input: $input)
  }
`;

const DEPLOYMENT_CANCEL = `
  mutation deploymentCancel($id: String!) {
    deploymentCancel(id: $id)
  }
`;

const DEPLOYMENT_STOP = `
  mutation deploymentStop($id: String!) {
    deploymentStop(id: $id)
  }
`;

const DEPLOYMENT_RESTART = `
  mutation deploymentRestart($id: String!) {
    deploymentRestart(id: $id)
  }
`;

const SERVICE_DELETE = `
  mutation serviceDelete($id: String!) {
    serviceDelete(id: $id)
  }
`;

const PROJECT_CREATE = `
  mutation projectCreate($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      id
      name
      environments {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  }
`;

const VOLUME_CREATE = `
  mutation volumeCreate($input: VolumeCreateInput!) {
    volumeCreate(input: $input) {
      id
      name
    }
  }
`;

// ─── Helper Functions ───────────────────────────────────────────

function getDefaultProjectId(): string {
  const projectId = process.env.RAILWAY_DEFAULT_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing RAILWAY_DEFAULT_PROJECT_ID environment variable");
  }
  return projectId;
}

export async function getProject(
  projectId?: string
): Promise<RailwayProject> {
  const id = projectId ?? getDefaultProjectId();
  const data = await railwayQuery<{ project: RailwayProject }>(GET_PROJECT, {
    projectId: id,
  });
  return data.project;
}

export async function getProductionEnvironmentId(
  projectId?: string
): Promise<string> {
  const project = await getProject(projectId);
  const prodEnv = project.environments.edges.find(
    (e) => e.node.name === "production"
  );
  if (!prodEnv) {
    throw new Error(
      `No production environment found in project ${project.id}`
    );
  }
  return prodEnv.node.id;
}

export async function createService({
  name,
  image,
  projectId,
  environmentId,
}: {
  name: string;
  image: string;
  projectId?: string;
  environmentId?: string;
}): Promise<RailwayService> {
  const pId = projectId ?? getDefaultProjectId();
  const envId = environmentId ?? (await getProductionEnvironmentId(pId));

  const data = await railwayQuery<{ serviceCreate: RailwayService }>(
    SERVICE_CREATE,
    {
      input: {
        name,
        projectId: pId,
        source: { image },
        environmentId: envId,
      },
    }
  );

  return data.serviceCreate;
}

export async function setServiceVariables({
  serviceId,
  environmentId,
  projectId,
  variables,
}: {
  serviceId: string;
  environmentId?: string;
  projectId?: string;
  variables: Record<string, string>;
}): Promise<boolean> {
  const pId = projectId ?? getDefaultProjectId();
  const envId = environmentId ?? (await getProductionEnvironmentId(pId));

  await railwayQuery<{ variableCollectionUpsert: boolean }>(
    VARIABLE_COLLECTION_UPSERT,
    {
      input: {
        projectId: pId,
        environmentId: envId,
        serviceId,
        variables,
      },
    }
  );

  return true;
}

export async function configureServiceInstance({
  serviceId,
  environmentId,
  projectId,
  sleepApplication,
}: {
  serviceId: string;
  environmentId?: string;
  projectId?: string;
  sleepApplication?: boolean;
}): Promise<boolean> {
  const pId = projectId ?? getDefaultProjectId();
  const envId = environmentId ?? (await getProductionEnvironmentId(pId));

  await railwayQuery(SERVICE_INSTANCE_UPDATE, {
    serviceId,
    environmentId: envId,
    input: {
      ...(sleepApplication !== undefined && { sleepApplication }),
    },
  });

  return true;
}

export async function triggerDeploy({
  serviceId,
  environmentId,
  projectId,
}: {
  serviceId: string;
  environmentId?: string;
  projectId?: string;
}): Promise<boolean> {
  const pId = projectId ?? getDefaultProjectId();
  const envId = environmentId ?? (await getProductionEnvironmentId(pId));

  await railwayQuery(ENVIRONMENT_TRIGGERS_DEPLOY, {
    input: {
      projectId: pId,
      environmentId: envId,
      serviceId,
    },
  });

  return true;
}

export async function getDeployments({
  serviceId,
  environmentId,
  projectId,
  limit = 5,
}: {
  serviceId: string;
  environmentId?: string;
  projectId?: string;
  limit?: number;
}): Promise<RailwayDeployment[]> {
  const pId = projectId ?? getDefaultProjectId();
  const envId = environmentId ?? (await getProductionEnvironmentId(pId));

  const data = await railwayQuery<{
    deployments: { edges: Array<{ node: RailwayDeployment }> };
  }>(GET_DEPLOYMENTS, {
    serviceId,
    environmentId: envId,
    first: limit,
  });

  return data.deployments.edges.map((e) => e.node);
}

export async function cancelDeployment(deploymentId: string): Promise<boolean> {
  await railwayQuery(DEPLOYMENT_CANCEL, { id: deploymentId });
  return true;
}

export async function cancelActiveDeployments({
  serviceId,
  environmentId,
  projectId,
}: {
  serviceId: string;
  environmentId?: string;
  projectId?: string;
}): Promise<void> {
  const deployments = await getDeployments({
    serviceId,
    environmentId,
    projectId,
    limit: 5,
  });

  const active = deployments.filter(
    (d) =>
      d.status === "DEPLOYING" ||
      d.status === "BUILDING" ||
      d.status === "QUEUED" ||
      d.status === "INITIALIZING" ||
      d.status === "WAITING"
  );

  for (const deployment of active) {
    await cancelDeployment(deployment.id).catch((err) =>
      console.error(`Failed to cancel deployment ${deployment.id}:`, err)
    );
  }
}

export async function stopDeployment(deploymentId: string): Promise<boolean> {
  await railwayQuery(DEPLOYMENT_STOP, { id: deploymentId });
  return true;
}

export async function restartDeployment(
  deploymentId: string
): Promise<boolean> {
  await railwayQuery(DEPLOYMENT_RESTART, { id: deploymentId });
  return true;
}

export async function deleteService(serviceId: string): Promise<boolean> {
  await railwayQuery(SERVICE_DELETE, { id: serviceId });
  return true;
}

export async function createProject(
  name: string
): Promise<{ id: string; name: string; environmentId: string }> {
  const data = await railwayQuery<{ projectCreate: RailwayProject }>(
    PROJECT_CREATE,
    { input: { name } }
  );

  const project = data.projectCreate;
  const prodEnv = project.environments.edges.find(
    (e) => e.node.name === "production"
  );
  if (!prodEnv) {
    throw new Error(
      `No production environment found in newly created project ${project.id}`
    );
  }

  return {
    id: project.id,
    name: project.name,
    environmentId: prodEnv.node.id,
  };
}

export async function createVolume({
  projectId,
  serviceId,
  environmentId,
  mountPath,
}: {
  projectId: string;
  serviceId: string;
  environmentId: string;
  mountPath: string;
}): Promise<{ id: string; name: string }> {
  const data = await railwayQuery<{
    volumeCreate: { id: string; name: string };
  }>(VOLUME_CREATE, {
    input: {
      projectId,
      serviceId,
      environmentId,
      mountPath,
    },
  });

  return data.volumeCreate;
}

// ─── High-Level Orchestration ───────────────────────────────────

export async function deployOpenClawContainer({
  name,
  image,
  envVars,
  projectId,
}: {
  name: string;
  image: string;
  envVars: Record<string, string>;
  projectId?: string;
}): Promise<{
  service: RailwayService;
  environmentId: string;
}> {
  const pId = projectId ?? getDefaultProjectId();
  const environmentId = await getProductionEnvironmentId(pId);

  // 1. Create the service with the Docker image
  const service = await createService({
    name,
    image,
    projectId: pId,
    environmentId,
  });

  // 2. Enable sleep mode BEFORE setting env vars — configuring an empty
  //    service does NOT trigger a deploy, so this avoids two back-to-back
  //    deploys that can leave the second one stuck in INITIALIZING.
  await configureServiceInstance({
    serviceId: service.id,
    environmentId,
    projectId: pId,
    sleepApplication: true,
  });

  // 3. Set env vars (this auto-triggers a single deploy)
  await setServiceVariables({
    serviceId: service.id,
    environmentId,
    projectId: pId,
    variables: envVars,
  });

  return { service, environmentId };
}
