import { auth, isAuthEnabled } from "@/auth";
import { PROJECTS } from "@/data/projects";
import { lookupPermission, type Role } from "./permissions";
import type { ProjectMeta } from "@/types/wbs";

export interface UserContext {
  /** True when auth env vars are configured. */
  authEnabled: boolean;
  /** True when the request has a valid session, or when auth is disabled. */
  isAuthenticated: boolean;
  email: string | null;
  role: Role | null;
  /** Slugs the user can access; null means "all" (admin or dev mode). */
  projects: string[] | null;
}

export { isAuthEnabled };

const DEV_CONTEXT: UserContext = {
  authEnabled: false,
  isAuthenticated: true,
  email: null,
  role: "admin",
  projects: null,
};

export async function getUserContext(): Promise<UserContext> {
  if (!isAuthEnabled()) {
    return DEV_CONTEXT;
  }
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email) {
    return {
      authEnabled: true,
      isAuthenticated: false,
      email: null,
      role: null,
      projects: [],
    };
  }
  const perm = lookupPermission(email);
  if (!perm) {
    return {
      authEnabled: true,
      isAuthenticated: true,
      email,
      role: null,
      projects: [],
    };
  }
  return {
    authEnabled: true,
    isAuthenticated: true,
    email,
    role: perm.role,
    projects: perm.role === "admin" ? null : (perm.projects ?? []),
  };
}

export function canEditProject(ctx: UserContext, slug: string): boolean {
  if (!ctx.isAuthenticated) {
    return false;
  }
  if (ctx.role === "admin") {
    return true;
  }
  if (ctx.role === "editor" && (ctx.projects?.includes(slug) ?? false)) {
    return true;
  }
  return false;
}

export function filterVisibleProjects(ctx: UserContext): ProjectMeta[] {
  if (ctx.role === "admin") {
    return PROJECTS;
  }
  if (!ctx.role) {
    return [];
  }
  return PROJECTS.filter((p) => ctx.projects?.includes(p.slug) ?? false);
}
