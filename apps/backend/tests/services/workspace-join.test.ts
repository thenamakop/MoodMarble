import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { WorkspaceJoinResponseSchema } from "../../../../packages/shared";
import {
  MissingJwtSecretError,
  WorkspaceJoinNotFoundError,
  WorkspaceJoinService,
} from "../../src/services/workspace-join";
import { InMemoryWorkspaceDirectory } from "../../src/services/workspace-directory";

const JWT_SECRET = "test-jwt-secret";

describe("WorkspaceJoinService", () => {
  it("returns the shared join response and signs a device jwt", async () => {
    const service = new WorkspaceJoinService({
      jwtSecret: JWT_SECRET,
      workspaceDirectory: new InMemoryWorkspaceDirectory(),
    });

    const response = await service.joinWorkspace({
      join_code: "abc123",
    });

    expect(() => WorkspaceJoinResponseSchema.parse(response)).not.toThrow();
    expect(response.workspace).toEqual({
      id: "ws_localdemo",
      name: "MoodMarble Local Workspace",
    });
    expect(response.teams).toEqual([
      { id: "tm_product", name: "Product" },
      { id: "tm_engineering", name: "Engineering" },
    ]);

    const decoded = jwt.verify(response.device_jwt, JWT_SECRET) as {
      device_token: string;
      workspace_id: string;
    };

    expect(decoded.workspace_id).toBe("ws_localdemo");
    expect(decoded.device_token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u,
    );
  });

  it("rejects a missing join code payload", async () => {
    const service = new WorkspaceJoinService({
      jwtSecret: JWT_SECRET,
      workspaceDirectory: new InMemoryWorkspaceDirectory(),
    });

    await expect(service.joinWorkspace({})).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects an unknown join code without leaking workspace data", async () => {
    const service = new WorkspaceJoinService({
      jwtSecret: JWT_SECRET,
      workspaceDirectory: new InMemoryWorkspaceDirectory(),
    });

    await expect(
      service.joinWorkspace({
        join_code: "ZZZ999",
      }),
    ).rejects.toEqual(new WorkspaceJoinNotFoundError());
  });

  it("fails cleanly when the jwt secret is missing", async () => {
    const service = new WorkspaceJoinService({
      jwtSecret: undefined,
      workspaceDirectory: new InMemoryWorkspaceDirectory(),
    });

    await expect(
      service.joinWorkspace({
        join_code: "ABC123",
      }),
    ).rejects.toBeInstanceOf(MissingJwtSecretError);
  });
});
