"use server";

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/lib/session';
import { ApiError } from '@/lib/api/client';
import { redirectIfSessionExpired, redirectMissingSession } from '@/lib/session-expiry';
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from '@/lib/user-error';
import { activateEngineeringVersion, createEngineeringVersion, engineeringPermission, listEngineeringVersions, type EngineeringScope, type EngineeringKind, type EngineeringPayload } from '@/lib/api/engineering';

async function tokenFor(scope: EngineeringScope, kind: EngineeringKind, action: 'VIEW' | 'CREATE' | 'UPDATE') {
  if (!['materials', 'products'].includes(scope) || !['bom', 'workflow'].includes(kind)) return null;
  const session = await getCurrentSession();
  if (!session) redirectMissingSession();
  if (!session.user.isSuperAdmin && !session.permissions.includes(engineeringPermission(scope, kind, action))) return null;
  const token = (await cookies()).get('accessToken')?.value;
  if (!token) redirectMissingSession();
  return token;
}
function failure(error: unknown) {
  redirectIfSessionExpired(error);
  return { status: 'error' as const, message: error instanceof ApiError ? apiErrorMessage(error) : CONNECTION_ERROR_MESSAGE };
}
function refresh(scope: EngineeringScope) {
  try {
    revalidatePath(`/bom-workflow/${scope}`); revalidatePath('/products'); revalidatePath('/products/list');
    revalidatePath('/materials/pc');
  } catch { /* Mutation already committed. */ }
}
export async function engineeringHistoryAction(scope: EngineeringScope, kind: EngineeringKind, id: string) {
  const token = await tokenFor(scope, kind, 'VIEW');
  if (!token) return { status: 'error' as const, message: 'คุณไม่มีสิทธิ์ดูข้อมูลนี้' };
  try { return { status: 'success' as const, versions: await listEngineeringVersions(token, scope, kind, id) }; }
  catch (error) { return failure(error); }
}
export async function createEngineeringAction(scope: EngineeringScope, kind: EngineeringKind, id: string, payload: EngineeringPayload) {
  const token = await tokenFor(scope, kind, 'CREATE');
  if (!token) return { status: 'error' as const, message: 'คุณไม่มีสิทธิ์เพิ่มข้อมูลนี้' };
  try {
    const version = await createEngineeringVersion(token, scope, kind, id, payload);
    refresh(scope); return { status: 'success' as const, id: version.id };
  } catch (error) { return failure(error); }
}
export async function activateEngineeringAction(scope: EngineeringScope, kind: EngineeringKind, id: string) {
  const token = await tokenFor(scope, kind, 'UPDATE');
  if (!token) return { status: 'error' as const, message: 'คุณไม่มีสิทธิ์เปิดใช้เวอร์ชัน' };
  try { await activateEngineeringVersion(token, scope, kind, id); refresh(scope); return { status: 'success' as const }; }
  catch (error) { return failure(error); }
}
