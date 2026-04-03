import { useState } from "react";
import { DataPagination } from "@/components/shared/DataPagination";

const categories = ["All Categories", "SAT Vocabulary", "GRE Words", "Business English", "Medical Terms"];

const mockLeaderboard = Array.from({ length: 30 }, (_, i) => ({
  rank: i + 1,
  name: `Player ${i + 1}`,
  points: Math.floor(5000 - i * 120 + Math.random() * 50),
  quizzes: Math.floor(80 - i * 2 + Math.random() * 10),
}));

const PAGE_SIZE = 10;

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState<"all" | "weekly" | "monthly">("all");
  const [category, setCategory] = useState(categories[0]);
  const [sortBy, setSortBy] = useState<"points" | "quizzes">("points");
  const [page, setPage] = useState(1);

  const sorted = [...mockLeaderboard].sort((a, b) => b[sortBy] - a[sortBy]).map((item, i) => ({ ...item, rank: i + 1 }));
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex border border-border">
          {(["all", "weekly", "monthly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTimeRange(t); setPage(1); }}
              className={`px-4 py-2 text-sm capitalize transition-colors ${timeRange === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              {t === "all" ? "All Time" : t}
            </button>
          ))}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "points" | "quizzes")} className="border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="points">Sort by Points</option>
          <option value="quizzes">Sort by Quizzes</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground w-16">Rank</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Player</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Points</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Quizzes</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p, i) => {
              const isTop3 = p.rank <= 3;
              return (
                <tr key={p.rank} className={`border-b border-border hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/20" : ""} ${isTop3 ? "font-semibold border-l-2 border-l-foreground" : ""}`}>
                  <td className="px-4 py-3 font-mono">{p.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 bg-primary text-primary-foreground flex items-center justify-center text-xs font-mono">
                        {p.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      {p.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">{p.points.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono">{p.quizzes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DataPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
