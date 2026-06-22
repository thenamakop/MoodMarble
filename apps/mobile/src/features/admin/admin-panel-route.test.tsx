import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { AdminPanelRoute } from "@/features/admin/admin-panel-route";
import {
  createAdminTeam,
  createAdminWorkspace,
  exportAdminCsv,
  fetchAdminJoinCode,
  loadAdminPanelShell,
  rotateAdminJoinCode,
  updateAdminTeam,
} from "@/features/admin/api";
import { shareAdminCsv } from "@/features/admin/share";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
}));

jest.mock("@/features/admin/api", () => ({
  createAdminTeam: jest.fn(),
  createAdminWorkspace: jest.fn(),
  exportAdminCsv: jest.fn(),
  fetchAdminJoinCode: jest.fn(),
  loadAdminPanelShell: jest.fn(),
  rotateAdminJoinCode: jest.fn(),
  updateAdminTeam: jest.fn(),
  ADMIN_PANEL_ERROR_MESSAGE:
    "Unable to load the admin control panel right now.",
}));

jest.mock("@/features/admin/share", () => ({
  shareAdminCsv: jest.fn(),
}));

jest.mock("@/features/admin/admin-panel-screen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return {
    AdminPanelScreen: ({
      contentState,
      feedbackState,
      isActionPending,
      onCopyJoinCode,
      onCreateTeam,
      onCreateWorkspace,
      onExport,
      onRetry,
      onReturnHome,
      onRotateJoinCode,
      onUpdateTeam,
      sectionFocus,
      viewModel,
    }: {
      contentState?: { kind: string; message?: string };
      feedbackState?: { kind: string; message: string } | null;
      isActionPending?: boolean;
      onCopyJoinCode?: (joinCode: string) => void | Promise<void>;
      onCreateTeam?: (name: string) => void | Promise<void>;
      onCreateWorkspace?: (input: {
        bootstrapSecret: string;
        name: string;
      }) => void | Promise<void>;
      onExport?: (input: {
        endDate: string;
        startDate: string;
      }) => void | Promise<void>;
      onRetry?: () => void;
      onReturnHome?: () => void;
      onRotateJoinCode?: () => void | Promise<void>;
      onUpdateTeam?: (input: {
        name: string;
        teamId: string;
      }) => void | Promise<void>;
      sectionFocus?: string;
      viewModel?: {
        joinCode?: string | null;
        teams?: Array<{ id: string; name: string }>;
        workspaceName?: string | null;
      } | null;
    }) => (
      <View>
        <Text>{`content:${contentState?.kind ?? "unknown"}`}</Text>
        <Text>{`pending:${isActionPending ? "yes" : "no"}`}</Text>
        <Text>{`focus:${sectionFocus ?? "overview"}`}</Text>
        <Text>{`workspace:${viewModel?.workspaceName ?? "none"}`}</Text>
        <Text>{`teams:${viewModel?.teams?.length ?? 0}`}</Text>
        <Text>{`join-code:${viewModel?.joinCode ?? "none"}`}</Text>
        <Text>{`error:${contentState?.message ?? "none"}`}</Text>
        <Text>{`feedback:${feedbackState?.kind ?? "none"}:${feedbackState?.message ?? "none"}`}</Text>
        <Pressable onPress={onReturnHome} testID="admin-route-return-home">
          <Text>return-home</Text>
        </Pressable>
        <Pressable onPress={onRetry} testID="admin-route-retry">
          <Text>retry</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onCreateWorkspace?.({
              name: "MoodMarble HQ",
              bootstrapSecret: "bootstrap-secret",
            })
          }
          testID="admin-route-create-workspace"
        >
          <Text>create-workspace</Text>
        </Pressable>
        <Pressable
          onPress={() => onCreateTeam?.("Product")}
          testID="admin-route-create-team"
        >
          <Text>create-team</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onUpdateTeam?.({
              teamId: "tm_product",
              name: "Engineering",
            })
          }
          testID="admin-route-update-team"
        >
          <Text>update-team</Text>
        </Pressable>
        <Pressable
          onPress={() => onCopyJoinCode?.("ABC123")}
          testID="admin-route-copy-join-code"
        >
          <Text>copy-join-code</Text>
        </Pressable>
        <Pressable
          onPress={onRotateJoinCode}
          testID="admin-route-rotate-join-code"
        >
          <Text>rotate-join-code</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onExport?.({
              startDate: "2026-06-01",
              endDate: "2026-06-30",
            })
          }
          testID="admin-route-export"
        >
          <Text>export</Text>
        </Pressable>
      </View>
    ),
  };
});

