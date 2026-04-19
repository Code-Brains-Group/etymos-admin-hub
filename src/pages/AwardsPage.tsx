import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { toast } from "sonner";
import { Pencil, Trash2, Gift, Activity as ActivityIcon } from "lucide-react";
import type { Award } from "@/lib/api";
import { DataPagination } from "@/components/shared/DataPagination";

const PAGE_SIZE = 12;

export default function AwardsPage() {
  const { api } = useAuth();
  const qc = useQueryClient();

  const [editAward, setEditAward] = useState<Award | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteAward, setDeleteAward] = useState<Award | null>(null);
  const [grantAward, setGrantAward] = useState<Award | null>(null);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [page, setPage] = useState(1);
  const [viewAwardId, setViewAwardId] = useState<number | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formPoints, setFormPoints] = useState(0);
  const [formCompId, setFormCompId] = useState("");

  // ── Queries ─────────────────────────────────────────────────
  const { data: awardsData, isLoading, isError } = useQuery({
    queryKey: ["admin-awards", page],
    queryFn: () => api.adminAwards.list(page, PAGE_SIZE),
  });

  const awards = awardsData?.items || [];
  const totalAwards = awardsData?.total_count || 0;
  const totalPages = Math.ceil(totalAwards / PAGE_SIZE);

  const { data: competitionsData } = useQuery({
    queryKey: ["admin-competitions", "dropdown"],
    queryFn: () => api.adminCompetitions.list(1, 100),
  });
  const competitions = competitionsData?.items || [];

  const { data: awardDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["admin-award-detail", viewAwardId],
    queryFn: () => api.adminAwards.getDetails(viewAwardId!),
    enabled: !!viewAwardId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-awards"] });

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      icon_url: string;
      points_required: number;
      competition_id?: string;
    }) => api.adminAwards.create(payload),
    onSuccess: () => { toast.success("Award created"); invalidate(); setEditAward(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: {
      id: number;
      payload: { title?: string; description?: string; icon_url?: string; points_required?: number; competition_id?: string };
    }) => api.adminAwards.update(id, payload),
    onSuccess: () => { toast.success("Award updated"); invalidate(); setEditAward(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.adminAwards.delete(id),
    onSuccess: () => { toast.success("Award deleted"); invalidate(); setDeleteAward(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const grantMutation = useMutation({
    mutationFn: ({ awardId, userId, reason }: { awardId: number; userId: string; reason: string }) =>
      api.adminAwards.grant({ award_id: awardId, user_id: userId, reason }),
    onSuccess: () => { 
      toast.success("Award granted successfully"); 
      setGrantAward(null); 
      setGrantUserId(""); 
      setGrantReason("");
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Handlers ────────────────────────────────────────────────
  const openCreate = () => {
    setIsNew(true);
    setFormTitle(""); setFormDesc(""); setFormIcon(""); setFormPoints(0); setFormCompId("");
    setEditAward({} as Award);
  };

  const openEdit = (a: Award) => {
    setIsNew(false);
    setFormTitle(a.title); setFormDesc(a.description);
    setFormIcon(a.icon_url); setFormPoints(a.points_required);
    setFormCompId(a.competition_id || "");
    setEditAward(a);
  };

  const handleSave = () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    const payload = {
      title: formTitle,
      description: formDesc,
      icon_url: formIcon,
      points_required: formPoints,
      competition_id: formCompId || null,
    };
    if (isNew) {
      createMutation.mutate(payload);
    } else if (editAward?.id) {
      updateMutation.mutate({ id: editAward.id, payload });
    }
  };

  const handleGrant = () => {
    if (!grantUserId.trim()) { toast.error("User ID is required"); return; }
    if (!grantReason.trim()) { toast.error("Reason is required"); return; }
    if (!grantAward) return;
    grantMutation.mutate({ awardId: grantAward.id, userId: grantUserId.trim(), reason: grantReason.trim() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90"
        >
          + New Award
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {awards.map((a, i) => {
            const globalIndex = (page - 1) * PAGE_SIZE + i + 1;
            return (
              <div key={a.id} className="border border-border flex flex-col relative group">
                <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-background/80 backdrop-blur-sm border border-border text-[9px] font-mono font-bold text-muted-foreground shadow-sm">
                  #{globalIndex.toString().padStart(2, "0")}
                </div>
                <div className="h-28 bg-muted flex items-center justify-center">
                  {a.icon_url ? (
                    <img src={a.icon_url} alt={a.title} className="h-20 w-20 object-contain" />
                  ) : (
                    <span className="text-3xl">🏅</span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex flex-col gap-1 mb-2">
                    <h3 className="font-semibold leading-tight">{a.title}</h3>
                    {a.competition_title && (
                      <span className="inline-block self-start text-[9px] font-bold uppercase tracking-tighter bg-primary/10 text-primary px-1.5 py-0.5 border border-primary/20">
                        {a.competition_title}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 line-clamp-2">{a.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5">
                      {(a.points_required ?? 0).toLocaleString()} pts
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewAwardId(a.id)}
                        className="p-1.5 border border-border hover:bg-accent transition-colors"
                        title="View recipients"
                      >
                        <ActivityIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { setGrantAward(a); setGrantUserId(""); setGrantReason(""); }}
                        className="p-1.5 border border-border hover:bg-accent transition-colors"
                        title="Grant to user"
                      >
                        <Gift className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 border border-border hover:bg-accent transition-colors"
                        title="Edit award"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteAward(a)}
                        className="p-1.5 border border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        title="Delete award"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {awards.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              No awards matched your query.
            </div>
          )}
        </div>
      )}

      <DataPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {isError && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 text-sm text-center">
          Failed to load awards. Please check your network or refresh the page.
        </div>
      )}

      <Modal
        open={!!editAward}
        onClose={() => setEditAward(null)}
        title={isNew ? "New Award" : "Edit Award"}
        footer={
          <>
            <button
              onClick={() => setEditAward(null)}
              className="px-4 py-2 text-sm border border-border hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Title</label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Icon URL</label>
            <input
              value={formIcon}
              onChange={(e) => setFormIcon(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Points Required</label>
            <input
              type="number"
              min={0}
              value={formPoints}
              onChange={(e) => setFormPoints(Number(e.target.value))}
              className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Link to Competition (Optional)</label>
            <select
              value={formCompId}
              onChange={(e) => setFormCompId(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— Independent Award —</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteAward}
        onClose={() => setDeleteAward(null)}
        onConfirm={() => deleteAward && deleteMutation.mutate(deleteAward.id)}
        title="Delete Award"
        message={`Delete "${deleteAward?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />

      <Modal
        open={!!grantAward}
        onClose={() => setGrantAward(null)}
        title={`Grant "${grantAward?.title}"`}
        footer={
          <>
            <button
              onClick={() => setGrantAward(null)}
              className="px-4 py-2 text-sm border border-border hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleGrant}
              disabled={grantMutation.isPending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {grantMutation.isPending ? "Granting..." : "Grant Award"}
            </button>
          </>
        }
      >
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">User ID (UUID)</label>
            <input
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
              placeholder="550e8400-e29b-41d4-a716-446655440000"
              className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Reason for Award</label>
            <textarea
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="Outstanding contribution to the April challenge."
              rows={3}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              This reason will be visible to the user in their achievements gallery.
            </p>
          </div>
      </Modal>

      <Modal
        open={!!viewAwardId}
        onClose={() => setViewAwardId(null)}
        title="Award Intelligence & Recipients"
        size="lg"
      >
        {isLoadingDetail ? (
          <div className="space-y-4">
            <LoadingSkeleton className="h-20 w-full" />
            <LoadingSkeleton className="h-40 w-full" />
          </div>
        ) : awardDetail ? (
          <div className="space-y-6">
            <div className="flex gap-6 items-start">
              <div className="h-20 w-20 bg-muted flex items-center justify-center border border-border">
                {awardDetail.icon_url ? (
                  <img src={awardDetail.icon_url} alt="" className="h-16 w-16 object-contain" />
                ) : (
                  <span className="text-3xl">🏅</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{awardDetail.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{awardDetail.description}</p>
                <div className="flex gap-3 mt-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-muted px-2 py-1 border border-border">
                    {awardDetail.points_required.toLocaleString()} pts required
                  </span>
                  {awardDetail.competition_title && (
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 border border-primary/20">
                      Linked: {awardDetail.competition_title}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex justify-between items-center">
                <span>Award Recipients ({awardDetail.recipients.length})</span>
                <span className="font-mono bg-muted px-1.5 py-0.5 border border-border">Created: {new Date(awardDetail.created_at).toLocaleDateString()}</span>
              </h4>
              <div className="border border-border max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-bold text-muted-foreground sticky top-0">
                    <tr>
                      <th className="px-4 py-2">User Name</th>
                      <th className="px-4 py-2">Email Identity</th>
                      <th className="px-4 py-2">Date Granted</th>
                      <th className="px-4 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {awardDetail.recipients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">No users have earned this award yet.</td>
                      </tr>
                    ) : (
                      awardDetail.recipients.map(r => (
                        <tr key={r.user_id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-semibold">{r.full_name}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{r.email}</td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(r.granted_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 italic text-muted-foreground truncate max-w-[200px]" title={r.reason || ""}>
                            {r.reason ? `"${r.reason}"` : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
