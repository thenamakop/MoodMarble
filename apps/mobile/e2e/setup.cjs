const { execFileSync } = require("child_process");

jest.setTimeout(180000);

// Belt-and-suspenders: ensure ADB port reversal is active before tests run.
// This is also handled by launchExpoDevClient() and detox.config.cjs reversePorts,
// but running it here guarantees the tunnels exist even if the emulator was
// restarted between the Detox init phase and the first test file.
try {
  execFileSync("adb", ["reverse", "tcp:8081", "tcp:8081"], { stdio: "pipe" });
  execFileSync("adb", ["reverse", "tcp:3000", "tcp:3000"], { stdio: "pipe" });
} catch {
  // Non-fatal: detox.config reversePorts and launchExpoDevClient() handle this too
}
