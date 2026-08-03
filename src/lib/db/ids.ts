import path from "path";

export const DATA_DIR = path.join(process.cwd(), "data");

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toIso(d: Date | string | null | undefined): string {
  if (!d) return nowIso();
  if (typeof d === "string") return d;
  return d.toISOString();
}
