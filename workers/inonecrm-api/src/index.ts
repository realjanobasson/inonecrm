import { Hono } from "hono";
import { cors } from "hono/cors";
import { sign, verify } from "hono/jwt";
import { drizzle } from "drizzle-orm/d1";
import { and, desc, eq, like, or } from "drizzle-orm";

import type { Env } from "./env";
import {
  tenants,
  users,
  contacts,
  pipelines,
  stages,
  opportunities,
  tasks,
  conversations,
  messages,
} from "@inonecrm/db";

type JwtPayload = {
  sub: string;
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};

const app = new Hono<{ Bindings: Env & { JWT_SECRET?: string; SEED_TOKEN?: string } }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

function nowMs() {
  return Date.now();
}

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function jsonError(c: any, status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return c.json({ ok: false, code, message, ...extra }, status);
}

function getDb(c: any) {
  return drizzle(c.env.DB);
}

async function requireAuth(c: any): Promise<JwtPayload | null> {
  const auth = c.req.header("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const secret = c.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const payload = (await verify(token, secret)) as JwtPayload;
    // minimal issuer/audience sanity check
    if (payload.iss !== c.env.JWT_ISSUER || payload.aud !== c.env.JWT_AUDIENCE) return null;
    return payload;
  } catch {
    return null;
  }
}

function tenantGuard(c: any, jwt: JwtPayload) {
  const tenantId = c.req.param("tenantId");
  if (tenantId !== jwt.tenantId) {
    return jsonError(c, 403, "forbidden", "Tenant mismatch");
  }
  return null;
}

async function assertTenantActive(c: any, tenantId: string) {
  const db = getDb(c);
  const t = await db.select().from(tenants).where(eq(tenants.id, tenantId)).get();
  if (!t) return jsonError(c, 404, "not_found", "Tenant not found");

  if (t.status !== "active") {
    return jsonError(c, 403, "tenant_locked", "Tenant is locked");
  }

  if (t.plan === "trial" && t.trialEndsAt && nowMs() > t.trialEndsAt) {
    return c.json(
      {
        ok: false,
        code: "trial_expired",
        message: "Trial expired. Upgrade required.",
        upgrade: { plan: "Full access", price: 275, currency: "USD" },
      },
      402
    );
  }

  return null;
}

// --- Password hashing (PBKDF2) ---

function bytesToB64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  // @ts-ignore
  return btoa(s);
}

function b64ToBytes(b64: string) {
  // @ts-ignore
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 160_000;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  const hash = new Uint8Array(bits);
  return `pbkdf2$${iterations}$${bytesToB64(salt)}$${bytesToB64(hash)}`;
}

async function verifyPassword(password: string, stored: string) {
  try {
    const [algo, iterStr, saltB64, hashB64] = stored.split("$");
    if (algo !== "pbkdf2") return false;
    const iterations = Number(iterStr);
    const salt = b64ToBytes(saltB64);
    const expected = b64ToBytes(hashB64);

    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, [
      "deriveBits",
    ]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      key,
      256
    );
    const actual = new Uint8Array(bits);
    if (actual.length !== expected.length) return false;
    let ok = 0;
    for (let i = 0; i < actual.length; i++) ok |= actual[i] ^ expected[i];
    return ok === 0;
  } catch {
    return false;
  }
}

async function issueToken(c: any, user: { id: string; tenantId: string; role: string }) {
  const secret = c.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 7; // 7 days session
  const payload: JwtPayload = {
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role,
    iat,
    exp,
    iss: c.env.JWT_ISSUER,
    aud: c.env.JWT_AUDIENCE,
  };
  return sign(payload, secret);
}

// --- Routes ---

app.get("/health", (c) => c.json({ ok: true, env: c.env.ENV }));

