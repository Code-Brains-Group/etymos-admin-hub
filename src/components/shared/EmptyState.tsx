import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Inbox className="h-12 w-12 mb-4" />
      <p className="text-sm mb-4">{message}</p>
      {action && (
        <button onClick={action.onClick} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          {action.label}
        </button>
      )}
    </div>
  );
}
