import { StatCard } from "@/components/shared/StatCard";
import { useNavigate } from "react-router-dom";

const stats = [
  { label: "Total Users", value: "12,847" },
  { label: "Active Today", value: "1,203" },
  { label: "Quizzes Completed", value: "89,412" },
  { label: "Words Searched", value: "234,561" },
  { label: "New This Week", value: "347" },
  { label: "Active Competitions", value: "5" },
  { label: "Top Category", value: "SAT" },
];

const recentActivity = [
  { text: "User john_doe completed 'Advanced Vocab' quiz", time: "2 min ago" },
  { text: "New user sarah_m registered", time: "15 min ago" },
  { text: "Competition 'Spring Challenge' started", time: "1 hr ago" },
  { text: "Category 'GRE Words' updated with 50 new words", time: "2 hr ago" },
  { text: "Award 'Word Master' granted to mike_t", time: "3 hr ago" },
  { text: "User banned: spammer_bot", time: "5 hr ago" },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="border border-border">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Recent Activity</h3>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((item, i) => (
              <div key={i} className="px-5 py-3 flex justify-between items-start gap-4">
                <span className="text-sm">{item.text}</span>
                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border border-border">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Quick Actions</h3>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { label: "Create Category", path: "/categories" },
              { label: "Create Competition", path: "/competitions" },
              { label: "Create Award", path: "/awards" },
              { label: "Create Quiz", path: "/quizzes" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="border border-border px-4 py-3 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
