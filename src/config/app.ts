/**
 * Global app settings. Change `name` to rename the whole application.
 */
export const APP_CONFIG = {
  name: "NEXUS",
  tagline: "Личное пространство знаний и планирования",
  /** IndexedDB database name. Changing it starts with an empty database. */
  dbName: "nexus",
  /** First day of week: 1 = Monday */
  weekStartsOn: 1 as const,
  /** Hours shown in the day view timeline */
  dayStartHour: 6,
  dayEndHour: 24,
} as const;
