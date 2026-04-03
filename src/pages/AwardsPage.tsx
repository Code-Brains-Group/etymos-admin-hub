import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Pencil, Trash2, Gift } from "lucide-react";

interface AwardItem {
  id: number;
  title: string;
  description: string;
  iconUrl: string;
  pointsRequired: number;
}

const initialAwards: AwardItem[] = [
  { id: 1, title: "Word Master", description: "Complete 100 quizzes", iconUrl: "", pointsRequired: 500 },
  { id: 2, title: "Vocabulary Guru", description: "Search 1000 words", iconUrl: "", pointsRequired: 1000 },
  { id: 3, title: "Quiz Champion", description: "Score 100% on 10 quizzes", iconUrl: "", pointsRequired: 750 },
  { id: 4, title: "Speed Demon", description: "Complete a quiz in under 30 seconds", iconUrl: "", pointsRequired: 300 },
  { id: 5, title: "Streak Master", description: "7-day login streak", iconUrl: "", pointsRequired: 200 },
  { id: 6, title: "Competition Winner", description: "Win a competition", iconUrl: "", pointsRequired: 1500 },
];

export default function AwardsPage() {
  const [awards, setAwards] = useState(initialAwards);
  const [editAward, setEditAward] = useState<AwardItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteAward, setDeleteAward] = useState<AwardItem | null>(null);
  const [grantAward, setGrantAward] = useState<AwardItem | null>(null);
  const [grantUserId, setGrantUserId] = useState("");

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formPoints, setFormPoints] = useState(0);

  const openCreate = () => {
    setIsNew(true); setFormTitle(""); setFormDesc(""); setFormIcon(""); setFormPoints(0);
    setEditAward({} as AwardItem);
  };

  const openEdit = (a: AwardItem) => {
    setIsNew(false); setFormTitle(a.title); setFormDesc(a.description); setFormIcon(a.iconUrl); setFormPoints(a.pointsRequired);
    setEditAward(a);
  };

  const handleSave = () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    if (isNew) {
      setAwards((p) => [...p, { id: Date.now(), title: formTitle, description: formDesc, iconUrl: formIcon, pointsRequired: formPoints }]);
      toast.success("Award created");
    } else if (editAward) {
      setAwards((p) => p.map((a) => a.id === editAward.id ? { ...a, title: formTitle, description: formDesc, iconUrl: formIcon, pointsRequired: formPoints } : a));
      toast.success("Award updated");
    }
    setEditAward(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button onClick={openCreate} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90">+ New Award</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {awards.map((a) => (
          <div key={a.id} className="border border-border flex flex-col">
            <div className="h-28 bg-muted flex items-center justify-center text-3xl">🏅</div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold mb-1">{a.title}</h3>
              <p className="text-sm text-muted-foreground flex-1">{a.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs font-mono bg-muted px-2 py-0.5">{a.pointsRequired} pts</span>
                <div className="flex gap-2">
                  <button onClick={() => { setGrantAward(a); setGrantUserId(""); }} className="text-muted-foreground hover:text-foreground"><Gift className="h-3.5 w-3.5" /></button>
                  <button onClick={() => openEdit(a)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteAward(a)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={!!editAward} onClose={() => setEditAward(null)} title={isNew ? "New Award" : "Edit Award"} footer={
        <>
          <button onClick={() => setEditAward(null)} className="px-4 py-2 text-sm border border-border hover:bg-accent">Cancel</button>
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
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Icon URL</label>
            <input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Points Required</label>
            <input type="number" value={formPoints} onChange={(e) => setFormPoints(Number(e.target.value))} className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteAward} onClose={() => setDeleteAward(null)} onConfirm={() => { setAwards((p) => p.filter((a) => a.id !== deleteAward?.id)); toast.success("Award deleted"); setDeleteAward(null); }} title="Delete Award" message={`Delete "${deleteAward?.title}"?`} confirmLabel="Delete" danger />

      {/* Grant Award Modal */}
      <Modal open={!!grantAward} onClose={() => setGrantAward(null)} title={`Grant "${grantAward?.title}"`} footer={
        <>
          <button onClick={() => setGrantAward(null)} className="px-4 py-2 text-sm border border-border hover:bg-accent">Cancel</button>
          <button onClick={() => { if (!grantUserId.trim()) { toast.error("User ID required"); return; } toast.success(`Award granted to ${grantUserId}`); setGrantAward(null); }} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90">Grant</button>
        </>
      }>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">User ID</label>
          <input value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} placeholder="Enter user ID" className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </Modal>
    </div>
  );
}
