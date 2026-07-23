"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddOutlined, DashboardOutlined, DeleteOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { createBoard, deleteBoard, getBoards, type BoardSummary } from "@/lib/dashboard-api";

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = () => getBoards().then((r) => setBoards(r.boards)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function create() {
    setErr(null);
    const n = name.trim() || "Nouveau tableau de bord";
    try {
      const b = await createBoard({ name: n, items: [] });
      router.push(`/boards/${b.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur."); }
  }

  async function remove(id: number) {
    setBoards((prev) => prev.filter((b) => b.id !== id));
    await deleteBoard(id).catch(() => load());
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-6 max-w-[1100px] mx-auto w-full">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-headline-lg font-display text-on-surface">Tableaux de bord</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">Composez des pages en arrangeant vos widgets.</p>
          </div>
          <div className="flex items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du tableau…"
              className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none" />
            <button type="button" onClick={create}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container">
              <AddOutlined style={{ fontSize: 18 }} /> Créer
            </button>
          </div>
        </div>
        {err && <p className="mb-4 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">{err}</p>}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-container" />)}</div>
        ) : boards.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant text-center">
            <DashboardOutlined style={{ fontSize: 40 }} className="text-on-surface-variant/30" />
            <p className="text-body-md text-on-surface-variant">Aucun tableau de bord.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => (
              <div key={b.id} className="group relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 hover:border-primary/40"
                onClick={() => router.push(`/boards/${b.id}`)}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><DashboardOutlined style={{ fontSize: 18 }} /></span>
                <p className="truncate text-body-md font-semibold text-on-surface">{b.name}</p>
                <p className="text-label-md text-on-surface-variant">{b.count} widget(s)</p>
                <button type="button" onClick={(e) => { e.stopPropagation(); remove(b.id); }} title="Supprimer"
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-on-surface-variant/40 opacity-0 transition-opacity hover:bg-error/8 hover:text-error group-hover:opacity-100">
                  <DeleteOutlined style={{ fontSize: 16 }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
