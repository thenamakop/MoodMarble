import jwt from "jsonwebtoken";

import { buildApp } from "../src/app";
import { InMemoryDashboardAnalyticsSource } from "../src/services/dashboard-daily";
import { InMemoryWorkspaceDirectory } from "../src/services/workspace-directory";

void (async () => {
  const port = Number(process.env.PORT ?? "3001");
  const tokenPayload = {
    workspace_id: "ws_localdemo",
    team_id: "tm_product",
    role: "manager",
  } as const;

  const submissions = [
    {
      teamId: "tm_product",
      moodType: "happy",
      tags: ["#team"],
      hourOfDay: 9,
      submissionDate: "2026-06-16",
    },
    {
      teamId: "tm_product",
      moodType: "focused",
      tags: ["#workload"],
      hourOfDay: 10,
      submissionDate: "2026-06-16",
    },
    {
      teamId: "tm_product",
      moodType: "calm",
      tags: ["#team"],
      hourOfDay: 11,
      submissionDate: "2026-06-17",
    },
    {
      teamId: "tm_product",
      moodType: "energised",
      tags: ["#workload"],
      hourOfDay: 9,
      submissionDate: "2026-06-17",
    },
    {
      teamId: "tm_product",
      moodType: "happy",
      tags: ["#management"],
      hourOfDay: 13,
      submissionDate: "2026-06-18",
    },
    {
      teamId: "tm_product",
      moodType: "focused",
      tags: ["#team"],
      hourOfDay: 14,
      submissionDate: "2026-06-18",
    },
    {
      teamId: "tm_product",
      moodType: "calm",
      tags: ["#workload"],
      hourOfDay: 14,
      submissionDate: "2026-06-18",
    },
    {
      teamId: "tm_product",
      moodType: "happy",
      tags: ["#team"],
      hourOfDay: 15,
      submissionDate: "2026-06-18",
    },
    {
      teamId: "tm_product",
      moodType: "neutral",
      tags: ["#workload"],
      hourOfDay: 14,
      submissionDate: "2026-06-18",
    },
    {
      teamId: "tm_product",
      moodType: "stressed",
      tags: ["#management"],
      hourOfDay: 10,
      submissionDate: "2026-06-11",
    },
    {
      teamId: "tm_product",
      moodType: "tired",
      tags: ["#workload"],
      hourOfDay: 11,
      submissionDate: "2026-06-11",
    },
  ] as const;

  const managerJwt = jwt.sign(tokenPayload, "manual-manager-secret", {
    expiresIn: "30d",
  });

  const app = await buildApp({
    jwtSecret: "manual-manager-secret",
    dashboardAnalyticsSource: new InMemoryDashboardAnalyticsSource(
      [...submissions],
      { tm_product: 5 },
    ),
    workspaceDirectory: new InMemoryWorkspaceDirectory(),
    now: () => new Date("2026-06-18T12:00:00.000Z"),
  });

  const address = await app.listen({
    host: "0.0.0.0",
    port,
  });

  console.log(`MANUAL_SERVER_LISTENING=${address}`);
  console.log(
    "MANUAL_SERVER_NOTE=Dashboard demo only. Use the real backend on port 3000 for joined-device mood submissions and PostgreSQL writes.",
  );
  console.log(`MANUAL_MANAGER_JWT=${managerJwt}`);
  console.log(
    "MANUAL_MANAGER_ROUTE=http://localhost:8081/manager" +
      `?manager_jwt=${encodeURIComponent(managerJwt)}` +
      "&manager_teams=tm_product%3AProduct" +
      "&team_id=tm_product" +
      "&team_name=Product" +
      "&date=2026-06-18" +
      "&start_date=2026-06-15",
  );
  console.log(
    "MANUAL_PRIVACY_ROUTE=http://localhost:8081/manager" +
      `?manager_jwt=${encodeURIComponent(managerJwt)}` +
      "&manager_teams=tm_product%3AProduct" +
      "&team_id=tm_product" +
      "&team_name=Product" +
      "&date=2026-06-11" +
      "&start_date=2026-06-08",
  );
  console.log("MANUAL_GUARDED_ROUTE=http://localhost:8081/manager");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
