import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { AdminPanelRoute } from "@/features/admin/admin-panel-route";
import { loadAdminPanelShell } from "@/features/admin/api";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/features/admin/api", () => ({
  loadAdminPanelShell: jest.fn(),
  ADMIN_PANEL_ERROR_MESSAGE:
    "Unable to load the admin control panel right now.",
}));

jest.mock("@/features/admin/admin-panel-screen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return {
    AdminPanelScreen: ({
      contentState,
      onRetry,
      onReturnHome,
      sectionFocus,
      viewModel,
    }: {
      contentState?: { kind: string; message?: string };
      onRetry?: () => void;
      onReturnHome?: () => void;
      sectionFocus?: string;
      viewModel?: {
        workspaceName?: string | null;
        teamNames?: string[];
      } | null;
    }) => (
      <View>
        <Text>{`content:${contentState?.kind ?? "unknown"}`}</Text>
        <Text>{`focus:${sectionFocus ?? "overview"}`}</Text>
        <Text>{`workspace:${viewModel?.workspaceName ?? "none"}`}</Text>
        <Text>{`teams:${viewModel?.teamNames?.length ?? 0}`}</Text>
        <Text>{`error:${contentState?.message ?? "none"}`}</Text>
        <Pressable onPress={onReturnHome} testID="admin-route-return-home">
          <Text>return-home</Text>
        </Pressable>
        <Pressable onPress={onRetry} testID="admin-route-retry">
          <Text>retry</Text>
        </Pressable>
      </View>
    ),
  };
});

const { useLocalSearchParams, useRouter } = jest.requireMock("expo-router") as {
  useLocalSearchParams: jest.Mock;
  useRouter: jest.Mock;
};

describe("AdminPanelRoute", () => {
  let replace: jest.Mock;
  let currentParams: Record<string, string>;

  beforeEach(() => {
    replace = jest.fn();
    currentParams = {};
    useRouter.mockReturnValue({ replace });
    useLocalSearchParams.mockImplementation(() => currentParams);
    jest.mocked(loadAdminPanelShell).mockResolvedValue({
      workspaceId: "ws_admin",
      workspaceName: "MoodMarble HQ",
      joinCode: "ABC123",
      teamNames: ["Product", "Engineering"],
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
      admin_teams: "tm_product:Product|tm_design:Design",
      join_code: "abc123",
      workspace_id: "ws_admin",
      workspace_name: "MoodMarble HQ",
    };

    const view = await render(<AdminPanelRoute sectionFocus="team" />);

    await waitFor(() =>
      expect(loadAdminPanelShell).toHaveBeenCalledWith({
        adminJwt: "admin-jwt-token",
        workspaceId: "ws_admin",
        workspaceName: "MoodMarble HQ",
        joinCode: "abc123",
        teamNames: ["Product", "Design"],
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
        teamNames: [],
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
});
