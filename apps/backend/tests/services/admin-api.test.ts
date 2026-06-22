import { describe, expect, it } from "vitest";

import { verifyAdminJwt } from "../../src/auth/admin-jwt";
import { InMemoryAdminApiService } from "../../src/services/admin-api";
import { InMemoryWorkspaceDirectory } from "../../src/services/workspace-directory";

const JWT_SECRET = "test-jwt-secret";

describe("InMemoryAdminApiService", () => {
  it("creates a workspace with a unique valid join code and admin jwt", async () => {
    const workspaceDirectory = new InMemoryWorkspaceDirectory();
    const joinCodeCandidates = ["ABC123", "Q7M4K2"];
    const adminApiService = new InMemoryAdminApiService({
      jwtSecret: JWT_SECRET,
      workspaceDirectory,
      workspaceIdFactory: () => "ws_admin",
      joinCodeFactory: () => {
        const candidate = joinCodeCandidates.shift();

        if (!candidate) {
          throw new Error("No join code candidate left for the test.");
        }

        return candidate;
      },
    });

    const response = await adminApiService.createWorkspace({
      name: "MoodMarble HQ",
    });

    expect(response.workspace).toEqual({
      id: "ws_admin",
      name: "MoodMarble HQ",
      join_code: "Q7M4K2",
    });
    expect(verifyAdminJwt(`Bearer ${response.admin_jwt}`, JWT_SECRET)).toEqual({
      workspace_id: "ws_admin",
      role: "admin",
    });

    await expect(workspaceDirectory.findByJoinCode("Q7M4K2")).resolves.toEqual({
      id: "ws_admin",
      name: "MoodMarble HQ",
      joinCode: "Q7M4K2",
      teams: [],
    });
  });

  it("surfaces and rotates the active join code for an existing workspace", async () => {
    const workspaceDirectory = new InMemoryWorkspaceDirectory();
    const joinCodeCandidates = ["N3W456"];
    const adminApiService = new InMemoryAdminApiService({
      jwtSecret: JWT_SECRET,
      workspaceDirectory,
      joinCodeFactory: () => {
        const candidate = joinCodeCandidates.shift();

        if (!candidate) {
          throw new Error("No join code candidate left for the test.");
        }

        return candidate;
      },
    });

    await expect(adminApiService.getJoinCode("ws_localdemo")).resolves.toEqual({
      workspace: {
        id: "ws_localdemo",
        join_code: "ABC123",
      },
    });

    await expect(
      adminApiService.rotateJoinCode("ws_localdemo"),
    ).resolves.toEqual({
      workspace: {
        id: "ws_localdemo",
        join_code: "N3W456",
      },
    });

    await expect(
      workspaceDirectory.findByJoinCode("ABC123"),
    ).resolves.toBeNull();
    await expect(workspaceDirectory.findByJoinCode("N3W456")).resolves.toEqual({
      id: "ws_localdemo",
      name: "MoodMarble Local Workspace",
      joinCode: "N3W456",
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
    });
  });
});
