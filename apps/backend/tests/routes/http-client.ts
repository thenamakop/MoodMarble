import type { FastifyInstance } from "fastify";
import request from "supertest";

interface InjectOptions {
  headers?: Record<string, string>;
  method: "GET" | "POST" | "PATCH" | "OPTIONS";
  payload?: unknown;
  url: string;
}

export async function inject(app: FastifyInstance, options: InjectOptions) {
  await app.ready();

  let httpRequest = createRequest(app, options.method, options.url);

  if (options.headers) {
    httpRequest = httpRequest.set(options.headers);
  }

  if (typeof options.payload !== "undefined" && options.payload !== null) {
    httpRequest = httpRequest.send(options.payload as string | object);
  }

  const response = await httpRequest;
  const contentType = response.headers["content-type"] ?? "";
  const responseBody =
    typeof contentType === "string" && contentType.includes("application/json")
      ? response.body
      : response.text;

  return {
    body: responseBody,
    headers: response.headers,
    json: () => responseBody,
    statusCode: response.status,
    text: response.text,
  };
}

function createRequest(
  app: FastifyInstance,
  method: InjectOptions["method"],
  url: string,
) {
  const agent = request(app.server);

  switch (method) {
    case "GET":
      return agent.get(url);
    case "POST":
      return agent.post(url);
    case "PATCH":
      return agent.patch(url);
    case "OPTIONS":
      return agent.options(url);
    default:
      throw new Error(`Unsupported HTTP method: ${String(method)}`);
  }
}
