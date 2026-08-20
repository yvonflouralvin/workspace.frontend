"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Les mémoires sont l'écran le plus fréquenté du service : on y ouvre. */
export default function Racine() {
  const router = useRouter();
  useEffect(() => router.replace("/memoires"), [router]);
  return null;
}
