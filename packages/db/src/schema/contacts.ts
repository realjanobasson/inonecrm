import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const contacts = sqliteTable("contacts",{
  id:text("id").primaryKey(),
  tenantId:text("tenant_id").notNull(),
  firstName:text("first_name"),
  lastName:text("last_name"),
  fullName:text("full_name").notNull(),
  email:text("email"),
  phone:text("phone"),
  companyName:text("company_name"),
  ownerUserId:text("owner_user_id"),
  lifecycle:text("lifecycle").notNull().default("lead"),
  status:text("status").notNull().default("active"),
  searchText:text("search_text").notNull().default(""),
  createdAt:integer("created_at").notNull(),
  updatedAt:integer("updated_at").notNull()
},(c)=>({ tenantIdx:index("contacts_tenant_idx").on(c.tenantId), ownerIdx:index("contacts_owner_idx").on(c.tenantId,c.ownerUserId), emailIdx:index("contacts_email_idx").on(c.tenantId,c.email), phoneIdx:index("contacts_phone_idx").on(c.tenantId,c.phone) }));
