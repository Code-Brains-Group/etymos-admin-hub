import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Puzzle,
  Award,
  Trophy,
  Globe,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const navItems = [
  { label: "Dashboard",      path: "/dashboard",   icon: LayoutDashboard },
  { label: "Users",          path: "/users",        icon: Users },
  { label: "Categories",     path: "/categories",   icon: FolderOpen },
  { label: "Competitions",   path: "/competitions", icon: Trophy },
  { label: "Special Quizzes",path: "/quizzes",      icon: Puzzle },
  { label: "Awards",         path: "/awards",       icon: Award },
  { label: "Leaderboard",    path: "/leaderboard",  icon: Globe },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/users": "Users",
  "/categories": "Categories",
  "/quizzes": "Special Quizzes",
  "/awards": "Awards",
  "/competitions": "Competitions",
  "/leaderboard": "Leaderboard",
};

export default function AdminLayout() {
  const { adminName, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = adminName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const pageTitle = pageTitles[location.pathname] || "Admin Portal";

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar text-sidebar-foreground flex flex-col z-50">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="font-display text-2xl font-bold tracking-tight">ETYMOS</h1>
          <p className="text-xs font-mono text-sidebar-muted mt-1">Admin Portal</p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-l-2 border-sidebar-primary bg-sidebar-accent text-sidebar-foreground font-semibold"
                    : "border-l-2 border-transparent text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">

          <div className="flex items-center gap-3 px-3">
            <div className="h-8 w-8 bg-sidebar-accent text-sidebar-foreground flex items-center justify-center text-xs font-mono font-medium">
              {initials}
            </div>
            <span className="text-sm truncate flex-1">{adminName}</span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-sidebar-muted hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-8 bg-background sticky top-0 z-40">
          <h2 className="text-lg font-semibold">{pageTitle}</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{adminName}</span>
            <div className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center text-xs font-mono font-medium">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
