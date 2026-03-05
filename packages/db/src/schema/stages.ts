import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const stages = sqliteTable(
  "stages",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    pipelineId: text("pipeline_id").notNull(),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    isWon: integer("is_won").notNull().default(0),
    isLost: integer("is_lost").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (s) => ({
    tenantIdx: index("stages_tenant_idx").on(s.tenantId),
    pipelineIdx: index("stages_pipeline_idx").on(s.tenantId, s.pipelineId, s.orderIndex),
  })
);
