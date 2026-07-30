import { readFile, rm } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("E2E_SUPABASE_CONFIG_MISSING");

const session = JSON.parse(await readFile(".e2e-session.json", "utf8"));
const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error } = await admin.auth.admin.deleteUser(session.id);
if (error) throw new Error(`E2E_USER_DELETE_FAILED:${error.message}`);
await rm(".e2e-session.json", { force: true });
console.log(`Deleted isolated E2E user ${session.id}`);
