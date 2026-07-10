"use client";

import { apiFetch } from "@repo/network/client";
import type { ReportData, ReportDescriptor } from "@repo/reporting-widgets/ReportWidget";
import type { HomeWidget } from "@repo/reporting-widgets/DashboardHomeWidget";

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

export interface HomeResponse {
  widgets: HomeWidget[];
}

export interface DomainDetail {
  provider: string;
  app_label: string;
  domain_key: string;
  label: string;
  reports: ReportDescriptor[];
}

export async function getHome(): Promise<HomeResponse> {
  const res = await apiFetch("/api/home");
  if (!res.ok) throw new Error("Impossible de charger l'accueil du tableau de bord.");
  return res.json();
}

export async function getDomain(provider: string, domain: string): Promise<DomainDetail> {
  const qs = new URLSearchParams({ provider, domain });
  const res = await apiFetch(`/api/domain?${qs.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Impossible de charger le domaine.");
  }
  return res.json();
}

export interface SourceField {
  name: string;
  type: string;
  nullable?: boolean;
  values?: string[];
}

export interface SourceModel {
  name: string;
  fields: SourceField[];
}

export interface DataSourceApp {
  app_key: string;
  app_label: string;
  models: SourceModel[];
}

export interface SourcesResponse {
  sources: DataSourceApp[];
}

export async function getSources(): Promise<SourcesResponse> {
  const res = await apiFetch("/api/sources");
  if (!res.ok) throw new Error("Impossible de charger les sources de données.");
  return res.json();
}
