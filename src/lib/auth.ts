import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-strong-jwt-secret-key-32-chars-minimum"
);

export interface SessionPayload {
  userId: string;
  email: string;
  quiznexaId?: string;
  name: string;
  role: "ADMIN" | "CONTROLLER" | "STUDENT";
  department?: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const token = new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();
  if (payload.role === "STUDENT") token.setExpirationTime("12h");
  return token.sign(SECRET);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(await getSessionCookieName())?.value || cookieStore.get("session_token")?.value;
    return token ? verifySessionToken(token) : null;
  } catch {
    return null;
  }
}

async function getSessionForRole(role: "ADMIN" | "CONTROLLER"): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(`${role.toLowerCase()}_session_token`)?.value;
    const session = token ? await verifySessionToken(token) : null;
    return session?.role === role ? session : null;
  } catch {
    return null;
  }
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string, role: SessionPayload["role"]): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(`${role.toLowerCase()}_session_token`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 365 * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(await getSessionCookieName());
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(await getSessionCookieName())?.value;
}

async function getSessionCookieName(): Promise<string> {
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer") || "";
  const requestPath = requestHeaders.get("next-url") || requestHeaders.get("x-invoke-path") || "";
  const context = `${referer} ${requestPath}`;

  if (context.includes("/controller")) return "controller_session_token";
  if (context.includes("/admin")) return "admin_session_token";
  return "session_token";
}

export async function getStudentSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_session_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === "STUDENT" ? payload as unknown as SessionPayload : null;
  } catch {
    return null;
  }
}

export async function setStudentSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("student_session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 12 * 60 * 60,
    path: "/",
  });
}

export async function clearStudentSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("student_session_token");
}

export async function getStudentSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("student_session_token")?.value;
}

export async function requireStudentAuth(): Promise<SessionPayload> {
  const session = await getStudentSession();
  if (!session) redirect("/");
  return session;
}

export async function requireAuth(allowedRoles?: string | string[]): Promise<SessionPayload> {
  const session = await getSession();
  
  if (!session) {
    redirect("/");
  }

  const roles = typeof allowedRoles === "string" ? [allowedRoles] : allowedRoles;
  if (roles && !roles.includes(session.role)) {
    redirect("/unauthorized");
  }

  return session;
}

// Helper to check role hierarchy
// Admin has all permissions (including controller permissions)
// Controller has controller permissions only
// Student has student permissions only
export function hasPermission(userRole: string, requiredRole: string): boolean {
  if (userRole === "ADMIN") return true; // Admin has all permissions
  return userRole === requiredRole; // Otherwise check exact match
}

// Helper to allow admin to bypass controller checks
export async function requireAdminOrController(): Promise<SessionPayload> {
  const session = await getSession();
  
  if (!session) {
    redirect("/");
  }

  // Admin can do everything a controller can do (role hierarchy)
  if (session.role !== "ADMIN" && session.role !== "CONTROLLER") {
    redirect("/unauthorized");
  }

  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = (await getSessionForRole("ADMIN")) || await getSession();
  if (!session || session.role !== "ADMIN") redirect("/unauthorized");
  return session;
}

export async function requireController(): Promise<SessionPayload> {
  const session = (await getSessionForRole("CONTROLLER"))
    || (await getSessionForRole("ADMIN"))
    || await getSession();
  
  if (!session || (session.role !== "CONTROLLER" && session.role !== "ADMIN")) {
    redirect("/");
  }

  // Both ADMIN and CONTROLLER can access controller features
  if (session.role !== "CONTROLLER" && session.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  return session;
}
