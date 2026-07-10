"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowBackOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { WidgetForm } from "@/components/WidgetForm";
import { getSources, type DataSourceApp } from "@/lib/dashboard-api";

function NewWidgetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") ?? "count";

  const [sources, setSources] = useState<DataSourceApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSources().then((r) => setSources(r.sources)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const back = () => router.push("/widgets");

  return (
    <div className="p-6 max-w-[800px] mx-auto w-full">
      <button type="button" onClick={back}
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">
        <ArrowBackOutlined style={{ fontSize: 18 }} /> Widgets
      </button>
      <h1 className="mb-6 text-headline-lg font-display text-on-surface">Nouveau widget</h1>
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-surface-container" />
      ) : (
        <WidgetForm sources={sources} initialType={initialType} onSaved={back} onCancel={back} />
      )}
    </div>
  );
}

export default function NewWidgetPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<div className="p-6" />}>
        <NewWidgetInner />
      </Suspense>
    </DashboardShell>
  );
}
