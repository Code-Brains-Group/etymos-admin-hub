import { useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Check, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataPagination } from "@/components/shared/DataPagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import type {
  Category,
  WordModerationAction,
  WordModerationBulkResult,
  WordModerationFilters,
  WordModerationItem,
  WordModerationSort,
  WordModerationStatus,
} from "@/lib/api";

const PAGE_SIZE = 50;
const STATUS_TABS: { value: Exclude<WordModerationStatus, "all">; label: string }[] = [
  { value: "review", label: "Needs review" },
  { value: "rejected", label: "Rejected" },
  { value: "excluded", label: "Excluded" },
];

function optionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

function getErrorDetails(error: unknown) {
  const apiError = error as Error & {
    detail?: string | { detail?: string; message?: string };
    status?: number;
    payload?: { detail?: string | { detail?: string; message?: string }; message?: string };
  };
  const rawDetail = apiError.detail ?? apiError.payload?.detail;
  const code = typeof rawDetail === "string" ? rawDetail : rawDetail?.detail;
  const nestedMessage = typeof rawDetail === "object" ? rawDetail?.message : undefined;
  return {
    code,
    status: apiError.status,
    message: nestedMessage || apiError.payload?.message || apiError.message,
  };
}

function moderationErrorMessage(error: unknown) {
  const details = getErrorDetails(error);
  if (details.code === "bulk_limit_exceeded") {
    return "More than 5,000 review items match. Narrow the filters and try again.";
  }
  if (details.code === "invalid_confidence_range") {
    return "Minimum confidence cannot be greater than maximum confidence.";
  }
  if (details.code === "word_relationship_not_found" || details.status === 404) {
    return "That moderation item no longer exists. The queue has been refreshed.";
  }
  if (details.status === 401) return "Your admin session has expired. Sign in again.";
  if (details.status === 403) return "Admin permission is required for this action.";
  if (details.status === 503) return "Moderation is temporarily unavailable. Please retry.";
  return details.message || "The moderation action could not be completed.";
}

function confidenceLabel(confidence: number | null) {
  return confidence === null ? "—" : `${Math.round(confidence * 100)}%`;
}

