import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataPagination } from "@/components/shared/DataPagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Modal } from "@/components/shared/Modal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import type { ManagedAvatar, ManagedAvatarPayload } from "@/lib/api";

const PAGE_SIZE = 25;

type AvatarForm = {
  name: string;
  image_url: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
};

const EMPTY_FORM: AvatarForm = {
  name: "",
  image_url: "",
  is_active: true,
  is_default: false,
  sort_order: 0,
};

function errorMessage(error: unknown) {
  const apiError = error as Error & { detail?: string; status?: number };
  const code = apiError.detail;
  if (code === "invalid_default_avatar") return "A default avatar must remain active.";
  if (code === "avatar_not_found") return "This avatar no longer exists. The list has been refreshed.";
  if (code === "avatar_exists") return "An avatar with this name or image URL already exists.";
  if (code === "validation_error") return "Check the name, HTTPS image URL, and display order.";
  if (apiError.status === 409) return "An avatar with this name or image URL already exists.";
  if (apiError.status === 422) return "Check the name, HTTPS image URL, and display order.";
  return apiError.message || "Something went wrong while saving the avatar.";
}

function AvatarImage({ src, name, large = false }: { src: string; name: string; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  const size = large ? "h-32 w-32" : "h-12 w-12";

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (broken || !src) {
    return (
      <div className={`${size} shrink-0 border border-dashed border-border bg-muted/40 flex flex-col items-center justify-center text-muted-foreground`}>
        <ImageOff className={large ? "h-7 w-7" : "h-4 w-4"} />
        {large && <span className="mt-2 text-[10px] uppercase tracking-wide">Image unavailable</span>}
      </div>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={`${name || "Avatar"} preview`}
      onError={() => setBroken(true)}
      className={`${size} shrink-0 border border-border bg-muted object-cover`}
    />
  );
}

export default function AvatarsPage() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ManagedAvatar | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [removing, setRemoving] = useState<ManagedAvatar | null>(null);
  const [form, setForm] = useState<AvatarForm>(EMPTY_FORM);

  const queryKey = ["admin-avatars", page];
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => api.adminAvatars.list(page, PAGE_SIZE),
  });

  const avatars = Array.isArray(data?.items) ? data.items : [];
  const totalPages = Math.max(1, Math.ceil((data?.total_count ?? 0) / PAGE_SIZE));
  const trimmedName = form.name.trim();
  const trimmedUrl = form.image_url.trim();
  const urlIsValid = useMemo(() => {
    try {
      return new URL(trimmedUrl).protocol === "https:";
    } catch {
      return false;
    }
  }, [trimmedUrl]);
  const formIsValid = trimmedName.length > 0 && urlIsValid && Number.isInteger(form.sort_order) && form.sort_order >= 0;

  const invalidateList = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-avatars"] });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (avatar: ManagedAvatar) => {
    setEditing(avatar);
    setForm({
      name: avatar.name,
      image_url: avatar.image_url,
      is_active: avatar.is_active,
      is_default: avatar.is_default,
      sort_order: avatar.sort_order,
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const next: AvatarForm = { ...form, name: trimmedName, image_url: trimmedUrl };
      if (!editing) return api.adminAvatars.create(next);

      const original: AvatarForm = {
        name: editing.name,
        image_url: editing.image_url,
        is_active: editing.is_active,
        is_default: editing.is_default,
        sort_order: editing.sort_order,
      };
      const changed = (Object.keys(next) as (keyof AvatarForm)[]).reduce<ManagedAvatarPayload>((payload, key) => {
        if (next[key] !== original[key]) Object.assign(payload, { [key]: next[key] });
        return payload;
      }, {});
      if (!Object.keys(changed).length) return editing;
      return api.adminAvatars.update(editing.id, changed);
    },
    onSuccess: async () => {
      await invalidateList();
      toast.success(editing ? "Avatar updated" : "Avatar created");
      setModalOpen(false);
    },
    onError: async (mutationError) => {
      await invalidateList();
      toast.error(errorMessage(mutationError));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (avatarId: number) => api.adminAvatars.remove(avatarId),
    onSuccess: async () => {
      await invalidateList();
      toast.success("Avatar removed from public selection");
    },
    onError: async (mutationError) => {
      await invalidateList();
      toast.error(errorMessage(mutationError));
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (avatarId: number) => api.adminAvatars.update(avatarId, { is_active: true }),
    onSuccess: async () => {
      await invalidateList();
      toast.success("Avatar reactivated");
    },
    onError: async (mutationError) => {
      await invalidateList();
      toast.error(errorMessage(mutationError));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Managed Avatars</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control the images available during registration and profile editing.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Create avatar
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => <LoadingSkeleton key={index} className="h-20 w-full" />)}
        </div>
      )}

      {!isLoading && error && (
        <div className="border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Avatars could not be loaded. Refresh the page to try again.
        </div>
      )}

      {!isLoading && !error && avatars.length === 0 && (
        <EmptyState message="No managed avatars yet." action={{ label: "Create avatar", onClick: openCreate }} />
      )}

      {!isLoading && !error && avatars.length > 0 && (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Avatar</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {avatars.map((avatar) => (
                <tr key={avatar.id} className={!avatar.is_active ? "bg-muted/20 text-muted-foreground" : "hover:bg-muted/10"}>
                  <td className="px-4 py-3"><AvatarImage src={avatar.image_url} name={avatar.name} /></td>
                  <td className="max-w-md px-4 py-3">
                    <div className="font-medium text-foreground">{avatar.name}</div>
                    <a href={avatar.image_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-primary hover:underline">{avatar.image_url}</a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge variant={avatar.is_active ? "active" : "inactive"}>{avatar.is_active ? "Active" : "Inactive"}</StatusBadge>
                      {avatar.is_default && <StatusBadge variant="admin">Default</StatusBadge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">{avatar.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {!avatar.is_active && (
                        <button onClick={() => reactivateMutation.mutate(avatar.id)} disabled={reactivateMutation.isPending} className="flex items-center gap-1 border border-border px-2 py-1 text-xs text-foreground hover:bg-accent disabled:opacity-50">
                          <RefreshCw className="h-3.5 w-3.5" /> Reactivate
                        </button>
                      )}
                      <button onClick={() => openEdit(avatar)} className="flex items-center gap-1 border border-border px-2 py-1 text-xs text-foreground hover:bg-accent">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      {avatar.is_active && (
                        <button onClick={() => setRemoving(avatar)} className="flex items-center gap-1 border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground">
                          <Trash2 className="h-3.5 w-3.5" /> Remove
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit avatar" : "Create avatar"}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button onClick={() => saveMutation.mutate()} disabled={!formIsValid || saveMutation.isPending} className="bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-40">
              {saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create avatar"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex justify-center border-b border-border pb-5">
            <AvatarImage src={trimmedUrl} name={trimmedName} large />
          </div>
          <div>
            <label htmlFor="avatar-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide">Name</label>
            <input id="avatar-name" maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Lion" className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            {!trimmedName && form.name.length > 0 && <p className="mt-1 text-xs text-destructive">Enter a name.</p>}
          </div>
          <div>
            <label htmlFor="avatar-url" className="mb-1.5 block text-xs font-medium uppercase tracking-wide">Hosted image URL</label>
            <input id="avatar-url" type="url" value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} placeholder="https://cdn.example.com/avatars/lion.png" className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            {trimmedUrl && !urlIsValid && <p className="mt-1 text-xs text-destructive">Use a public URL beginning with https://</p>}
          </div>
          <div>
            <label htmlFor="avatar-order" className="mb-1.5 block text-xs font-medium uppercase tracking-wide">Display order</label>
            <input id="avatar-order" type="number" min={0} step={1} value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
            {(!Number.isInteger(form.sort_order) || form.sort_order < 0) && <p className="mt-1 text-xs text-destructive">Enter a non-negative whole number.</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex cursor-pointer items-center justify-between border border-border p-3 text-sm">
              <span><strong className="block font-medium">Active</strong><span className="text-xs text-muted-foreground">Visible to mobile users</span></span>
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked, is_default: event.target.checked ? form.is_default : false })} className="h-4 w-4 accent-primary" />
            </label>
            <label className={`flex items-center justify-between border border-border p-3 text-sm ${!form.is_active ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              <span><strong className="block font-medium">Default</strong><span className="text-xs text-muted-foreground">Preselected avatar</span></span>
              <input type="checkbox" checked={form.is_default} disabled={!form.is_active} onChange={(event) => setForm({ ...form, is_default: event.target.checked })} className="h-4 w-4 accent-primary" />
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && removeMutation.mutate(removing.id)}
        title="Remove avatar"
        message={`Remove “${removing?.name}” from public selection? Existing users will keep their current image, and the avatar can be reactivated later.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
