import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

let cachedSoffice = undefined;

function sofficeCandidates() {
  return process.platform === "win32"
    ? [
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
      ]
    : ["soffice", "/usr/bin/soffice", "/usr/lib/libreoffice/program/soffice"];
}

export async function findSoffice() {
  if (cachedSoffice !== undefined) return cachedSoffice;
  for (const candidate of sofficeCandidates()) {
    try {
      if (candidate.includes("/") || candidate.includes("\\")) {
        await fs.access(candidate);
      }
      await execFileAsync(candidate, ["--version"], { timeout: 8000 });
      cachedSoffice = candidate;
      return candidate;
    } catch {
      /* try next */
    }
  }
  cachedSoffice = null;
  return null;
}

export async function libreOfficeConvertBuffer(buffer, baseName, fromExt, toExt, tmpDir) {
  const soffice = await findSoffice();
  if (!soffice) {
    throw new Error("LibreOffice is not installed");
  }

  const from = fromExt.startsWith(".") ? fromExt : `.${fromExt}`;
  const to = toExt.startsWith(".") ? toExt.replace(".", "") : toExt;
  const inputPath = path.join(tmpDir, `${baseName}-input${from}`);
  const outDir = path.join(tmpDir, "lo-out");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(inputPath, buffer);

  await execFileAsync(
    soffice,
    [
      "--headless",
      "--invisible",
      "--norestore",
      "--nologo",
      "--nofirststartwizard",
      "--convert-to",
      to,
      "--outdir",
      outDir,
      inputPath,
    ],
    {
      timeout: 120000,
      env: {
        ...process.env,
        SAL_USE_VCLPLUGIN: "svp",
        HOME: process.env.HOME || "/tmp",
      },
    }
  );

  const files = await fs.readdir(outDir);
  const match =
    files.find((name) => name.startsWith(`${baseName}-input`) && name.endsWith(`.${to}`)) ||
    files.find((name) => name.endsWith(`.${to}`));
  if (!match) {
    throw new Error(`LibreOffice did not produce .${to} output`);
  }

  return fs.readFile(path.join(outDir, match));
}
