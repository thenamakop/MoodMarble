import { fireEvent, render } from "@testing-library/react-native";

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

jest.mock("@/features/dashboard/dashboard-charts", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    ManagerDashboardCharts: () => <View testID="manager-dashboard-charts" />,
  };
});

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

  it("renders the guarded access state and returns to the app", async () => {
    const onReturnHome = jest.fn();
    const view = await render(
      <ManagerDashboardScreen
        contentState={{ kind: "guarded" }}
        onReturnHome={onReturnHome}
      />,
    );

    expect(view.getByTestId("manager-dashboard-guarded-state")).toBeTruthy();
    fireEvent.press(view.getByTestId("manager-dashboard-return-home"));
    expect(onReturnHome).toHaveBeenCalledTimes(1);
  });

  it("invokes the date and team selection controls when manager options are available", async () => {
    const onSelectDate = jest.fn();
    const onSelectTeam = jest.fn();
    const view = await render(
      <ManagerDashboardScreen
        canChangeDate
        canChangeTeam
        contentState={{ kind: "ready" }}
        onSelectDate={onSelectDate}
        onSelectTeam={onSelectTeam}
      />,
    );

    fireEvent.press(view.getByTestId("manager-dashboard-date-picker"));
    fireEvent.press(view.getByTestId("manager-dashboard-team-selector"));

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    expect(onSelectTeam).toHaveBeenCalledTimes(1);
  });

  it("keeps the ready state aggregate-only and separate from member data", async () => {
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "ready" }} />,
    );

    expect(view.queryByText(/device token/i)).toBeNull();
    expect(view.queryByText(/joined-device-jwt/i)).toBeNull();
    expect(view.queryByText(/marble-tray:/i)).toBeNull();
  });
});
