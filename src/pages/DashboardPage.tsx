import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { formatDate } from "@/lib/utils";
import { subDays, format } from "date-fns";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell,
  PieChart, Pie, Legend, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";

// ── Colour Palette (muted, desaturated) ──────────────────────────────────────
const PALETTE = {
  indigo:  "#818cf8",   // soft indigo
  violet:  "#a78bfa",   // muted violet
  emerald: "#6ee7b7",   // sage green
  amber:   "#fbbf24",   // warm amber (kept slightly bright as accent)
  rose:    "#fb7185",   // soft rose
  sky:     "#7dd3fc",   // pale sky
  fuchsia: "#e879f9",   // muted fuchsia
  teal:    "#5eead4",   // soft teal
  orange:  "#fdba74",   // pale orange
};

const PIE_COLORS = [PALETTE.indigo, PALETTE.emerald, PALETTE.amber, PALETTE.rose, PALETTE.sky, PALETTE.fuchsia, PALETTE.teal];

const areaGrowthConfig: ChartConfig = {
  user_growth:    { label: "New Users",       color: PALETTE.indigo },
  quizzes:        { label: "Quizzes Started", color: PALETTE.emerald },
};
const wordSearchConfig: ChartConfig = {
  word_searches:  { label: "Word Searches",   color: PALETTE.sky },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function mergeTimeSeries(
  seriesA: { date: string; value: number }[],
  keyA: string,
  seriesB: { date: string; value: number }[],
  keyB: string,
) {
  const map: Record<string, Record<string, number | string>> = {};
  seriesA.forEach(({ date, value }) => {
    if (!map[date]) map[date] = { date };
    map[date][keyA] = value;
  });
  seriesB.forEach(({ date, value }) => {
    if (!map[date]) map[date] = { date };
    map[date][keyB] = value;
  });
  return Object.values(map).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function buildStackedActivity(raw: Record<string, { date: string; value: number }[]>) {
  const allDates = [...new Set(Object.values(raw).flat().map(p => p.date))].sort();
  return allDates.map(date => {
    const entry: Record<string, number | string> = { date };
    for (const [key, series] of Object.entries(raw)) {
      const point = series.find(p => p.date === date);
      entry[key] = point?.value ?? 0;
    }
    return entry;
  });
}

function formatAxisDate(d: string, granularity: string) {
  try {
    const dt = new Date(d);
    if (granularity === "month") return format(dt, "MMM yy");
    if (granularity === "week")  return format(dt, "MMM d");
    return format(dt, "MMM d");
  } catch { return d; }
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomPieTip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border px-3 py-2 text-xs shadow-lg rounded">
      <p className="font-semibold capitalize">{payload[0].name.replace(/_/g, " ")}</p>
      <p className="text-muted-foreground">{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

// ── Granularity quick-default dates ──────────────────────────────────────────
function defaultDateRange(gran: "day" | "week" | "month") {
  const end   = new Date();
  const days  = gran === "month" ? 365 : gran === "week" ? 90 : 30;
  const start = subDays(end, days);
  return {
    start: start.toISOString().slice(0, 10),
    end:   end.toISOString().slice(0, 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate  = useNavigate();
  const { api }   = useAuth();

  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [activityStart, setActivityStart] = useState("");
  const [activityEnd,   setActivityEnd]   = useState("");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.admin.getStats(),
    retry: 1,
  });

  // ── Activity Stream ───────────────────────────────────────────────────────
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ["admin-activities", activityStart, activityEnd],
    queryFn: () => {
      const start = activityStart ? new Date(activityStart).toISOString() : undefined;
      const end   = activityEnd   ? new Date(activityEnd).toISOString()   : undefined;
      return api.admin.getActivities(undefined, 1, 50, start, end);
    },
  });
  const activities = activitiesData?.items ?? [];

  // ── Analytics ─────────────────────────────────────────────────────────────
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-analytics", granularity],
    queryFn: () => {
      const { start, end } = defaultDateRange(granularity);
      return api.admin.getAnalytics({
        granularity,
        start_date: new Date(start).toISOString(),
        end_date:   new Date(end).toISOString(),
      });
    },
    retry: 1,
  });

  const { data: recentAwardsData, isLoading: awardsLoading } = useQuery({
    queryKey: ["admin-recent-awards"],
    queryFn: () => api.adminAwards.listRecent(1, 8),
  });
  const recentAwards = recentAwardsData?.items ?? [];
  // ── Derived Chart Data ────────────────────────────────────────────────────
  const growthData = useMemo(() => {
    if (!analytics) return [];
    return mergeTimeSeries(
      analytics.user_growth,       "user_growth",
      analytics.quizzes_over_time, "quizzes",
    );
  }, [analytics]);

  const wordSearchData = useMemo(() => {
    if (!analytics) return [];
    return analytics.word_searches_over_time.map(p => ({
      date: p.date, word_searches: p.value,
    }));
  }, [analytics]);

  const difficultyPie = useMemo(() => {
    if (!analytics) return [];
    const d = analytics.quiz_difficulty_dist;
    return [
      { name: "Easy",   value: d.easy   },
      { name: "Medium", value: d.medium },
      { name: "Hard",   value: d.hard   },
    ];
  }, [analytics]);

  const statusPie = useMemo(() => {
    if (!analytics) return [];
    const s = analytics.quiz_status_dist;
    return [
      { name: "Completed",   value: s.completed   },
      { name: "In Progress", value: s.in_progress },
    ];
  }, [analytics]);

  const activityTypePie = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.activity_type_dist)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [analytics]);

  const stackedActivityData = useMemo(() => {
    if (!analytics?.activity_over_time) return [];
    return buildStackedActivity(analytics.activity_over_time);
  }, [analytics]);
  const activityKeys = useMemo(() => analytics ? Object.keys(analytics.activity_over_time) : [], [analytics]);
  const activityStackConfig: ChartConfig = useMemo(() =>
    Object.fromEntries(activityKeys.map((k, i) => [k, { label: k.replace(/_/g, " "), color: PIE_COLORS[i % PIE_COLORS.length] }])),
  [activityKeys]);

  // ── Stat Cards ────────────────────────────────────────────────────────────
  const statCards = stats ? [
    { label: "Total Users",         value: (stats.total_users ?? 0).toLocaleString(),             color: PALETTE.indigo,  icon: "👤" },
    { label: "Active Today",        value: (stats.active_users_today ?? 0).toLocaleString(),       color: PALETTE.emerald, icon: "⚡" },
    { label: "New This Week",       value: (stats.new_users_this_week ?? 0).toLocaleString(),      color: PALETTE.sky,     icon: "📈" },
    { label: "Quizzes Completed",   value: (stats.total_quizzes_completed ?? 0).toLocaleString(),  color: PALETTE.violet,  icon: "✏️" },
    { label: "Words Searched",      value: (stats.total_words_searched ?? 0).toLocaleString(),     color: PALETTE.amber,   icon: "🔍" },
    { label: "Active Competitions", value: (stats.active_competitions ?? 0).toLocaleString(),      color: PALETTE.rose,    icon: "🏆" },
    { label: "Top Category",        value: stats.top_category || "—",                       color: PALETTE.teal,    icon: "📚" },
  ] : [];

  // ── Render Helpers ────────────────────────────────────────────────────────
  const ChartCard = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
    <div className={`border border-border bg-card p-5 flex flex-col gap-4 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {children}
    </div>
  );

  const loading = analyticsLoading;

  return (
    <div className="space-y-8">

      {/* ── STAT CARDS ───────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => <LoadingSkeleton key={i} className="h-24" />)}
        </div>
      ) : statsError ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          {["Total Users","Active Today","New This Week","Quizzes Completed","Words Searched","Active Competitions","Top Category"]
            .map(l => <StatCard key={l} label={l} value="—" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          {statCards.map(s => (
            <StatCard key={s.label} label={s.label} value={s.value} color={s.color} icon={s.icon} />
          ))}
        </div>
      )}

      {/* ── FILTER BAR ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Granularity:</span>
        {(["day","week","month"] as const).map(g => (
          <button
            key={g}
            onClick={() => setGranularity(g)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
              granularity === g
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground italic">
          Charts update automatically based on granularity
        </div>
      </div>

      {/* ── ROW 1: User Growth + Word Searches ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* User Growth & Quizzes — 2/3 width */}
        <ChartCard title="User Growth & Quiz Activity" className="lg:col-span-2">
          {loading ? <LoadingSkeleton className="h-[280px]" /> : (
            <ChartContainer config={areaGrowthConfig} className="h-[280px] w-full">
              <AreaChart data={growthData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.indigo}  stopOpacity={0.35} />
                    <stop offset="95%" stopColor={PALETTE.indigo}  stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gradQuizzes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.emerald} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} className="text-xs"
                  tickFormatter={d => formatAxisDate(String(d), granularity)} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Area type="monotone" dataKey="user_growth" name="user_growth"
                  stroke={PALETTE.indigo}  fill="url(#gradUsers)"   strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="quizzes"     name="quizzes"
                  stroke={PALETTE.emerald} fill="url(#gradQuizzes)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ChartContainer>
          )}
          <div className="flex gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: PALETTE.indigo }}/>
              New Users
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: PALETTE.emerald }}/>
              Quizzes Started
            </span>
          </div>
        </ChartCard>

        {/* Activity Type Donut — Now in Row 1 for more space */}
        <ChartCard title="Activity Breakdown">
          {loading ? <LoadingSkeleton className="h-[280px]" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                <Pie data={activityTypePie} cx="50%" cy="50%" innerRadius="55%" outerRadius="82%"
                  dataKey="value" nameKey="name" strokeWidth={2} stroke="hsl(var(--background))">
                  {activityTypePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomPieTip />} />
                <Legend iconType="circle" iconSize={8} verticalAlign="bottom" align="center"
                  formatter={v => <span className="text-[10px] text-muted-foreground capitalize font-bold leading-none">{String(v).replace(/_/g," ")}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── ROW 2: Search Trend + Difficulty & Status Mix ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Word Search Trend */}
        <ChartCard title="Word Search Trend">
          {loading ? <LoadingSkeleton className="h-[220px]" /> : (
            <ChartContainer config={wordSearchConfig} className="h-[220px] w-full">
              <AreaChart data={wordSearchData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSearch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.sky}  stopOpacity={0.4} />
                    <stop offset="95%" stopColor={PALETTE.sky}  stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} className="text-[10px]"
                  tickFormatter={d => formatAxisDate(String(d), granularity)} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-[10px]" />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Area type="monotone" dataKey="word_searches" name="word_searches"
                  stroke={PALETTE.sky} fill="url(#gradSearch)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ChartContainer>
          )}
        </ChartCard>

        {/* Quiz Difficulty */}
        <ChartCard title="Quiz Difficulty Mix">
          {loading ? <LoadingSkeleton className="h-[220px]" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{ bottom: 10 }}>
                <Pie data={difficultyPie} cx="50%" cy="50%" innerRadius="50%" outerRadius="75%"
                  dataKey="value" nameKey="name" strokeWidth={2} stroke="hsl(var(--background))">
                  {difficultyPie.map((_, i) => <Cell key={i} fill={[PALETTE.emerald, PALETTE.amber, PALETTE.rose][i]} />)}
                </Pie>
                <Tooltip content={<CustomPieTip />} />
                <Legend iconType="circle" iconSize={8} verticalAlign="bottom"
                  formatter={v => <span className="text-[10px] text-muted-foreground capitalize font-bold">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Quiz Status */}
        <ChartCard title="Quiz Status">
          {loading ? <LoadingSkeleton className="h-[220px]" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{ bottom: 10 }}>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius="50%" outerRadius="75%"
                  dataKey="value" nameKey="name" strokeWidth={2} stroke="hsl(var(--background))">
                  {statusPie.map((_, i) => <Cell key={i} fill={[PALETTE.indigo, PALETTE.violet][i]} />)}
                </Pie>
                <Tooltip content={<CustomPieTip />} />
                <Legend iconType="circle" iconSize={8} verticalAlign="bottom"
                  formatter={v => <span className="text-[10px] text-muted-foreground capitalize font-bold">{String(v).replace(/_/g," ")}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── ROW 3: Stacked Activity Timeline ─────────────────────────────── */}
      <ChartCard title="Activity Over Time (Stacked)">
        {loading ? <LoadingSkeleton className="h-[280px]" /> : (
          <ChartContainer config={activityStackConfig} className="h-[280px] w-full">
            <AreaChart data={stackedActivityData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} className="text-xs"
                tickFormatter={d => formatAxisDate(String(d), granularity)} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              {activityKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stackId="1"
                  stroke={PIE_COLORS[i % PIE_COLORS.length]}
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                  fillOpacity={0.55} strokeWidth={1.5} dot={false} />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {activityKeys.map((k, i) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              {k.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </ChartCard>

      {/* ── ROW 4: Competition Performance + Top Words ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Competition Performance */}
        <ChartCard title="Competition Performance">
          {loading ? <LoadingSkeleton className="h-[280px]" /> : !analytics?.competition_performance?.length ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No competition data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.competition_performance} margin={{ left: -10, right: 10, top: 10, bottom: 60 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="title" tickLine={false} axisLine={false} angle={-30} textAnchor="end" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12, borderRadius: 4 }}
                  formatter={(v, n) => [Number(v).toLocaleString(), String(n).replace(/_/g," ")]}
                />
                <Bar dataKey="participants" name="Participants" fill={PALETTE.indigo} radius={[4,4,0,0]} />
                <Bar dataKey="avg_score"    name="Avg Score"    fill={PALETTE.amber}  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top Words Searched — Horizontal Bar */}
        <ChartCard title="Top Words Searched">
          {loading ? <LoadingSkeleton className="h-[280px]" /> : !analytics?.top_words_searched?.length ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No search data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                layout="vertical"
                data={analytics.top_words_searched.slice(0, 10)}
                margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis type="category" dataKey="word" tickLine={false} axisLine={false} className="text-xs" width={70} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12, borderRadius: 4 }}
                />
                <Bar dataKey="count" name="Searches" radius={[0,4,4,0]}>
                  {analytics.top_words_searched.slice(0,10).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── ROW 5: Activity Stream + Quick Actions ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity Stream */}
        <div className="lg:col-span-2 border border-border bg-card flex flex-col max-h-[480px]">
          <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Activity Stream</h3>
            <div className="flex items-center gap-2">
              <input type="date" value={activityStart} onChange={e => setActivityStart(e.target.value)}
                className="border border-input bg-background/50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" title="Start Date" />
              <span className="text-xs text-muted-foreground">—</span>
              <input type="date" value={activityEnd} onChange={e => setActivityEnd(e.target.value)}
                className="border border-input bg-background/50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" title="End Date" />
              {(activityStart || activityEnd) && (
                <button onClick={() => { setActivityStart(""); setActivityEnd(""); }}
                  className="text-xs underline text-muted-foreground hover:text-foreground">Clear</button>
              )}
            </div>
          </div>
          <div className="divide-y divide-border overflow-y-auto flex-1">
            {activitiesLoading ? (
              <div className="p-10 flex flex-col items-center justify-center gap-2">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-sm text-muted-foreground">Syncing stream…</div>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No activity yet.</div>
            ) : activities.map(item => (
              <div key={item.id} className="px-5 py-3.5 flex justify-between items-start gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm leading-none">
                    <span className="font-semibold">{item.full_name}</span>{" "}
                    <span className="text-xs text-muted-foreground ml-1">({item.email})</span>
                  </span>
                  <span className="text-xs flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider bg-foreground/10 px-2 py-0.5 rounded-sm">
                      {item.action_type.replace(/_/g, " ")}
                    </span>
                    {item.details && <span className="italic text-muted-foreground">"{item.details}"</span>}
                  </span>
                </div>
                <span className="text-xs font-mono text-muted-foreground/70 whitespace-nowrap mt-0.5">
                  {formatDate(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Toolkit */}
        <div className="border border-border bg-card flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Administrator Toolkit</h3>
          </div>
          <div className="p-5 flex flex-col gap-3 flex-1">
            {[
              { label: "Create Category",    desc: "Add new word groupings",      path: "/categories",   color: PALETTE.indigo  },
              { label: "Create Competition", desc: "Launch a new event",           path: "/competitions", color: PALETTE.emerald },
              { label: "Create Award",       desc: "Define achievements",          path: "/awards",       color: PALETTE.amber   },
              { label: "Generate Quiz",      desc: "Build a special challenge",    path: "/quizzes",      color: PALETTE.rose    },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.path)}
                className="group border border-border p-4 text-left hover:border-primary/50 hover:bg-muted/20 transition-colors flex flex-col gap-1">
                <span className="text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: a.color }}>
                  {a.label}
                </span>
                <span className="text-xs text-muted-foreground">{a.desc}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className="border border-border bg-card flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent Awards & Recognition</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                <th className="px-5 py-3">Award Title</th>
                <th className="px-5 py-3">Recipient</th>
                <th className="px-5 py-3">Date Granted</th>
                <th className="px-5 py-3">Reason / Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {awardsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-5 py-4"><LoadingSkeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : recentAwards.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground italic">No recent awards found.</td>
                </tr>
              ) : (
                recentAwards.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3 font-semibold text-primary">{a.award_title}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{a.full_name}</span>
                        <span className="text-[10px] text-muted-foreground">{a.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-muted-foreground">{formatDate(a.granted_at)}</td>
                    <td className="px-5 py-3 italic text-muted-foreground max-w-md truncate">"{a.reason}"</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
