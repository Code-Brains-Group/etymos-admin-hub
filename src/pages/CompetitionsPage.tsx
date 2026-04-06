import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataPagination } from "@/components/shared/DataPagination";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { Competition } from "@/lib/api";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  AreaChart, 
  Area 
} from "recharts";

function getStatus(start: string, end: string): "active" | "ended" | "upcoming" {
  const now = new Date();
  if (now < new Date(start)) return "upcoming";
  if (now > new Date(end)) return "ended";
  return "active";
}

const PAGE_SIZE = 25;

export default function CompetitionsPage() {
  const { api } = useAuth();
  const qc = useQueryClient();

  const [editComp, setEditComp] = useState<Competition | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteComp, setDeleteComp] = useState<Competition | null>(null);
  const [announceComp, setAnnounceComp] = useState<Competition | null>(null);
  const [generateQuizComp, setGenerateQuizComp] = useState<Competition | null>(null);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "participants" | "analytics">("overview");
  const [grantingToUser, setGrantingToUser] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const [participantPage, setParticipantPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [grantingReason, setGrantingReason] = useState("");
  const [grantingAwardId, setGrantingAwardId] = useState<number | "">("");

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formPrize, setFormPrize] = useState("");

  const [quizRounds, setQuizRounds] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [quizOrder, setQuizOrder] = useState<"random" | "alphabetical">("random");

  // Convert ISO date to datetime-local string for input
  const toLocalInput = (iso: string) => {
    if (!iso) return "";
    try { return new Date(iso).toISOString().slice(0, 16); }
    catch { return ""; }
  };

  // Convert datetime-local back to ISO
  const toISO = (local: string) => {
    if (!local) return "";
    return new Date(local).toISOString();
  };

  // ── Queries ─────────────────────────────────────────────────
  const { data: competitionsData, isLoading } = useQuery({
    queryKey: ["admin-competitions", page, statusFilter],
    queryFn: () => api.adminCompetitions.list(page, PAGE_SIZE, statusFilter === "all" ? undefined : statusFilter),
  });
  const competitions = competitionsData?.items || [];
  const totalPages = Math.ceil((competitionsData?.total_count || 0) / PAGE_SIZE);

  const { data: compDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["competition-detail", viewDetailId],
    queryFn: () => viewDetailId ? api.public.getCompetition(viewDetailId) : null,
    enabled: !!viewDetailId,
  });

  const { data: participantsData, isLoading: isParticipantsLoading } = useQuery({
    queryKey: ["competition-participants", viewDetailId, participantPage],
    queryFn: () => viewDetailId ? api.adminCompetitions.getParticipants(viewDetailId, participantPage, 10) : null,
    enabled: !!viewDetailId && (detailTab === "participants"),
  });

  const { data: compAnalytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["competition-analytics", viewDetailId],
    queryFn: () => viewDetailId ? api.admin.getAnalytics({ competition_id: viewDetailId }) : null,
    enabled: !!viewDetailId && detailTab === "overview", // We'll show some highlights in overview too, but mostly in a new tab if we add one.
  });
  
  const participants = participantsData?.items || [];
  const totalParticipantPages = Math.ceil((participantsData?.total_count || 0) / 10);

  const { data: awardsRaw = [] } = useQuery({
    queryKey: ["awards"],
    queryFn: () => api.public.getAwards(),
    enabled: !!grantingToUser,
  });
  const allAwards = Array.isArray(awardsRaw) ? awardsRaw : [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["competitions"] });

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      start_date: string;
      end_date: string;
      prize_details: string;
    }) => api.adminCompetitions.create(payload),
    onSuccess: () => { toast.success("Competition created"); invalidate(); setEditComp(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: {
      id: string;
      payload: { title?: string; description?: string; end_date?: string; prize_details?: string };
    }) => api.adminCompetitions.update(id, payload),
    onSuccess: () => { toast.success("Competition updated"); invalidate(); setEditComp(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.adminCompetitions.delete(id),
    onSuccess: () => { toast.success("Competition deleted"); invalidate(); setDeleteComp(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const announceMutation = useMutation({
    mutationFn: (id: string) => api.adminCompetitions.announceWinners(id),
    onSuccess: () => { 
      toast.success("Winners announced!"); 
      setAnnounceComp(null);
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateQuizMutation = useMutation({
    mutationFn: (payload: {
      competition_id: string;
      num_rounds: number;
      difficulty: "easy" | "medium" | "hard";
      order_type: "random" | "alphabetical";
      title: string;
    }) => api.adminQuizzes.create(payload),
    onSuccess: () => { toast.success("Quiz successfully mathematically constructed and paired!"); setGenerateQuizComp(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const grantMutation = useMutation({
    mutationFn: ({ awardId, userId, reason }: { awardId: number; userId: string; reason: string }) =>
      api.adminAwards.grant({ award_id: awardId, user_id: userId, reason }),
    onSuccess: () => {
      toast.success("Award granted successfully!");
      setGrantingToUser(null);
      setGrantingReason("");
      setGrantingAwardId("");
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const processMutation = useMutation({
    mutationFn: () => api.adminAwards.processCompleted(),
    onSuccess: (data) => {
      toast.success(`Processed! ${data.processed_count} winners awarded.`);
      invalidate();
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Handlers ────────────────────────────────────────────────
  const openCreate = () => {
    setIsNew(true);
    setFormTitle(""); setFormDesc(""); setFormStart(""); setFormEnd(""); setFormPrize("");
    setEditComp({} as Competition);
  };

  const openEdit = (c: Competition) => {
    setIsNew(false);
    setFormTitle(c.title); setFormDesc(c.description);
    setFormStart(toLocalInput(c.start_date)); setFormEnd(toLocalInput(c.end_date));
    setFormPrize(c.prize_details);
    setEditComp(c);
  };

  const handleSave = () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    if (!formStart || !formEnd) { toast.error("Dates are required"); return; }
    if (isNew) {
      createMutation.mutate({
        title: formTitle,
        description: formDesc,
        start_date: toISO(formStart),
        end_date: toISO(formEnd),
        prize_details: formPrize || undefined,
      });
    } else if (editComp?.id) {
      updateMutation.mutate({
        id: editComp.id,
        payload: {
          title: formTitle,
          description: formDesc,
          end_date: toISO(formEnd),
          prize_details: formPrize || undefined,
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Filter Status:</label>
          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring min-w-[120px]"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm("Process all finished competitions and grant awards to winners?")) {
                processMutation.mutate();
              }
            }}
            disabled={processMutation.isPending}
            className="px-4 py-2 text-sm border border-primary text-primary hover:bg-primary/5 font-semibold disabled:opacity-50"
          >
            {processMutation.isPending ? "Processing..." : "Process Finished Competitions"}
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90"
          >
            + New Competition
          </button>
        </div>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Start</th>
              <th className="px-4 py-3 text-left">End</th>
              <th className="px-4 py-3 text-left">Participants</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <LoadingSkeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : competitions.map((c, i) => {
                  const status = getStatus(c.start_date, c.end_date);
                  const displayStatus = !c.is_active ? "inactive" : status;
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        i % 2 === 1 ? "bg-muted/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                        {((page - 1) * PAGE_SIZE + i + 1).toString().padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {c.title}
                          {!c.is_active && (
                            <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1 py-0.5 border border-border leading-none">DISABLED</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {formatDate(c.start_date)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {formatDate(c.end_date)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-center md:text-left">
                        {c.participant_count?.toLocaleString() ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge variant={c.status === "past" ? "ended" : c.status}>
                            {c.status.toUpperCase()}
                          </StatusBadge>
                          {c.status === "past" && !c.is_processed && (
                            <span className="text-[8px] font-bold bg-amber-500 text-white px-1 py-0.5 border border-amber-600 self-start animate-pulse">
                              PENDING WINNERS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => { setViewDetailId(c.id); setParticipantPage(1); }}
                          className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-border hover:bg-accent transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteComp(c)}
                          className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          Delete
                        </button>
                        {status === "ended" && (
                          <button
                            onClick={() => setAnnounceComp(c)}
                            className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                          >
                            Announce
                          </button>
                        )}
                        {status !== "ended" && (
                          <button
                            onClick={() => setGenerateQuizComp(c)}
                            className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                          >
                            Generate Quiz
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <DataPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create/Edit Modal */}
      <Modal
        open={!!editComp}
        onClose={() => setEditComp(null)}
        title={isNew ? "New Competition" : "Edit Competition"}
        footer={
          <>
            <button
              onClick={() => setEditComp(null)}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Start Date</label>
              <input
                type="datetime-local"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                disabled={!isNew}
                className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">End Date</label>
              <input
                type="datetime-local"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Prize Details</label>
            <textarea
              value={formPrize}
              onChange={(e) => setFormPrize(e.target.value)}
              rows={2}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteComp}
        onClose={() => setDeleteComp(null)}
        onConfirm={() => deleteComp && deleteMutation.mutate(deleteComp.id)}
        title="Delete Competition"
        message={`Delete "${deleteComp?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={!!announceComp}
        onClose={() => setAnnounceComp(null)}
        onConfirm={() => announceComp && announceMutation.mutate(announceComp.id)}
        title="Announce Winners"
        message={`Announce winners for "${announceComp?.title}"? This will notify all participants.`}
        confirmLabel="Announce"
      />

      {/* Generate Quiz Modal */}
      <Modal
        open={!!generateQuizComp}
        onClose={() => setGenerateQuizComp(null)}
        title="Generate Paired Quiz"
        footer={
          <>
            <button
              onClick={() => setGenerateQuizComp(null)}
              className="px-4 py-2 text-sm border border-border hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => generateQuizComp && generateQuizMutation.mutate({
                competition_id: generateQuizComp.id,
                num_rounds: quizRounds,
                difficulty: quizDifficulty,
                order_type: quizOrder,
                title: `${generateQuizComp.title} - Auto Quiz`,
              })}
              disabled={generateQuizMutation.isPending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {generateQuizMutation.isPending ? "Generating..." : "Generate Puzzle"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground mb-4">
            Mathematically construct a robust puzzle and permanently pair it with <strong>{generateQuizComp?.title}</strong>.
          </p>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Number of Rounds</label>
            <input
              type="number"
              min={1}
              value={quizRounds}
              onChange={(e) => setQuizRounds(Number(e.target.value))}
              className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Difficulty</label>
              <select
                value={quizDifficulty}
                onChange={(e) => setQuizDifficulty(e.target.value as "easy" | "medium" | "hard")}
                className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Order Type</label>
              <select
                value={quizOrder}
                onChange={(e) => setQuizOrder(e.target.value as "random" | "alphabetical")}
                className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="random">Random</option>
                <option value="sequential">Sequential</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail View Modal */}
      <Modal
        open={!!viewDetailId}
        onClose={() => { setViewDetailId(null); setDetailTab("overview"); }}
        title="Competition Hub"
        size="lg"
        footer={
          <button
            onClick={() => { setViewDetailId(null); setDetailTab("overview"); }}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90"
          >
            Close
          </button>
        }
      >
        <div className="flex border-b border-border mb-6">
          {(["overview", "participants", "analytics"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDetailTab(t)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                detailTab === t
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "overview" ? "Overview" : t === "participants" ? "Participants & Scores" : "Analytics"}
            </button>
          ))}
        </div>

        {detailTab === "overview" && (
          isDetailLoading ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-20 w-full" />
              <LoadingSkeleton className="h-40 w-full" />
            </div>
          ) : compDetail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</h4>
                    <StatusBadge variant={getStatus(compDetail.start_date, compDetail.end_date)}>
                      {getStatus(compDetail.start_date, compDetail.end_date).toUpperCase()}
                    </StatusBadge>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Timeline</h4>
                    <p className="text-sm">
                      {formatDate(compDetail.start_date)} — <br/>
                      {formatDate(compDetail.end_date)}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Prize Details</h4>
                    <p className="text-sm italic text-foreground">{compDetail.prize_details || "No prize details listed."}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Attached Special Quizzes</h4>
                {compDetail.quizzes && compDetail.quizzes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {compDetail.quizzes.map((q) => (
                      <div key={q.id} className="border border-border p-3 bg-muted/5">
                        <p className="text-sm font-medium">{q.title}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{q.id}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 italic">No quizzes linked yet.</p>
                )}
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Linked Awards (Badges)</h4>
                {compDetail.awards && compDetail.awards.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {compDetail.awards.map((a) => (
                      <div key={a.id} className="border border-border p-3 flex items-center gap-3 bg-muted/5">
                        <div className="h-10 w-10 bg-muted flex items-center justify-center text-xl">
                          {a.icon_url ? <img src={a.icon_url} alt="" className="h-8 w-8 object-contain" /> : "🏅"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{(a.points_required ?? 0).toLocaleString()} pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2 italic">No badges linked yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Failed to load competition data.</div>
          )
        )}

        {detailTab === "analytics" && (
          <div className="space-y-6">
            {isAnalyticsLoading ? (
              <div className="space-y-4">
                <LoadingSkeleton className="h-[200px] w-full" />
                <LoadingSkeleton className="h-[200px] w-full" />
              </div>
            ) : compAnalytics ? (
              <div className="grid grid-cols-1 gap-6">
                {/* Competition Performance Bar Chart */}
                <div className="border border-border p-4 bg-muted/5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Competition Performance</h4>
                  <div className="h-[250px] w-full">
                    {/* We'll use a simple bar chart to show performance relative to others if available, 
                        but usually analytics for a specific competition will show internal growth.
                        The guide says: competition_performance: [{ competition_id, title, participants, avg_score }]
                    */}
                    {compAnalytics.competition_performance.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={compAnalytics.competition_performance}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="title" tickLine={false} axisLine={false} tickMargin={10} className="text-[10px]" />
                          <YAxis tickLine={false} axisLine={false} tickMargin={10} className="text-[10px]" />
                          <Tooltip 
                            contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: "10px" }}
                            itemStyle={{ fontSize: "10px" }}
                          />
                          <Bar dataKey="participants" fill="hsl(var(--primary))" name="Participants" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="avg_score" fill="hsl(var(--muted-foreground))" name="Avg Score" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                        No performance data yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Growth Trend */}
                <div className="border border-border p-4 bg-muted/5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Participant Growth</h4>
                  <div className="h-[250px] w-full">
                    {compAnalytics.user_growth.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={compAnalytics.user_growth}>
                          <defs>
                            <linearGradient id="fillGrowth" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} className="text-[10px]" />
                          <YAxis tickLine={false} axisLine={false} tickMargin={10} className="text-[10px]" />
                          <Tooltip 
                            contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: "10px" }}
                            itemStyle={{ fontSize: "10px" }}
                          />
                          <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#fillGrowth)" strokeWidth={2} name="New Participants" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                        No growth data yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">Failed to load analytics.</div>
            )}
            
            {/* Winner Reveal for Past Competitions */}
            {compDetail?.status === "past" && participants.length > 0 && (
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-center">🏆 Hall of Fame</h4>
                <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg text-center space-y-3">
                  <div className="text-4xl">👑</div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Winner</p>
                    <p className="text-2xl font-display font-bold text-primary">{participants[0].full_name}</p>
                    <p className="text-xs text-muted-foreground">{participants[0].email}</p>
                  </div>
                  <div className="pt-2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-mono font-bold">
                      {participants[0].score.toLocaleString()} PTS
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {detailTab === "participants" && (
          <div className="space-y-4">
            {isParticipantsLoading ? (
              <div className="space-y-3">
                <LoadingSkeleton className="h-10 w-full" />
                <LoadingSkeleton className="h-10 w-full" />
                <LoadingSkeleton className="h-10 w-full" />
              </div>
            ) : participants.length > 0 ? (
              <>
                <div className="border border-border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                        <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                        <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Joined At</th>
                        <th className="px-4 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p) => (
                        <tr key={p.id} className="border-b border-border hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="font-medium">{p.full_name}</div>
                            <div className="text-[10px] text-muted-foreground">{p.email}</div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-primary">
                            {p.score?.toLocaleString() ?? 0}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {formatDate(p.joined_at)}
                          </td>
                          <td className="px-4 py-3">
                           <button
                              onClick={() => {
                                setGrantingToUser({ id: p.user_id, name: p.full_name });
                                setGrantingAwardId("");
                                setGrantingReason("");
                              }}
                              className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              Grant Award
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalParticipantPages > 1 && (
                  <DataPagination 
                    currentPage={participantPage}
                    totalPages={totalParticipantPages}
                    onPageChange={setParticipantPage}
                  />
                )}
              </>
            ) : (
              <div className="py-12 text-center text-muted-foreground border border-dashed border-border px-4">
                No participants have joined this competition yet.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Manual Award Granting Modal (Contextual) */}
      <Modal
        open={!!grantingToUser}
        onClose={() => setGrantingToUser(null)}
        title={`Manual Award Grant — ${grantingToUser?.name}`}
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setGrantingToUser(null)}
              className="px-4 py-2 text-sm border border-border hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!grantingAwardId) return toast.error("Choose an award");
                if (!grantingReason.trim()) return toast.error("Provide a reason");
                if (!grantingToUser?.id) return;
                grantMutation.mutate({
                  awardId: Number(grantingAwardId),
                  userId: grantingToUser.id,
                  reason: grantingReason.trim()
                });
              }}
              disabled={grantMutation.isPending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {grantMutation.isPending ? "Granting..." : "Confirm Grant"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5 font-bold">Select Award Type</label>
            <select
              value={grantingAwardId}
              onChange={(e) => setGrantingAwardId(Number(e.target.value))}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
            >
              <option value="">— Select Award Type —</option>
              {allAwards.map((a) => (
                <option key={a.id} value={a.id}>{a.title} (Min {(a.points_required ?? 0).toLocaleString()} pts)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5 font-bold">Award Reason</label>
            <textarea
              value={grantingReason}
              onChange={(e) => setGrantingReason(e.target.value)}
              placeholder="e.g., Outstanding contribution to the April challenge."
              rows={3}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-2 italic leading-tight">
              A clear reason helps the user understand why they were recognized.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
