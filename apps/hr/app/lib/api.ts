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
