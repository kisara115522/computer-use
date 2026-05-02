import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join, parse } from "node:path";

const execOpen = async (args: string[]): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    execFile("/usr/bin/open", args, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const openUrl = async (
  url: string,
  options: { app?: string; waitMs?: number } = {},
): Promise<void> => {
  const parsed = new URL(url);
  const args = options.app ? ["-a", options.app, parsed.toString()] : [parsed.toString()];
  await execOpen(args);
  await sleep(options.waitMs ?? 800);
};

export const openApp = async (
  name: string,
  options: { waitMs?: number } = {},
): Promise<void> => {
  await execOpen(["-a", name]);
  await sleep(options.waitMs ?? 800);
};

const scanAppDirectory = async (
  root: string,
  depth = 0,
): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const apps: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory() && entry.name.endsWith(".app")) {
      apps.push(parse(entry.name).name);
      continue;
    }

    if (entry.isDirectory() && depth < 1) {
      apps.push(...(await scanAppDirectory(fullPath, depth + 1)));
    }
  }

  return apps;
};

export const listApps = async (): Promise<string[]> => {
  const roots = [
    "/Applications",
    "/System/Applications",
    "/System/Applications/Utilities",
    `${process.env.HOME ?? ""}/Applications`,
  ].filter(Boolean);

  const apps = (await Promise.all(roots.map((root) => scanAppDirectory(root))))
    .flat()
    .sort((a, b) => a.localeCompare(b));

  return [...new Set(apps)];
};
