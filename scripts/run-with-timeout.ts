/**
 * Run a child process with timeout. Timeout => FAIL (exit 124), never PASS.
 * Usage: npx tsx scripts/run-with-timeout.ts <ms> -- <command...>
 */
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const sep = args.indexOf("--");
if (sep < 1) {
  console.error("Usage: run-with-timeout.ts <timeoutMs> -- <command...>");
  process.exit(2);
}
const timeoutMs = Number(args[0]);
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error("timeoutMs must be a positive number");
  process.exit(2);
}
const cmd = args[sep + 1];
const cmdArgs = args.slice(sep + 2);
if (!cmd) {
  console.error("Missing command after --");
  process.exit(2);
}

const child = spawn(cmd, cmdArgs, { stdio: "inherit", shell: process.platform === "win32" });
let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  console.error(`TIMEOUT after ${timeoutMs}ms — FAIL (not PASS)`);
  child.kill("SIGTERM");
  setTimeout(() => child.kill("SIGKILL"), 5000).unref();
}, timeoutMs);
timer.unref?.();

child.on("exit", (code, signal) => {
  clearTimeout(timer);
  if (timedOut) process.exit(124);
  process.exit(code ?? (signal ? 1 : 0));
});
