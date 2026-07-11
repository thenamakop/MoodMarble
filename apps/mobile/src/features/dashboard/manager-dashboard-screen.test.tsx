import { fireEvent, render, waitFor } from "@testing-library/react-native";

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
    const view = await render(<ManagerDashboardScreen contentState={{ kind: "ready" }} />);

    expect(view.getByTestId("manager-dashboard-screen")).toBeTruthy();
    expect(view.getByText("dashboard.title")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-this-week")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-last-week")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-choose-week")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-team-selector")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-export-button")).toBeTruthy();
    expect(view.getByTestId("manager-dashboard-ready-state")).toBeTruthy();
  });

  it("calls onExport when the export button is pressed and a viewModel is present", async () => {
    const onExport = jest.fn();
    const viewModel = {
      summary: { totalSubmissionsLabel: "8", windowLabel: "2026-06-15 to 2026-06-21" },
      banner: null,
      dailyHeatmap: {
        visibility: "visible",
        hiddenMessage: null,
        thresholdMessage: null,
        data: [],
      },
      weeklyTrend: { visibility: "visible", hiddenMessage: null, thresholdMessage: null, data: [] },
      submissionVolume: {
        visibility: "visible",
        hiddenMessage: null,
        thresholdMessage: null,
        data: [],
      },
      moodDistribution: {
        visibility: "visible",
        hiddenMessage: null,
        thresholdMessage: null,
        data: [],
      },
      tagFrequency: {
        visibility: "visible",
        hiddenMessage: null,
        thresholdMessage: null,
        data: [],
      },
    } as never;
    const view = await render(
      <ManagerDashboardScreen
        contentState={{ kind: "ready" }}
        onExport={onExport}
        viewModel={viewModel}
      />,
    );

    fireEvent.press(view.getByTestId("manager-dashboard-export-button"));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("renders the Sign out button and calls onSignOut when tapped", async () => {
    const onSignOut = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "ready" }} onSignOut={onSignOut} />,
    );

    expect(view.getByTestId("manager-dashboard-logout")).toBeTruthy();
    fireEvent.press(view.getByTestId("manager-dashboard-logout"));
    await waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
  });

  it("renders the loading state", async () => {
    const view = await render(<ManagerDashboardScreen contentState={{ kind: "loading" }} />);

    expect(view.getByTestId("manager-dashboard-loading-state")).toBeTruthy();
    expect(view.getByText("dashboard.states.loading.title")).toBeTruthy();
  });

  it("renders the empty state", async () => {
    const view = await render(<ManagerDashboardScreen contentState={{ kind: "empty" }} />);

    expect(view.getByTestId("manager-dashboard-empty-state")).toBeTruthy();
    expect(view.getByText("dashboard.states.empty.title")).toBeTruthy();
  });

  it("renders the privacy-threshold state", async () => {
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "privacy", visibility: "hidden" }} />,
    );

    expect(view.getByTestId("manager-dashboard-privacy-state")).toBeTruthy();
    expect(view.getByText("dashboard.states.privacy.title")).toBeTruthy();
  });

  it("renders the guarded access state and returns to the app", async () => {
    const onReturnHome = jest.fn();
    const view = await render(
      <ManagerDashboardScreen contentState={{ kind: "guarded" }} onReturnHome={onReturnHome} />,
    );

    expect(view.getByTestId("manager-dashboard-guarded-state")).toBeTruthy();
    fireEvent.press(view.getByTestId("manager-dashboard-return-home"));
    expect(onReturnHome).toHaveBeenCalledTimes(1);
  });

  it("invokes the week and team selection controls when manager options are available", async () => {
    const onSelectThisWeek = jest.fn();
    const onSelectLastWeek = jest.fn();
    const onSelectTeam = jest.fn();
    const view = await render(
      <ManagerDashboardScreen
        canChangeDate
        canChangeTeam
        contentState={{ kind: "ready" }}
        onSelectLastWeek={onSelectLastWeek}
        onSelectTeam={onSelectTeam}
        onSelectThisWeek={onSelectThisWeek}
      />,
    );

    fireEvent.press(view.getByTestId("manager-dashboard-this-week"));
    fireEvent.press(view.getByTestId("manager-dashboard-last-week"));
    fireEvent.press(view.getByTestId("manager-dashboard-team-selector"));

    expect(onSelectThisWeek).toHaveBeenCalledTimes(1);
    expect(onSelectLastWeek).toHaveBeenCalledTimes(1);
    expect(onSelectTeam).toHaveBeenCalledTimes(1);
  });

  it("keeps the ready state aggregate-only and separate from member data", async () => {
    const view = await render(<ManagerDashboardScreen contentState={{ kind: "ready" }} />);

    expect(view.queryByText(/device token/i)).toBeNull();
    expect(view.queryByText(/joined-device-jwt/i)).toBeNull();
    expect(view.queryByText(/marble-tray:/i)).toBeNull();
  });
});
