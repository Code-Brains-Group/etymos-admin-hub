import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataPagination } from "@/components/shared/DataPagination";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

interface Quiz {
  id: number;
  title: string;
  description: string;
  category: string;
  questions: number;
  active: boolean;
}

const categories = ["SAT Vocabulary", "GRE Words", "Business English", "Medical Terms"];

const initialQuizzes: Quiz[] = [
  { id: 1, title: "SAT Power Words", description: "Top 100 SAT words", category: "SAT Vocabulary", questions: 25, active: true },
  { id: 2, title: "GRE Challenge", description: "Hard GRE vocab quiz", category: "GRE Words", questions: 30, active: true },
  { id: 3, title: "Business Basics", description: "Essential business terms", category: "Business English", questions: 15, active: false },
  { id: 4, title: "Medical Terminology 101", description: "Intro to medical terms", category: "Medical Terms", questions: 20, active: true },
];

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [editQuiz, setEditQuiz] = useState<Quiz | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteQuiz, setDeleteQuiz] = useState<Quiz | null>(null);
  const [page, setPage] = useState(1);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCat, setFormCat] = useState(categories[0]);
  const [formQuestions, setFormQuestions] = useState(10);
  const [formActive, setFormActive] = useState(true);

  const openCreate = () => {
    setIsNew(true);
    setFormTitle(""); setFormDesc(""); setFormCat(categories[0]); setFormQuestions(10); setFormActive(true);
    setEditQuiz({} as Quiz);
  };

  const openEdit = (q: Quiz) => {
    setIsNew(false);
    setFormTitle(q.title); setFormDesc(q.description); setFormCat(q.category); setFormQuestions(q.questions); setFormActive(q.active);
    setEditQuiz(q);
  };

  const handleSave = () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    if (isNew) {
      setQuizzes((p) => [...p, { id: Date.now(), title: formTitle, description: formDesc, category: formCat, questions: formQuestions, active: formActive }]);
      toast.success("Quiz created");
    } else if (editQuiz) {
      setQuizzes((p) => p.map((q) => q.id === editQuiz.id ? { ...q, title: formTitle, description: formDesc, category: formCat, questions: formQuestions, active: formActive } : q));
      toast.success("Quiz updated");
    }
    setEditQuiz(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button onClick={openCreate} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90">+ New Quiz</button>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Questions</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q, i) => (
              <tr key={q.id} className={`border-b border-border hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                <td className="px-4 py-3 font-medium">{q.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{q.category}</td>
                <td className="px-4 py-3 font-mono">{q.questions}</td>
                <td className="px-4 py-3"><StatusBadge variant={q.active ? "active" : "inactive"}>{q.active ? "Active" : "Inactive"}</StatusBadge></td>
                <td className="px-4 py-3 space-x-2">
                  <button onClick={() => openEdit(q)} className="text-xs underline text-muted-foreground hover:text-foreground">Edit</button>
                  <button onClick={() => setDeleteQuiz(q)} className="text-xs underline text-destructive">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DataPagination currentPage={page} totalPages={1} onPageChange={setPage} />

      <Modal open={!!editQuiz} onClose={() => setEditQuiz(null)} title={isNew ? "New Quiz" : "Edit Quiz"} footer={
        <>
          <button onClick={() => setEditQuiz(null)} className="px-4 py-2 text-sm border border-border hover:bg-accent">Cancel</button>
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
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Category</label>
            <select value={formCat} onChange={(e) => setFormCat(e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Number of Questions</label>
            <input type="number" value={formQuestions} onChange={(e) => setFormQuestions(Number(e.target.value))} className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium uppercase tracking-wide">Active</label>
            <button onClick={() => setFormActive(!formActive)} className={`w-10 h-5 flex items-center transition-colors ${formActive ? "bg-primary" : "bg-muted border border-border"}`}>
              <div className={`w-4 h-4 bg-primary-foreground border border-border transition-transform ${formActive ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteQuiz} onClose={() => setDeleteQuiz(null)} onConfirm={() => { setQuizzes((p) => p.filter((q) => q.id !== deleteQuiz?.id)); toast.success("Quiz deleted"); setDeleteQuiz(null); }} title="Delete Quiz" message={`Delete "${deleteQuiz?.title}"?`} confirmLabel="Delete" danger />
    </div>
  );
}
