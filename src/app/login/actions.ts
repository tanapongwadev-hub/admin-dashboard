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
  | {
      status: "select-department";
      departmentSelectionToken: string;
      departments: DepartmentOption[];
    }
  | { status: "error"; message: string };

export async function loginAction(
  username: string,
  password: string
): Promise<LoginActionResult> {
  try {
    const result = await login({ username, password });

    if (isDepartmentSelectionRequired(result)) {
      return {
        status: "select-department",
        departmentSelectionToken: result.departmentSelectionToken,
        departments: result.departments,
      };
    }

    await setSessionCookies(result);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: authErrorMessage(err) };
  }
}

export async function selectDepartmentAction(
  departmentSelectionToken: string,
  userDepartmentRoleId: string
): Promise<LoginActionResult> {
  try {
    const result = await selectDepartment({
      departmentSelectionToken,
      userDepartmentRoleId,
    });
    await setSessionCookies(result);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: authErrorMessage(err) };
  }
}

async function setSessionCookies(result: LoginSuccess) {
  const { accessToken, refreshToken } = result.data.authentication;
  const store = await cookies();
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  store.set("accessToken", accessToken, { ...common, maxAge: 60 * 60 * 8 });
  store.set("refreshToken", refreshToken, {
    ...common,
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
