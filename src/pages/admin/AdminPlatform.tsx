import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MoreHorizontal, ShieldCheck, ShieldOff, Ban, CheckCircle, Users, PenTool } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  roles: string[];
}

const BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-users`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${session?.access_token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export default function AdminPlatform() {
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    type: "ban" | "unban" | "promote" | "demote" | "add-contributor" | "remove-contributor";
    user: AdminUser;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}?action=list`, { headers });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      return data.users as AdminUser[];
    },
  });

  const mutation = useMutation({
    mutationFn: async (params: { action: string; body: Record<string, unknown> }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}?action=${params.action}`, {
        method: "POST",
        headers,
        body: JSON.stringify(params.body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Action failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;

    if (type === "ban") {
      mutation.mutate({ action: "ban", body: { user_id: user.id, ban: true } });
    } else if (type === "unban") {
      mutation.mutate({ action: "ban", body: { user_id: user.id, ban: false } });
    } else if (type === "promote") {
      mutation.mutate({ action: "set-role", body: { user_id: user.id, role: "admin", remove: false } });
    } else if (type === "demote") {
      mutation.mutate({ action: "set-role", body: { user_id: user.id, role: "admin", remove: true } });
    } else if (type === "add-contributor") {
      mutation.mutate({ action: "set-role", body: { user_id: user.id, role: "contributor", remove: false } });
    } else if (type === "remove-contributor") {
      mutation.mutate({ action: "set-role", body: { user_id: user.id, role: "contributor", remove: true } });
    }
    setConfirmAction(null);
  };

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.id.includes(search)
  );

  const isBanned = (u: AdminUser) =>
    u.banned_until && new Date(u.banned_until) > new Date();

  const confirmLabels: Record<string, string> = {
    ban: "Ban User",
    unban: "Unban User",
    promote: "Promote to Admin",
    demote: "Remove Admin Role",
    "add-contributor": "Make Contributor",
    "remove-contributor": "Remove Contributor Role",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Platform Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users, roles, and platform settings
          </p>
        </div>
        <Badge variant="secondary">{users.length} users</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading users...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id} className={isBanned(user) ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-sm">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length === 0 && (
                        <Badge variant="outline" className="text-xs">user</Badge>
                      )}
                      {user.roles.map((r) => (
                        <Badge
                          key={r}
                          variant={r === "admin" ? "default" : r === "contributor" ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isBanned(user) ? (
                      <Badge variant="destructive" className="text-xs">Banned</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_sign_in_at
                      ? format(new Date(user.last_sign_in_at), "MMM d, yyyy")
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.roles.includes("admin") ? (
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: "demote", user })}
                          >
                            <ShieldOff className="mr-2 h-4 w-4" /> Remove Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: "promote", user })}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" /> Make Admin
                          </DropdownMenuItem>
                        )}
                        {user.roles.includes("contributor") ? (
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: "remove-contributor", user })}
                          >
                            <PenTool className="mr-2 h-4 w-4" /> Remove Contributor
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: "add-contributor", user })}
                          >
                            <PenTool className="mr-2 h-4 w-4" /> Make Contributor
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {isBanned(user) ? (
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: "unban", user })}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Unban User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setConfirmAction({ type: "ban", user })}
                          >
                            <Ban className="mr-2 h-4 w-4" /> Ban User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction ? confirmLabels[confirmAction.type] : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction?.type.replace("-", " ")}{" "}
              <strong>{confirmAction?.user.email}</strong>? This action can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
