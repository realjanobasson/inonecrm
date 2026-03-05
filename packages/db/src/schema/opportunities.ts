import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const opportunities = sqliteTable("opportunities",{
  id:text("id").primaryKey(),
  tenantId:text("tenant_id").notNull(),
  contactId:text("contact_id").notNull(),
  ownerUserId:text("owner_user_id"),
  pipelineId:text("pipeline_id").notNull(),
  stageId:text("stage_id").notNull(),
  title:text("title").notNull(),
  valueCents:integer("value_cents").notNull().default(0),
  currency:text("currency").notNull().default("ZAR"),
  status:text("status").notNull().default("open"),
  closeDate:integer("close_date"),
  createdAt:integer("created_at").notNull(),
  updatedAt:integer("updated_at").notNull()
},(o)=>({ tenantIdx:index("opps_tenant_idx").on(o.tenantId), pipelineStageIdx:index("opps_pipeline_stage_idx").on(o.tenantId,o.pipelineId,o.stageId), contactIdx:index("opps_contact_idx").on(o.tenantId,o.contactId), ownerIdx:index("opps_owner_idx").on(o.tenantId,o.ownerUserId) }));
