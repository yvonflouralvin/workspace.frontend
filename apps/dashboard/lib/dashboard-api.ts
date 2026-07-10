"use client";

import { apiFetch } from "@repo/network/client";
import type { ReportData, ReportDescriptor } from "@repo/reporting-widgets/ReportWidget";

export interface ContractDomain {
  provider: string;
  app_label: string;
  domain_key: string;
  label: string;
  reports: ReportDescriptor[];
}

export interface Contract {
  domains: ContractDomain[];
}

export async function getContract(): Promise<Contract> {
  const res = await apiFetch("/api/contract");
  if (!res.ok) throw new Error("Impossible de charger le contrat de reporting.");
  return res.json();
}

export async function getReportData(
  provider: string,
  report: string,
  filters?: Record<string, string>,
): Promise<ReportData> {
  const qs = new URLSearchParams({ provider, report, ...(filters ?? {}) });
  const res = await apiFetch(`/api/report-data?${qs.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Impossible de charger les données du rapport.");
  }
  return res.json();
}
