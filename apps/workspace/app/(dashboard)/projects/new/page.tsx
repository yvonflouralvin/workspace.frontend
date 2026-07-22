"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La création se fait via la modale de la liste des projets.
export default function NewProjectRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/projects?create=1"); }, [router]);
  return <div className="p-8 text-sm text-on-surface-variant">Redirection…</div>;
}
