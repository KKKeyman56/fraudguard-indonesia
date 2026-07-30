import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  RISK_ENGINE_VERSION,
  SUPPORTED_RISK_ENGINE_VERSIONS,
  type RiskEngineVersion,
} from "@/lib/risk-engine";

export type RiskEngineRegistryItem = {
  version: RiskEngineVersion;
  displayName: string;
  algorithm: string;
  releaseNotes: string;
  createdAt: string;
};

function isSupportedVersion(value: unknown): value is RiskEngineVersion {
  return typeof value === "string"
    && SUPPORTED_RISK_ENGINE_VERSIONS.includes(value as RiskEngineVersion);
}

export async function getActiveRiskEngineVersion(): Promise<RiskEngineVersion> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("risk_engine_settings")
      .select("active_version")
      .eq("singleton", true)
      .maybeSingle();
    if (error || !isSupportedVersion(data?.active_version)) return RISK_ENGINE_VERSION;
    return data.active_version;
  } catch {
    return RISK_ENGINE_VERSION;
  }
}

export async function getRiskEngineRegistry() {
  const supabase = await createClient();
  const [versionsResult, settingResult, deploymentsResult] = await Promise.all([
    supabase
      .from("risk_engine_versions")
      .select("version, display_name, algorithm, release_notes, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("risk_engine_settings")
      .select("active_version, updated_at")
      .eq("singleton", true)
      .single(),
    supabase
      .from("risk_engine_deployments")
      .select("id, previous_version, new_version, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const firstError = [
    versionsResult.error,
    settingResult.error,
    deploymentsResult.error,
  ].find(Boolean);
  if (firstError) throw new Error(`ENGINE_REGISTRY_READ_FAILED:${firstError.code}`);
  if (!settingResult.data) throw new Error("ENGINE_REGISTRY_SETTING_MISSING");

  return {
    activeVersion: isSupportedVersion(settingResult.data.active_version)
      ? settingResult.data.active_version
      : RISK_ENGINE_VERSION,
    updatedAt: settingResult.data.updated_at as string,
    versions: (versionsResult.data ?? [])
      .filter((item) => isSupportedVersion(item.version))
      .map((item) => ({
        version: item.version as RiskEngineVersion,
        displayName: item.display_name,
        algorithm: item.algorithm,
        releaseNotes: item.release_notes,
        createdAt: item.created_at,
      } satisfies RiskEngineRegistryItem)),
    deployments: deploymentsResult.data ?? [],
  };
}
