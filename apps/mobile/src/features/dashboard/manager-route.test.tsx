import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import ManagerDashboardRoute from "@/app/manager";
import { buildManagerDashboardViewModel } from "@/features/dashboard/chart-model";
import { loadManagerDashboardBundle } from "@/features/dashboard/api";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/features/dashboard/api", () => ({
  loadManagerDashboardBundle: jest.fn(),
}));

jest.mock("@/features/dashboard/chart-model", () => ({
  buildManagerDashboardViewModel: jest.fn(),
}));

jest.mock("@/features/dashboard/manager-dashboard-screen", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return {
    ManagerDashboardScreen: ({
      canChangeDate,
      canChangeTeam,
      contentState,
      onReturnHome,
      onSelectDate,
      onSelectTeam,
      selectedDateLabel,
      selectedTeamLabel,
      viewModel,
    }: {
      canChangeDate?: boolean;
      canChangeTeam?: boolean;
      contentState?: { kind: string };
      onReturnHome?: () => void;
      onSelectDate?: () => void;
      onSelectTeam?: () => void;
      selectedDateLabel?: string;
      selectedTeamLabel?: string;
      viewModel?: unknown;
    }) => (
      <View>
        <Text>{`content:${contentState?.kind ?? "unknown"}`}</Text>
        <Text>{`date:${selectedDateLabel ?? "none"}`}</Text>
        <Text>{`team:${selectedTeamLabel ?? "none"}`}</Text>
        <Text>{`can-change-date:${canChangeDate ? "yes" : "no"}`}</Text>
        <Text>{`can-change-team:${canChangeTeam ? "yes" : "no"}`}</Text>
        <Text>{`view-model:${viewModel ? "present" : "missing"}`}</Text>
        <Pressable onPress={onSelectDate} testID="manager-route-select-date">
          <Text>select-date</Text>
        </Pressable>
        <Pressable onPress={onSelectTeam} testID="manager-route-select-team">
          <Text>select-team</Text>
        </Pressable>
        <Pressable onPress={onReturnHome} testID="manager-route-return-home">
          <Text>return-home</Text>
        </Pressable>
      </View>
    ),
  };
});

const { useLocalSearchParams, useRouter } = jest.requireMock("expo-router") as {
  useLocalSearchParams: jest.Mock;
  useRouter: jest.Mock;
};

describe("ManagerDashboardRoute", () => {
  let replace: jest.Mock;
  let currentParams: Record<string, string>;

  beforeEach(() => {
    replace = jest.fn();
    currentParams = {};
    useRouter.mockReturnValue({ replace });
    useLocalSearchParams.mockImplementation(() => currentParams);
    jest.mocked(loadManagerDashboardBundle).mockResolvedValue({} as never);
    jest.mocked(buildManagerDashboardViewModel).mockReturnValue({
      summary: {
        totalSubmissionsLabel: "8",
        windowLabel: "2026-06-15 to 2026-06-21",
      },
      banner: null,
      dailyHeatmap: {
        visibility: "visible",
        hiddenMessage: null,
        thresholdMessage: null,
        data: [],
      },
      weeklyTrend: {
        visibility: "visible",
        hiddenMessage: null,
        thresholdMessage: null,
        data: [],
      },
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
    } as never);
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("guards the manager route from member users and returns to the main app", async () => {
    const view = await render(<ManagerDashboardRoute />);

    expect(view.getByText("content:guarded")).toBeTruthy();
    expect(view.getByText("can-change-date:no")).toBeTruthy();
    expect(view.getByText("can-change-team:no")).toBeTruthy();
    expect(loadManagerDashboardBundle).not.toHaveBeenCalled();

    fireEvent.press(view.getByTestId("manager-route-return-home"));

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("loads the selected team aggregates and passes manager labels into the screen", async () => {
    currentParams = {
      date: "2026-06-18",
      manager_jwt: "manager-jwt-token",
      manager_teams: "tm_product:Product|tm_design:Design",
      start_date: "2026-06-16",
      team_id: "tm_product",
      team_name: "Product",
    };

    const view = await render(<ManagerDashboardRoute />);

    await waitFor(() =>
      expect(loadManagerDashboardBundle).toHaveBeenCalledWith({
        teamId: "tm_product",
        managerJwt: "manager-jwt-token",
        date: "2026-06-18",
        startDate: "2026-06-16",
      }),
    );

    await waitFor(() => expect(view.getByText("content:ready")).toBeTruthy());
    expect(view.getByText("date:2026-06-18")).toBeTruthy();
    expect(view.getByText("team:Product")).toBeTruthy();
    expect(view.getByText("can-change-date:yes")).toBeTruthy();
    expect(view.getByText("can-change-team:yes")).toBeTruthy();
    expect(view.getByText("view-model:present")).toBeTruthy();
  });

  it("updates the date selection and refetches the matching aggregate bundle", async () => {
    currentParams = {
      date: "2026-06-18",
      manager_jwt: "manager-jwt-token",
      manager_teams: "tm_product:Product|tm_design:Design",
      start_date: "2026-06-16",
      team_id: "tm_product",
      team_name: "Product",
    };

    const view = await render(<ManagerDashboardRoute />);

    await waitFor(() =>
      expect(loadManagerDashboardBundle).toHaveBeenCalledTimes(1),
    );

    fireEvent.press(view.getByTestId("manager-route-select-date"));

    expect(replace).toHaveBeenCalledWith({
      pathname: "/manager",
      params: {
        date: "2026-06-17",
        manager_jwt: "manager-jwt-token",
        manager_teams: "tm_product:Product|tm_design:Design",
        start_date: "2026-06-16",
        team_id: "tm_product",
        team_name: "Product",
      },
    });

    currentParams = {
      ...currentParams,
      date: "2026-06-17",
    };
    view.rerender(<ManagerDashboardRoute />);

    await waitFor(() =>
      expect(loadManagerDashboardBundle).toHaveBeenNthCalledWith(2, {
        teamId: "tm_product",
        managerJwt: "manager-jwt-token",
        date: "2026-06-17",
        startDate: "2026-06-16",
      }),
    );
  });
});
