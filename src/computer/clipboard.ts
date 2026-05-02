import { execFile } from "node:child_process";

/** Read text from macOS clipboard via pbpaste */
export const read = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/pbpaste", [], (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
};

/** Write text to macOS clipboard via pbcopy */
export const write = async (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const proc = execFile("/usr/bin/pbcopy", [], (err) => {
      if (err) reject(err);
      else resolve();
    });
    proc.stdin?.write(text);
    proc.stdin?.end();
  });
};
