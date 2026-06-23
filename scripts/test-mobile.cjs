const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const mobileAppRoot = path.join(repoRoot, "apps", "mobile");
const forwardedArgs = process.argv.slice(2);

if (forwardedArgs[0] === "--") {
  forwardedArgs.shift();
}

const jestArgs = ["exec", "jest", "--runInBand", ...forwardedArgs];
const result = spawnSync("pnpm", jestArgs, {
  cwd: mobileAppRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}

process.exit(1);
