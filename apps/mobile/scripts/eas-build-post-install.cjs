"use strict";

const { execSync } = require("node:child_process");
const path = require("node:path");

const mobileRoot = path.resolve(__dirname, "..");
const sharedRoot = path.resolve(mobileRoot, "../../packages/shared");

function has(bin) {
  try {
    execSync(`${bin} --version`, { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

function run(command, cwd) {
  console.log(`[eas-build-post-install] ${command} (cwd=${cwd})`);
  execSync(command, { cwd, stdio: "inherit", env: process.env, shell: true });
}

const runner = has("bunx") ? "bunx" : "npx";

run(
  `${runner} paraglide-js compile --project ./project.inlang --outdir ./src/paraglide`,
  mobileRoot,
);

if (has("bun")) {
  run("bun run build", sharedRoot);
} else {
  run("npm run build", sharedRoot);
}
