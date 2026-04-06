import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { DataPagination } from "@/components/shared/DataPagination";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";
import type { Category } from "@/lib/api";

const WORDS_PAGE_SIZE = 50;
const PAGE_SIZE = 25;

export default function CategoriesPage() {
  const { api } = useAuth();
  const qc = useQueryClient();

  const [editCat, setEditCat] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [wordsCat, setWordsCat] = useState<Category | null>(null);
  const [wordsPage, setWordsPage] = useState(1);
  const [newWord, setNewWord] = useState("");
  const [page, setPage] = useState(1);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImg, setFormImg] = useState("");
  const [formActive, setFormActive] = useState(true);

  // ── Queries ─────────────────────────────────────────────────
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["admin-categories", page],
    queryFn: () => api.adminCategories.list(page, PAGE_SIZE),
  });

  const categories = categoriesData?.items || [];
  const totalCategories = categoriesData?.total_count || 0;
  const totalPages = Math.ceil(totalCategories / PAGE_SIZE);

  const { data: wordsData, isLoading: wordsLoading } = useQuery({
    queryKey: ["category-words", wordsCat?.id, wordsPage],
    queryFn: () =>
      api.public.getCategoryWords(wordsCat!.id, wordsPage, WORDS_PAGE_SIZE),
    enabled: !!wordsCat,
  });

  const invalidateCats = () =>
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  const invalidateWords = () =>
    qc.invalidateQueries({ queryKey: ["category-words", wordsCat?.id] });

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description: string; image_url?: string | null }) =>
      api.adminCategories.create(payload),
    onSuccess: () => { toast.success("Category created"); invalidateCats(); setEditCat(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: {
      id: number;
      payload: { title?: string; description?: string; image_url?: string | null; is_active?: boolean };
    }) => api.adminCategories.update(id, payload),
    onSuccess: () => { toast.success("Category updated"); invalidateCats(); setEditCat(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.adminCategories.delete(id),
    onSuccess: () => { toast.success("Category deleted"); invalidateCats(); setDeleteCat(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addWordsMutation = useMutation({
    mutationFn: ({ catId, words }: { catId: number; words: string[] }) =>
      api.adminCategories.addWords(catId, words),
    onSuccess: () => { toast.success("Words added"); invalidateWords(); setNewWord(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteWordMutation = useMutation({
    mutationFn: ({ catId, word }: { catId: number; word: string }) =>
      api.adminCategories.deleteWord(catId, word),
    onSuccess: () => { toast.success("Word removed"); invalidateWords(); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Handlers ────────────────────────────────────────────────
  const openCreate = () => {
    setIsNew(true);
    setFormTitle(""); setFormDesc(""); setFormImg(""); setFormActive(true);
    setEditCat({} as Category);
  };

  const openEdit = (cat: Category) => {
    setIsNew(false);
    setFormTitle(cat.title);
    setFormDesc(cat.description);
    setFormImg(cat.image_url || "");
    setFormActive(cat.is_active ?? true);
    setEditCat(cat);
  };

  const handleSave = () => {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    const payload = {
      title: formTitle,
      description: formDesc,
      image_url: formImg || null,
      is_active: formActive,
    };
    if (isNew) {
      createMutation.mutate(payload);
    } else if (editCat?.id) {
      updateMutation.mutate({ id: editCat.id, payload });
    }
  };

  const addWord = () => {
    if (!newWord.trim() || !wordsCat) return;
    const words = newWord.split(",").map((w) => w.trim()).filter(Boolean);
    addWordsMutation.mutate({ catId: wordsCat.id, words });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          + New Category
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-52" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => {
            const globalIndex = (page - 1) * PAGE_SIZE + i + 1;
            return (
              <div key={cat.id} className="border border-border flex flex-col relative group">
                <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-background/80 backdrop-blur-sm border border-border text-[9px] font-mono font-bold text-muted-foreground shadow-sm">
                  #{globalIndex.toString().padStart(2, "0")}
                </div>
                <div className="h-36 bg-muted flex items-center justify-center text-muted-foreground text-xs font-mono">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.title} className="h-full w-full object-cover" />
                  ) : (
                    "No Image"
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg leading-none">{cat.title}</h3>
                    {cat.is_active === false && (
                      <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 border border-border">DISABLED</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4 italic">
                    {cat.description || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setWordsCat(cat); setWordsPage(1); }}
                        className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-border hover:bg-accent transition-colors"
                      >
                        Words
                      </button>
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 border border-border hover:bg-accent transition-colors"
                        title="Edit category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteCat(cat)}
                        className="p-1.5 border border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DataPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Create/Edit Modal */}
      <Modal
        open={!!editCat}
        onClose={() => setEditCat(null)}
        title={isNew ? "Create New Category" : "Edit Category"}
        footer={
          <div className="flex justify-end gap-3">
             <button
              onClick={() => setEditCat(null)}
              className="px-4 py-2 text-sm border border-border hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90"
            >
              {isNew ? "Create" : "Save Changes"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">Title</label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">Description</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[100px]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">Image URL</label>
            <input
              value={formImg}
              onChange={(e) => setFormImg(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cat-active"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
              className="rounded-none border-input text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="cat-active" className="text-sm font-medium">Category is Active</label>
          </div>
        </div>
      </Modal>

      {/* Words Management Modal */}
      <Modal
        open={!!wordsCat}
        onClose={() => setWordsCat(null)}
        title={`Manage Words: ${wordsCat?.title}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-muted p-4 border border-border">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-muted-foreground">Add New Words (Comma separated)</label>
            <div className="flex gap-2">
              <input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="apple, banana, cherry..."
                className="flex-1 border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={addWord}
                disabled={addWordsMutation.isPending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50"
              >
                ADD
              </button>
            </div>
          </div>

          <div className="space-y-3">
             <h4 className="text-sm font-bold uppercase tracking-tighter text-muted-foreground">Existing Word Treasury</h4>
             {wordsLoading ? (
               <div className="grid grid-cols-4 gap-2">
                 {Array.from({ length: 12 }).map((_, i) => <LoadingSkeleton key={i} className="h-8 w-full" />)}
               </div>
             ) : wordsData?.words.length === 0 ? (
               <div className="py-8 text-center text-sm italic text-muted-foreground">No words in this category yet.</div>
             ) : (
               <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {wordsData?.words.map((w: string) => (
                    <div key={w} className="bg-background border border-border px-3 py-1.5 text-sm flex items-center justify-between group hover:border-primary/30 transition-colors">
                      <span className="font-medium truncate">{w}</span>
                      <button
                        onClick={() => wordsCat && deleteWordMutation.mutate({ catId: wordsCat.id, word: w })}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {wordsData && wordsData.total > WORDS_PAGE_SIZE && (
                  <div className="pt-4 border-t border-border mt-6">
                    <DataPagination
                      currentPage={wordsPage}
                      totalPages={Math.ceil(wordsData.total / WORDS_PAGE_SIZE)}
                      onPageChange={setWordsPage}
                    />
                  </div>
                )}
               </>
             )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteCat}
        onClose={() => setDeleteCat(null)}
        onConfirm={() => deleteCat && deleteMutation.mutate(deleteCat.id)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteCat?.title}"? This will NOT delete the words themselves, but they will be unlinked from this category.`}
        confirmLabel="Delete Category"
        danger
      />
    </div>
  );
}