app.post("/auth/signup", async (c) => {
  const db = getDb(c);
  const body = await c.req.json().catch(() => null);
  const email = (body?.email || "").toLowerCase().trim();
  const password = body?.password || "";
  const name = (body?.name || "").trim();
  const tenantName = (body?.tenantName || "").trim() || "My Business";

  if (!email || !password || password.length < 8 || !name) {
    return jsonError(c, 400, "bad_request", "Name, email and password (8+ chars) are required");
  }

  const tenantId = crypto.randomUUID();
  const slug = `${toSlug(tenantName) || "business"}-${tenantId.slice(0, 6)}`;
  const userId = crypto.randomUUID();
  const ts = nowMs();
  const trialStartedAt = ts;
  const trialEndsAt = ts + 7 * 24 * 60 * 60 * 1000;

  const pwHash = await hashPassword(password);

  // create tenant
  await db
    .insert(tenants)
    .values({
      id: tenantId,
      name: tenantName,
      slug,
      plan: "trial",
      status: "active",
      trialStartedAt,
      trialEndsAt,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  // create user (org_admin)
  await db
    .insert(users)
    .values({
      id: userId,
      tenantId,
      email,
      name,
      role: "org_admin",
      passwordHash: pwHash,
      isActive: 1,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  // seed default pipeline + stages
  const pipelineId = crypto.randomUUID();
  await db
    .insert(pipelines)
    .values({ id: pipelineId, tenantId, name: "Sales Pipeline", isDefault: 1, createdAt: ts, updatedAt: ts })
    .run();

  const stageDefs = [
    { name: "New Lead", orderIndex: 10 },
    { name: "Qualified", orderIndex: 20 },
    { name: "Quoted", orderIndex: 30 },
    { name: "Booked", orderIndex: 40 },
    { name: "Won", orderIndex: 90, isWon: 1 },
    { name: "Lost", orderIndex: 99, isLost: 1 },
  ];

  for (const s of stageDefs) {
    await db
      .insert(stages)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        pipelineId,
        name: s.name,
        orderIndex: s.orderIndex,
        isWon: (s as any).isWon || 0,
        isLost: (s as any).isLost || 0,
        createdAt: ts,
        updatedAt: ts,
      })
      .run();
  }

  const token = await issueToken(c, { id: userId, tenantId, role: "org_admin" });

  return c.json({
    ok: true,
    token,
    tenant: { id: tenantId, name: tenantName, slug, plan: "trial", trialEndsAt },
    user: { id: userId, email, name, role: "org_admin" },
  });
});

app.post("/auth/login", async (c) => {
  const db = getDb(c);
  const body = await c.req.json().catch(() => null);
  const email = (body?.email || "").toLowerCase().trim();
  const password = body?.password || "";
  if (!email || !password) return jsonError(c, 400, "bad_request", "Email and password required");

  // pick the most recent active user with this email
  const u = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isActive, 1)))
    .orderBy(desc(users.updatedAt))
    .get();

  if (!u || !u.passwordHash) return jsonError(c, 401, "invalid_credentials", "Invalid login");

  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) return jsonError(c, 401, "invalid_credentials", "Invalid login");

  const t = await db.select().from(tenants).where(eq(tenants.id, u.tenantId)).get();
  if (!t) return jsonError(c, 401, "invalid_credentials", "Invalid login");

  const token = await issueToken(c, { id: u.id, tenantId: u.tenantId, role: u.role });

  return c.json({
    ok: true,
    token,
    tenant: { id: t.id, name: t.name, slug: t.slug, plan: t.plan, status: t.status, trialEndsAt: t.trialEndsAt },
    user: { id: u.id, email: u.email, name: u.name, role: u.role },
  });
});

app.get("/auth/me", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");

  const db = getDb(c);
  const u = await db.select().from(users).where(eq(users.id, jwt.sub)).get();
  const t = await db.select().from(tenants).where(eq(tenants.id, jwt.tenantId)).get();
  if (!u || !t) return jsonError(c, 401, "unauthorized", "Session invalid");

  return c.json({
    ok: true,
    user: { id: u.id, email: u.email, name: u.name, role: u.role },
    tenant: { id: t.id, name: t.name, slug: t.slug, plan: t.plan, status: t.status, trialEndsAt: t.trialEndsAt },
  });
});

// ---- Tenant resources ----

app.get("/tenants/:tenantId/meta", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const db = getDb(c);
  const t = await db.select().from(tenants).where(eq(tenants.id, jwt.tenantId)).get();
  return c.json({ ok: true, tenant: t });
});

// Contacts
app.get("/tenants/:tenantId/contacts", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const q = (c.req.query("q") || "").trim();
  const db = getDb(c);

  const where = q
    ? and(
        eq(contacts.tenantId, jwt.tenantId),
        or(like(contacts.fullName, `%${q}%`), like(contacts.email, `%${q}%`), like(contacts.phone, `%${q}%`))
      )
    : eq(contacts.tenantId, jwt.tenantId);

  const items = await db.select().from(contacts).where(where).orderBy(desc(contacts.updatedAt)).all();
  return c.json({ ok: true, items });
});

