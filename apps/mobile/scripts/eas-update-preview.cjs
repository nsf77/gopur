"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

process.env.EXPO_PUBLIC_API_URL ||= "https://go.pur.run/api";
process.env.EXPO_PUBLIC_AUTH_URL ||= "https://go.pur.run";

const mobileRoot = path.resolve(__dirname, "..");
const extra = process.argv.slice(2);
const args = ["eas-cli", "update", "--channel", "preview", ...extra];

function has(bin) {
  const result = spawnSync(bin, ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

const launcher = has("bunx") ? "bunx" : "npx";
console.log(
  `[eas:update:preview] ${launcher} ${args.join(" ")} API=${process.env.EXPO_PUBLIC_API_URL} AUTH=${process.env.EXPO_PUBLIC_AUTH_URL}`,
);
const result = spawnSync(launcher, args, {
  cwd: mobileRoot,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
