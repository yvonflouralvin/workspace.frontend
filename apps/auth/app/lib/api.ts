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
