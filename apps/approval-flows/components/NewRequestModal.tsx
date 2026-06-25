"use client";

import { useState } from "react";
import { SearchOutlined } from "@mui/icons-material";
import type { FlowSummary } from "@repo/approval-flows/types/flow";

export function NewRequestModal({
  flows,
  onClose,
  onSelect,
}: {
  flows: FlowSummary[];
  onClose: () => void;
  onSelect: (flowId: string) => void;
}) {
  const [query, setQuery] = useState("");

  // app_key !== null = template d'app (mode 1, ex. hr.leave_request) — uniquement
  // soumissible depuis le composant métier qui l'embarque (ApprovalFlowWrapper côté
  // app consommatrice), jamais en libre-service ici. Seuls les flows créés librement
  // dans ce workspace (mode 2, app_key null) sont éligibles à ce raccourci.
  const submittable = flows.filter((flow) => flow.configured && flow.app_key === null);
  const filtered = query
    ? submittable.filter((flow) => flow.title.toLowerCase().includes(query.toLowerCase()))
    : submittable.slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[32rem] bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <SearchOutlined className="text-on-surface-variant" style={{ fontSize: 20 }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant text-sm outline-none"
            placeholder="Rechercher un formulaire à soumettre…"
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-sm text-on-surface-variant text-center">
              {submittable.length === 0 ? "Aucun formulaire disponible." : "Aucun formulaire trouvé."}
            </p>
          ) : (
            filtered.map((flow) => (
              <button
                key={flow.id}
                type="button"
                onClick={() => onSelect(flow.id)}
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container transition-colors"
              >
                {flow.title}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
