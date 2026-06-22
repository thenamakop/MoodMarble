import { fireEvent, render } from "@testing-library/react-native";

import { AdminPanelScreen } from "@/features/admin/admin-panel-screen";

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    background: "#ffffff",
    backgroundElement: "#f3f4f6",
    backgroundSelected: "#d1d5db",
    text: "#111111",
    textSecondary: "#6b7280",
  }),
}));

describe("AdminPanelScreen", () => {
  it("renders the admin shell with overview, workspace, team, join-code, and export sections", async () => {
    const view = await render(
      <AdminPanelScreen
        contentState={{ kind: "ready" }}
        viewModel={{
          workspaceId: "ws_admin",
          workspaceName: "MoodMarble HQ",
          joinCode: "ABC123",
          teamNames: ["Product", "Engineering"],
        }}
      />,
    );

    expect(view.getByTestId("admin-panel-screen")).toBeTruthy();
    expect(view.getByText("Admin control panel")).toBeTruthy();
    expect(view.getByTestId("admin-panel-nav-overview")).toBeTruthy();
    expect(view.getByTestId("admin-panel-workspace-section")).toBeTruthy();
    expect(view.getByTestId("admin-panel-team-section")).toBeTruthy();
    expect(view.getByTestId("admin-panel-join-code-section")).toBeTruthy();
    expect(view.getByTestId("admin-panel-export-section")).toBeTruthy();
    expect(view.getByTestId("admin-panel-ready-state")).toBeTruthy();
  });

  it("renders the loading state", async () => {
    const view = await render(
      <AdminPanelScreen contentState={{ kind: "loading" }} />,
    );

    expect(view.getByTestId("admin-panel-loading-state")).toBeTruthy();
    expect(view.getByText("Loading admin panel")).toBeTruthy();
  });

  it("renders the empty state", async () => {
    const view = await render(
      <AdminPanelScreen contentState={{ kind: "empty" }} />,
    );

    expect(view.getByTestId("admin-panel-empty-state")).toBeTruthy();
    expect(view.getByText("Admin setup is empty")).toBeTruthy();
  });

  it("renders the error state and retries", async () => {
    const onRetry = jest.fn();
    const view = await render(
      <AdminPanelScreen
        contentState={{
          kind: "error",
          message: "Unable to load the admin control panel right now.",
        }}
        onRetry={onRetry}
      />,
    );

    expect(view.getByTestId("admin-panel-error-state")).toBeTruthy();
    fireEvent.press(view.getByTestId("admin-panel-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the guarded state and returns to the app", async () => {
    const onReturnHome = jest.fn();
    const view = await render(
      <AdminPanelScreen
        contentState={{ kind: "guarded" }}
        onReturnHome={onReturnHome}
      />,
    );

    expect(view.getByTestId("admin-panel-guarded-state")).toBeTruthy();
    fireEvent.press(view.getByTestId("admin-panel-guarded-return-home"));
    expect(onReturnHome).toHaveBeenCalledTimes(1);
  });

  it("shows the team empty copy when no teams are loaded", async () => {
    const view = await render(
      <AdminPanelScreen
        contentState={{ kind: "ready" }}
        sectionFocus="team"
        viewModel={{
          workspaceId: "ws_admin",
          workspaceName: "MoodMarble HQ",
          joinCode: null,
          teamNames: [],
        }}
      />,
    );

    expect(view.getByTestId("admin-panel-team-empty-copy")).toBeTruthy();
    expect(view.queryByText(/daily heatmap/i)).toBeNull();
    expect(view.queryByText(/manager dashboard/i)).toBeNull();
  });
});
