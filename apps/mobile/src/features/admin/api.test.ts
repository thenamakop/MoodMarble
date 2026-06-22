import {
  createAdminWorkspace,
  exportAdminCsv,
  loadAdminPanelShell,
} from "@/features/admin/api";

describe("admin api", () => {
  const originalFetch = globalThis.fetch;
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    globalThis.fetch = jest.fn() as typeof fetch;
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.moodmarble.test";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (originalApiBaseUrl) {
      process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    }
  });

  it("creates a workspace using the bootstrap header", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        workspace: {
          id: "ws_admin",
          name: "MoodMarble HQ",
          join_code: "ABC123",
        },
        admin_jwt: "admin-jwt-token",
      }),
    });

    await expect(
      createAdminWorkspace({
        bootstrapSecret: "bootstrap-secret",
        name: "MoodMarble HQ",
      }),
    ).resolves.toEqual({
      workspace: {
        id: "ws_admin",
        name: "MoodMarble HQ",
        join_code: "ABC123",
      },
      admin_jwt: "admin-jwt-token",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.moodmarble.test/admin/workspace",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-bootstrap-secret": "bootstrap-secret",
        },
      }),
    );
  });

  it("loads the admin shell from the team-list and join-code endpoints", async () => {
    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          teams: [
            {
              id: "tm_product",
              workspace_id: "ws_admin",
              name: "Product",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          workspace: {
            id: "ws_admin",
            join_code: "ABC123",
          },
        }),
      });

    await expect(
      loadAdminPanelShell({
        adminJwt: "admin-jwt-token",
        workspaceId: "ws_admin",
        workspaceName: "MoodMarble HQ",
      }),
    ).resolves.toEqual({
      workspaceId: "ws_admin",
      workspaceName: "MoodMarble HQ",
      joinCode: "ABC123",
      teams: [
        {
          id: "tm_product",
          workspace_id: "ws_admin",
          name: "Product",
        },
      ],
    });

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.moodmarble.test/admin/workspace/ws_admin/teams",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer admin-jwt-token",
        },
      }),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      "https://api.moodmarble.test/admin/workspace/ws_admin/join-code",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer admin-jwt-token",
        },
      }),
    );
  });

  it("exports CSV with the admin jwt and returns the file name", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest
          .fn()
          .mockReturnValue(
            'attachment; filename="moodmarble-ws_admin-2026-06-01-to-2026-06-30.csv"',
          ),
      },
      text: jest.fn().mockResolvedValue("team_id,team_name\n"),
    });

    await expect(
      exportAdminCsv({
        adminJwt: "admin-jwt-token",
        workspaceId: "ws_admin",
        startDate: "2026-06-01",
        endDate: "2026-06-30",
      }),
    ).resolves.toEqual({
      csv: "team_id,team_name\n",
      fileName: "moodmarble-ws_admin-2026-06-01-to-2026-06-30.csv",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.moodmarble.test/admin/workspace/ws_admin/export?start_date=2026-06-01&end_date=2026-06-30",
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer admin-jwt-token",
        },
      }),
    );
  });

  it("keeps export errors stable when the backend response is unsafe", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        message:
          "Export rejected for device 550e8400-e29b-41d4-a716-446655440000.",
      }),
    });

    await expect(
      exportAdminCsv({
        adminJwt: "admin-jwt-token",
        workspaceId: "ws_admin",
        startDate: "2026-06-01",
        endDate: "2026-06-30",
      }),
    ).rejects.toThrow("Unable to export CSV right now.");
  });
});
