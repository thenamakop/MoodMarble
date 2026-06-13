import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/", async () => ({
    status: "ok",
  }));

  app.get("/health", async () => ({
    status: "ok",
  }));
}
