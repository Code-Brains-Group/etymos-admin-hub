import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { DataPagination } from "@/components/shared/DataPagination";
import { toast } from "sonner";
import { Eye, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type {
  Category,
  CategoryDetail,
  CategorySuggestionItem,
  CategoryWordItem,
} from "@/lib/api";

const WORDS_PAGE_SIZE = 50;
const PAGE_SIZE = 20;
const SOURCE_HINT_OPTIONS = [
  "general vocabulary",
  "verb",
  "adjective",
  "adverb",
  "animal",
  "architecture",
  "clothing",
  "food",
  "language",
  "law and society",
  "medicine",
  "music",
  "place or culture",
  "plant",
  "religion",
  "science",
  "technology",
] as const;

export default function CategoriesPage() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [editCat, setEditCat] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [detailCat, setDetailCat] = useState<Category | null>(null);
  const [wordsCat, setWordsCat] = useState<Category | null>(null);
  const [wordsPage, setWordsPage] = useState(1);
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [newWord, setNewWord] = useState("");
  const [page, setPage] = useState(() => Number(searchParams.get("page") || 1));
  const [filterVisibility, setFilterVisibility] = useState<
    "all" | "public" | "private"
  >(
    () =>
      (searchParams.get("visibility") as "all" | "public" | "private") || "all",
  );
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >(
    () =>
      (searchParams.get("active") as "all" | "active" | "inactive") || "all",
  );
  const [filterEnrichment, setFilterEnrichment] = useState<
    | "all"
    | "ready"
    | "pending"
    | "enriching"
    | "retrying"
    | "failed"
    | "needs_guidance"
  >(
    () =>
      (searchParams.get("enrichment") as
        | "all"
        | "ready"
        | "pending"
        | "enriching"
        | "retrying"
        | "failed"
        | "needs_guidance") || "all",
  );
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [detailTab, setDetailTab] = useState<
    "overview" | "approved" | "suggestions"
  >("overview");
  const [pendingWordRemove, setPendingWordRemove] = useState<{
    catId: number;
    word: string;
    source: "approved" | "suggestion";
  } | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImg, setFormImg] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formHints, setFormHints] = useState<string[]>([]);
  const [formExamples, setFormExamples] = useState("");
  const [formVisibility, setFormVisibility] = useState<"public" | "private">(
    "public",
  );
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (page === 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(page));
    }

    if (filterVisibility === "all") {
      nextParams.delete("visibility");
    } else {
      nextParams.set("visibility", filterVisibility);
    }

    if (filterActive === "all") {
      nextParams.delete("active");
    } else {
      nextParams.set("active", filterActive);
    }

    if (filterEnrichment === "all") {
      nextParams.delete("enrichment");
    } else {
      nextParams.set("enrichment", filterEnrichment);
    }

    const next = nextParams.toString();
    const current = searchParams.toString();
    if (next !== current) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    filterVisibility,
    filterActive,
    filterEnrichment,
    page,
    searchParams,
    setSearchParams,
  ]);

  // ── Queries ─────────────────────────────────────────────────
  const {
    data: categoriesData,
    isLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["admin-categories", page],
    queryFn: () => api.adminCategories.list(page, PAGE_SIZE),
  });

  const categories = useMemo(() => {
    if (Array.isArray(categoriesData)) return categoriesData as Category[];
    if (categoriesData && typeof categoriesData === "object") {
      const maybePaged = categoriesData as Partial<{ items: Category[] }>;
      if (Array.isArray(maybePaged.items)) return maybePaged.items;
    }
    return [] as Category[];
  }, [categoriesData]);

  useEffect(() => {
    const reviewCategoryId = searchParams.get("reviewCategory");
    if (!reviewCategoryId || !categories.length) return;

    const targetCategory = categories.find(
      (category) => String(category.id) === reviewCategoryId,
    );
    if (!targetCategory) return;

    setDetailCat(targetCategory);
    setWordsCat(targetCategory);
    setWordsPage(1);
    setSuggestionsPage(1);
    setDetailTab(
      (searchParams.get("reviewTab") as
        | "overview"
        | "approved"
        | "suggestions") || "overview",
    );

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("reviewCategory");
    nextParams.delete("reviewTab");
    setSearchParams(nextParams, { replace: true });
  }, [categories, searchParams, setSearchParams]);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesVisibility =
        filterVisibility === "all" || cat.visibility === filterVisibility;
      const matchesActive =
        filterActive === "all" ||
        (filterActive === "active"
          ? cat.is_active !== false
          : cat.is_active === false);
      const matchesEnrichment =
        filterEnrichment === "all" ||
        cat.enrichment_status === filterEnrichment;
      return matchesVisibility && matchesActive && matchesEnrichment;
    });
  }, [categories, filterActive, filterEnrichment, filterVisibility]);
  const totalCategories = filteredCategories.length;
  const totalPages = Math.max(1, Math.ceil(totalCategories / PAGE_SIZE));

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-category-detail", detailCat?.id],
    queryFn: () => api.adminCategories.getDetail(detailCat!.id),
    enabled: !!detailCat,
    refetchInterval: (query) => {
      const status = query.state.data?.enrichment_status;
      return status && ["pending", "enriching", "retrying"].includes(status)
        ? 30000
        : false;
    },
    refetchIntervalInBackground: false,
  });

  const { data: wordsData, isLoading: wordsLoading } = useQuery({
    queryKey: ["category-words", wordsCat?.id, wordsPage],
    queryFn: () =>
      api.adminCategories.listWords(wordsCat!.id, wordsPage, WORDS_PAGE_SIZE),
    enabled: !!wordsCat,
  });

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["category-suggestions", wordsCat?.id, suggestionsPage],
    queryFn: () =>
      api.adminCategories.listWordSuggestions(
        wordsCat!.id,
        suggestionsPage,
        WORDS_PAGE_SIZE,
      ),
    enabled: !!wordsCat,
  });

  const invalidateCats = () =>
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  const invalidateDetail = () =>
    qc.invalidateQueries({
      queryKey: ["admin-category-detail", detailCat?.id],
    });
  const invalidateWords = () =>
    qc.invalidateQueries({ queryKey: ["category-words", wordsCat?.id] });
  const invalidateSuggestions = () =>
    qc.invalidateQueries({ queryKey: ["category-suggestions", wordsCat?.id] });

  // ── Mutations ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      image_url?: string | null;
      matching_instructions?: string | null;
      source_category_hints?: string[];
      example_words?: string[];
      visibility?: "public" | "private";
      is_active?: boolean;
    }) => api.adminCategories.create(payload),
    onSuccess: () => {
      toast.success("Category created");
      invalidateCats();
      invalidateDetail();
      setEditCat(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        title?: string;
        description?: string;
        image_url?: string | null;
        matching_instructions?: string | null;
        source_category_hints?: string[];
        example_words?: string[];
        visibility?: "public" | "private";
        is_active?: boolean;
      };
    }) => api.adminCategories.update(id, payload),
    onSuccess: () => {
      toast.success("Category updated");
      invalidateCats();
      invalidateDetail();
      invalidateWords();
      invalidateSuggestions();
      setEditCat(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.adminCategories.delete(id),
    onSuccess: () => {
      toast.success("Category deleted");
      invalidateCats();
      invalidateDetail();
      setDeleteCat(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addWordsMutation = useMutation({
    mutationFn: ({ catId, words }: { catId: number; words: string[] }) =>
      api.adminCategories.addWords(catId, words),
    onSuccess: (result) => {
      toast.success(
        `Added ${result.added} word${result.added === 1 ? "" : "s"}${result.skipped_duplicates ? `, skipped ${result.skipped_duplicates} duplicate${result.skipped_duplicates === 1 ? "" : "s"}` : ""}`,
      );
      invalidateWords();
      invalidateSuggestions();
      setNewWord("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteWordMutation = useMutation({
    mutationFn: ({ catId, word }: { catId: number; word: string }) =>
      api.adminCategories.deleteWord(catId, word),
    onSuccess: () => {
      toast.success("Word excluded from category");
      invalidateWords();
      invalidateSuggestions();
      invalidateDetail();
      setPendingWordRemove(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveSuggestionsMutation = useMutation({
    mutationFn: ({ catId, words }: { catId: number; words: string[] }) =>
      api.adminCategories.addWords(catId, words),
    onSuccess: (result) => {
      toast.success(
        `Approved ${result.added} suggestion${result.added === 1 ? "" : "s"}`,
      );
      invalidateWords();
      invalidateSuggestions();
      setSelectedSuggestions([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Handlers ────────────────────────────────────────────────
  const openCreate = () => {
    setIsNew(true);
    setFormTitle("");
    setFormDesc("");
    setFormImg("");
    setFormInstructions("");
    setFormHints([]);
    setFormExamples("");
    setFormVisibility("public");
    setFormActive(true);
    setEditCat({} as Category);
  };

  const openEdit = (cat: Category) => {
    setIsNew(false);
    setFormTitle(cat.title);
    setFormDesc(cat.description);
    setFormImg(cat.image_url || "");
    setFormInstructions(cat.matching_instructions || "");
    setFormHints(cat.source_category_hints || []);
    setFormExamples((cat.example_words || []).join(", "));
    setFormVisibility(cat.visibility || "public");
    setFormActive(cat.is_active ?? true);
    setEditCat(cat);
  };

  const handleSave = () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    const exampleWords = formExamples
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((word) => word.toUpperCase());

    const payload = {
      title: formTitle,
      description: formDesc,
      image_url: formImg || null,
      matching_instructions: formInstructions || null,
      source_category_hints: formHints,
      example_words: exampleWords,
      visibility: formVisibility,
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
    const words = newWord
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean)
      .map((w) => w.toUpperCase());
    addWordsMutation.mutate({ catId: wordsCat.id, words });
  };

  const approveSelectedSuggestions = () => {
    if (!wordsCat || selectedSuggestions.length === 0) return;
    approveSuggestionsMutation.mutate({
      catId: wordsCat.id,
      words: selectedSuggestions,
    });
  };

  const toggleHint = (hint: string) => {
    setFormHints((current) =>
      current.includes(hint)
        ? current.filter((item) => item !== hint)
        : [...current, hint],
    );
  };

  const detailStatus = useMemo(() => {
    const status = (detailData?.enrichment_status || "ready").toLowerCase();
    return status.replace(/^./, (char) => char.toUpperCase());
  }, [detailData?.enrichment_status]);

  const exampleWordEntries = useMemo(() => {
    return formExamples
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((word) => ({ raw: word, normalized: word.toUpperCase() }));
  }, [formExamples]);

  const invalidExampleWords = useMemo(() => {
    return exampleWordEntries.filter(
      (entry) => !/^[A-Za-zÀ-ÿ0-9' -]{2,}$/.test(entry.raw),
    );
  }, [exampleWordEntries]);

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

      <div className="flex flex-wrap gap-3 items-center border border-border bg-background p-3">
        <select
          value={filterVisibility}
          onChange={(e) => {
            setFilterVisibility(e.target.value as "all" | "public" | "private");
            setPage(1);
          }}
          className="border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Visibility</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <select
          value={filterActive}
          onChange={(e) => {
            setFilterActive(e.target.value as "all" | "active" | "inactive");
            setPage(1);
          }}
          className="border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={filterEnrichment}
          onChange={(e) => {
            setFilterEnrichment(
              e.target.value as
                | "all"
                | "ready"
                | "pending"
                | "enriching"
                | "retrying"
                | "failed"
                | "needs_guidance",
            );
            setPage(1);
          }}
          className="border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Enrichment</option>
          <option value="ready">Ready</option>
          <option value="pending">Pending</option>
          <option value="enriching">Enriching</option>
          <option value="retrying">Retrying</option>
          <option value="failed">Failed</option>
          <option value="needs_guidance">Needs Guidance</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-52" />
          ))}
        </div>
      ) : categoriesError ? (
        <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Unable to load categories from the admin API. Check the backend
          connection and authentication token, then try again.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories
            .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
            .map((cat, i) => {
              const globalIndex = (page - 1) * PAGE_SIZE + i + 1;
              return (
                <div
                  key={cat.id}
                  className="border border-border flex flex-col relative group"
                >
                  <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-background/80 backdrop-blur-sm border border-border text-[9px] font-mono font-bold text-muted-foreground shadow-sm">
                    #{globalIndex.toString().padStart(2, "0")}
                  </div>
                  <div className="h-36 bg-muted flex items-center justify-center text-muted-foreground text-xs font-mono">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "No Image"
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg leading-none">
                        {cat.title}
                      </h3>
                      <div className="flex gap-2">
                        {cat.visibility && (
                          <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 border border-border uppercase">
                            {cat.visibility}
                          </span>
                        )}
                        {cat.word_count !== undefined &&
                          cat.word_count < 20 && (
                            <span
                              className="text-[9px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 border border-amber-500/20"
                              title="Low words: API will fall back to full dictionary"
                            >
                              ⚠️ LOW WORDS
                            </span>
                          )}
                        {cat.is_active === false && (
                          <span className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 border border-border">
                            DISABLED
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4 italic">
                      {cat.description || "No description provided."}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[10px] mb-3">
                      <span className="border border-border px-1.5 py-0.5 bg-background">
                        Words: {cat.word_count ?? "—"}
                      </span>
                      <span className="border border-border px-1.5 py-0.5 bg-background uppercase">
                        {cat.enrichment_status || "ready"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setDetailCat(cat);
                            setWordsCat(cat);
                            setWordsPage(1);
                            setSuggestionsPage(1);
                          }}
                          className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-border hover:bg-accent transition-colors"
                        >
                          Review Category
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
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
              Title
            </label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
              Description
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[100px]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
              Image URL
            </label>
            <input
              value={formImg}
              onChange={(e) => setFormImg(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
              Matching Instructions
            </label>
            <textarea
              value={formInstructions}
              onChange={(e) => setFormInstructions(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[90px]"
              placeholder="Describe what to include and exclude for this category"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
              Source Category Hints
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Pick broad labels that help the enrichment worker find relevant
              candidates. These are guidance labels, not final user-facing
              categories.
            </p>
            <div className="flex flex-wrap gap-2">
              {SOURCE_HINT_OPTIONS.map((hint) => {
                const active = formHints.includes(hint);
                return (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => toggleHint(hint)}
                    className={`px-2.5 py-1.5 text-xs border transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {hint}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
              Example Words
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Example words are treated as trusted manual approvals when they
              exist in the dictionary. They are normalized to uppercase visually
              and sent to the backend as-is.
            </p>
            <input
              value={formExamples}
              onChange={(e) => setFormExamples(e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="COUSCOUS, UGALI, INJERA"
            />
            {exampleWordEntries.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {exampleWordEntries.map((entry) => (
                  <span
                    key={entry.normalized}
                    className={`px-2 py-1 text-[11px] border ${
                      invalidExampleWords.some((item) => item.raw === entry.raw)
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {entry.normalized}
                  </span>
                ))}
              </div>
            )}
            {invalidExampleWords.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Some example words look invalid and may need correction before
                review.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-muted-foreground">
              Visibility
            </label>
            <select
              value={formVisibility}
              onChange={(e) =>
                setFormVisibility(e.target.value as "public" | "private")
              }
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cat-active"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
              className="rounded-none border-input text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="cat-active" className="text-sm font-medium">
              Category is Active
            </label>
          </div>
        </div>
      </Modal>

      {/* Category Detail Modal */}
      <Modal
        open={!!wordsCat}
        onClose={() => setWordsCat(null)}
        title={`Category: ${wordsCat?.title}`}
        size="xl"
      >
        <div className="space-y-6">
          <div className="bg-primary/10 border border-primary/20 p-3 text-xs text-primary rounded">
            <strong>Tip:</strong> Matching instructions, source hints, and
            examples guide enrichment. Approved cached words stay visible even
            if enrichment is running or fails.
          </div>

          <div className="flex gap-2 border-b border-border pb-2">
            {(
              [
                ["overview", "Overview"],
                ["approved", "Approved Words"],
                ["suggestions", "AI Suggestions"],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDetailTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                  detailTab === tab
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {detailTab === "overview" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Eye className="h-4 w-4" /> Overview
                </div>
                {detailLoading ? (
                  <LoadingSkeleton className="h-24" />
                ) : (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <span className="text-foreground font-medium">
                        Visibility:
                      </span>{" "}
                      {detailData?.visibility || "public"}
                    </div>
                    <div>
                      <span className="text-foreground font-medium">
                        Status:
                      </span>{" "}
                      {detailStatus}
                    </div>
                    <div>
                      <span className="text-foreground font-medium">
                        Approved words:
                      </span>{" "}
                      {detailData?.approved_word_count ??
                        detailData?.word_count ??
                        "—"}
                    </div>
                    <div>
                      <span className="text-foreground font-medium">
                        Suggested words:
                      </span>{" "}
                      {detailData?.suggested_word_count ?? "—"}
                    </div>
                    {(detailData?.matching_instructions ||
                      detailData?.source_category_hints?.length ||
                      detailData?.example_words?.length) && (
                      <div className="space-y-2">
                        {detailData?.matching_instructions && (
                          <p>
                            <span className="text-foreground font-medium">
                              Instructions:
                            </span>{" "}
                            {detailData.matching_instructions}
                          </p>
                        )}
                        {detailData?.source_category_hints?.length ? (
                          <p>
                            <span className="text-foreground font-medium">
                              Hints:
                            </span>{" "}
                            {detailData.source_category_hints.join(", ")}
                          </p>
                        ) : null}
                        {detailData?.example_words?.length ? (
                          <p>
                            <span className="text-foreground font-medium">
                              Examples:
                            </span>{" "}
                            {detailData.example_words.join(", ")}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="border border-border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" /> Enrichment Status
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    <span className="text-foreground font-medium">
                      Current status:
                    </span>{" "}
                    {detailStatus}
                  </div>
                  {detailData?.sample_words?.length ? (
                    <div>
                      <span className="text-foreground font-medium">
                        Sample words:
                      </span>{" "}
                      {detailData.sample_words.join(", ")}
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Enrichment runs asynchronously. The approved cached words
                    remain usable while the background process updates the pool.
                  </p>
                </div>
              </div>
            </div>
          ) : detailTab === "approved" ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 border border-border">
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-muted-foreground">
                  Add Approved Words
                </label>
                <div className="flex gap-2">
                  <input
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="COUSCOUS, UGALI, INJERA"
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
                <h4 className="text-sm font-bold uppercase tracking-tighter text-muted-foreground">
                  Approved Words
                </h4>
                {wordsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <LoadingSkeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : wordsData?.items?.length || wordsData?.words?.length ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(
                        wordsData.items ||
                        (wordsData.words || []).map(
                          (word: string) => ({ word }) as CategoryWordItem,
                        )
                      ).map((entry: CategoryWordItem) => (
                        <div
                          key={entry.word}
                          className="bg-background border border-border px-3 py-1.5 text-sm flex items-center justify-between group hover:border-primary/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {entry.word}
                            </div>
                            {entry.reason && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                {entry.reason}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              wordsCat &&
                              setPendingWordRemove({
                                catId: wordsCat.id,
                                word: entry.word,
                                source: "approved",
                              })
                            }
                            disabled={deleteWordMutation.isPending}
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            title="Exclude from category"
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
                          totalPages={Math.ceil(
                            wordsData.total / WORDS_PAGE_SIZE,
                          )}
                          onPageChange={setWordsPage}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-sm italic text-muted-foreground">
                    No approved words in this category yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestionsLoading ? (
                <LoadingSkeleton className="h-24" />
              ) : suggestionsData?.items?.length ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      Select suggestions to approve
                    </span>
                    <button
                      onClick={approveSelectedSuggestions}
                      disabled={
                        approveSuggestionsMutation.isPending ||
                        selectedSuggestions.length === 0
                      }
                      className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      Approve Selected
                    </button>
                  </div>
                  {suggestionsData.items.map(
                    (suggestion: CategorySuggestionItem) => {
                      const checked = selectedSuggestions.includes(
                        suggestion.word,
                      );
                      return (
                        <div
                          key={suggestion.word}
                          className="border border-border p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-start gap-2 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedSuggestions((current) =>
                                    current.includes(suggestion.word)
                                      ? current.filter(
                                          (word) => word !== suggestion.word,
                                        )
                                      : [...current, suggestion.word],
                                  )
                                }
                                className="mt-1"
                              />
                              <div>
                                <div className="font-medium">
                                  {suggestion.word}
                                </div>
                                {suggestion.meaning && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {suggestion.meaning}
                                  </p>
                                )}
                                {suggestion.reason && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {suggestion.reason}
                                  </p>
                                )}
                              </div>
                            </label>
                            <div className="flex items-center gap-2">
                              {suggestion.confidence !== undefined &&
                                suggestion.confidence !== null && (
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(suggestion.confidence * 100)}%
                                  </span>
                                )}
                              <button
                                type="button"
                                onClick={() =>
                                  wordsCat &&
                                  setPendingWordRemove({
                                    catId: wordsCat.id,
                                    word: suggestion.word,
                                    source: "suggestion",
                                  })
                                }
                                className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              >
                                Exclude
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No suggestions currently available.
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingWordRemove}
        onClose={() => setPendingWordRemove(null)}
        onConfirm={() =>
          pendingWordRemove &&
          deleteWordMutation.mutate({
            catId: pendingWordRemove.catId,
            word: pendingWordRemove.word,
          })
        }
        title={
          pendingWordRemove?.source === "suggestion"
            ? "Exclude suggestion from category"
            : "Exclude word from category"
        }
        message={
          pendingWordRemove?.source === "suggestion"
            ? `Exclude "${pendingWordRemove?.word}" from this category? It will remain in the dictionary, but it will be locked out of future category enrichment.`
            : `Exclude "${pendingWordRemove?.word}" from this category? It will remain in the dictionary, but it will be locked out of future category enrichment.`
        }
        confirmLabel="Exclude"
        danger
      />

      <ConfirmDialog
        open={!!deleteCat}
        onClose={() => setDeleteCat(null)}
        onConfirm={() => deleteCat && deleteMutation.mutate(deleteCat.id)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteCat?.title}"? This permanent action will remove the category and affect existing category associations.`}
        confirmLabel="Delete Category"
        danger
      />
    </div>
  );
}
