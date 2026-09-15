import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Brief } from "./types";

function briefsDir() {
  const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (volume) return path.join(volume, "briefs");
  return path.join(process.cwd(), ".data", "briefs");
}

function fileFor(id: string) {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(briefsDir(), `${safe}.json`);
}

export async function readBrief(id: string): Promise<Brief | null> {
  try {
    const raw = await readFile(fileFor(id), "utf8");
    return JSON.parse(raw) as Brief;
  } catch {
    return null;
  }
}

export async function writeBrief(brief: Brief) {
  await mkdir(briefsDir(), { recursive: true });
  await writeFile(fileFor(brief.id), JSON.stringify(brief, null, 2));
}
