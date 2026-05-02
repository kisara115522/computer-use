import { execFile } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export type PermissionStatus =
  | "authorized"
  | "denied"
  | "restricted"
  | "not determined"
  | "unavailable";

export interface PermissionReport {
  accessibility: PermissionStatus;
  screen: PermissionStatus;
  inputMonitoring: PermissionStatus;
  runtime: {
    platform: string;
    execPath: string;
    argv0: string | undefined;
  };
  guidance: string[];
}

interface MacPermissions {
  getAuthStatus(type: string): PermissionStatus;
  askForAccessibilityAccess(): void;
  askForScreenCaptureAccess(): void;
  askForInputMonitoringAccess(): Promise<PermissionStatus>;
}

let cachedPermissions: MacPermissions | undefined;

const loadMacPermissions = (): MacPermissions | undefined => {
  if (process.platform !== "darwin") return undefined;
  if (cachedPermissions) return cachedPermissions;

  try {
    cachedPermissions = require(
      "@nut-tree-fork/node-mac-permissions",
    ) as MacPermissions;
    return cachedPermissions;
  } catch {
    return undefined;
  }
};

const statusFor = (type: string): PermissionStatus => {
  const permissions = loadMacPermissions();
  if (!permissions) return "unavailable";

  try {
    return permissions.getAuthStatus(type);
  } catch {
    return "unavailable";
  }
};

const permissionGuidance = (
  accessibility: PermissionStatus,
  screen: PermissionStatus,
  inputMonitoring: PermissionStatus,
): string[] => {
  const target = process.argv0 || process.execPath;
  const guidance: string[] = [];

  if (accessibility !== "authorized") {
    guidance.push(
      `Grant Accessibility permission to the app running this server (${target}). Mouse and keyboard tools need it.`,
    );
  }

  if (screen !== "authorized") {
    guidance.push(
      `Grant Screen Recording permission to the app running this server (${target}). Screenshot and observe tools need it.`,
    );
  }

  if (inputMonitoring !== "authorized" && inputMonitoring !== "unavailable") {
    guidance.push(
      `Grant Input Monitoring permission if global hotkeys or background typing are blocked (${target}).`,
    );
  }

  return guidance;
};

export const getPermissionReport = (): PermissionReport => {
  const accessibility = statusFor("accessibility");
  const screen = statusFor("screen");
  const inputMonitoring = statusFor("input-monitoring");

  return {
    accessibility,
    screen,
    inputMonitoring,
    runtime: {
      platform: process.platform,
      execPath: process.execPath,
      argv0: process.argv0,
    },
    guidance: permissionGuidance(accessibility, screen, inputMonitoring),
  };
};

export const assertAccessibilityPermission = (): void => {
  const report = getPermissionReport();
  if (
    report.accessibility === "authorized" ||
    report.accessibility === "unavailable"
  ) {
    return;
  }

  throw new Error(
    `Accessibility permission is ${report.accessibility}. ${report.guidance.join(" ")}`,
  );
};

export const openPermissionSettings = async (
  pane: "accessibility" | "screen" | "input-monitoring" = "accessibility",
): Promise<void> => {
  const urls: Record<typeof pane, string> = {
    accessibility:
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
    screen:
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
    "input-monitoring":
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent",
  };

  await new Promise<void>((resolve, reject) => {
    execFile("/usr/bin/open", [urls[pane]], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};
