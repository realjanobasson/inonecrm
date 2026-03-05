import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const pipelines = sqliteTable(
  "pipelines",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    isDefault: integer("is_default").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (p) => ({ tenantIdx: index("pipelines_tenant_idx").on(p.tenantId) })
);
