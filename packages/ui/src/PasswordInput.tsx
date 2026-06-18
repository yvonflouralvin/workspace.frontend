"use client";

import { useState } from "react";
import { Visibility, VisibilityOff, AutorenewOutlined } from "@mui/icons-material";

function generatePassword(length = 14) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  generatable = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  generatable?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-3 pr-20 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
      />
      <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
        {generatable && (
          <button
            type="button"
            onClick={() => {
              onChange(generatePassword());
              setVisible(true);
            }}
            title="Générer un mot de passe"
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <AutorenewOutlined style={{ fontSize: 18 }} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Masquer" : "Afficher"}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          {visible ? (
            <VisibilityOff style={{ fontSize: 18 }} />
          ) : (
            <Visibility style={{ fontSize: 18 }} />
          )}
        </button>
      </div>
    </div>
  );
}
