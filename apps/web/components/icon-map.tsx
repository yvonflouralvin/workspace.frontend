import {
  Hub,
  AccountTree,
  Insights,
  Description,
  ReceiptLong,
  AccountBalance,
  Contacts,
  Inventory2,
  Groups,
  PlaylistAddCheck,
  Gavel,
  LocalHospital,
  School,
  Storefront,
  type SvgIconComponent,
} from "@mui/icons-material";

const icons: Record<string, SvgIconComponent> = {
  Hub,
  AccountTree,
  Insights,
  Description,
  ReceiptLong,
  AccountBalance,
  Contacts,
  Inventory2,
  Groups,
  PlaylistAddCheck,
  Gavel,
  LocalHospital,
  School,
  Storefront,
};

export function ProduitIcon({ nom, className }: { nom: string; className?: string }) {
  const Icon = icons[nom] ?? Hub;
  return <Icon className={className} />;
}
