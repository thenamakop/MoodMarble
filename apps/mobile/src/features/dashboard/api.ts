import {
  DashboardDailySchema,
  DashboardTagsSchema,
  DashboardWeeklySchema,
  type DashboardDaily,
  type DashboardTags,
  type DashboardWeekly,
} from "@/contracts/dashboard";
import { createApiUrl, getApiRequestErrorMessage } from "@/lib/api";

const MANAGER_DASHBOARD_ERROR_MESSAGE =
  "Unable to load manager dashboard right now.";
const MANAGER_ACCESS_MISSING_MESSAGE =
  "Manager access missing. Open the dashboard from a manager link again.";

interface LoadManagerDashboardBundleInput {
  teamId: string;
  managerJwt: string;
  date?: string;
  startDate?: string;
}

interface ManagerDashboardBundle {
  daily: DashboardDaily;
  weekly: DashboardWeekly;
  tags: DashboardTags;
}

export async function loadManagerDashboardBundle(
  input: LoadManagerDashboardBundleInput,
): Promise<ManagerDashboardBundle> {
  if (!input.teamId.trim() || !input.managerJwt.trim()) {
    throw new Error(MANAGER_ACCESS_MISSING_MESSAGE);
  }

  const [daily, weekly, tags] = await Promise.all([
    fetchDashboardDaily(input.teamId, input.managerJwt, input.date),
    fetchDashboardWeekly(input.teamId, input.managerJwt, input.startDate),
    fetchDashboardTags(input.teamId, input.managerJwt, input.startDate),
  ]);

  return { daily, weekly, tags };
}

async function fetchDashboardDaily(
  teamId: string,
  managerJwt: string,
  date?: string,
): Promise<DashboardDaily> {
  const requestUrl = createApiUrl(
    appendOptionalQuery(`/dashboard/team/${teamId}/daily`, "date", date),
  );

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${managerJwt}`,
      },
    });
    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(readDashboardErrorMessage(responseJson));
    }

    return DashboardDailySchema.parse(responseJson);
  } catch (error) {
    throw new Error(
      getApiRequestErrorMessage(
        MANAGER_DASHBOARD_ERROR_MESSAGE,
        error,
        requestUrl,
      ),
    );
  }
}

async function fetchDashboardWeekly(
  teamId: string,
  managerJwt: string,
  startDate?: string,
): Promise<DashboardWeekly> {
  const requestUrl = createApiUrl(
    appendOptionalQuery(
      `/dashboard/team/${teamId}/weekly`,
      "start_date",
      startDate,
    ),
  );

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${managerJwt}`,
      },
    });
    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(readDashboardErrorMessage(responseJson));
    }

    return DashboardWeeklySchema.parse(responseJson);
  } catch (error) {
    throw new Error(
      getApiRequestErrorMessage(
        MANAGER_DASHBOARD_ERROR_MESSAGE,
        error,
        requestUrl,
      ),
    );
  }
}

async function fetchDashboardTags(
  teamId: string,
  managerJwt: string,
  startDate?: string,
): Promise<DashboardTags> {
  const requestUrl = createApiUrl(
    appendOptionalQuery(
      `/dashboard/team/${teamId}/tags`,
      "start_date",
      startDate,
    ),
  );

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${managerJwt}`,
      },
    });
    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(readDashboardErrorMessage(responseJson));
    }

    return DashboardTagsSchema.parse(responseJson);
  } catch (error) {
    throw new Error(
      getApiRequestErrorMessage(
        MANAGER_DASHBOARD_ERROR_MESSAGE,
        error,
        requestUrl,
      ),
    );
  }
}

function appendOptionalQuery(
  pathname: string,
  queryKey: string,
  queryValue?: string,
): string {
  if (!queryValue?.trim()) {
    return pathname;
  }

  const searchParams = new URLSearchParams({
    [queryKey]: queryValue,
  });

  return `${pathname}?${searchParams.toString()}`;
}

function readDashboardErrorMessage(responseJson: unknown): string {
  if (
    typeof responseJson === "object" &&
    responseJson !== null &&
    "message" in responseJson &&
    typeof responseJson.message === "string" &&
    ["Unauthorized", "Forbidden"].includes(responseJson.message)
  ) {
    return responseJson.message;
  }

  return MANAGER_DASHBOARD_ERROR_MESSAGE;
}

export {
  MANAGER_ACCESS_MISSING_MESSAGE,
  MANAGER_DASHBOARD_ERROR_MESSAGE,
  type LoadManagerDashboardBundleInput,
  type ManagerDashboardBundle,
};
