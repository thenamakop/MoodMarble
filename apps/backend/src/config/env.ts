import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_FILE_PATH = resolve(__dirname, "../../../../.env");

export function loadLocalEnvFile(): void {
  if (!existsSync(ENV_FILE_PATH)) {
    return;
  }

  const contents = readFileSync(ENV_FILE_PATH, "utf8");

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
