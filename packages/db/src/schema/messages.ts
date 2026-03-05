import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const messages = sqliteTable("messages",{
  id:text("id").primaryKey(),
  tenantId:text("tenant_id").notNull(),
  conversationId:text("conversation_id").notNull(),
  contactId:text("contact_id"),
  direction:text("direction").notNull(),
  channel:text("channel").notNull(),
  provider:text("provider").notNull(),
  providerMessageId:text("provider_message_id"),
  from:text("from").notNull(),
  to:text("to").notNull(),
  body:text("body"),
  html:text("html"),
  status:text("status").notNull().default("sent"),
  sentAt:integer("sent_at"),
  receivedAt:integer("received_at"),
  createdAt:integer("created_at").notNull()
},(m)=>({ tenantIdx:index("messages_tenant_idx").on(m.tenantId), convoIdx:index("messages_convo_idx").on(m.tenantId,m.conversationId,m.createdAt), providerIdx:index("messages_provider_idx").on(m.tenantId,m.provider,m.providerMessageId) }));
