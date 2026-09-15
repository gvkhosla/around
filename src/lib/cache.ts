import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Brief } from "./types";

const mem = new Map<string, Brief>();

function briefsDir() {
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "briefs");
  }
  if (process.env.RAILWAY_ENVIRONMENT) {
    return path.join(os.tmpdir(), "around-briefs");
  }
  return path.join(process.cwd(), ".data", "briefs");
}

function fileFor(id: string) {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(briefsDir(), `${safe}.json`);
}

export async function readBrief(id: string): Promise<Brief | null> {
  const hit = mem.get(id);
  if (hit) return hit;
  try {
    const raw = await readFile(fileFor(id), "utf8");
    const brief = JSON.parse(raw) as Brief;
    mem.set(id, brief);
    return brief;
  } catch {
    return null;
  }
}

export async function writeBrief(brief: Brief) {
  mem.set(brief.id, brief);
  try {
    await mkdir(briefsDir(), { recursive: true });
    await writeFile(fileFor(brief.id), JSON.stringify(brief, null, 2));
  } catch (error) {
    console.error("brief cache write failed", error);
  }
}
