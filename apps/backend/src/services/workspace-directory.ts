import { eq } from "drizzle-orm";

import type {
  TeamId,
  TeamSummary,
  WorkspaceId,
} from "../../../../packages/shared";
import type { DatabaseClient } from "../db/client";
import { teams, workspaces } from "../db/schema";

export interface WorkspaceDirectoryEntry {
  id: WorkspaceId;
  name: string;
  joinCode: string;
  teams: TeamSummary[];
}

export interface WorkspaceDirectory {
  findByJoinCode(joinCode: string): Promise<WorkspaceDirectoryEntry | null>;
  hasTeamInWorkspace(workspaceId: string, teamId: string): Promise<boolean>;
}

export const LOCAL_WORKSPACE_SEED: WorkspaceDirectoryEntry[] = [
  {
    id: "ws_localdemo",
    name: "MoodMarble Local Workspace",
    joinCode: "ABC123",
    teams: [
      {
        id: "tm_product",
        name: "Product",
      },
      {
        id: "tm_engineering",
        name: "Engineering",
      },
    ],
  },
];

export class InMemoryWorkspaceDirectory implements WorkspaceDirectory {
  private readonly workspaces: WorkspaceDirectoryEntry[];

  constructor(workspaces: WorkspaceDirectoryEntry[] = LOCAL_WORKSPACE_SEED) {
    this.workspaces = workspaces.map(cloneWorkspaceDirectoryEntry);
  }

  async findByJoinCode(
    joinCode: string,
  ): Promise<WorkspaceDirectoryEntry | null> {
    return (
      this.workspaces.find((workspace) => workspace.joinCode === joinCode) ??
      null
    );
  }

  async hasTeamInWorkspace(
    workspaceId: string,
    teamId: string,
  ): Promise<boolean> {
    const workspace = this.workspaces.find(
      (currentWorkspace) => currentWorkspace.id === workspaceId,
    );

    if (!workspace) {
      return false;
    }

    return workspace.teams.some(
      (team): team is TeamSummary & { id: TeamId } => team.id === teamId,
    );
  }

  async findById(workspaceId: string): Promise<WorkspaceDirectoryEntry | null> {
    return (
      this.workspaces.find(
        (currentWorkspace) => currentWorkspace.id === workspaceId,
      ) ?? null
    );
  }

  async addWorkspace(
    workspace: WorkspaceDirectoryEntry,
  ): Promise<WorkspaceDirectoryEntry> {
    const storedWorkspace = cloneWorkspaceDirectoryEntry(workspace);
    this.workspaces.push(storedWorkspace);
    return cloneWorkspaceDirectoryEntry(storedWorkspace);
  }

  async updateJoinCode(
    workspaceId: string,
    joinCode: string,
  ): Promise<WorkspaceDirectoryEntry | null> {
    const workspace = this.workspaces.find(
      (currentWorkspace) => currentWorkspace.id === workspaceId,
    );

    if (!workspace) {
      return null;
    }

    workspace.joinCode = joinCode;
    return cloneWorkspaceDirectoryEntry(workspace);
  }

  async listTeams(workspaceId: string): Promise<TeamSummary[] | null> {
    const workspace = this.workspaces.find(
      (currentWorkspace) => currentWorkspace.id === workspaceId,
    );

    if (!workspace) {
      return null;
    }

    return workspace.teams.map((team) => ({
      id: team.id,
      name: team.name,
    }));
  }

  async addTeam(
    workspaceId: string,
    team: TeamSummary & { id: TeamId },
  ): Promise<TeamSummary | null> {
    const workspace = this.workspaces.find(
      (currentWorkspace) => currentWorkspace.id === workspaceId,
    );

    if (!workspace) {
      return null;
    }

    workspace.teams.push({
      id: team.id,
      name: team.name,
    });

    return {
      id: team.id,
      name: team.name,
    };
  }

  async updateTeam(
    workspaceId: string,
    teamId: string,
    name: string,
  ): Promise<TeamSummary | null> {
    const workspace = this.workspaces.find(
      (currentWorkspace) => currentWorkspace.id === workspaceId,
    );

    if (!workspace) {
      return null;
    }

    const team = workspace.teams.find(
      (currentTeam) => currentTeam.id === teamId,
    );

    if (!team) {
      return null;
    }

    team.name = name;
    return {
      id: team.id,
      name: team.name,
    };
  }
}

export class PostgresWorkspaceDirectory implements WorkspaceDirectory {
  constructor(private readonly databaseClient: DatabaseClient) {}

  async findByJoinCode(
    joinCode: string,
  ): Promise<WorkspaceDirectoryEntry | null> {
    const workspaceRecord =
      await this.databaseClient.db.query.workspaces.findFirst({
        where: eq(workspaces.joinCode, joinCode),
      });

    if (!workspaceRecord) {
      return null;
    }

    const teamRecords = await this.databaseClient.db.query.teams.findMany({
      where: eq(teams.workspaceId, workspaceRecord.id),
      orderBy: (teamTable, { asc }) => [asc(teamTable.name)],
    });

    return {
      id: workspaceRecord.id as WorkspaceId,
      name: workspaceRecord.name,
      joinCode: workspaceRecord.joinCode,
      teams: teamRecords.map(
        (teamRecord): TeamSummary => ({
          id: teamRecord.id,
          name: teamRecord.name,
        }),
      ),
    };
  }

  async hasTeamInWorkspace(
    workspaceId: string,
    teamId: string,
  ): Promise<boolean> {
    const teamRecord = await this.databaseClient.db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    return teamRecord?.workspaceId === workspaceId;
  }
}

function cloneWorkspaceDirectoryEntry(
  workspace: WorkspaceDirectoryEntry,
): WorkspaceDirectoryEntry {
  return {
    id: workspace.id,
    name: workspace.name,
    joinCode: workspace.joinCode,
    teams: workspace.teams.map((team) => ({
      id: team.id,
      name: team.name,
    })),
  };
}