app.post("/tenants/:tenantId/contacts", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const body = await c.req.json().catch(() => null);
  const fullName = (body?.fullName || "").trim();
  if (!fullName) return jsonError(c, 400, "bad_request", "fullName required");

  const email = (body?.email || "").trim() || null;
  const phone = (body?.phone || "").trim() || null;
  const companyName = (body?.companyName || "").trim() || null;

  const id = crypto.randomUUID();
  const ts = nowMs();
  const searchText = [fullName, email || "", phone || "", companyName || ""].join(" ").toLowerCase();

  const db = getDb(c);
  await db
    .insert(contacts)
    .values({
      id,
      tenantId: jwt.tenantId,
      fullName,
      email,
      phone,
      companyName,
      ownerUserId: jwt.sub,
      lifecycle: "lead",
      status: "active",
      searchText,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  return c.json({ ok: true, id });
});

app.delete("/tenants/:tenantId/contacts/:id", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const id = c.req.param("id");
  const db = getDb(c);
  await db.delete(contacts).where(and(eq(contacts.tenantId, jwt.tenantId), eq(contacts.id, id))).run();
  return c.json({ ok: true });
});

// Pipelines + stages
app.get("/tenants/:tenantId/pipelines/default", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const db = getDb(c);
  const pipe = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.tenantId, jwt.tenantId), eq(pipelines.isDefault, 1)))
    .get();

  if (!pipe) return jsonError(c, 404, "not_found", "Default pipeline not found");

  const stageItems = await db
    .select()
    .from(stages)
    .where(and(eq(stages.tenantId, jwt.tenantId), eq(stages.pipelineId, pipe.id)))
    .orderBy(stages.orderIndex)
    .all();

  return c.json({ ok: true, pipeline: pipe, stages: stageItems });
});

// Opportunities
app.get("/tenants/:tenantId/opportunities", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const pipelineId = (c.req.query("pipelineId") || "").trim();
  const db = getDb(c);

  const where = pipelineId
    ? and(eq(opportunities.tenantId, jwt.tenantId), eq(opportunities.pipelineId, pipelineId))
    : eq(opportunities.tenantId, jwt.tenantId);

  const items = await db.select().from(opportunities).where(where).orderBy(desc(opportunities.updatedAt)).all();
  return c.json({ ok: true, items });
});

app.post("/tenants/:tenantId/opportunities", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const body = await c.req.json().catch(() => null);
  const contactId = (body?.contactId || "").trim();
  const pipelineId = (body?.pipelineId || "").trim();
  const stageId = (body?.stageId || "").trim();
  const title = (body?.title || "").trim() || "New deal";
  const valueCents = Number(body?.valueCents || 0) || 0;

  if (!contactId || !pipelineId || !stageId) {
    return jsonError(c, 400, "bad_request", "contactId, pipelineId, stageId required");
  }

  const id = crypto.randomUUID();
  const ts = nowMs();
  const db = getDb(c);

  await db
    .insert(opportunities)
    .values({
      id,
      tenantId: jwt.tenantId,
      contactId,
      ownerUserId: jwt.sub,
      pipelineId,
      stageId,
      title,
      valueCents,
      currency: "ZAR",
      status: "open",
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  return c.json({ ok: true, id });
});

app.patch("/tenants/:tenantId/opportunities/:id", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const patch: any = { updatedAt: nowMs() };
  if (typeof body?.stageId === "string") patch.stageId = body.stageId;
  if (typeof body?.title === "string") patch.title = body.title;
  if (body?.valueCents !== undefined) patch.valueCents = Number(body.valueCents) || 0;

  const db = getDb(c);
  await db
    .update(opportunities)
    .set(patch)
    .where(and(eq(opportunities.tenantId, jwt.tenantId), eq(opportunities.id, id)))
    .run();

  return c.json({ ok: true });
});

// Tasks
app.get("/tenants/:tenantId/tasks", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const db = getDb(c);
  const items = await db.select().from(tasks).where(eq(tasks.tenantId, jwt.tenantId)).orderBy(desc(tasks.updatedAt)).all();
  return c.json({ ok: true, items });
});

