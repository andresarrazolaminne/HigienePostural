import type { UserRole } from "../api/types"

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super administrador",
  company_admin: "Administrador de empresa",
  expert: "Experto ergonómico",
  user: "Inspector",
}

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/admin"
    case "company_admin":
      return "/empresa"
    case "expert":
      return "/experto"
    case "user":
      return "/app"
  }
}

export function roleCanAccessPath(role: UserRole, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "super_admin"
  }
  if (pathname.startsWith("/empresa")) {
    return role === "company_admin"
  }
  if (pathname.startsWith("/experto")) {
    return role === "expert"
  }
  if (pathname.startsWith("/app")) {
    return role === "user"
  }
  return true
}
