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

export async function checkEmail(email: string): Promise<{ exists: boolean }> {
  const response = await apiFetch(`/api/check-email`, {
    method: "POST",
    body: { email },
  });

  return parseResponse(response);
}

export async function login(email: string, password: string) {
  const response = await apiFetch(`/api/login`, {
    method: "POST",
    body: { email, password },
  });

  return parseResponse(response);
}

export async function getLoginMethods(
  email: string
): Promise<{ exists: boolean; methods: string[]; enforced_provider: string | null }> {
  const response = await apiFetch(`/api/login-methods?email=${encodeURIComponent(email)}`);

  return parseResponse(response);
}

export async function requestOtp(
  email: string,
  purpose: "login" | "signup"
): Promise<{ sent: boolean; dev_code?: string }> {
  const response = await apiFetch(`/api/otp/request`, {
    method: "POST",
    body: { email, purpose },
  });

  return parseResponse(response);
}

export async function verifyOtp(params: {
  email: string;
  code: string;
  purpose: "login" | "signup";
  fullName?: string;
  workspaceName?: string;
  workspaceType?: "individual" | "organization";
}) {
  const response = await apiFetch(`/api/otp/verify`, {
    method: "POST",
    body: {
      email: params.email,
      code: params.code,
      purpose: params.purpose,
      full_name: params.fullName,
      workspace_name: params.workspaceName,
      workspace_type: params.workspaceType,
    },
  });

  return parseResponse(response);
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  workspaceName: string,
  workspaceType: "individual" | "organization"
) {
  const response = await apiFetch(`/api/register`, {
    method: "POST",
    body: {
      email,
      password,
      full_name: fullName,
      workspace_name: workspaceName,
      workspace_type: workspaceType,
    },
  });

  return parseResponse(response);
}
