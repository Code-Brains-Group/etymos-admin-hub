import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  const sizeClasses = {
    md: "max-w-lg",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-foreground/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-background border border-border w-full ${sizeClasses[size]} max-h-[85vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="p-6 border-t border-border flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
