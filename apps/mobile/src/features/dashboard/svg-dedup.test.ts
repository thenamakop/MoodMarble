import { readFileSync } from "fs";
import { resolve } from "path";

describe("react-native-svg workspace dedup", () => {
  it("lockfile only contains one react-native-svg version", () => {
    // This test guards against a duplicate native SVG module graph. If two
    // versions of react-native-svg are resolved (e.g. root workspace and mobile
    // workspace disagree), Metro can bundle the native code twice and Android
    // crashes with "Tried to register two views with the same name RNSVGCircle".
    const lockfilePath = resolve(__dirname, "../../../../../pnpm-lock.yaml");
    const lockfile = readFileSync(lockfilePath, "utf-8");
    const matches = lockfile.match(/^\s+react-native-svg@\d+\.\d+\.\d+:$/gm) ?? [];
    const versions = new Set(
      matches.map((m) => m.trim().replace("react-native-svg@", "").replace(":", "")),
    );

    expect(versions.size).toBe(1);
    expect([...versions][0]).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
