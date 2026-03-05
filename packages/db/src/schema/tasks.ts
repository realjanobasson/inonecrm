import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),

    title: text("title").notNull(),
    description: text("description"),

    status: text("status").notNull().default("open"), // open | done
    dueAt: integer("due_at"),

    ownerUserId: text("owner_user_id"),
    contactId: text("contact_id"),
    opportunityId: text("opportunity_id"),

    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    tenantIdx: index("tasks_tenant_idx").on(t.tenantId),
    ownerIdx: index("tasks_owner_idx").on(t.tenantId, t.ownerUserId),
    dueIdx: index("tasks_due_idx").on(t.tenantId, t.dueAt),
  })
);
