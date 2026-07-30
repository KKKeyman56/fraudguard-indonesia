import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("E2E_SUPABASE_CONFIG_MISSING");

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stamp = Date.now();
const email = `fraudguard-e2e-${stamp}@example.com`;
const password = `Fg!${randomBytes(18).toString("base64url")}`;
const consentedAt = new Date().toISOString();
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    terms_accepted: true,
    privacy_accepted: true,
    screening_consent: true,
    legal_version: "2026-07-30",
    screening_consent_version: "screening-2026-07-30",
    consented_at: consentedAt,
  },
});
if (error || !data.user) throw new Error(`E2E_USER_CREATE_FAILED:${error?.message ?? "NO_USER"}`);

await writeFile(
  ".e2e-session.json",
  JSON.stringify({ id: data.user.id, email, password }),
  { encoding: "utf8", mode: 0o600 },
);
console.log(`Created isolated E2E user ${data.user.id}`);
