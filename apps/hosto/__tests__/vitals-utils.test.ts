import { describe, it, expect } from "vitest";
import {
  computeIMC,
  isAbnormal,
  validateField,
  NORMAL,
  BOUNDS,
  UNITS,
} from "../components/emr/vitals-utils";

// ─── computeIMC ──────────────────────────────────────────────────────────────

describe("computeIMC", () => {
  it("computes IMC correctly (75kg / 175cm → 24.5)", () => {
    const latest = [
      { code: "POIDS", value: 75 },
      { code: "TAILLE", value: 175 },
    ];
    expect(computeIMC(latest)).toBe(24.5);
  });

  it("rounds to 1 decimal", () => {
    // 70 / 1.78² = 22.0963... → 22.1
    const latest = [
      { code: "POIDS", value: 70 },
      { code: "TAILLE", value: 178 },
    ];
    expect(computeIMC(latest)).toBe(22.1);
  });

  it("returns null when POIDS is missing", () => {
    const latest = [{ code: "TAILLE", value: 175 }];
    expect(computeIMC(latest)).toBeNull();
  });

  it("returns null when TAILLE is missing", () => {
    const latest = [{ code: "POIDS", value: 75 }];
    expect(computeIMC(latest)).toBeNull();
  });

  it("returns null when latest is empty", () => {
    expect(computeIMC([])).toBeNull();
  });

  it("returns null when TAILLE is 0 (division guard)", () => {
    const latest = [
      { code: "POIDS", value: 75 },
      { code: "TAILLE", value: 0 },
    ];
    expect(computeIMC(latest)).toBeNull();
  });

  it("ignores unrelated codes", () => {
    const latest = [
      { code: "TEMPERATURE", value: 37 },
      { code: "POIDS", value: 60 },
      { code: "TAILLE", value: 160 },
      { code: "FC", value: 80 },
    ];
    // 60 / 1.6² = 23.4375 → 23.4
    expect(computeIMC(latest)).toBe(23.4);
  });
});

// ─── isAbnormal ──────────────────────────────────────────────────────────────

describe("isAbnormal", () => {
  it("returns false for value within NORMAL range", () => {
    expect(isAbnormal("TEMPERATURE", 37.0)).toBe(false);
  });

  it("returns false at exact lower bound", () => {
    expect(isAbnormal("TEMPERATURE", 36.1)).toBe(false);
  });

  it("returns false at exact upper bound", () => {
    expect(isAbnormal("TEMPERATURE", 37.5)).toBe(false);
  });

  it("returns true for fever (TEMPERATURE > 37.5)", () => {
    expect(isAbnormal("TEMPERATURE", 39.0)).toBe(true);
  });

  it("returns true for hypothermia (TEMPERATURE < 36.1)", () => {
    expect(isAbnormal("TEMPERATURE", 35.0)).toBe(true);
  });

  it("returns false for codes without NORMAL range (POIDS)", () => {
    expect(isAbnormal("POIDS", 500)).toBe(false);
  });

  it("returns false for codes without NORMAL range (TAILLE)", () => {
    expect(isAbnormal("TAILLE", 250)).toBe(false);
  });

  it("returns false for codes without NORMAL range (IMC)", () => {
    expect(isAbnormal("IMC", 50)).toBe(false);
  });

  it("returns true for SPO2 below 95%", () => {
    expect(isAbnormal("SPO2", 94)).toBe(true);
  });

  it("returns true for FC above 100 bpm", () => {
    expect(isAbnormal("FC", 120)).toBe(true);
  });

  it("returns false for FC within normal range (60–100)", () => {
    expect(isAbnormal("FC", 75)).toBe(false);
  });

  it("returns true for DOULEUR_EVA above 3", () => {
    expect(isAbnormal("DOULEUR_EVA", 5)).toBe(true);
  });
});

// ─── validateField ───────────────────────────────────────────────────────────

describe("validateField", () => {
  it("returns null for empty string", () => {
    expect(validateField("TEMPERATURE", "")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(validateField("TEMPERATURE", "   ")).toBeNull();
  });

  it("returns error for non-numeric input", () => {
    expect(validateField("TEMPERATURE", "abc")).toBe("Valeur invalide");
  });

  it("returns null for valid value within BOUNDS", () => {
    expect(validateField("TEMPERATURE", "37.5")).toBeNull();
  });

  it("returns warning when value exceeds upper BOUND", () => {
    // TEMPERATURE bounds: [30, 45]
    expect(validateField("TEMPERATURE", "50")).toBe(
      `Valeur inhabituelle (attendu 30–45 ${UNITS["TEMPERATURE"]})`
    );
  });

  it("returns warning when value is below lower BOUND", () => {
    expect(validateField("TEMPERATURE", "20")).toBe(
      `Valeur inhabituelle (attendu 30–45 ${UNITS["TEMPERATURE"]})`
    );
  });

  it("returns null at exact lower bound", () => {
    expect(validateField("TEMPERATURE", "30")).toBeNull();
  });

  it("returns null at exact upper bound", () => {
    expect(validateField("TEMPERATURE", "45")).toBeNull();
  });

  it("returns null for codes without BOUNDS (IMC)", () => {
    expect(validateField("IMC", "99")).toBeNull();
  });

  it("returns warning for SPO2 below 50", () => {
    expect(validateField("SPO2", "40")).toContain("Valeur inhabituelle");
  });

  it("returns null for POIDS at lower boundary (0.5 kg)", () => {
    expect(validateField("POIDS", "0.5")).toBeNull();
  });

  it("returns warning for POIDS below 0.5 kg", () => {
    expect(validateField("POIDS", "0.1")).toContain("Valeur inhabituelle");
  });
});

// ─── Constants sanity checks ─────────────────────────────────────────────────

describe("NORMAL ranges", () => {
  it("TEMPERATURE normal is [36.1, 37.5]", () => {
    expect(NORMAL["TEMPERATURE"]).toEqual([36.1, 37.5]);
  });

  it("SPO2 normal is [95, 100]", () => {
    expect(NORMAL["SPO2"]).toEqual([95, 100]);
  });

  it("POIDS has no normal range", () => {
    expect(NORMAL["POIDS"]).toBeUndefined();
  });
});

describe("BOUNDS ranges", () => {
  it("DOULEUR_EVA bounds are [0, 10]", () => {
    expect(BOUNDS["DOULEUR_EVA"]).toEqual([0, 10]);
  });

  it("TAILLE bounds are [20, 250]", () => {
    expect(BOUNDS["TAILLE"]).toEqual([20, 250]);
  });
});
