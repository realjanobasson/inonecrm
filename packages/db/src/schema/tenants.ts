import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// Tenants = businesses / workspaces (multi-tenant)
// Trial + billing gating happens at tenant level.
export const tenants = sqliteTable(
  "tenants",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),

    // plan: trial | pro | enterprise
    plan: text("plan").notNull().default("trial"),

    // status: active | locked
    status: text("status").notNull().default("active"),

    trialStartedAt: integer("trial_started_at"),
    trialEndsAt: integer("trial_ends_at"),

    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({ slugIdx: index("tenants_slug_idx").on(t.slug) })
);
