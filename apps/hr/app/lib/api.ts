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

export async function listDepartments(): Promise<{
  departments: { id: number; name: string; headcount: number }[];
}> {
  const response = await apiFetch("/api/departments");

  return parseResponse(response);
}

export async function logout() {
  const response = await apiFetch("/api/logout", { method: "POST" });

  return parseResponse(response);
}

export interface GroupSummary {
  id: number;
  name: string;
  is_root: boolean;
  subgroup_count: number;
  employee_count: number;
}

export interface EmployeeSummary {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface GroupDetail {
  id: number;
  name: string;
  parent_id: number | null;
  is_root: boolean;
  manager: EmployeeSummary | null;
  ancestors: GroupSummary[];
  children: GroupSummary[];
  employees: EmployeeSummary[];
}

export interface GroupOption {
  id: number;
  path: string;
}

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  group_id: number;
  group_name: string;
  job_title: string | null;
  address: string | null;
  phone: string | null;
}

export async function getRootGroup(): Promise<GroupDetail> {
  const response = await apiFetch("/api/groups/root");

  return parseResponse(response);
}

export async function getGroup(id: number): Promise<GroupDetail> {
  const response = await apiFetch(`/api/groups/${id}`);

  return parseResponse(response);
}

export async function listGroupOptions(): Promise<GroupOption[]> {
  const response = await apiFetch("/api/groups");

  return parseResponse(response);
}

export async function createGroup(data: {
  name: string;
  parent_id: number;
  manager_id?: number | null;
}): Promise<GroupDetail> {
  const response = await apiFetch("/api/groups", { method: "POST", body: data });

  return parseResponse(response);
}

export async function updateGroup(
  id: number,
  data: { name: string; manager_id: number | null }
): Promise<GroupDetail> {
  const response = await apiFetch(`/api/groups/${id}`, { method: "PATCH", body: data });

  return parseResponse(response);
}

export async function listEmployees(): Promise<Employee[]> {
  const response = await apiFetch("/api/employees");

  return parseResponse(response);
}

export async function getEmployee(id: number): Promise<Employee> {
  const response = await apiFetch(`/api/employees/${id}`);

  return parseResponse(response);
}

export async function updateEmployee(
  id: number,
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    job_title?: string | null;
    group_id?: number;
    address?: string | null;
    phone?: string | null;
  }
): Promise<Employee> {
  const response = await apiFetch(`/api/employees/${id}`, { method: "PATCH", body: data });

  return parseResponse(response);
}

export async function createEmployee(data: {
  first_name: string;
  last_name: string;
  email: string;
  group_id: number;
  job_title?: string;
  address?: string;
  phone?: string;
}): Promise<Employee> {
  const response = await apiFetch("/api/employees", { method: "POST", body: data });

  return parseResponse(response);
}

export interface EmployeeDocument {
  id: number;
  category: string | null;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by_user_id: number | null;
  created_at: string;
}

export async function listEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]> {
  const response = await apiFetch(`/api/employees/${employeeId}/documents`);

  return parseResponse(response);
}

export async function uploadEmployeeDocument(
  employeeId: number,
  file: File,
  category: string
): Promise<EmployeeDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);

  // fetch brut (pas apiFetch) — body multipart, pas de JSON à chiffrer.
  const response = await fetch(`/api/employees/${employeeId}/documents`, {
    method: "POST",
    body: form,
  });

  return parseResponse(response);
}

export async function deleteEmployeeDocument(employeeId: number, documentId: number): Promise<void> {
  const response = await apiFetch(`/api/employees/${employeeId}/documents/${documentId}`, {
    method: "DELETE",
  });

  await parseResponse(response);
}

export function employeeDocumentContentUrl(employeeId: number, documentId: number): string {
  return `/api/employees/${employeeId}/documents/${documentId}/content`;
}

export interface Contract {
  id: number;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  working_time_percent: number;
  base_salary: number;
  salary_period: string;
  currency: string;
  document_id: number | null;
  status: "upcoming" | "active" | "ended";
  created_at: string;
}

export interface ContractInput {
  contract_type: string;
  start_date: string;
  end_date?: string | null;
  working_time_percent?: number;
  base_salary: number;
  salary_period?: string;
  currency?: string;
  document_id?: number | null;
}

export async function listEmployeeContracts(employeeId: number): Promise<Contract[]> {
  const response = await apiFetch(`/api/employees/${employeeId}/contracts`);

  return parseResponse(response);
}

export async function createEmployeeContract(
  employeeId: number,
  data: ContractInput
): Promise<Contract> {
  const response = await apiFetch(`/api/employees/${employeeId}/contracts`, {
    method: "POST",
    body: data,
  });

  return parseResponse(response);
}

export async function updateEmployeeContract(
  employeeId: number,
  contractId: number,
  data: Partial<ContractInput>
): Promise<Contract> {
  const response = await apiFetch(`/api/employees/${employeeId}/contracts/${contractId}`, {
    method: "PATCH",
    body: data,
  });

  return parseResponse(response);
}
