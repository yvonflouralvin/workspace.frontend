type Props = {
  name: string;
  className?: string;
};

export function Icon({ name, className }: Props) {
  return (
    <span className={`material-symbols-outlined ${className ?? ""}`}>
      {name}
    </span>
  );
}