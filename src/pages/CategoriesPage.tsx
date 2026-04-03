import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";

interface Category {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  words: string[];
}

const initialCategories: Category[] = [
  { id: 1, title: "SAT Vocabulary", description: "Essential words for SAT preparation", imageUrl: "", words: ["ubiquitous", "ephemeral", "pragmatic", "benevolent", "cacophony"] },
  { id: 2, title: "GRE Words", description: "Advanced vocabulary for GRE exams", imageUrl: "", words: ["obfuscate", "perspicacious", "sycophant", "recalcitrant"] },
  { id: 3, title: "Business English", description: "Professional vocabulary for the workplace", imageUrl: "", words: ["synergy", "leverage", "paradigm"] },
  { id: 4, title: "Medical Terms", description: "Common medical terminology", imageUrl: "", words: ["diagnosis", "prognosis", "chronic", "acute", "benign", "malignant"] },
  { id: 5, title: "Legal Jargon", description: "Frequently used legal terms", imageUrl: "", words: ["plaintiff", "defendant", "jurisdiction"] },
  { id: 6, title: "Everyday Idioms", description: "Common English idioms and phrases", imageUrl: "", words: ["break a leg", "hit the nail", "spill the beans", "bite the bullet"] },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [wordsCat, setWordsCat] = useState<Category | null>(null);
  const [newWord, setNewWord] = useState("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImg, setFormImg] = useState("");

  const openCreate = () => {
    setIsNew(true);
    setFormTitle(""); setFormDesc(""); setFormImg("");
    setEditCat({} as Category);
  };

  const openEdit = (cat: Category) => {
    setIsNew(false);
    setFormTitle(cat.title); setFormDesc(cat.description); setFormImg(cat.imageUrl);
    setEditCat(cat);
  };

  const handleSave = () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    if (isNew) {
      const newCat: Category = { id: Date.now(), title: formTitle, description: formDesc, imageUrl: formImg, words: [] };
      setCategories((p) => [...p, newCat]);
      toast.success("Category created");
    } else if (editCat) {
      setCategories((p) => p.map((c) => c.id === editCat.id ? { ...c, title: formTitle, description: formDesc, imageUrl: formImg } : c));
      toast.success("Category updated");
    }
    setEditCat(null);
  };

  const handleDelete = () => {
    if (!deleteCat) return;
    setCategories((p) => p.filter((c) => c.id !== deleteCat.id));
    toast.success("Category deleted");
    setDeleteCat(null);
  };

  const addWord = () => {
    if (!newWord.trim() || !wordsCat) return;
    const words = newWord.split(",").map((w) => w.trim()).filter(Boolean);
    setCategories((p) => p.map((c) => c.id === wordsCat.id ? { ...c, words: [...c.words, ...words] } : c));
    setWordsCat((prev) => prev ? { ...prev, words: [...prev.words, ...words] } : null);
    setNewWord("");
  };

  const removeWord = (word: string) => {
    if (!wordsCat) return;
    setCategories((p) => p.map((c) => c.id === wordsCat.id ? { ...c, words: c.words.filter((w) => w !== word) } : c));
    setWordsCat((prev) => prev ? { ...prev, words: prev.words.filter((w) => w !== word) } : null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <button onClick={openCreate} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          + New Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="border border-border flex flex-col">
            <div className="h-36 bg-muted flex items-center justify-center text-muted-foreground text-xs font-mono">
              {cat.imageUrl ? <img src={cat.imageUrl} alt={cat.title} className="h-full w-full object-cover" /> : "No Image"}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold mb-1">{cat.title}</h3>
              <p className="text-sm text-muted-foreground flex-1 line-clamp-2">{cat.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs font-mono bg-muted px-2 py-0.5">{cat.words.length} words</span>
                <div className="flex gap-2">
                  <button onClick={() => setWordsCat(cat)} className="text-xs underline text-muted-foreground hover:text-foreground">Words</button>
                  <button onClick={() => openEdit(cat)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteCat(cat)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={!!editCat}
        onClose={() => setEditCat(null)}
        title={isNew ? "New Category" : "Edit Category"}
        footer={
          <>
            <button onClick={() => setEditCat(null)} className="px-4 py-2 text-sm border border-border hover:bg-accent transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90">Save</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Title</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5">Image URL</label>
            <input value={formImg} onChange={(e) => setFormImg(e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog open={!!deleteCat} onClose={() => setDeleteCat(null)} onConfirm={handleDelete} title="Delete Category" message={`Delete "${deleteCat?.title}"? This cannot be undone.`} confirmLabel="Delete" danger />

      {/* Words Panel */}
      <Modal open={!!wordsCat} onClose={() => setWordsCat(null)} title={`Words — ${wordsCat?.title || ""}`}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Add words (comma separated)"
              className="flex-1 border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && addWord()}
            />
            <button onClick={addWord} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {wordsCat?.words.map((w) => (
              <span key={w} className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 text-xs font-mono">
                {w}
                <button onClick={() => removeWord(w)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
              </span>
            ))}
            {wordsCat?.words.length === 0 && <span className="text-sm text-muted-foreground">No words yet</span>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
