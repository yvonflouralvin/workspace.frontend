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
  const response = await fetch(`/api/check-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return parseResponse(response);
}

export async function login(email: string, password: string) {
  const response = await fetch(`/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseResponse(response);
}

export async function getLoginMethods(
  email: string
): Promise<{ exists: boolean; methods: string[]; enforced_provider: string | null }> {
  const response = await fetch(`/api/login-methods?email=${encodeURIComponent(email)}`);

  return parseResponse(response);
}

export async function requestOtp(
  email: string,
  purpose: "login" | "signup"
): Promise<{ sent: boolean; dev_code?: string }> {
  const response = await fetch(`/api/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, purpose }),
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
  const response = await fetch(`/api/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: params.email,
      code: params.code,
      purpose: params.purpose,
      full_name: params.fullName,
      workspace_name: params.workspaceName,
      workspace_type: params.workspaceType,
    }),
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
  const response = await fetch(`/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      workspace_name: workspaceName,
      workspace_type: workspaceType,
    }),
  });

  return parseResponse(response);
}
