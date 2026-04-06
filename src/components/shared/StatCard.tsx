interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;    // Accent color: used for the left border stripe, icon dot, and faint bg tint
  icon?: string;     // Emoji icon
}

export function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div
      className="relative border border-border bg-card p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
      style={color
        ? {
            borderLeftColor: color,
            borderLeftWidth: 3,
            background: `color-mix(in srgb, ${color} 5%, hsl(var(--card)))`,
          }
        : undefined
      }
    >
      {/* Icon badge — top right, small and muted */}
      {icon && color && (
        <div
          className="absolute top-4 right-4 h-7 w-7 flex items-center justify-center rounded text-sm opacity-80"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          {icon}
        </div>
      )}

      {/* Value — standard foreground, not colored */}
      <div className="text-2xl font-mono font-semibold text-foreground leading-none pr-8">
        {value}
      </div>

      {/* Label */}
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mt-2.5 leading-none">
        {label}
      </div>

      {/* Bottom accent line */}
      {color && (
        <div
          className="absolute bottom-0 left-0 h-[2px] w-full opacity-30"
          style={{ background: `linear-gradient(to right, ${color}, transparent)` }}
        />
      )}
    </div>
  );
}
