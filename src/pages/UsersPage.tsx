import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataPagination } from "@/components/shared/DataPagination";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
  status: "active" | "banned";
  isAdmin: boolean;
  joined: string;
  bio: string;
}

const mockUsers: User[] = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  status: i === 3 || i === 7 ? "banned" : "active",
  isAdmin: i === 0 || i === 2,
  joined: `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  bio: `This is the bio for User ${i + 1}. They love vocabulary and quizzes.`,
}));

const PAGE_SIZE = 8;

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState(mockUsers);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<{ user: User; action: "ban" | "unban" | "admin" } | null>(null);

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleConfirm = () => {
    if (!confirm) return;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== confirm.user.id) return u;
        if (confirm.action === "ban") return { ...u, status: "banned" };
        if (confirm.action === "unban") return { ...u, status: "active" };
        return { ...u, isAdmin: !u.isAdmin };
      })
    );
    toast.success(`${confirm.action === "admin" ? "Admin toggled" : confirm.action === "ban" ? "User banned" : "User unbanned"}`);
    setConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 text-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-64"
          />
        </div>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground font-mono text-xs">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Full Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Admin</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Joined</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((u, i) => (
              <tr key={u.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                <td className="px-4 py-3 font-mono text-muted-foreground">{u.id}</td>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <StatusBadge variant={u.status === "active" ? "active" : "banned"}>
                    {u.status === "active" ? "Active" : "Banned"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  {u.isAdmin ? <StatusBadge variant="admin">Admin</StatusBadge> : <span className="text-muted-foreground text-xs">No</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{u.joined}</td>
                <td className="px-4 py-3 space-x-2">
                  <button onClick={() => setViewUser(u)} className="text-xs underline hover:text-foreground text-muted-foreground">View</button>
                  <button
                    onClick={() => setConfirm({ user: u, action: u.status === "active" ? "ban" : "unban" })}
                    className={`text-xs underline ${u.status === "active" ? "text-destructive" : "text-success"}`}
                  >
                    {u.status === "active" ? "Ban" : "Unban"}
                  </button>
                  <button
                    onClick={() => setConfirm({ user: u, action: "admin" })}
                    className="text-xs underline text-muted-foreground hover:text-foreground"
                  >
                    {u.isAdmin ? "Remove Admin" : "Make Admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DataPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* View User Modal */}
      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="User Details">
        {viewUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-primary text-primary-foreground flex items-center justify-center text-lg font-mono font-bold">
                {viewUser.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-lg">{viewUser.name}</div>
                <div className="text-sm font-mono text-muted-foreground">{viewUser.email}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Bio:</span> {viewUser.bio}</div>
              <div><span className="text-muted-foreground">Joined:</span> <span className="font-mono">{viewUser.joined}</span></div>
              <div className="flex gap-2">
                <StatusBadge variant={viewUser.status === "active" ? "active" : "banned"}>
                  {viewUser.status === "active" ? "Active" : "Banned"}
                </StatusBadge>
                {viewUser.isAdmin && <StatusBadge variant="admin">Admin</StatusBadge>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title="Are you sure?"
        message={
          confirm
            ? confirm.action === "ban"
              ? `Ban ${confirm.user.name}? They won't be able to access the platform.`
              : confirm.action === "unban"
              ? `Unban ${confirm.user.name}?`
              : `${confirm.user.isAdmin ? "Remove admin from" : "Grant admin to"} ${confirm.user.name}?`
            : ""
        }
        confirmLabel={confirm?.action === "ban" ? "Ban User" : confirm?.action === "unban" ? "Unban User" : "Confirm"}
        danger={confirm?.action === "ban"}
      />
    </div>
  );
}