const { useLocalSearchParams, useRouter } = jest.requireMock("expo-router") as {
  useLocalSearchParams: jest.Mock;
  useRouter: jest.Mock;
};
const Clipboard = jest.requireMock("expo-clipboard") as {
  setStringAsync: jest.Mock;
};

describe("AdminPanelRoute", () => {
  let replace: jest.Mock;
  let currentParams: Record<string, string>;

  beforeEach(() => {
    replace = jest.fn();
    currentParams = {};
    useRouter.mockReturnValue({ replace });
    useLocalSearchParams.mockImplementation(() => currentParams);
    Clipboard.setStringAsync.mockResolvedValue(undefined);
    jest.mocked(shareAdminCsv).mockResolvedValue(undefined);
    jest.mocked(createAdminWorkspace).mockResolvedValue({
      admin_jwt: "admin-jwt-token",
      workspace: {
        id: "ws_admin",
        name: "MoodMarble HQ",
        join_code: "ABC123",
      },
    });
    jest.mocked(createAdminTeam).mockResolvedValue({
      id: "tm_product",
      workspace_id: "ws_admin",
      name: "Product",
    });
    jest.mocked(updateAdminTeam).mockResolvedValue({
      id: "tm_product",
      workspace_id: "ws_admin",
      name: "Engineering",
    });
    jest.mocked(rotateAdminJoinCode).mockResolvedValue("Q7M4K2");
    jest.mocked(fetchAdminJoinCode).mockResolvedValue("ABC123");
    jest.mocked(exportAdminCsv).mockResolvedValue({
      csv: "team_id,team_name\n",
      fileName: "moodmarble-export.csv",
    });
    jest.mocked(loadAdminPanelShell).mockResolvedValue({
      workspaceId: "ws_admin",
      workspaceName: "MoodMarble HQ",
      joinCode: "ABC123",
      teams: [
        {
          id: "tm_product",
          workspace_id: "ws_admin",
          name: "Product",
        },
        {
          id: "tm_engineering",
          workspace_id: "ws_admin",
          name: "Engineering",
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("guards the admin route when admin access is missing and returns to the app", async () => {
    const view = await render(<AdminPanelRoute />);

    expect(view.getByText("content:guarded")).toBeTruthy();
    expect(loadAdminPanelShell).not.toHaveBeenCalled();

    fireEvent.press(view.getByTestId("admin-route-return-home"));

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("loads the ready shell with workspace and team placeholders", async () => {
    currentParams = {
      admin_jwt: "admin-jwt-token",
      workspace_id: "ws_admin",
      workspace_name: "MoodMarble HQ",
    };

    const view = await render(<AdminPanelRoute sectionFocus="team" />);

    await waitFor(() =>
      expect(loadAdminPanelShell).toHaveBeenCalledWith({
        adminJwt: "admin-jwt-token",
        workspaceId: "ws_admin",
        workspaceName: "MoodMarble HQ",
      }),
    );

    await waitFor(() => expect(view.getByText("content:ready")).toBeTruthy());
    expect(view.getByText("focus:team")).toBeTruthy();
    expect(view.getByText("workspace:MoodMarble HQ")).toBeTruthy();
    expect(view.getByText("teams:2")).toBeTruthy();
  });

  it("shows the loading state while the shell request is pending", async () => {
    currentParams = {
      admin_jwt: "admin-jwt-token",
      workspace_id: "ws_admin",
    };
    jest
      .mocked(loadAdminPanelShell)
      .mockImplementation(() => new Promise(() => {}));

    const view = await render(<AdminPanelRoute />);

    await waitFor(() => expect(view.getByText("content:loading")).toBeTruthy());
  });

  it("shows the empty state when the shell has no workspace details yet", async () => {
    currentParams = {
      admin_jwt: "admin-jwt-token",
      workspace_id: "ws_admin",
    };
    jest.mocked(loadAdminPanelShell).mockResolvedValue(null);

    const view = await render(<AdminPanelRoute />);

    await waitFor(() => expect(view.getByText("content:empty")).toBeTruthy());
  });

  it("shows the error state and retries the shell load", async () => {
    currentParams = {
      admin_jwt: "admin-jwt-token",
      workspace_id: "ws_admin",
    };
    jest
      .mocked(loadAdminPanelShell)
      .mockRejectedValueOnce(
        new Error("Unable to load the admin control panel right now."),
      )
      .mockResolvedValueOnce({
        workspaceId: "ws_admin",
        workspaceName: "MoodMarble HQ",
        joinCode: "ABC123",
        teams: [],
      });

    const view = await render(<AdminPanelRoute />);

    await waitFor(() => expect(view.getByText("content:error")).toBeTruthy());
    expect(
      view.getByText("error:Unable to load the admin control panel right now."),
    ).toBeTruthy();

    fireEvent.press(view.getByTestId("admin-route-retry"));

    await waitFor(() => expect(loadAdminPanelShell).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view.getByText("content:ready")).toBeTruthy());
  });

  it("runs the successful admin action flow for workspace, team, copy, rotate, and export", async () => {
    const view = await render(<AdminPanelRoute />);

    expect(view.getByText("content:guarded")).toBeTruthy();

    fireEvent.press(view.getByTestId("admin-route-create-workspace"));

    await waitFor(() =>
      expect(createAdminWorkspace).toHaveBeenCalledWith({
        name: "MoodMarble HQ",
        bootstrapSecret: "bootstrap-secret",
      }),
    );
    await waitFor(() => expect(view.getByText("content:ready")).toBeTruthy());
    expect(view.getByText("workspace:MoodMarble HQ")).toBeTruthy();
    expect(view.getByText("join-code:ABC123")).toBeTruthy();

    fireEvent.press(view.getByTestId("admin-route-create-team"));

    await waitFor(() =>
      expect(createAdminTeam).toHaveBeenCalledWith({
        adminJwt: "admin-jwt-token",
        workspaceId: "ws_admin",
        name: "Product",
      }),
    );
    await waitFor(() => expect(view.getByText("teams:3")).toBeTruthy());
    expect(
      view.getByText("feedback:success:Product has been added."),
    ).toBeTruthy();

    fireEvent.press(view.getByTestId("admin-route-update-team"));

    await waitFor(() =>
      expect(updateAdminTeam).toHaveBeenCalledWith({
        adminJwt: "admin-jwt-token",
        workspaceId: "ws_admin",
        teamId: "tm_product",
        name: "Engineering",
      }),
    );
    expect(
      view.getByText("feedback:success:Engineering has been updated."),
    ).toBeTruthy();

    fireEvent.press(view.getByTestId("admin-route-copy-join-code"));

    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith("ABC123"),
    );
    expect(
      view.getByText("feedback:success:Join code ABC123 copied."),
    ).toBeTruthy();

    fireEvent.press(view.getByTestId("admin-route-rotate-join-code"));

    await waitFor(() =>
      expect(rotateAdminJoinCode).toHaveBeenCalledWith({
        adminJwt: "admin-jwt-token",
        workspaceId: "ws_admin",
      }),
    );
    await waitFor(() =>
      expect(view.getByText("join-code:Q7M4K2")).toBeTruthy(),
    );

    fireEvent.press(view.getByTestId("admin-route-export"));

    await waitFor(() =>
      expect(exportAdminCsv).toHaveBeenCalledWith({
        adminJwt: "admin-jwt-token",
        workspaceId: "ws_admin",
        startDate: "2026-06-01",
        endDate: "2026-06-30",
      }),
    );
    await waitFor(() =>
      expect(shareAdminCsv).toHaveBeenCalledWith({
        fileName: "moodmarble-export.csv",
        csv: "team_id,team_name\n",
      }),
    );
    expect(
      view.getByText(
        "feedback:success:moodmarble-export.csv is ready to share.",
      ),
    ).toBeTruthy();
  });

  it("shows failed admin actions without regressing the route state", async () => {
    jest
      .mocked(createAdminWorkspace)
      .mockRejectedValueOnce(new Error("Unauthorized"));

    const view = await render(<AdminPanelRoute />);

    fireEvent.press(view.getByTestId("admin-route-create-workspace"));

    await waitFor(() =>
      expect(view.getByText("feedback:error:Unauthorized")).toBeTruthy(),
    );
    expect(view.getByText("content:guarded")).toBeTruthy();
  });
});
