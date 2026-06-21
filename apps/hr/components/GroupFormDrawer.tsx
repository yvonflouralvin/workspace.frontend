"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { GraphQLSelect } from "@repo/ui/GraphQLSelect";
import {
  createGroup,
  updateGroup,
  ApiError,
  type GroupDetail,
  type EmployeeSummary,
} from "@/app/lib/api";

interface EmployeeRecord {
  id: number;
  first_name: string;
  last_name: string;
}

function employeeLabel(employee: EmployeeRecord | EmployeeSummary): string {
  return `${employee.first_name} ${employee.last_name}`;
}

type GroupFormDrawerProps =
  | {
      mode: "create";
      parentId: number;
      parentName: string;
      onClose: () => void;
      onSaved: (group: GroupDetail) => void;
    }
  | {
      mode: "edit";
      group: GroupDetail;
      onClose: () => void;
      onSaved: (group: GroupDetail) => void;
    };

export function GroupFormDrawer(props: GroupFormDrawerProps) {
  const { onClose, onSaved } = props;
  const [name, setName] = useState(props.mode === "edit" ? props.group.name : "");
  const [managerId, setManagerId] = useState<number | null>(
    props.mode === "edit" ? props.group.manager?.id ?? null : null
  );
  const [managerLabel, setManagerLabel] = useState<string | null>(
    props.mode === "edit" && props.group.manager ? employeeLabel(props.group.manager) : null
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const group =
        props.mode === "create"
          ? await createGroup({ name, parent_id: props.parentId, manager_id: managerId })
          : await updateGroup(props.group.id, { name, manager_id: managerId });
      onSaved(group);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    props.mode === "create" ? `Nouveau sous-groupe de ${props.parentName}` : `Modifier ${props.group.name}`;

  return (
    <RightDrawer title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Nom</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Responsable</label>
          <GraphQLSelect<EmployeeRecord>
            app="hr"
            model="employees"
            searchFields={["first_name", "last_name"]}
            value={managerId}
            onChange={(id, record) => {
              setManagerId(id as number | null);
              setManagerLabel(record ? employeeLabel(record) : null);
            }}
            getOptionLabel={employeeLabel}
            initialLabel={managerLabel ?? undefined}
            placeholder="Rechercher un employé…"
          />
          {managerId !== null && (
            <button
              type="button"
              onClick={() => {
                setManagerId(null);
                setManagerLabel(null);
              }}
              className="text-xs text-on-surface-variant hover:underline"
            >
              Retirer le responsable
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
