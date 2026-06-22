import { fireEvent, render, waitFor } from "@testing-library/react-native";

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
          teams: [],
        }}
      />,
    );

    expect(view.getByTestId("admin-panel-team-empty-copy")).toBeTruthy();
    expect(view.queryByText(/daily heatmap/i)).toBeNull();
    expect(view.queryByText(/manager dashboard/i)).toBeNull();
  });

  it("invokes the copy and export actions from the ready admin panel", async () => {
    const onCopyJoinCode = jest.fn();
    const onExport = jest.fn();
    const view = await render(
      <AdminPanelScreen
        contentState={{ kind: "ready" }}
        onCopyJoinCode={onCopyJoinCode}
        onExport={onExport}
        viewModel={{
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
        }}
      />,
    );

    fireEvent.press(view.getByTestId("admin-panel-copy-join-code"));
    fireEvent.changeText(
      view.getByTestId("admin-panel-export-start-date"),
      "2026-06-01",
    );
    fireEvent.changeText(
      view.getByTestId("admin-panel-export-end-date"),
      "2026-06-30",
    );
    await waitFor(() => {
      expect(view.getByDisplayValue("2026-06-01")).toBeTruthy();
      expect(view.getByDisplayValue("2026-06-30")).toBeTruthy();
    });
    fireEvent.press(view.getByTestId("admin-panel-export-run"));

    expect(onCopyJoinCode).toHaveBeenCalledWith("ABC123");
    await waitFor(() =>
      expect(onExport).toHaveBeenCalledWith({
        startDate: "2026-06-01",
        endDate: "2026-06-30",
      }),
    );
  });
});
