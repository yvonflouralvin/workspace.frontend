import { apiFetch } from "@repo/network/client";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.message ?? "Une erreur est survenue", response.status);
  }

  return data;
}

export interface ContactInput {
  full_name: string;
  relation: string;
  phone?: string;
  email?: string;
  adresse?: string;
  is_emergency?: boolean;
  is_primary?: boolean;
}

export interface Contact {
  id: number;
  full_name: string;
  relation: string;
  phone: string | null;
  email: string | null;
  adresse: string | null;
  is_emergency: boolean;
  is_primary: boolean;
}

export interface PatientSummary {
  id: number;
  dossier_number: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  date_naissance: string;
  lieu_naissance_ville: string;
  lieu_naissance_pays: string;
  adresse_ville: string | null;
  created_at: string;
}

export interface Patient {
  id: number;
  dossier_number: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  date_naissance: string;
  lieu_naissance_ville: string;
  lieu_naissance_province: string | null;
  lieu_naissance_pays: string;
  adresse_ligne1: string | null;
  adresse_quartier: string | null;
  adresse_ville: string | null;
  adresse_province: string | null;
  adresse_pays: string | null;
  contacts: Contact[];
  created_at: string;
  updated_at: string;
}

export interface PatientCreateInput {
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  date_naissance: string;
  lieu_naissance_ville: string;
  lieu_naissance_province?: string;
  lieu_naissance_pays: string;
  adresse_ligne1?: string;
  adresse_quartier?: string;
  adresse_ville?: string;
  adresse_province?: string;
  adresse_pays?: string;
  contacts?: ContactInput[];
}

export interface PatientPage {
  items: PatientSummary[];
  total: number;
  page: number;
  pages: number;
}

export async function listPatients(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PatientPage> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("page_size", String(params.pageSize));

  const qs = search.toString();
  const response = await apiFetch(`/api/patients${qs ? `?${qs}` : ""}`);

  return parseResponse(response);
}

export async function getPatient(id: number): Promise<Patient> {
  const response = await apiFetch(`/api/patients/${id}`);

  return parseResponse(response);
}

export async function createPatient(data: PatientCreateInput): Promise<Patient> {
  const response = await apiFetch("/api/patients", { method: "POST", body: data });

  return parseResponse(response);
}

export interface PatientUpdateInput {
  nom?: string;
  postnom?: string;
  prenom?: string;
  sexe?: string;
  date_naissance?: string;
  lieu_naissance_ville?: string;
  lieu_naissance_province?: string;
  lieu_naissance_pays?: string;
  adresse_ligne1?: string;
  adresse_quartier?: string;
  adresse_ville?: string;
  adresse_province?: string;
  adresse_pays?: string;
}

export async function updatePatient(id: number, data: PatientUpdateInput): Promise<Patient> {
  const response = await apiFetch(`/api/patients/${id}`, { method: "PATCH", body: data });
  return parseResponse(response);
}

export async function deletePatient(id: number): Promise<void> {
  const response = await apiFetch(`/api/patients/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.message ?? "Impossible de supprimer le patient", response.status);
  }
}

export async function logout() {
  const response = await apiFetch("/api/logout", { method: "POST" });

  return parseResponse(response);
}