function statusClass(status: string) {
  if (status === "review") return "border-amber-300 bg-amber-50 text-amber-800";
  if (status === "rejected") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

export default function WordModerationPage() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<Exclude<WordModerationStatus, "all">>("review");
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(
    () => searchParams.get("category_id") || "",
  );
  const [minConfidence, setMinConfidence] = useState("");
  const [maxConfidence, setMaxConfidence] = useState("");
  const [source, setSource] = useState("");
  const [visibility, setVisibility] = useState("");
  const [sort, setSort] = useState<WordModerationSort>("confidence_desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmFiltered, setConfirmFiltered] = useState<WordModerationAction | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
      setSelectedIds([]);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const minValue = optionalNumber(minConfidence);
  const maxValue = optionalNumber(maxConfidence);
  const confidenceRangeValid =
    (minValue === undefined || (minValue >= 0 && minValue <= 1)) &&
    (maxValue === undefined || (maxValue >= 0 && maxValue <= 1)) &&
    (minValue === undefined || maxValue === undefined || minValue <= maxValue);

  const filters = useMemo<WordModerationFilters>(
    () => ({
      status,
      page,
      limit: PAGE_SIZE,
      sort,
      category_id: categoryId ? Number(categoryId) : undefined,
      search: search || undefined,
      min_confidence: minValue,
      max_confidence: maxValue,
      source: source || undefined,
      visibility: visibility ? (visibility as "public" | "private") : undefined,
    }),
    [categoryId, maxValue, minValue, page, search, sort, source, status, visibility],
  );

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["admin-word-moderation", filters],
    queryFn: () => api.adminWordModeration.list(filters),
    enabled: confidenceRangeValid,
    placeholderData: keepPreviousData,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["admin-categories", "moderation-filter"],
    queryFn: () => api.adminCategories.list(1, 100),
    staleTime: 5 * 60 * 1000,
  });

  const categories = useMemo(() => {
    if (Array.isArray(categoriesData)) return categoriesData as Category[];
    return Array.isArray(categoriesData?.items) ? categoriesData.items : [];
  }, [categoriesData]);
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allCurrentSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  const resetForFilter = () => {
    setPage(1);
    setSelectedIds([]);
  };

  const refreshRelatedData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-word-moderation"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-category-detail"] }),
      queryClient.invalidateQueries({ queryKey: ["category-words"] }),
      queryClient.invalidateQueries({ queryKey: ["category-suggestions"] }),
    ]);
  };

  const individualMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: WordModerationAction }) =>
      api.adminWordModeration.decide(id, action),
    onSuccess: async (result) => {
      setSelectedIds((current) => current.filter((id) => id !== result.relationship_id));
      await refreshRelatedData();
      toast.success(result.action === "approve" ? `${result.word} approved` : `${result.word} rejected`);
    },
    onError: async (mutationError) => {
      await refreshRelatedData();
      toast.error(moderationErrorMessage(mutationError));
    },
  });

  const selectedMutation = useMutation({
    mutationFn: ({ action, ids }: { action: WordModerationAction; ids: number[] }) =>
      api.adminWordModeration.decideSelected(action, ids),
    onSuccess: async (result: WordModerationBulkResult) => {
      setSelectedIds(result.skipped_ids);
      await refreshRelatedData();
      toast.success(
        `${result.updated_count} word relationship${result.updated_count === 1 ? "" : "s"} updated${
          result.skipped_count ? `; ${result.skipped_count} skipped` : ""
        }`,
      );
    },
    onError: async (mutationError) => {
      await refreshRelatedData();
      toast.error(moderationErrorMessage(mutationError));
    },
  });

  const filteredMutation = useMutation({
    mutationFn: (action: WordModerationAction) => {
      const filtered: Omit<WordModerationFilters, "status" | "sort" | "page" | "limit"> = {
        category_id: filters.category_id,
        search: filters.search,
        min_confidence: filters.min_confidence,
        max_confidence: filters.max_confidence,
        source: filters.source,
        visibility: filters.visibility,
      };
      return api.adminWordModeration.decideFiltered(action, filtered);
    },
    onSuccess: async (result) => {
      setSelectedIds([]);
      await refreshRelatedData();
      toast.success(
        `${result.updated_count} filtered word relationship${result.updated_count === 1 ? "" : "s"} updated`,
      );
    },
    onError: async (mutationError) => {
      await refreshRelatedData();
      toast.error(moderationErrorMessage(mutationError));
    },
  });

  const toggleItem = (id: number, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, id])).slice(0, 500) : current.filter((value) => value !== id),
    );
  };

  const toggleCurrentPage = (checked: boolean) => {
    const currentIds = items.map((item) => item.id);
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, ...currentIds])).slice(0, 500)
        : current.filter((id) => !currentIds.includes(id)),
    );
  };

  const mutationPending =
    individualMutation.isPending || selectedMutation.isPending || filteredMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="font-display text-3xl font-bold">Word Moderation</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Review word-to-category suggestions globally. Decisions are locked against later AI changes.
        </p>
      </div>

      <div className="border border-border">
        <div className="flex flex-wrap border-b border-border bg-muted/20">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                resetForFilter();
              }}
              className={`border-r border-border px-5 py-3 text-sm transition-colors ${
                status === tab.value ? "bg-background font-semibold text-primary" : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              {tab.label}
              <span className="ml-2 font-mono text-xs">{data?.status_counts?.[tab.value] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-7">
          <label className="relative xl:col-span-2">
            <span className="sr-only">Search words</span>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search a word…"
              className="w-full border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <select
            value={categoryId}
            onChange={(event) => {
              const nextCategoryId = event.target.value;
              setCategoryId(nextCategoryId);
              const nextParams = new URLSearchParams(searchParams);
              if (nextCategoryId) {
                nextParams.set("category_id", nextCategoryId);
              } else {
                nextParams.delete("category_id");
              }
              setSearchParams(nextParams, { replace: true });
              resetForFilter();
            }}
            aria-label="Filter by category"
            className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
          </select>
          <select
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value);
              resetForFilter();
            }}
            aria-label="Filter by visibility"
            className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <select
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              resetForFilter();
            }}
            aria-label="Filter by source"
            className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All sources</option>
            <option value="ai">AI</option>
            <option value="admin">Admin</option>
            <option value="predefined">Predefined</option>
            <option value="user">User</option>
          </select>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={minConfidence}
            onChange={(event) => {
              setMinConfidence(event.target.value);
              resetForFilter();
            }}
            aria-label="Minimum confidence"
            placeholder="Min confidence"
            className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={maxConfidence}
            onChange={(event) => {
              setMaxConfidence(event.target.value);
              resetForFilter();
            }}
            aria-label="Maximum confidence"
            placeholder="Max confidence"
            className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as WordModerationSort);
              resetForFilter();
            }}
            aria-label="Sort moderation items"
            className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring xl:col-start-7"
          >
            <option value="confidence_desc">Confidence: high first</option>
            <option value="confidence_asc">Confidence: low first</option>
            <option value="word">Word</option>
            <option value="category">Category</option>
            <option value="newest">Newest</option>
          </select>
        </div>
        {!confidenceRangeValid && (
          <p className="px-4 pb-4 text-xs text-destructive">
            Confidence values must be between 0 and 1, and minimum cannot exceed maximum.
          </p>
        )}
      </div>

      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{total.toLocaleString()}</span> matching item{total === 1 ? "" : "s"}
          {isFetching && !isLoading && <span className="ml-2">Refreshing…</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <span className="mr-1 text-xs font-medium">{selectedIds.length} selected</span>
              <button
                onClick={() => selectedMutation.mutate({ action: "approve", ids: selectedIds })}
                disabled={mutationPending || selectedIds.length > 500}
                className="flex items-center gap-1.5 border border-success/40 px-3 py-2 text-xs text-success hover:bg-success hover:text-success-foreground disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" /> Approve selected
              </button>
              {status === "review" && (
                <button
                  onClick={() => selectedMutation.mutate({ action: "reject", ids: selectedIds })}
                  disabled={mutationPending || selectedIds.length > 500}
                  className="flex items-center gap-1.5 border border-destructive/40 px-3 py-2 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" /> Reject selected
                </button>
              )}
            </>
          )}
          {status === "review" && total > 0 && (
            <>
              <button
                onClick={() => setConfirmFiltered("approve")}
                disabled={mutationPending || !confidenceRangeValid}
                className="border border-border px-3 py-2 text-xs hover:bg-accent disabled:opacity-40"
              >
                Approve all filtered
              </button>
              <button
                onClick={() => setConfirmFiltered("reject")}
                disabled={mutationPending || !confidenceRangeValid}
                className="border border-destructive/30 px-3 py-2 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40"
              >
                Reject all filtered
              </button>
            </>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, index) => <LoadingSkeleton key={index} className="h-24 w-full" />)}
        </div>
      )}

      {!isLoading && error && confidenceRangeValid && (
        <div className="border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {moderationErrorMessage(error)}
        </div>
      )}

      {!isLoading && !error && confidenceRangeValid && items.length === 0 && (
        <EmptyState message={`No ${status} word relationships match these filters.`} />
      )}

      {!isLoading && items.length > 0 && (
        <div className={`overflow-x-auto border border-border transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <table className="min-w-[1280px] w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    onChange={(event) => toggleCurrentPage(event.target.checked)}
                    aria-label="Select all items on this page"
                    className="h-4 w-4 accent-primary"
                  />
                </th>
                <th className="px-4 py-3">Word and meaning</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Dictionary</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item: WordModerationItem) => (
                <tr key={item.id} className={selected.has(item.id) ? "bg-primary/5" : "hover:bg-muted/10"}>
                  <td className="px-4 py-4 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={(event) => toggleItem(item.id, event.target.checked)}
                      aria-label={`Select ${item.word}`}
                      className="h-4 w-4 accent-primary"
                    />
                  </td>
                  <td className="max-w-xs px-4 py-4 align-top">
                    <div className="font-mono text-base font-bold tracking-wide">{item.word}</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.meaning || "No dictionary meaning available"}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="font-medium">{item.category.title}</div>
                    <span className="mt-1 inline-flex border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{item.category.visibility}</span>
                  </td>
                  <td className="px-4 py-4 align-top text-xs">
                    <div>{item.part_of_speech || "—"}</div>
                    <div className="mt-1 max-w-40 text-muted-foreground">{item.origin || "Origin unavailable"}</div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className="font-mono font-semibold">{confidenceLabel(item.confidence)}</span>
                  </td>
                  <td className="max-w-xs px-4 py-4 align-top text-xs leading-relaxed text-muted-foreground">{item.reason || "No reason supplied"}</td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex border px-2 py-0.5 text-[10px] uppercase ${statusClass(item.status)}`}>{item.status}</span>
                    <div className="mt-2 text-[10px] uppercase text-muted-foreground">Source: {item.source}</div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => individualMutation.mutate({ id: item.id, action: "approve" })}
                        disabled={mutationPending}
                        className="flex items-center gap-1 border border-success/40 px-2 py-1 text-xs text-success hover:bg-success hover:text-success-foreground disabled:opacity-40"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      {item.status === "review" && (
                        <button
                          onClick={() => individualMutation.mutate({ id: item.id, action: "reject" })}
                          disabled={mutationPending}
                          className="flex items-center gap-1 border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DataPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        open={!!confirmFiltered}
        onClose={() => setConfirmFiltered(null)}
        onConfirm={() => confirmFiltered && filteredMutation.mutate(confirmFiltered)}
        title={`${confirmFiltered === "approve" ? "Approve" : "Reject"} all filtered words`}
        message={`${confirmFiltered === "approve" ? "Approve" : "Reject"} all ${total.toLocaleString()} review items matching the current filters? This decision is locked and applies beyond the current page.`}
        confirmLabel={`${confirmFiltered === "approve" ? "Approve" : "Reject"} all ${total.toLocaleString()}`}
        danger={confirmFiltered === "reject"}
      />
    </div>
  );
}
