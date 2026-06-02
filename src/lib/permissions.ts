/**
 * Role-based permission helpers — single source of truth for the UI.
 *
 * The same rules are enforced server-side in Supabase RLS (see migration
 * 008_role_based_permissions.sql). This file only mirrors them so the UI
 * can hide buttons / pages the current user has no business seeing. Never
 * use these as a security boundary on their own — RLS is the boundary.
 *
 * Spec (Arabic):
 *   Super Admin (sultan.alallah):
 *     - Full CRUD on every resource
 *     - Create / edit / suspend / delete user accounts
 *     - Assign roles to other users
 *     - Manage Supabase Storage (upload + delete)
 *
 *   Admin (afnan.bakri):
 *     - SELECT + INSERT + UPDATE on every resource
 *     - Cannot DELETE anything
 *     - Cannot create / edit / delete other users
 *     - Cannot reassign roles
 *     - Can upload to Storage, cannot delete from Storage
 *
 *   Everyone else (research_director, department_head, research_coordinator,
 *   authorized_staff, viewer):
 *     - Read-only on most resources (per existing RLS)
 *     - Download from Storage; cannot upload or delete
 */

import type { UserRole } from '@/types'

export const isSuperAdmin = (role?: UserRole | null): boolean =>
  role === 'super_admin'

export const isAdmin = (role?: UserRole | null): boolean =>
  role === 'admin' || role === 'super_admin'

/** Delete-anything power — only the Super Admin has it. */
export const canDelete = (role?: UserRole | null): boolean =>
  isSuperAdmin(role)

/** Add new users, suspend / archive existing ones, change anyone's role.
 *  Locked to the Super Admin per spec. */
export const canManageUsers = (role?: UserRole | null): boolean =>
  isSuperAdmin(role)

/** Edit existing records (research projects, departments, settings, …). */
export const canEdit = (role?: UserRole | null): boolean =>
  isAdmin(role)

/** Create new records (research, departments, qr-codes, …). */
export const canCreate = (role?: UserRole | null): boolean =>
  isAdmin(role)

/** Upload files into Storage. Super Admin + Admin. */
export const canUploadFiles = (role?: UserRole | null): boolean =>
  isAdmin(role)

/** Delete files from Storage. Super Admin only. */
export const canDeleteFiles = (role?: UserRole | null): boolean =>
  isSuperAdmin(role)

/** Download files from Storage. Any signed-in user. */
export const canDownloadFiles = (role?: UserRole | null): boolean =>
  !!role
