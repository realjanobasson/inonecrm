import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const conversations = sqliteTable("conversations",{
  id:text("id").primaryKey(),
  tenantId:text("tenant_id").notNull(),
  contactId:text("contact_id"),
  assignedUserId:text("assigned_user_id"),
  primaryChannel:text("primary_channel").notNull(),
  externalThreadId:text("external_thread_id"),
  status:text("status").notNull().default("open"),
  unreadCount:integer("unread_count").notNull().default(0),
  lastMessageAt:integer("last_message_at").notNull(),
  createdAt:integer("created_at").notNull(),
  updatedAt:integer("updated_at").notNull()
},(t)=>({ tenantIdx:index("conversations_tenant_idx").on(t.tenantId), contactIdx:index("conversations_contact_idx").on(t.tenantId,t.contactId), assignedIdx:index("conversations_assigned_idx").on(t.tenantId,t.assignedUserId), lastMsgIdx:index("conversations_last_msg_idx").on(t.tenantId,t.lastMessageAt) }));
