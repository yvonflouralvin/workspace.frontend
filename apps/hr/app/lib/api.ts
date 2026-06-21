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
