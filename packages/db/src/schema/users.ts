import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users",{
  id:text("id").primaryKey(),
  tenantId:text("tenant_id").notNull(),
  email:text("email").notNull(),
  name:text("name").notNull(),
  role:text("role").notNull().default("member"),
  passwordHash:text("password_hash"),
  isActive:integer("is_active").notNull().default(1),
  createdAt:integer("created_at").notNull(),
  updatedAt:integer("updated_at").notNull()
},(u)=>({ tenantIdx:index("users_tenant_idx").on(u.tenantId), emailTenantIdx:index("users_email_tenant_idx").on(u.tenantId,u.email) }));
