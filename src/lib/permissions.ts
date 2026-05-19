export type Role = "admin" | "editor" | "viewer";

export interface Permission {
  email: string;
  role: Role;
  /** Required for editor/viewer; ignored for admin. */
  projects?: string[];
}

const HARDCODED_PERMISSIONS: Permission[] = [
  { email: "m.oba@visionary-jp.net", role: "admin" },
];

function parseEnvPermissions(): Permission[] | null {
  const raw = process.env.AUTH_PERMISSIONS;
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.filter(isPermission);
  } catch (err) {
    console.error("[permissions] failed to parse AUTH_PERMISSIONS:", err);
    return null;
  }
}

function isPermission(value: unknown): value is Permission {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (typeof v.email !== "string") {
    return false;
  }
  if (v.role !== "admin" && v.role !== "editor" && v.role !== "viewer") {
    return false;
  }
  if (v.projects !== undefined) {
    if (
      !Array.isArray(v.projects) ||
      !v.projects.every((p) => typeof p === "string")
    ) {
      return false;
    }
  }
  return true;
}

const PERMISSIONS: Permission[] =
  parseEnvPermissions() ?? HARDCODED_PERMISSIONS;

export function lookupPermission(email: string): Permission | null {
  const norm = email.trim().toLowerCase();
  return PERMISSIONS.find((p) => p.email.trim().toLowerCase() === norm) ?? null;
}
