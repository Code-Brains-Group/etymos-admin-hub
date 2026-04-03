import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { baseUrl, setBaseUrl } = useAuth();
  const [url, setUrl] = useState(baseUrl);

  if (!open) return null;

  const handleSave = () => {
    setBaseUrl(url);
    toast.success("API Base URL updated");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-foreground/50 z-[60] flex items-center justify-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-background border border-border w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Settings</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <label className="block text-sm font-medium mb-2">API Base URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border hover:bg-accent transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity">Save</button>
        </div>
      </div>
    </div>
  );
}
