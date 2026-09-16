"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { getConfiguration } from "@/lib/compta-api";
import { WarningAmberOutlined } from "@mui/icons-material";

export function DeviseTenueGuard() {
  const pathname = usePathname();
  const { can } = usePermissions();
  const [deviseTenue, setDeviseTenue] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    getConfiguration().then((c) => setDeviseTenue(c.devise_tenue));
  }, []);

  if (deviseTenue === undefined || deviseTenue) return null;
  if (pathname === "/parametres/devise") return null;

  return (
    <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-300 px-4 py-2.5 text-body-sm text-amber-900">
      <WarningAmberOutlined style={{ fontSize: 18 }} className="shrink-0" />
      <span className="flex-1">
        Devise de tenue non configurée — aucune écriture ne peut être passée tant que ce réglage n&rsquo;est pas fait.
      </span>
      {can("comptabilite.parametrage.manage") && (
        <Link href="/parametres/devise" className="shrink-0 font-semibold underline hover:no-underline">
          Configurer maintenant
        </Link>
      )}
    </div>
  );
}
