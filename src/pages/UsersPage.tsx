import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataPagination } from "@/components/shared/DataPagination";
import { Modal } from "@/components/shared/Modal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { toast } from "sonner";
import { Search, Trash2, Activity as ActivityIcon } from "lucide-react";
import { User } from "@/lib/api";
import { Gift } from "lucide-react";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function UsersPage() {
  const { api } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "activity">("profile");
  const [activityPage, setActivityPage] = useState(1);
  const [grantToUser, setGrantToUser] = useState<{ id: string; name: string } | null>(null);
  const [grantAwardId, setGrantAwardId] = useState<number | "">("");
  const [grantReason, setGrantReason] = useState("");
  const [confirm, setConfirm] = useState<{
    user: User;
    action: "ban" | "unban" | "admin" | "delete";
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── List users ──────────────────────────────────────────────
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", page, debouncedSearch],
    queryFn: () => api.admin.listUsers(page, PAGE_SIZE, debouncedSearch),
    retry: 1,
  });

  const users = usersData?.items || [];
  const totalUsers = usersData?.total_count || 0;
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

  const { data: activitiesData, isLoading: loadingActivities } = useQuery({
    queryKey: ["admin-user-activities", viewUserId, activityPage],
    queryFn: () => api.admin.getActivities(viewUserId!, activityPage, 10),
    enabled: !!viewUserId && detailTab === "activity",
  });

  const userActivities = activitiesData?.items || [];
  const totalActivities = activitiesData?.total_count || 0;
  const totalActivityPages = Math.ceil(totalActivities / 10);

  // ── Single user detail ──────────────────────────────────────
  const { data: viewUser } = useQuery({
    queryKey: ["admin-user", viewUserId],
    queryFn: () => api.admin.getUser(viewUserId!),
    enabled: !!viewUserId,
  });

  const { data: awardsRaw = [] } = useQuery({
    queryKey: ["awards"],
    queryFn: () => api.public.getAwards(),
    enabled: !!grantToUser,
  });
  const awards = Array.isArray(awardsRaw) ? awardsRaw : [];

  // ── Mutations ───────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const banMutation = useMutation({
    mutationFn: (userId: string) => api.admin.banUser(userId),
    onSuccess: () => { toast.success("User banned"); invalidate(); setConfirm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => api.admin.unbanUser(userId),
    onSuccess: () => { toast.success("User unbanned"); invalidate(); setConfirm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const makeAdminMutation = useMutation({
    mutationFn: (userId: string) => api.admin.makeAdmin(userId),
    onSuccess: () => { toast.success("User promoted to admin"); invalidate(); setConfirm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.admin.deleteUser(userId),
    onSuccess: () => { 
      toast.success("User deleted successfully"); 
      invalidate(); 
      setConfirm(null); 
      setViewUserId(null);
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grantMutation = useMutation({
    mutationFn: ({ awardId, userId, reason }: { awardId: number; userId: string; reason: string }) =>
      api.adminAwards.grant({ award_id: awardId, user_id: userId, reason }),
    onSuccess: () => {
      toast.success("Award granted successfully!");
      setGrantToUser(null);
      setGrantAwardId("");
      setGrantReason("");
      qc.invalidateQueries({ queryKey: ["admin-activities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.action === "ban") banMutation.mutate(confirm.user.id);
    else if (confirm.action === "unban") unbanMutation.mutate(confirm.user.id);
    else if (confirm.action === "admin") makeAdminMutation.mutate(confirm.user.id);
    else if (confirm.action === "delete") deleteMutation.mutate(confirm.user.id);
  };

  const isMutating =
    banMutation.isPending || unbanMutation.isPending || makeAdminMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Smart search (Server-side)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-64"
          />
        </div>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left w-16">Avatar</th>
              <th className="px-4 py-3 text-left">Full Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <LoadingSkeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((u, i) => {
                  const globalIndex = (page - 1) * PAGE_SIZE + i + 1;
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        i % 2 === 1 ? "bg-muted/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                        {globalIndex.toString().padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full border border-border object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {u.full_name[0].toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{u.full_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={u.is_active ? "active" : "banned"}>
                          {u.is_active ? "Active" : "Banned"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_admin ? (
                          <StatusBadge variant="admin">Admin</StatusBadge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <button
                          onClick={() => { setViewUserId(u.id); setActivityPage(1); }}
                          className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-border hover:bg-accent transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setGrantToUser({ id: u.id, name: u.full_name });
                            setGrantAwardId("");
                            setGrantReason("");
                          }}
                          className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          Grant Award
                        </button>
                        <button
                          onClick={() =>
                            setConfirm({
                              user: u,
                              action: u.is_active ? "ban" : "unban",
                            })
                          }
                          className={`px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border ${
                            u.is_active 
                              ? "border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
                              : "border-green-600/20 text-green-600 hover:bg-green-600 hover:text-white"
                          } transition-colors`}
                        >
                          {u.is_active ? "Ban" : "Unban"}
                        </button>
                        {!u.is_admin && (
                          <button
                            onClick={() => setConfirm({ user: u, action: "admin" })}
                            className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border border-foreground/10 hover:bg-foreground hover:text-background transition-colors"
                          >
                            Make Admin
                          </button>
                        )}
                        <button
                          onClick={() => setConfirm({ user: u, action: "delete" })}
                          className="p-1 text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            {users.length === 0 && !isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground italic">
                  No users matched your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DataPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <Modal
        open={!!viewUserId}
        onClose={() => { setViewUserId(null); setDetailTab("profile"); }}
        title="User Investigation Dashboard"
        size="lg"
      >
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setDetailTab("profile")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              detailTab === "profile" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Core Profile
          </button>
          <button
            onClick={() => setDetailTab("activity")}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              detailTab === "activity" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Activity History
          </button>
        </div>

        {detailTab === "profile" && (
          viewUser ? (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex items-center gap-4 flex-1">
                  {viewUser.avatar_url ? (
                    <img
                      src={viewUser.avatar_url}
                      alt={viewUser.full_name}
                      className="h-16 w-16 object-cover border border-border"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-muted text-muted-foreground flex items-center justify-center text-xl font-bold border border-border">
                      {viewUser.full_name[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-xl tracking-tight">{viewUser.full_name}</div>
                    <div className="text-sm font-mono text-muted-foreground">{viewUser.email}</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-primary/5 border border-primary/20 px-4 py-2 rounded-sm text-center min-w-[100px]">
                    <p className="text-[10px] uppercase font-bold text-primary/60 mb-1">Total Points</p>
                    <p className="text-lg font-mono font-bold">{(viewUser.total_points ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-muted border border-border px-4 py-2 rounded-sm text-center min-w-[100px]">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Quizzes</p>
                    <p className="text-lg font-mono font-bold">{(viewUser.quizzes_completed ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Moderation Status</h4>
                    <div className="flex gap-2">
                       <StatusBadge variant={viewUser.is_active ? "active" : "banned"}>
                        {viewUser.is_active ? "ACTIVE" : "BANNED"}
                      </StatusBadge>
                      {viewUser.is_verified && (
                        <span className="text-[8px] font-bold bg-green-500/10 text-green-600 px-1.5 py-0.5 border border-green-500/20 rounded-full">VERIFIED</span>
                      )}
                      {viewUser.is_admin && <StatusBadge variant="admin">ADMINISTRATOR</StatusBadge>}
                    </div>
                  </div>
                  {viewUser.bio && (
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Biography</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed italic">"{viewUser.bio}"</p>
                    </div>
                  )}
                </div>
                <div className="bg-muted/30 p-4 border border-border space-y-3">
                  <h4 className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                     <Gift className="h-3 w-3" /> Quick Moderation
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirm({ user: viewUser, action: viewUser.is_active ? "ban" : "unban" })}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-border bg-background hover:bg-accent"
                    >
                      {viewUser.is_active ? "Ban User" : "Unban User"}
                    </button>
                    <button
                      onClick={() => setConfirm({ user: viewUser, action: "delete" })}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-destructive/30 text-destructive bg-background hover:bg-destructive hover:text-white"
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <LoadingSkeleton className="h-20 w-full" />
              <LoadingSkeleton className="h-40 w-full" />
            </div>
          )
        )}

        {detailTab === "activity" && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground flex items-center gap-2">
               <ActivityIcon className="h-3 w-3" /> Activity Ledger (Cross-Platform Investigation)
            </h4>
            <div className="border border-border min-h-[300px] overflow-hidden flex flex-col">
              <div className="bg-muted/50 border-b border-border px-4 py-2 grid grid-cols-4 text-[10px] font-bold uppercase tracking-wider">
                <span className="col-span-1">Action Type</span>
                <span className="col-span-2">Details</span>
                <span className="col-span-1 text-right">Timestamp</span>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-border">
                {loadingActivities ? (
                  <div className="p-12 text-center">
                    <LoadingSkeleton className="h-8 w-48 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Reconstructing activity history...</p>
                  </div>
                ) : userActivities.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground italic">
                    No activities recorded for this user investigation.
                  </div>
                ) : (
                  userActivities.map((act) => (
                    <div key={act.id} className="px-4 py-3 grid grid-cols-4 items-center hover:bg-muted/10 transition-colors">
                      <span className="col-span-1">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 bg-muted border border-border uppercase">
                          {act.action_type}
                        </span>
                      </span>
                      <span className="col-span-2 text-xs truncate text-muted-foreground">
                        {act.details}
                      </span>
                      <span className="col-span-1 text-right font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDate(act.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {totalActivityPages > 1 && (
              <DataPagination 
                currentPage={activityPage}
                totalPages={totalActivityPages}
                onPageChange={setActivityPage}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title="Security Confirmation"
        message={
          confirm
            ? confirm.action === "ban"
              ? `Ban ${confirm.user.full_name}? Access will be immediately revoked across all services.`
              : confirm.action === "unban"
              ? `Unban ${confirm.user.full_name}? Full access will be restored.`
              : confirm.action === "admin"
              ? `Grant administrative privileges to ${confirm.user.full_name}? This user will have full platform control.`
              : `PERMANENTLY DELETE user "${confirm.user.full_name}"? All associated data will be removed from the active system. This action is irreversible.`
            : ""
        }
        confirmLabel={
          confirm?.action === "ban"
            ? "Ban User"
            : confirm?.action === "unban"
            ? "Unban User"
            : confirm?.action === "admin"
            ? "Promote to Admin"
            : "Permanently Delete User"
        }
        danger={confirm?.action === "ban" || confirm?.action === "delete"}
      />
      {/* Grant Award Modal */}
      <Modal
        open={!!grantToUser}
        onClose={() => setGrantToUser(null)}
        title={`Grant Award — ${grantToUser?.name || "User"}`}
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setGrantToUser(null)}
              className="px-4 py-2 text-sm border border-border hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!grantAwardId) return toast.error("Select an award");
                if (!grantReason.trim()) return toast.error("Enter a reason");
                if (!grantToUser?.id) return;
                grantMutation.mutate({
                  awardId: Number(grantAwardId),
                  userId: grantToUser.id,
                  reason: grantReason.trim()
                });
              }}
              disabled={grantMutation.isPending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {grantMutation.isPending ? "Processing..." : "Confirm Grant"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5 font-bold">Select Award</label>
            <select
              value={grantAwardId}
              onChange={(e) => setGrantAwardId(Number(e.target.value))}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
            >
              <option value="">— Select Award Type —</option>
              {awards.map((a) => (
                <option key={a.id} value={a.id}>{a.title} ({(a.points_required ?? 0).toLocaleString()} pts)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-1.5 font-bold">Award Reason</label>
            <textarea
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="e.g., Outstanding contribution to the April challenge."
              rows={3}
              className="w-full border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-2 italic leading-tight">
              A clear reason helps the user understand why they were recognized. This will be stored as part of their official achievement record.
            </p>
          </div>
        </div>
      </Modal>

      {isMutating && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20">
          <div className="bg-background border border-border px-6 py-4 text-sm font-mono">
            Processing...
          </div>
        </div>
      )}
    </div>
  );
}
