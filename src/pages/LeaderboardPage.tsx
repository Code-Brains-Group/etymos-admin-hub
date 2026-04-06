import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { DataPagination } from "@/components/shared/DataPagination";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

const PAGE_SIZE = 20;

export default function LeaderboardPage() {
  const { api } = useAuth();

  const [timeRange, setTimeRange] = useState<"alltime" | "weekly" | "monthly">("alltime");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"points" | "time">("points");
  const [page, setPage] = useState(1);

  // ── Fetch categories for filter ──────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.public.getCategories(),
  });

  // ── Fetch leaderboard ────────────────────────────────────────
  const { data: leaderboard, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", timeRange, categoryId, sortBy, page],
    queryFn: () =>
      api.public.getGlobalLeaderboard({
        filter: timeRange,
        category_id: categoryId,
        sort: sortBy,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const entries = leaderboard?.results ?? [];
  const totalPages = leaderboard
    ? Math.ceil(leaderboard.total / PAGE_SIZE)
    : 1;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex border border-border">
          {(["alltime", "weekly", "monthly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTimeRange(t); setPage(1); }}
              className={`px-4 py-2 text-sm capitalize transition-colors ${
                timeRange === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {t === "alltime" ? "All Time" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={categoryId ?? ""}
          onChange={(e) => {
            setCategoryId(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as "points" | "time"); setPage(1); }}
          className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="points">Sort by Points</option>
          <option value="time">Sort by Time</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Player</th>
              <th className="px-4 py-3 text-left">Points</th>
              <th className="px-4 py-3 text-left">Quizzes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <LoadingSkeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : isError
              ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Failed to load leaderboard data.
                    </td>
                  </tr>
                )
              : entries.length === 0
              ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No leaderboard entries for this filter.
                    </td>
                  </tr>
                )
              : entries.map((entry, i) => {
                  const isTop3 = entry.rank <= 3;
                  const nameStr = entry.full_name || "Unknown Player";
                  const initials = nameStr
                    .split(" ")
                    .map((n) => n[0])
                    .filter(Boolean)
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <tr
                      key={entry.user_id || i}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        i % 2 === 1 ? "bg-muted/20" : ""
                      } ${isTop3 ? "font-semibold border-l-2 border-l-foreground" : ""}`}
                    >
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                        {entry.rank.toString().padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {entry.avatar_url ? (
                            <img
                              src={entry.avatar_url}
                              alt={entry.full_name}
                              className="h-7 w-7 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold border border-border">
                              {initials}
                            </div>
                          )}
                          {nameStr}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">{(entry.total_points || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono">{entry.quizzes_completed || 0}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <DataPagination currentPage={page} totalPages={Math.max(1, totalPages)} onPageChange={setPage} />
    </div>
  );
}
