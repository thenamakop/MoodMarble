import { getAppEnv } from "../config/env";
import { createDatabaseClient } from "./client";
import { teams, workspaces } from "./schema";
import { LOCAL_WORKSPACE_SEED } from "../services/workspace-directory";

async function run(): Promise<void> {
  const env = getAppEnv();
  const databaseClient = createDatabaseClient(env.DATABASE_URL);

  try {
    for (const workspace of LOCAL_WORKSPACE_SEED) {
      await databaseClient.db
        .insert(workspaces)
        .values({
          id: workspace.id,
          name: workspace.name,
          joinCode: workspace.joinCode,
        })
        .onConflictDoUpdate({
          target: workspaces.id,
          set: {
            name: workspace.name,
            joinCode: workspace.joinCode,
          },
        });

      for (const team of workspace.teams) {
        await databaseClient.db
          .insert(teams)
          .values({
            id: team.id,
            workspaceId: workspace.id,
            name: team.name,
          })
          .onConflictDoUpdate({
            target: teams.id,
            set: {
              workspaceId: workspace.id,
              name: team.name,
            },
          });
      }
    }

    console.log("Seed data ready");
  } finally {
    await databaseClient.close();
  }
}

void run();
