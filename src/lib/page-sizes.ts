/**
 * Page sizes shared by server-rendered first pages and client pagination.
 * They live outside "use client" modules: a value exported from a client
 * module reaches server components as a client reference, not a number.
 */
export const COLLECTION_PAGE_SIZE = 120;
export const PRIORITIES_PAGE_SIZE = 100;
