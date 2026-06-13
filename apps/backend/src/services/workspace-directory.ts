import { eq } from "drizzle-orm";

import type { TeamSummary, WorkspaceId } from "../../../../packages/shared";
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
  constructor(
    private readonly workspaces: WorkspaceDirectoryEntry[] = LOCAL_WORKSPACE_SEED,
  ) {}

  async findByJoinCode(
    joinCode: string,
  ): Promise<WorkspaceDirectoryEntry | null> {
    return (
      this.workspaces.find((workspace) => workspace.joinCode === joinCode) ??
      null
    );
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
}