app.post("/tenants/:tenantId/tasks", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const body = await c.req.json().catch(() => null);
  const title = (body?.title || "").trim();
  if (!title) return jsonError(c, 400, "bad_request", "title required");

  const id = crypto.randomUUID();
  const ts = nowMs();
  const dueAt = body?.dueAt ? Number(body.dueAt) : null;

  const db = getDb(c);
  await db
    .insert(tasks)
    .values({
      id,
      tenantId: jwt.tenantId,
      title,
      description: (body?.description || "").trim() || null,
      status: "open",
      dueAt,
      ownerUserId: jwt.sub,
      contactId: body?.contactId || null,
      opportunityId: body?.opportunityId || null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  return c.json({ ok: true, id });
});

app.patch("/tenants/:tenantId/tasks/:id", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const patch: any = { updatedAt: nowMs() };
  if (typeof body?.status === "string") patch.status = body.status;
  if (typeof body?.title === "string") patch.title = body.title;

  const db = getDb(c);
  await db.update(tasks).set(patch).where(and(eq(tasks.tenantId, jwt.tenantId), eq(tasks.id, id))).run();
  return c.json({ ok: true });
});

// Inbox (basic)
app.get("/tenants/:tenantId/conversations", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const db = getDb(c);
  const items = await db
    .select()
    .from(conversations)
    .where(eq(conversations.tenantId, jwt.tenantId))
    .orderBy(desc(conversations.lastMessageAt))
    .all();
  return c.json({ ok: true, items });
});

app.post("/tenants/:tenantId/conversations/demo", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const db = getDb(c);
  const ts = nowMs();

  // Ensure at least one contact exists
  let c0 = await db
    .select()
    .from(contacts)
    .where(eq(contacts.tenantId, jwt.tenantId))
    .orderBy(desc(contacts.updatedAt))
    .get();

  if (!c0) {
    const contactId = crypto.randomUUID();
    await db
      .insert(contacts)
      .values({
        id: contactId,
        tenantId: jwt.tenantId,
        fullName: "Demo Lead",
        email: "lead@example.com",
        phone: "+27 00 000 0000",
        companyName: "Demo Co",
        ownerUserId: jwt.sub,
        lifecycle: "lead",
        status: "active",
        searchText: "demo lead lead@example.com",
        createdAt: ts,
        updatedAt: ts,
      })
      .run();

    c0 = await db.select().from(contacts).where(eq(contacts.id, contactId)).get();
  }

  const convoId = crypto.randomUUID();
  await db
    .insert(conversations)
    .values({
      id: convoId,
      tenantId: jwt.tenantId,
      contactId: c0!.id,
      assignedUserId: jwt.sub,
      primaryChannel: "whatsapp",
      externalThreadId: null,
      status: "open",
      unreadCount: 1,
      lastMessageAt: ts,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  await db
    .insert(messages)
    .values({
      id: crypto.randomUUID(),
      tenantId: jwt.tenantId,
      conversationId: convoId,
      contactId: c0!.id,
      direction: "in",
      channel: "whatsapp",
      provider: "demo",
      providerMessageId: null,
      from: c0!.phone || "contact",
      to: "business",
      body: "Hi! I'm interested — can you send pricing and book me a time?",
      html: null,
      status: "received",
      sentAt: null,
      receivedAt: ts,
      createdAt: ts,
    })
    .run();

  return c.json({ ok: true, id: convoId });
});

app.get("/tenants/:tenantId/conversations/:id/messages", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const convoId = c.req.param("id");
  const db = getDb(c);
  const items = await db
    .select()
    .from(messages)
    .where(and(eq(messages.tenantId, jwt.tenantId), eq(messages.conversationId, convoId)))
    .orderBy(desc(messages.createdAt))
    .all();
  return c.json({ ok: true, items: items.reverse() });
});

app.post("/tenants/:tenantId/conversations/:id/messages", async (c) => {
  const jwt = await requireAuth(c);
  if (!jwt) return jsonError(c, 401, "unauthorized", "Not logged in");
  const tg = tenantGuard(c, jwt);
  if (tg) return tg;

  const gate = await assertTenantActive(c, jwt.tenantId);
  if (gate) return gate;

  const convoId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const text = (body?.body || "").trim();
  if (!text) return jsonError(c, 400, "bad_request", "body required");

  const ts = nowMs();
  const msgId = crypto.randomUUID();

  const db = getDb(c);
  await db
    .insert(messages)
    .values({
      id: msgId,
      tenantId: jwt.tenantId,
      conversationId: convoId,
      contactId: body?.contactId || null,
      direction: "out",
      channel: "app",
      provider: "internal",
      providerMessageId: null,
      from: jwt.sub,
      to: "contact",
      body: text,
      html: null,
      status: "sent",
      sentAt: ts,
      receivedAt: null,
      createdAt: ts,
    })
    .run();

  // update conversation last_message_at
  await db
    .update(conversations)
    .set({ lastMessageAt: ts, updatedAt: ts })
    .where(and(eq(conversations.tenantId, jwt.tenantId), eq(conversations.id, convoId)))
    .run();

  return c.json({ ok: true, id: msgId });
});

