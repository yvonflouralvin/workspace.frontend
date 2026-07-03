import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@repo/network/client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@repo/network/client";
import {
  getPatientObservations,
  getLatestObservations,
  createObservationsBatch,
  deleteObservation,
} from "../app/lib/emr-api";
import { ApiError } from "../app/lib/api";

const mockApiFetch = vi.mocked(apiFetch);

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200 });
}

function err(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status });
}

const OBS_STUB = {
  id: 1,
  workspace_id: 1,
  patient_id: 42,
  patient: { id: 42, dossier_number: "PAT-001", nom: "Doe", postnom: "John", prenom: "J" },
  encounter_id: null,
  measured_by: null,
  staff: null,
  code: "TEMPERATURE",
  value: 37.2,
  unit: "°C",
  measured_at: "2026-07-01T09:00:00Z",
  created_at: "2026-07-01T09:00:00Z",
  deleted_at: null,
};

beforeEach(() => {
  mockApiFetch.mockReset();
});

// ─── getPatientObservations ───────────────────────────────────────────────────

describe("getPatientObservations", () => {
  it("calls correct URL without filters", async () => {
    mockApiFetch.mockResolvedValue(ok([OBS_STUB]));

    const result = await getPatientObservations(42);

    expect(mockApiFetch).toHaveBeenCalledWith("/api/patients/42/observations");
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(37.2);
  });

  it("appends code filter to URL", async () => {
    mockApiFetch.mockResolvedValue(ok([]));

    await getPatientObservations(42, { code: "TEMPERATURE" });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/patients/42/observations?code=TEMPERATURE"
    );
  });

  it("appends from/to date filters", async () => {
    mockApiFetch.mockResolvedValue(ok([]));

    await getPatientObservations(42, {
      from: "2026-06-01T00:00:00Z",
      to: "2026-06-30T23:59:59Z",
    });

    const url = mockApiFetch.mock.calls[0][0] as string;
    expect(url).toContain("from=");
    expect(url).toContain("to=");
  });

  it("throws ApiError on 401", async () => {
    mockApiFetch.mockResolvedValue(err({ detail: "Non autorisé" }, 401));

    await expect(getPatientObservations(42)).rejects.toThrow(ApiError);
  });

  it("throws ApiError on 404", async () => {
    mockApiFetch.mockResolvedValue(err({ detail: "Patient introuvable" }, 404));

    let thrown: ApiError | undefined;
    try {
      await getPatientObservations(99);
    } catch (e) {
      thrown = e as ApiError;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown?.status).toBe(404);
  });
});

// ─── getLatestObservations ────────────────────────────────────────────────────

describe("getLatestObservations", () => {
  it("calls /observations/latest endpoint", async () => {
    mockApiFetch.mockResolvedValue(ok([OBS_STUB]));

    const result = await getLatestObservations(42);

    expect(mockApiFetch).toHaveBeenCalledWith("/api/patients/42/observations/latest");
    expect(result[0].code).toBe("TEMPERATURE");
  });

  it("returns empty array when no observations", async () => {
    mockApiFetch.mockResolvedValue(ok([]));

    const result = await getLatestObservations(42);

    expect(result).toEqual([]);
  });

  it("throws ApiError on non-ok response", async () => {
    mockApiFetch.mockResolvedValue(err({ detail: "Erreur serveur" }, 500));

    await expect(getLatestObservations(42)).rejects.toThrow(ApiError);
  });
});

// ─── createObservationsBatch ──────────────────────────────────────────────────

describe("createObservationsBatch", () => {
  const batchItem = {
    patient_id: 42,
    code: "TEMPERATURE" as const,
    value: 37.5,
    unit: "°C",
    measured_at: "2026-07-01T09:00:00Z",
  };

  it("posts to /api/observations/batch", async () => {
    mockApiFetch.mockResolvedValue(ok([OBS_STUB]));

    await createObservationsBatch([batchItem]);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/observations/batch",
      expect.objectContaining({
        method: "POST",
        body: { observations: [batchItem] },
      })
    );
  });

  it("returns array of created observations", async () => {
    const obs2 = { ...OBS_STUB, id: 2, code: "FC", value: 80 };
    mockApiFetch.mockResolvedValue(ok([OBS_STUB, obs2]));

    const result = await createObservationsBatch([batchItem]);

    expect(result).toHaveLength(2);
  });

  it("throws ApiError on 422 (invalid code)", async () => {
    mockApiFetch.mockResolvedValue(
      err({ detail: "code invalide ou non autorisé en saisie directe" }, 422)
    );

    await expect(createObservationsBatch([batchItem])).rejects.toThrow(ApiError);
  });
});

// ─── deleteObservation ────────────────────────────────────────────────────────

describe("deleteObservation", () => {
  it("calls DELETE /api/observations/:id", async () => {
    mockApiFetch.mockResolvedValue(new Response(null, { status: 204 }));

    await deleteObservation(1);

    expect(mockApiFetch).toHaveBeenCalledWith("/api/observations/1", {
      method: "DELETE",
    });
  });

  it("resolves without error on 204", async () => {
    mockApiFetch.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteObservation(1)).resolves.toBeUndefined();
  });

  it("throws ApiError on 404", async () => {
    mockApiFetch.mockResolvedValue(err({ detail: "Observation introuvable" }, 404));

    let thrown: ApiError | undefined;
    try {
      await deleteObservation(999);
    } catch (e) {
      thrown = e as ApiError;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown?.status).toBe(404);
    expect(thrown?.message).toBe("Observation introuvable");
  });

  it("throws ApiError with fallback message when detail missing", async () => {
    mockApiFetch.mockResolvedValue(err({}, 500));

    let thrown: ApiError | undefined;
    try {
      await deleteObservation(1);
    } catch (e) {
      thrown = e as ApiError;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown?.message).toBe("Erreur lors de la suppression.");
  });
});
