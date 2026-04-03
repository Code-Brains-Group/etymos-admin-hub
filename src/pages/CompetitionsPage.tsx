import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataPagination } from "@/components/shared/DataPagination";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

interface Competition {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  prize: string;
}

const initialCompetitions: Competition[] = [
  { id: 1, title: "Spring Challenge", description: "The ultimate spring vocab battle", startDate: "2026-03-01T09:00", endDate: "2026-04-15T23:59", prize: "$500 Gift Card" },
  { id: 2, title: "GRE Showdown", description: "Who knows the most GRE words?", startDate: "2026-04-10T09:00", endDate: "2026-05-10T23:59", prize: "Free GRE Prep Course" },
  { id: 3, title: "Winter Vocab Blitz", description: "Fast-paced winter competition", startDate: "2025-12-01T09:00", endDate: "2026-01-15T23:59", prize: "Trophy + $200" },
  { id: 4, title: "Summer Series", description: "Weekly summer challenges", startDate: "2026-06-01T09:00", endDate: "2026-08-31T23:59", prize: "Scholarship Entry" },
];

function getStatus(start: string, end: string): "active" | "ended" | "upcoming" {
  const now = new Date();
  if (now < new Date(start)) return "upcoming";
  if (now > new Date(end)) return "ended";
  return "active";
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [editComp, setEditComp] = useState<Competition | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteComp, setDeleteComp] = useState<Competition | null>(null);
  const [announceComp, setAnnounceComp] = useState<Competition | null>(null);
  const [page, setPage] = useState(1);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formPrize, setFormPrize] = useState("");

  const openCreate = () => {
    setIsNew(true); setFormTitle(""); setFormDesc(""); setFormStart(""); setFormEnd(""); setFormPrize("");
    setEditComp({} as Competition);
  };

  const openEdit = (c: Competition) => {
    setIsNew(false); setFormTitle(c.title); setFormDesc(c.description); setFormStart(c.startDate); setFormEnd(c.endDate); setFormPrize(c.prize);
    setEditComp(c);
  };

  const handleSave = () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    if (!formStart || !formEnd) { toast.error("Dates are required"); return; }
    if (isNew) {
      setCompetitions((p) => [...p, { id: Date.now(), title: formTitle, description: formDesc, startDate: formStart, endDate: formEnd, prize: formPrize }]);
      toast.success("Competition created");
    } else if (editComp) {
      setCompetitions((p) => p.map((c) => c.id === editComp.id ? { ...c, title: formTitle, description: formDesc, startDate: formStart, endDate: formEnd, prize: formPrize } : c));
      toast.success("Competition updated");
    }
    setEditComp(null);
  };

  const statusVariant = (s: string) => s === "active" ? "active" : s === "ended" ? "ended" : "upcoming";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button onClick={openCreate} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90">+ New Competition</button>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Start</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">End</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {competitions.map((c, i) => {
              const status = getStatus(c.startDate, c.endDate);
              return (
                <tr key={c.id} className={`border-b border-border hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 font-mono text-xs">{new Date(c.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono text-xs">{new Date(c.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge variant={statusVariant(status)}>{status.charAt(0).toUpperCase() + status.slice(1)}</StatusBadge></td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => openEdit(c)} className="text-xs underline text-muted-foreground hover:text-foreground">Edit</button>
                    <button onClick={() => setDeleteComp(c)} className="text-xs underline text-destructive">Delete</button>
                    {status === "ended" && (
                      <button onClick={() => setAnnounceComp(c)} className="text-xs underline text-foreground font-medium">Announce Winners</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DataPagination currentPage={page} totalPages={1} onPageChange={setPage} />

      <Modal open={!!editComp} onClose={() => setEditComp(null)} title={isNew ? "New Competition" : "Edit Competition"} footer={
        <>
          <button onClick={() => setEditComp(null)} className="px-4 py-2 text-sm border border-border hover:bg-accent">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90">Save</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Title</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Start Date</label>
              <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">End Date</label>
              <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Prize Details</label>
            <textarea value={formPrize} onChange={(e) => setFormPrize(e.target.value)} rows={2} className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteComp} onClose={() => setDeleteComp(null)} onConfirm={() => { setCompetitions((p) => p.filter((c) => c.id !== deleteComp?.id)); toast.success("Competition deleted"); setDeleteComp(null); }} title="Delete Competition" message={`Delete "${deleteComp?.title}"?`} confirmLabel="Delete" danger />

      <ConfirmDialog open={!!announceComp} onClose={() => setAnnounceComp(null)} onConfirm={() => { toast.success(`Winners announced for "${announceComp?.title}"`); setAnnounceComp(null); }} title="Announce Winners" message={`Announce winners for "${announceComp?.title}"? This will notify all participants.`} confirmLabel="Announce" />
    </div>
  );
}
