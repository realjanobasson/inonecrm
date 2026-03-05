const TOKEN_KEY = "inonecrm_token";
const TENANT_KEY = "inonecrm_tenant";

export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setSession(token: string, tenantId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TENANT_KEY);
}

export function getTenantId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TENANT_KEY) || "";
}