// --- Admin (superadmin) ---

async function requireSuperadmin(c: any): Promise<JwtPayload | null> {
  const jwt = await requireAuth(c);
  if (!jwt) return null;
  if (jwt.role !== "superadmin") return null;
  return jwt;
}

app.post("/admin/seed", async (c) => {
  // Create a superadmin user ONLY when SEED_TOKEN matches.
  const seedToken = c.env.SEED_TOKEN;
  const authHeader = c.req.header("Authorization") || "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!seedToken || provided !== seedToken) {
    return jsonError(c, 401, "unauthorized", "Missing/invalid seed token");
  }

  const db = getDb(c);
  const body = await c.req.json().catch(() => null);
  const email = (body?.email || "").toLowerCase().trim();
  const password = body?.password || "";
  const name = (body?.name || "").trim() || "Super Admin";

  if (!email || !password || password.length < 8) {
    return jsonError(c, 400, "bad_request", "email + password (8+ chars) required");
  }

  // Superadmin lives in its own tenant (internal)
  const ts = nowMs();
  const internalTenantSlug = "inonecrm-internal";

  let t = await db.select().from(tenants).where(eq(tenants.slug, internalTenantSlug)).get();
  if (!t) {
    const tenantId = crypto.randomUUID();
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: "InOneCRM Internal",
        slug: internalTenantSlug,
        plan: "enterprise",
        status: "active",
        trialStartedAt: null,
        trialEndsAt: null,
        createdAt: ts,
        updatedAt: ts,
      })
      .run();
    t = await db.select().from(tenants).where(eq(tenants.slug, internalTenantSlug)).get();
  }

  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.tenantId, t!.id)))
    .get();
  if (existing) return c.json({ ok: true, already: true });

  const pwHash = await hashPassword(password);
  await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      tenantId: t!.id,
      email,
      name,
      role: "superadmin",
      passwordHash: pwHash,
      isActive: 1,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();

  return c.json({ ok: true });
});

app.get("/admin/tenants", async (c) => {
  const jwt = await requireSuperadmin(c);
  if (!jwt) return jsonError(c, 403, "forbidden", "Superadmin required");

  const db = getDb(c);
  const items = await db.select().from(tenants).orderBy(desc(tenants.updatedAt)).all();
  return c.json({ ok: true, items });
});

app.patch("/admin/tenants/:id", async (c) => {
  const jwt = await requireSuperadmin(c);
  if (!jwt) return jsonError(c, 403, "forbidden", "Superadmin required");

  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const patch: any = { updatedAt: nowMs() };
  if (typeof body?.plan === "string") patch.plan = body.plan;
  if (typeof body?.status === "string") patch.status = body.status;
  if (body?.trialEndsAt !== undefined) patch.trialEndsAt = body.trialEndsAt ? Number(body.trialEndsAt) : null;

  const db = getDb(c);
  await db.update(tenants).set(patch).where(eq(tenants.id, id)).run();
  return c.json({ ok: true });
});

app.get("/admin/users", async (c) => {
  const jwt = await requireSuperadmin(c);
  if (!jwt) return jsonError(c, 403, "forbidden", "Superadmin required");

  const db = getDb(c);
  const items = await db.select().from(users).orderBy(desc(users.updatedAt)).all();
  return c.json({ ok: true, items });
});

app.patch("/admin/users/:id", async (c) => {
  const jwt = await requireSuperadmin(c);
  if (!jwt) return jsonError(c, 403, "forbidden", "Superadmin required");

  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const patch: any = { updatedAt: nowMs() };
  if (typeof body?.role === "string") patch.role = body.role;
  if (body?.isActive !== undefined) patch.isActive = body.isActive ? 1 : 0;

  const db = getDb(c);
  await db.update(users).set(patch).where(eq(users.id, id)).run();
  return c.json({ ok: true });
});

export default app;
