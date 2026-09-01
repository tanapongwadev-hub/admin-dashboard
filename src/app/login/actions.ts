"use server";

import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/client";
import {
  login,
  selectDepartment,
  isDepartmentSelectionRequired,
  type DepartmentOption,
  type LoginSuccess,
} from "@/lib/api/auth";

export type LoginActionResult =
  | { status: "success" }
  | { status: "select-department"; departments: DepartmentOption[] }
  | { status: "error"; message: string };

const DEPARTMENT_SELECTION_COOKIE = "deptSelectionToken";

// httpOnly, secure by default — see setCookie(). Only "development" (the
// Next.js dev server's own NODE_ENV, not attacker-controlled) opts out, so
// any real deployment gets Secure cookies even if NODE_ENV isn't explicitly
// "production".
function secureCookies() {
  return process.env.NODE_ENV !== "development";
}

export async function loginAction(
  username: string,
  password: string
): Promise<LoginActionResult> {
  try {
    const result = await login({ username, password });

    if (isDepartmentSelectionRequired(result)) {
      // Keep the short-lived selection token server-side only — it never
      // reaches client JS or gets echoed back in a fetchable response body.
      const store = await cookies();
      setCookie(store, DEPARTMENT_SELECTION_COOKIE, result.departmentSelectionToken, {
        maxAge: 60 * 5,
      });
      return { status: "select-department", departments: result.departments };
    }

    await setSessionCookies(result);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: authErrorMessage(err) };
  }
}

export async function selectDepartmentAction(
  userDepartmentRoleId: string
): Promise<LoginActionResult> {
  try {
    const store = await cookies();
    const departmentSelectionToken = store.get(
      DEPARTMENT_SELECTION_COOKIE
    )?.value;
    if (!departmentSelectionToken) {
      return {
        status: "error",
        message: "Your session expired. Please sign in again.",
      };
    }

    const result = await selectDepartment({
      departmentSelectionToken,
      userDepartmentRoleId,
    });
    store.delete(DEPARTMENT_SELECTION_COOKIE);
    await setSessionCookies(result);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: authErrorMessage(err) };
  }
}

function setCookie(
  store: Awaited<ReturnType<typeof cookies>>,
  name: string,
  value: string,
  opts: { maxAge: number }
) {
  store.set(name, value, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: opts.maxAge,
  });
}

async function setSessionCookies(result: LoginSuccess) {
  const { accessToken, refreshToken } = result.data.authentication;
  const store = await cookies();
  setCookie(store, "accessToken", accessToken, { maxAge: 60 * 60 * 8 });
  setCookie(store, "refreshToken", refreshToken, {
    maxAge: 60 * 60 * 24 * 7,
  });
}

function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      const body = err.body as { message?: string } | undefined;
      return body?.message ?? "Invalid username or password.";
    }
    if (err.status === 403) {
      const body = err.body as { message?: string } | undefined;
      return body?.message ?? "This account cannot sign in right now.";
    }
    const body = err.body as { message?: string } | undefined;
    return body?.message ?? "Something went wrong. Please try again.";
  }
  return "Could not reach the server. Please try again.";
}
