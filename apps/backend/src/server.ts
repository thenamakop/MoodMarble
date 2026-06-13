import { buildApp } from "./app";
import { loadLocalEnvFile } from "./config/env";

async function startServer(): Promise<void> {
  loadLocalEnvFile();

  const app = await buildApp({
    jwtSecret: process.env.JWT_SECRET,
  });

  const port = Number(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({
    host,
    port,
  });

  console.log(`Backend listening on http://127.0.0.1:${port}`);
}

void startServer();
