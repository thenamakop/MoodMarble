import type { FastifyInstance } from "fastify";

/**
 * Registers the health check route.
 */
export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/health",
    {
      schema: {
        tags: ["Public"],
        summary: "Health check",
        description:
          "Returns HTTP 200 when the server is running. " +
          "Used by Railway healthcheck and monitoring.",
        response: {
          200: {
            type: "object",
            additionalProperties: true,
            properties: {
              status: { type: "string", enum: ["ok"] },
            },
          },
        },
      },
    },
    async () => ({ status: "ok" }),
  );
}
