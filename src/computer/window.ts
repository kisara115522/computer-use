import { execFile } from "node:child_process";

export interface BrowserState {
  app: "Google Chrome" | "Safari" | "unknown";
  title?: string;
  url?: string;
}

const osascript = async (script: string, timeoutMs = 2500): Promise<string> => {
  const args = script
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => ["-e", line]);

  return new Promise<string>((resolve, reject) => {
    execFile("/usr/bin/osascript", args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr.trim() || err.message));
      else resolve(stdout.trim());
    });
  });
};

export const frontmostApp = async (): Promise<string> => {
  return osascript(`
    tell application "System Events"
      get name of first application process whose frontmost is true
    end tell
  `);
};

const chromeState = async (): Promise<BrowserState> => {
  const output = await osascript(`
    tell application "Google Chrome"
      if not (exists front window) then error "No Chrome window"
      set tabTitle to title of active tab of front window
      set tabUrl to URL of active tab of front window
      return tabTitle & linefeed & tabUrl
    end tell
  `);
  const [title, url] = output.split("\n");
  return { app: "Google Chrome", title, url };
};

const safariState = async (): Promise<BrowserState> => {
  const output = await osascript(`
    tell application "Safari"
      if not (exists front document) then error "No Safari document"
      set tabTitle to name of front document
      set tabUrl to URL of front document
      return tabTitle & linefeed & tabUrl
    end tell
  `);
  const [title, url] = output.split("\n");
  return { app: "Safari", title, url };
};

export const browserState = async (
  preferred?: "Google Chrome" | "Safari",
): Promise<BrowserState> => {
  const app = preferred ?? (await frontmostApp().catch(() => "unknown"));

  if (app === "Google Chrome") return chromeState();
  if (app === "Safari") return safariState();

  return { app: "unknown" };
};
