"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { GraphQLSelect } from "@repo/ui/GraphQLSelect";
import { createEmployee, ApiError, type Employee } from "@/app/lib/api";

interface GroupRecord {
  id: number;
  name: string;
  parent: GroupRecord | null;
}

function buildGroupPath(group: GroupRecord): string {
  const names: string[] = [];
  let node: GroupRecord | null = group;
  while (node) {
    names.unshift(node.name);
    node = node.parent;
  }
  return names.join(" / ");
}

export function CreateEmployeeDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (employee: Employee) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return;

    setError(null);
    setSubmitting(true);
    try {
      const employee = await createEmployee({
        first_name: firstName,
        last_name: lastName,
        email,
        group_id: groupId,
        job_title: jobTitle || undefined,
        address: address || undefined,
        phone: phone || undefined,
      });
      onCreated(employee);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Nouvel employé" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Prénom</label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Nom</label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Fonction</label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Adresse</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Groupe / Département</label>
          <GraphQLSelect<GroupRecord>
            app="hr"
            model="groups"
            searchFields={["name"]}
            include={["parent"]}
            depth={3}
            value={groupId}
            onChange={(id) => setGroupId(id as number | null)}
            getOptionLabel={buildGroupPath}
            placeholder="Rechercher un groupe…"
          />
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
            disabled={submitting || !groupId}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
          >
            {submitting ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
