import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const BACKEND_ENV_FILE_PATH = resolve(__dirname, "../../.env");
const ROOT_ENV_FILE_PATH = resolve(__dirname, "../../../../.env");

const JwtSecretSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !looksLikeJwt(value), {
    message: "JWT_SECRET must be a signing secret, not a JWT token.",
  });

const AppEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: JwtSecretSchema,
  ADMIN_BOOTSTRAP_SECRET: z.string().trim().min(1).optional(),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  SENTRY_DSN: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
});

export type AppEnv = z.infer<typeof AppEnvSchema>;

export function loadLocalEnvFile(): void {
  loadEnvFile(BACKEND_ENV_FILE_PATH);
  loadEnvFile(ROOT_ENV_FILE_PATH);
}

export function getAppEnv(): AppEnv {
  loadLocalEnvFile();

  return AppEnvSchema.parse(process.env);
}

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/u)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function looksLikeJwt(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(value);
}
