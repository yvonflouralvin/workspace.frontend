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
  groupe_sanguin: string | null;
  rhesus: string | null;
  derniere_tension: string | null;
  dernier_poids: string | null;
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
  groupe_sanguin?: string;
  rhesus?: string;
  derniere_tension?: string;
  dernier_poids?: string;
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

export async function archivePatient(id: number): Promise<Patient> {
  const response = await apiFetch(`/api/patients/${id}/archive`, { method: "POST", body: {} });
  return parseResponse(response);
}

// ─── HR Employees ────────────────────────────────────────────────────────────

export interface HREmployee {
  id: number;
  user_id: number | null;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string | null;
  group_name: string | null;
}

export async function searchHREmployees(q: string): Promise<HREmployee[]> {
  const all: HREmployee[] = await parseResponse(await apiFetch("/api/hr-employees"));
  if (!q.trim()) return all;
  const lower = q.toLowerCase();
  return all.filter(
    (e) =>
      e.first_name.toLowerCase().includes(lower) ||
      e.last_name.toLowerCase().includes(lower) ||
      e.email.toLowerCase().includes(lower) ||
      (e.job_title ?? "").toLowerCase().includes(lower),
  );
}

// ─── Services ────────────────────────────────────────────────────────────────

export interface Service {
  id: number;
  workspace_id: number;
  nom: string;
  code: string;
  description: string | null;
  is_system: boolean;
  active: boolean;
  created_at: string;
}

export interface ServiceCreateInput { nom: string; code: string; description?: string }
export interface ServiceUpdateInput { nom?: string; code?: string; description?: string; active?: boolean }

export async function listServices(): Promise<Service[]> {
  return parseResponse(await apiFetch("/api/services"));
}

export async function syncStockInventory(): Promise<{ synced: number; pending: number; total: number }> {
  return parseResponse(await apiFetch("/api/services/sync-stock", { method: "POST" }));
}

export interface Parametre {
  id: number;
  cle: string;
  nom: string;
  description: string | null;
  valeur: Record<string, unknown>;
}

export async function listParametres(): Promise<Parametre[]> {
  return parseResponse(await apiFetch("/api/parametres"));
}

export interface ParametreT<T> {
  id: number;
  cle: string;
  nom: string;
  description: string | null;
  valeur: T;
}

export async function getParametre<T>(cle: string): Promise<ParametreT<T>> {
  return parseResponse(await apiFetch(`/api/parametres/${cle}`));
}

export async function updateParametre<T>(cle: string, valeur: T): Promise<ParametreT<T>> {
  return parseResponse(
    await apiFetch(`/api/parametres/${cle}`, { method: "PUT", body: { valeur } }),
  );
}

export async function createService(data: ServiceCreateInput): Promise<Service> {
  return parseResponse(await apiFetch("/api/services", { method: "POST", body: data }));
}

export async function updateService(id: number, data: ServiceUpdateInput): Promise<Service> {
  return parseResponse(await apiFetch(`/api/services/${id}`, { method: "PATCH", body: data }));
}

export async function deleteService(id: number): Promise<void> {
  const res = await apiFetch(`/api/services/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Impossible de supprimer le service", res.status);
  }
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export type StaffRole = "MEDECIN" | "INFIRMIER" | "AIDE_SOIGNANT" | "SECRETAIRE" | "AUTRE";
export const ROLE_LABELS: Record<StaffRole, string> = {
  MEDECIN: "Médecin",
  INFIRMIER: "Infirmier(ère)",
  AIDE_SOIGNANT: "Aide-soignant(e)",
  SECRETAIRE: "Secrétaire médical(e)",
  AUTRE: "Autre",
};

export interface HostoStaff {
  id: number;
  workspace_id: number;
  employee_id: number;
  nom_cache: string;
  prenom_cache: string;
  role: StaffRole;
  specialite: string | null;
  services: Service[];
  active: boolean;
  created_at: string;
}

export interface StaffCreateInput {
  employee_id: number;
  user_id?: number | null;
  nom_cache: string;
  prenom_cache: string;
  role: string;
  specialite?: string;
  service_ids?: number[];
}
export interface StaffUpdateInput { role?: string; specialite?: string; service_ids?: number[]; active?: boolean }

export interface StaffPage {
  items: HostoStaff[];
  total: number;
  page: number;
  pages: number;
}

export async function listStaff(params?: {
  q?: string;
  service_id?: number;
  role?: string;
  active?: boolean | null;
  page?: number;
  page_size?: number;
}): Promise<StaffPage> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.service_id) qs.set("service_id", String(params.service_id));
  if (params?.role) qs.set("role", params.role);
  if (params?.active === true) qs.set("active", "true");
  if (params?.active === false) qs.set("active", "false");
  if (params?.page && params.page > 1) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  return parseResponse(await apiFetch(`/api/staff${qs.toString() ? `?${qs}` : ""}`));
}

export async function createStaff(data: StaffCreateInput): Promise<HostoStaff> {
  return parseResponse(await apiFetch("/api/staff", { method: "POST", body: data }));
}

// Services du staff médical courant (réception scopée). Vide si l'user n'est pas staff.
export async function getMyReceptionServices(): Promise<Service[]> {
  return parseResponse(await apiFetch("/api/reception/my-services"));
}

export async function updateStaff(id: number, data: StaffUpdateInput): Promise<HostoStaff> {
  return parseResponse(await apiFetch(`/api/staff/${id}`, { method: "PATCH", body: data }));
}

export async function deleteStaff(id: number): Promise<void> {
  const res = await apiFetch(`/api/staff/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Impossible de supprimer ce membre", res.status);
  }
}

