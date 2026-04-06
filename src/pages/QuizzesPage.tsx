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
import type { SpecialQuiz } from "@/lib/api";

const toLocalInput = (iso: string | undefined) => {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 16); }
  catch { return ""; }
};

const PAGE_SIZE = 25;

export default function QuizzesPage() {
  const { api } = useAuth();
  const qc = useQueryClient();

  const [editQuiz, setEditQuiz] = useState<SpecialQuiz | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteQuiz, setDeleteQuiz] = useState<SpecialQuiz | null>(null);
  const [inspectQuizId, setInspectQuizId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCompId, setFormCompId] = useState("");
  const [formCatId, setFormCatId] = useState<number | undefined>(undefined);
  const [formRounds, setFormRounds] = useState(5);
  const [formDifficulty, setFormDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [formOrder, setFormOrder] = useState<"random" | "alphabetical">("random");
  const [formLetterCount, setFormLetterCount] = useState<number | undefined>(undefined);
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formActive, setFormActive] = useState(true);

  // ── Queries ─────────────────────────────────────────────────
  const { data: quizzesData, isLoading } = useQuery({
    queryKey: ["special-quizzes", page],
    queryFn: () => api.adminQuizzes.list(page, PAGE_SIZE),
  });

  const quizzes = quizzesData?.items || [];
  const totalQuizzes = quizzesData?.total_count || 0;
  const totalPages = Math.ceil(totalQuizzes / PAGE_SIZE);

  const { data: categoriesRaw = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.public.getCategories(),
  });
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];

  const { data: competitionsData } = useQuery({
    queryKey: ["admin-competitions", "dropdown"],
    queryFn: () => api.adminCompetitions.list(1, 100),
  });
  const competitions = competitionsData?.items || [];

  const { data: quizDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["special-quiz-detail", inspectQuizId],
    queryFn: () => (inspectQuizId ? api.adminQuizzes.getDetails(inspectQuizId) : null),
    enabled: !!inspectQuizId,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["special-quizzes"] });

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description?: string;
      competition_id: string;
      num_rounds: number;
      difficulty: "easy" | "medium" | "hard";
      category_id?: number;
      order_type?: "random" | "alphabetical";
      letter_count?: number;
      valid_from?: string;
      valid_until?: string;
      is_active?: boolean;
    }) => api.adminQuizzes.create(payload),
    onSuccess: () => { 
      toast.success("Quiz created"); 
      invalidate(); 
      setEditQuiz(null); 
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: {
      id: string;
      payload: { title?: string; description?: string; is_active?: boolean };
    }) => api.adminQuizzes.update(id, payload),
    onSuccess: () => { 
      toast.success("Quiz updated"); 
      invalidate(); 
      setEditQuiz(null); 
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.adminQuizzes.delete(id),
    onSuccess: () => { 
      toast.success("Quiz deleted"); 
      invalidate(); 
      setDeleteQuiz(null); 
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Handlers ────────────────────────────────────────────────
  const openCreate = () => {
    setIsNew(true);
    setFormTitle(""); setFormDesc("");
    setFormCatId(undefined);
    setFormRounds(5);
    setFormDifficulty("medium");
    setFormOrder("random");
    setFormLetterCount(undefined);
    setFormActive(true);

    // Pre-select the first competition and populate its dates immediately
    const firstComp = competitions[0];
    if (firstComp) {
      setFormCompId(firstComp.id);
      setFormValidFrom(toLocalInput(firstComp.start_date));
      setFormValidUntil(toLocalInput(firstComp.end_date));
    } else {
      setFormCompId("");
      setFormValidFrom("");
      setFormValidUntil("");
    }

    setEditQuiz({} as SpecialQuiz);
  };

  const handleCompChange = (cId: string) => {
    setFormCompId(cId);
    if (!cId) {
      setFormValidFrom("");
      setFormValidUntil("");
      return;
    }
    const comp = competitions.find(c => c.id === cId);
    if (comp) {
      setFormValidFrom(toLocalInput(comp.start_date));
      setFormValidUntil(toLocalInput(comp.end_date));
    }
  };

  const openEdit = (q: SpecialQuiz) => {
    setIsNew(false);
    setFormTitle(q.title); setFormDesc(q.description);
    setFormActive(q.is_active);
    setEditQuiz(q);
  };

  const handleSave = () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    if (isNew) {
      if (!formCompId) { toast.error("Select a competition"); return; }
      createMutation.mutate({
        title: formTitle,
        description: formDesc,
        competition_id: formCompId,
        num_rounds: formRounds,
        difficulty: formDifficulty,
        category_id: formCatId,
        order_type: formOrder,
        letter_count: formLetterCount,
        valid_from: formValidFrom ? new Date(formValidFrom).toISOString() : undefined,
        valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : undefined,
        is_active: formActive,
      });
    } else if (editQuiz?.id) {
      updateMutation.mutate({
        id: editQuiz.id,
        payload: { title: formTitle, description: formDesc, is_active: formActive },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90"
        >
          + New Quiz
        </button>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Competition</th>
              <th className="px-4 py-3 text-left">Validity</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <LoadingSkeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : quizzes.map((q, i) => {
                  const globalIndex = (page - 1) * PAGE_SIZE + i + 1;
                  return (
                    <tr
                      key={q.id}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        i % 2 === 1 ? "bg-muted/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                        {globalIndex.toString().padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex flex-col">
                          <span>{q.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{q.id}</span>
                        </div>
                      </td>
                    <td className="px-4 py-3 text-xs">
                      {q.competition_title || "Unlinked"}
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono leading-tight whitespace-nowrap">
                      {formatDate(q.valid_from)}<br />
                      to {formatDate(q.valid_until)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={q.is_active ? "active" : "inactive"}>
                        {q.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => setInspectQuizId(q.id)}
                        className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => openEdit(q)}
                        className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-border hover:bg-accent transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteQuiz(q)}
                        className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <DataPagination currentPage={page} totalPages={Math.max(1, totalPages)} onPageChange={setPage} />

      <Modal
        open={!!editQuiz}
        onClose={() => setEditQuiz(null)}
        title={isNew ? "New Special Quiz" : "Edit Special Quiz"}
        footer={
          <>
            <button
              onClick={() => setEditQuiz(null)}
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
          {isNew && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Competition</label>
                <select
                  value={formCompId}
                  onChange={(e) => handleCompChange(e.target.value)}
                  className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Select competition —</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Category (Optional)</label>
                <select
                  value={formCatId ?? ""}
                  onChange={(e) => setFormCatId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {isNew && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Rounds</label>
                  <input
                    type="number"
                    min={1}
                    value={formRounds}
                    onChange={(e) => setFormRounds(Number(e.target.value))}
                    className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as "easy" | "medium" | "hard")}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Letter Count</label>
                  <input
                    type="number"
                    min={3}
                    placeholder="Any"
                    value={formLetterCount ?? ""}
                    onChange={(e) => setFormLetterCount(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Order Type</label>
                  <select
                    value={formOrder}
                    onChange={(e) => setFormOrder(e.target.value as "random" | "alphabetical")}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="random">Random</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
                <div />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Valid From</label>
                  <input
                    type="datetime-local"
                    value={formValidFrom}
                    readOnly
                    className="w-full border border-input bg-muted px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring opacity-70 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Valid Until</label>
                  <input
                    type="datetime-local"
                    value={formValidUntil}
                    readOnly
                    className="w-full border border-input bg-muted px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring opacity-70 cursor-not-allowed"
                  />
                </div>
              </div>
            </>
          )}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium uppercase tracking-wide">Active</label>
            <button
              onClick={() => setFormActive(!formActive)}
              className={`w-10 h-5 flex items-center transition-colors ${formActive ? "bg-primary" : "bg-muted border border-border"}`}
            >
              <div className={`w-4 h-4 bg-primary-foreground border border-border transition-transform ${formActive ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteQuiz}
        onClose={() => setDeleteQuiz(null)}
        onConfirm={() => deleteQuiz && deleteMutation.mutate(deleteQuiz.id)}
        title="Delete Quiz"
        message={`Delete "${deleteQuiz?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />

      {/* Quiz Inspector Modal */}
      <Modal
        open={!!inspectQuizId}
        onClose={() => setInspectQuizId(null)}
        title="Quiz Inspector (Under the Hood)"
        size="lg"
        footer={
          <button
            onClick={() => setInspectQuizId(null)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90"
          >
            Close
          </button>
        }
      >
        {isDetailLoading && (
          <div className="space-y-4">
            <LoadingSkeleton className="h-12 w-full" />
            <LoadingSkeleton className="h-40 w-full" />
            <LoadingSkeleton className="h-40 w-full" />
          </div>
        )}

        {!isDetailLoading && quizDetail && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 border-b border-border pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</p>
                <p className="text-sm font-semibold">{quizDetail.title}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Competition</p>
                <p className="text-sm">{quizDetail.competition_title || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total Rounds</p>
                <p className="text-sm font-mono">{Array.isArray(quizDetail.rounds) ? quizDetail.rounds.length : 0}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Mathematical Rounds Construction</h4>
              {(Array.isArray(quizDetail.rounds) ? quizDetail.rounds : []).map((round, idx) => (
                <div key={idx} className="border border-border p-4 bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-foreground text-background px-2 py-0.5">ROUND {idx + 1}</span>
                    <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
                      <span>SEED: <strong className="text-foreground">{round.seed_word}</strong></span>
                      <span>SCRAMBLE: <strong className="text-foreground">{round.scrambled_letters}</strong></span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                       Valid Solutions ({Array.isArray(round.solutions) ? round.solutions.length : 0})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(round.solutions) ? round.solutions : []).map((sol, sidx) => (
                        <div key={sidx} className="bg-background border border-border px-2 py-1 text-[11px] flex items-center gap-2">
                          <span className="font-medium">{sol.word}</span>
                          <span className="text-muted-foreground border-l border-border pl-2">{sol.points}pt</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isDetailLoading && !quizDetail && (
          <div className="py-12 text-center text-muted-foreground">Failed to load quiz metadata.</div>
        )}
      </Modal>
    </div>
  );
}
