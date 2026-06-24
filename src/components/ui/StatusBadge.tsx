type StatusBadgeProps = {
  label: string;
  variant?: "active" | "inactive" | "completed";
};

export function StatusBadge({ label, variant = "active" }: StatusBadgeProps) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    inactive: "bg-zinc-100 text-zinc-600 ring-zinc-500/10",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