// ─── Service Schedules ───────────────────────────────────────────────────────

export interface ServiceSchedule {
  id: number;
  workspace_id: number;
  service_id: number;
  day_of_week: number; // 0=Lundi … 6=Dimanche
  open_time: string;   // "HH:MM:SS"
  close_time: string;
  max_slots: number | null;
  label: string | null;
  active: boolean;
  created_at: string;
  staff: HostoStaff[];
}

export interface ScheduleCreateInput {
  service_id: number;
  day_of_week: number;
  open_time: string;
  close_time: string;
  max_slots?: number;
  label?: string;
}

export interface ScheduleUpdateInput {
  day_of_week?: number;
  open_time?: string;
  close_time?: string;
  max_slots?: number | null;
  label?: string | null;
  active?: boolean;
}

export async function listSchedules(params?: {
  service_id?: number;
  day_of_week?: number;
  active?: boolean;
}): Promise<ServiceSchedule[]> {
  const qs = new URLSearchParams();
  if (params?.service_id !== undefined) qs.set("service_id", String(params.service_id));
  if (params?.day_of_week !== undefined) qs.set("day_of_week", String(params.day_of_week));
  if (params?.active !== undefined) qs.set("active", String(params.active));
  return parseResponse(await apiFetch(`/api/schedules${qs.toString() ? `?${qs}` : ""}`));
}

export async function createSchedule(data: ScheduleCreateInput): Promise<ServiceSchedule> {
  return parseResponse(await apiFetch("/api/schedules", { method: "POST", body: data }));
}

export async function updateSchedule(id: number, data: ScheduleUpdateInput): Promise<ServiceSchedule> {
  return parseResponse(await apiFetch(`/api/schedules/${id}`, { method: "PATCH", body: data }));
}

export async function deleteSchedule(id: number): Promise<void> {
  const res = await apiFetch(`/api/schedules/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Impossible de supprimer cet horaire", res.status);
  }
}

export async function addStaffToSchedule(scheduleId: number, staffId: number): Promise<ServiceSchedule> {
  return parseResponse(await apiFetch(`/api/schedules/${scheduleId}/staff`, { method: "POST", body: { staff_id: staffId } }));
}

export async function removeStaffFromSchedule(scheduleId: number, staffId: number): Promise<ServiceSchedule> {
  return parseResponse(await apiFetch(`/api/schedules/${scheduleId}/staff/${staffId}`, { method: "DELETE" }));
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export type AppointmentType = "CONSULTATION" | "URGENCE" | "CONTROLE" | "CHIRURGIE";
export type AppointmentStatus = "EN_ATTENTE" | "EN_COURS" | "TERMINE" | "ANNULE";
export type AppointmentPriority = "NORMAL" | "URGENT" | "TRES_URGENT" | "CRITIQUE";

export const TYPE_LABELS: Record<AppointmentType, string> = {
  CONSULTATION: "Consultation", URGENCE: "Urgence", CONTROLE: "Contrôle", CHIRURGIE: "Chirurgie",
};
export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  EN_ATTENTE: "En attente", EN_COURS: "En cours", TERMINE: "Terminé", ANNULE: "Annulé",
};
export const PRIORITY_LABELS: Record<AppointmentPriority, string> = {
  NORMAL: "Normal", URGENT: "Urgent", TRES_URGENT: "Très urgent", CRITIQUE: "Critique",
};

export interface PatientMini { id: number; dossier_number: string; nom: string; postnom: string; prenom: string }

export interface Appointment {
  id: number;
  workspace_id: number;
  patient_id: number;
  patient: PatientMini;
  service_id: number | null;
  service: Service | null;
  staff_id: number | null;
  staff: HostoStaff | null;
  scheduled_at: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  motif: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreateInput {
  patient_id: number;
  service_id?: number;
  staff_id?: number;
  scheduled_at?: string;
  type?: string;
  priority?: string;
  motif?: string;
  notes?: string;
}
export interface AppointmentUpdateInput {
  service_id?: number | null;
  staff_id?: number | null;
  scheduled_at?: string | null;
  type?: string;
  status?: string;
  priority?: string;
  motif?: string;
  notes?: string;
}

export async function listAppointments(params?: {
  day?: string; service_id?: number; status?: string; priority?: string;
}): Promise<Appointment[]> {
  const q = new URLSearchParams();
  if (params?.day) q.set("day", params.day);
  if (params?.service_id) q.set("service_id", String(params.service_id));
  if (params?.status) q.set("status", params.status);
  if (params?.priority) q.set("priority", params.priority);
  return parseResponse(await apiFetch(`/api/appointments${q.toString() ? `?${q}` : ""}`));
}

export async function createAppointment(data: AppointmentCreateInput): Promise<Appointment> {
  return parseResponse(await apiFetch("/api/appointments", { method: "POST", body: data }));
}

export async function updateAppointment(id: number, data: AppointmentUpdateInput): Promise<Appointment> {
  return parseResponse(await apiFetch(`/api/appointments/${id}`, { method: "PATCH", body: data }));
}

export async function deleteAppointment(id: number): Promise<void> {
  const res = await apiFetch(`/api/appointments/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Impossible de supprimer ce rendez-vous", res.status);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout() {
  const response = await apiFetch("/api/logout", { method: "POST" });

  return parseResponse(response);
}
