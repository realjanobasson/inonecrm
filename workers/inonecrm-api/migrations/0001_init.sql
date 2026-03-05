-- InOneCRM D1 schema (v1)
-- Apply with: wrangler d1 migrations apply inone-db --remote

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'active',
  trial_started_at INTEGER,
  trial_ends_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tenants_slug_idx ON tenants(slug);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  password_hash TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS users_tenant_idx ON users(tenant_id);
CREATE INDEX IF NOT EXISTS users_email_tenant_idx ON users(tenant_id, email);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  owner_user_id TEXT,
  lifecycle TEXT NOT NULL DEFAULT 'lead',
  status TEXT NOT NULL DEFAULT 'active',
  search_text TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS contacts_tenant_idx ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS contacts_owner_idx ON contacts(tenant_id, owner_user_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(tenant_id, email);
CREATE INDEX IF NOT EXISTS contacts_phone_idx ON contacts(tenant_id, phone);

CREATE TABLE IF NOT EXISTS pipelines (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pipelines_tenant_idx ON pipelines(tenant_id);

CREATE TABLE IF NOT EXISTS stages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pipeline_id TEXT NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_won INTEGER NOT NULL DEFAULT 0,
  is_lost INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS stages_tenant_idx ON stages(tenant_id);
CREATE INDEX IF NOT EXISTS stages_pipeline_idx ON stages(tenant_id, pipeline_id, order_index);

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  owner_user_id TEXT,
  pipeline_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  title TEXT NOT NULL,
  value_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'open',
  close_date INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS opps_tenant_idx ON opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS opps_pipeline_stage_idx ON opportunities(tenant_id, pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS opps_contact_idx ON opportunities(tenant_id, contact_id);
CREATE INDEX IF NOT EXISTS opps_owner_idx ON opportunities(tenant_id, owner_user_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  due_at INTEGER,
  owner_user_id TEXT,
  contact_id TEXT,
  opportunity_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_tenant_idx ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS tasks_owner_idx ON tasks(tenant_id, owner_user_id);
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(tenant_id, due_at);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  contact_id TEXT,
  assigned_user_id TEXT,
  primary_channel TEXT NOT NULL,
  external_thread_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS conversations_tenant_idx ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS conversations_contact_idx ON conversations(tenant_id, contact_id);
CREATE INDEX IF NOT EXISTS conversations_assigned_idx ON conversations(tenant_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS conversations_last_msg_idx ON conversations(tenant_id, last_message_at);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  contact_id TEXT,
  direction TEXT NOT NULL,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  body TEXT,
  html TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at INTEGER,
  received_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_tenant_idx ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS messages_convo_idx ON messages(tenant_id, conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_provider_idx ON messages(tenant_id, provider, provider_message_id);

PRAGMA foreign_keys = ON;
