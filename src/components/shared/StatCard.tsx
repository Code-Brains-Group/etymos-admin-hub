interface StatCardProps {
  label: string;
  value: string | number;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="border border-border bg-background p-5">
      <div className="text-3xl font-mono font-medium">{value}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">{label}</div>
    </div>
  );
}
