import type { TeamSummary, WorkspaceId } from "../../../../packages/shared";

export interface WorkspaceDirectoryEntry {
  id: WorkspaceId;
  name: string;
  joinCode: string;
  teams: TeamSummary[];
}

export interface WorkspaceDirectory {
  findByJoinCode(joinCode: string): Promise<WorkspaceDirectoryEntry | null>;
}

const LOCAL_WORKSPACE_SEED: WorkspaceDirectoryEntry[] = [
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
