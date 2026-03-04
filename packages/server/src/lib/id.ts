import { ulid } from "ulid"
import { z } from "zod"

// =============================================================================
// Prefixed ID System
// =============================================================================
// All entity IDs use the format: {prefix}_{ulid}
// The prefix identifies the entity type, making it easy to:
// - Identify entity type from ID alone
// - Derive parent type from parentId without extra queries
// - Debug and trace entities in logs

const prefixes = {
  user: "usr",
  session: "ses",
  account: "acc",
  verification: "vrf",
  area: "area",
  project: "prj",
  heading: "hdg",
  task: "tsk",
  checklistItem: "chk",
  tag: "tag",
  taskTag: "ttg",
  taskOrdering: "ord",
  repeatingRule: "rep",
  apiKey: "key",
} as const

export type EntityType = keyof typeof prefixes
export type EntityPrefix = (typeof prefixes)[EntityType]

/**
 * Create a new prefixed ID for an entity type
 * @example createId("task") => "tsk_01ARZ3NDEKTSV4RRFFQ69G5FAV"
 */
export function createId<T extends EntityType>(entity: T): string {
  return `${prefixes[entity]}_${ulid()}`
}

/**
 * Get the prefix for an entity type
 * @example getPrefix("task") => "tsk"
 */
export function getPrefix(entity: EntityType): EntityPrefix {
  return prefixes[entity]
}

/**
 * Validate that an ID has the correct prefix for an entity type
 * @example validateId("task", "tsk_01ARZ...") => true
 */
export function validateId(entity: EntityType, id: string): boolean {
  return id.startsWith(`${prefixes[entity]}_`)
}

/**
 * Create a Zod schema that validates an ID has the correct prefix
 * @example schema("task") => z.string().startsWith("tsk_")
 */
export function idSchema(entity: EntityType) {
  return z.string().startsWith(`${prefixes[entity]}_`)
}

// =============================================================================
// List Type System
// =============================================================================
// The new "List" abstraction: both Projects and Areas are "Lists" that hold tasks.
// - Projects (prj_) are lists that can be completed
// - Areas (area_) are lists that never end
// - listId points to the containing List
// - headingId points to a grouping Heading within the List (optional)

export type ListType = "none" | "area" | "project"

/**
 * Derive the list type from a listId
 * @example getListType("prj_01ARZ...") => "project"
 * @example getListType("area_01ARZ...") => "area"
 * @example getListType(null) => "none" (Inbox)
 */
export function getListType(listId: string | null | undefined): ListType {
  if (!listId) return "none"
  if (listId.startsWith(`${prefixes.area}_`)) return "area"
  if (listId.startsWith(`${prefixes.project}_`)) return "project"
  throw new Error(`Invalid list ID prefix: ${listId}. Must be area (area_) or project (prj_)`)
}

/**
 * Check if a listId is an area
 */
export function isAreaId(id: string | null | undefined): id is string {
  return !!id && id.startsWith(`${prefixes.area}_`)
}

/**
 * Check if a listId is a project
 */
export function isProjectId(id: string | null | undefined): id is string {
  return !!id && id.startsWith(`${prefixes.project}_`)
}

/**
 * Check if an id is a heading
 */
export function isHeadingId(id: string | null | undefined): id is string {
  return !!id && id.startsWith(`${prefixes.heading}_`)
}

/**
 * Validate that a listId has a valid prefix (area or project only - not heading)
 */
export function isValidListId(listId: string): boolean {
  return listId.startsWith(`${prefixes.area}_`) || listId.startsWith(`${prefixes.project}_`)
}

/**
 * Validate that a headingId has a valid prefix
 */
export function isValidHeadingId(headingId: string): boolean {
  return headingId.startsWith(`${prefixes.heading}_`)
}

/**
 * Zod schema for listId - must be a valid area or project ID
 */
export const listIdSchema = z
  .string()
  .refine(isValidListId, {
    message: "listId must be a valid area (area_) or project (prj_) ID",
  })
  .nullable()
  .optional()

/**
 * Zod schema for headingId - must be a valid heading ID
 */
export const headingIdSchema = z
  .string()
  .refine(isValidHeadingId, {
    message: "headingId must be a valid heading (hdg_) ID",
  })
  .nullable()
  .optional()

// =============================================================================
// ID Factory Functions for Schema
// =============================================================================
// These are used as $defaultFn in drizzle schema definitions

export const createUserId = () => createId("user")
export const createSessionId = () => createId("session")
export const createAccountId = () => createId("account")
export const createVerificationId = () => createId("verification")
export const createAreaId = () => createId("area")
export const createProjectId = () => createId("project")
export const createHeadingId = () => createId("heading")
export const createTaskId = () => createId("task")
export const createChecklistItemId = () => createId("checklistItem")
export const createTagId = () => createId("tag")
export const createTaskTagId = () => createId("taskTag")
export const createTaskOrderingId = () => createId("taskOrdering")
export const createRepeatingRuleId = () => createId("repeatingRule")
export const createApiKeyId = () => createId("apiKey")
