"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowBackOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { WidgetForm } from "@/components/WidgetForm";
import { getSources, getWidget, type DataSourceApp, type Widget } from "@/lib/dashboard-api";

export default function EditWidgetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [sources, setSources] = useState<DataSourceApp[]>([]);
  const [widget, setWidget] = useState<Widget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSources(), getWidget(id)])
      .then(([s, w]) => { setSources(s.sources); setWidget(w); })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, [id]);

  const back = () => router.push("/widgets");

  return (
    <DashboardShell>
      <div className="p-6 max-w-[800px] mx-auto w-full">
        <button type="button" onClick={back}
          className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">
          <ArrowBackOutlined style={{ fontSize: 18 }} /> Widgets
        </button>
        <h1 className="mb-6 text-headline-lg font-display text-on-surface">Modifier le widget</h1>
        {error && <p className="mb-4 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">{error}</p>}
        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-surface-container" />
        ) : widget ? (
          <WidgetForm sources={sources} widget={widget} onSaved={back} onCancel={back} />
        ) : null}
      </div>
    </DashboardShell>
  );
}
