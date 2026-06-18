import { render } from "@testing-library/react-native";

import { ManagerDashboardScreen } from "@/features/dashboard/manager-dashboard-screen";

jest.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    background: "#ffffff",
    backgroundElement: "#f3f4f6",
    backgroundSelected: "#d1d5db",
    text: "#111111",
    textSecondary: "#6b7280",
  }),
}));

describe("ManagerDashboardScreen", () => {
  it("renders the manager dashboard shell with its control placeholders", async () => {
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "ready" }} />,
    );

    expect(view.getByTestId("manager-dashboard-screen")).toBeTruthy();
    expect(view.getByText("Manager dashboard")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-date-picker")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-team-selector")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-export-button")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-ready-state")).toBeTruthy();
  });

  it("renders the loading state", async () => {
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "loading" }} />,
    );

    expect(view.getByTestId("manager-dashboard-loading-state")).toBeTruthy();
    expect(view.getByText("Loading dashboard")).toBeTruthy();
  });

  it("renders the empty state", async () => {
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "empty" }} />,
    );

    expect(view.getByTestId("manager-dashboard-empty-state")).toBeTruthy();
    expect(view.getByText("No aggregate data yet")).toBeTruthy();
  });

  it("renders the privacy-threshold state", async () => {
    const view = await render(
      <ManagerDashboardScreen
        contentState={{ kind: "privacy", visibility: "hidden" }}
      />,
    );

    expect(view.getByTestId("manager-dashboard-privacy-state")).toBeTruthy();
    expect(view.getByText("Privacy threshold active")).toBeTruthy();
  });

  it("renders the data-ready placeholders without any individual entries", async () => {
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "ready" }} />,
    );

    expect(view.getByTestId("manager-dashboard-daily-slot")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-weekly-slot")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-tags-slot")).toBeTruthy();
    expect(view.queryByText(/device token/i)).toBeNull();
    expect(view.queryByText(/joined-device-jwt/i)).toBeNull();
    expect(view.queryByText(/marble-tray:/i)).toBeNull();
  });
});
