"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getUsers,
  createUser,
  deleteUser,
  updateUser,
  getDeletedUsers,
  restoreUser,
  getAggregateUsage,
  toggleProModelAccess,
} from "@/app/actions/user";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, Pencil, Check, X, Undo } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface UserData {
  id: string;
  email: string;
  role: string;
  force_password_change?: boolean;
  total_cost?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  pro_model_access?: boolean;
  pro_model_requested?: boolean;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [aggregateUsage, setAggregateUsage] = useState({
    sum_input: 0,
    sum_output: 0,
    sum_cost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState("");
  const [editingRole, setEditingRole] = useState("");

  const [showDeleted, setShowDeleted] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToReopen, setUserToReopen] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("highest_cost");

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    const isPending = u.force_password_change;
    const status = isPending ? "pending" : "active";
    const matchesStatus = filterStatus === "all" || status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  filteredUsers.sort((a, b) => {
    if (sortBy === "highest_cost")
      return (Number(b.total_cost) || 0) - (Number(a.total_cost) || 0);
    if (sortBy === "lowest_cost")
      return (Number(a.total_cost) || 0) - (Number(b.total_cost) || 0);
    if (sortBy === "highest_input")
      return (
        (Number(b.total_input_tokens) || 0) -
        (Number(a.total_input_tokens) || 0)
      );
    if (sortBy === "highest_output")
      return (
        (Number(b.total_output_tokens) || 0) -
        (Number(a.total_output_tokens) || 0)
      );
    return 0;
  });

  const loadUsers = useCallback(async () => {
    try {
      const data = showDeleted ? await getDeletedUsers() : await getUsers();
      setUsers(data);
      if (!showDeleted) {
        const agg = await getAggregateUsage();
        setAggregateUsage(agg);
      }
    } catch (err: unknown) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [showDeleted]);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/");
      return;
    }
    loadUsers();
  }, [session, router, showDeleted, loadUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const res = await createUser(email, role);
      if (res?.error === "user_deleted" && res?.userId) {
        setUserToReopen(res.userId);
        return;
      }
      if (
        "passwordSetupEmailSent" in res &&
        res.passwordSetupEmailSent === false
      ) {
        toast.warning(
          "User added, but email delivery is not configured. Ask them to use Forgot Password after SMTP is configured.",
        );
      } else {
        toast.success("User added and a secure setup link was emailed");
      }
      setEmail("");
      setRole("user");
      await loadUsers();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete);
      toast.success("User deleted successfully");
      await loadUsers();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to delete user");
    } finally {
      setUserToDelete(null);
    }
  };

  const executeRestore = async () => {
    if (!userToReopen) return;
    try {
      const result = await restoreUser(userToReopen);
      toast[result.passwordSetupEmailSent ? "success" : "warning"](
        result.passwordSetupEmailSent
          ? "User reopened and a new setup link was emailed"
          : "User reopened, but the setup email could not be delivered",
      );
      setEmail("");
      await loadUsers();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to reopen user");
    } finally {
      setUserToReopen(null);
    }
  };

  const handleRestoreFromTable = async (id: string) => {
    try {
      const result = await restoreUser(id);
      toast[result.passwordSetupEmailSent ? "success" : "warning"](
        result.passwordSetupEmailSent
          ? "User restored and a new setup link was emailed"
          : "User restored, but the setup email could not be delivered",
      );
      await loadUsers();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to restore user");
    }
  };

  const handleUpdateUser = async (id: string) => {
    try {
      await updateUser(id, editingEmail, editingRole);
      toast.success("User updated successfully");
      setEditingUserId(null);
      await loadUsers();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update user");
    }
  };

  const handleToggleProModel = async (id: string, access: boolean) => {
    try {
      await toggleProModelAccess(id, access);
      toast.success(
        access ? "Pro model access granted" : "Pro model access revoked",
      );
      await loadUsers();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Failed to toggle pro model access");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-6xl px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage roles and access for the AI Agent workspace.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant={showDeleted ? "default" : "destructive"}
            onClick={() => setShowDeleted(!showDeleted)}
          >
            {showDeleted ? "Show Active Users" : "Show Deleted Users"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Chat
          </Button>
        </div>
      </div>

      {!showDeleted && (
        <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold">Overall Usage</h2>
              <p className="text-sm text-muted-foreground">
                Overall usage accumulated over the time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Platform Input Tokens
              </h3>
              <p className="text-3xl font-bold mt-2 text-blue-500">
                {Math.max(
                  0,
                  aggregateUsage.sum_input - 4134356,
                ).toLocaleString()}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Platform Output Tokens
              </h3>
              <p className="text-3xl font-bold mt-2 text-orange-500">
                {Math.max(
                  0,
                  aggregateUsage.sum_output - 199358,
                ).toLocaleString()}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Total Platform Cost
              </h3>
              <p className="text-3xl font-bold mt-2 text-emerald-600">
                ${Math.max(0, aggregateUsage.sum_cost - 0.8853).toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 size-2 rounded-full bg-amber-500" />

          <div className="flex-1">
            <h3 className="font-medium">Older API Usage - v2</h3>

            <p className="text-sm text-muted-foreground mt-1">
              Usage generated before migrating to the current API key and
              tracking system.
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm">
              <span>
                <span className="text-muted-foreground">Input:</span>{" "}
                <span className="font-medium">4,134,356</span>
              </span>

              <span>
                <span className="text-muted-foreground">Output:</span>{" "}
                <span className="font-medium">199,358</span>
              </span>

              <span>
                <span className="text-muted-foreground">Cost:</span>{" "}
                <span className="font-medium text-emerald-600">$0.8853</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 size-2 rounded-full bg-amber-500" />

          <div className="flex-1">
            <h3 className="font-medium">Older API Usage - v1</h3>

            <p className="text-sm text-muted-foreground mt-1">
              Usage generated before migrating to the current API key and
              tracking system.
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm">
              <span>
                <span className="text-muted-foreground">Input:</span>{" "}
                <span className="font-medium">5,294,592</span>
              </span>

              <span>
                <span className="text-muted-foreground">Output:</span>{" "}
                <span className="font-medium">258,826</span>
              </span>

              <span>
                <span className="text-muted-foreground">Cost:</span>{" "}
                <span className="font-medium text-emerald-600">$1.1686</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
        <form
          onSubmit={handleAddUser}
          className="flex flex-col sm:flex-row gap-4 sm:items-end"
        >
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <label className="text-sm font-medium mb-1.5 block">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !email}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Plus className="size-4 mr-2" />
            )}
            Add User
          </Button>
        </form>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card"
          />
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="team_lead">Team Lead</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending Setup</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="highest_cost">Highest Cost</SelectItem>
              <SelectItem value="lowest_cost">Lowest Cost</SelectItem>
              <SelectItem value="highest_input">Highest Input</SelectItem>
              <SelectItem value="highest_output">Highest Output</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-center">Pro Model</th>
                <th className="px-6 py-3 font-medium">Usage / Cost</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-muted-foreground"
                  >
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      {editingUserId === u.id ? (
                        <Input
                          value={editingEmail}
                          onChange={(e) => setEditingEmail(e.target.value)}
                          className="h-8 max-w-[200px]"
                        />
                      ) : (
                        u.email
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingUserId === u.id ? (
                        <Select
                          value={editingRole}
                          onValueChange={setEditingRole}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="team_lead">Team Lead</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="capitalize">
                          {u.role.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {showDeleted ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-red-600 border-red-600/20 bg-red-600/10">
                          Deleted
                        </span>
                      ) : u.force_password_change ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-yellow-600 border-yellow-600/20 bg-yellow-600/10">
                          Pending Setup
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-green-600 border-green-600/20 bg-green-600/10">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Switch
                          checked={u.pro_model_access}
                          onCheckedChange={(checked) =>
                            handleToggleProModel(u.id, checked)
                          }
                          disabled={
                            showDeleted || session?.user?.role !== "admin"
                          }
                        />
                        {u.pro_model_requested && (
                          <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">
                            Requested
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex justify-between w-[140px]">
                          <span className="text-muted-foreground">Input:</span>
                          <span className="font-medium text-blue-500">
                            {Number(u.total_input_tokens || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between w-[140px]">
                          <span className="text-muted-foreground">Output:</span>
                          <span className="font-medium text-orange-500">
                            {Number(
                              u.total_output_tokens || 0,
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between w-[140px] pt-1 mt-1 border-t border-border/50">
                          <span className="text-muted-foreground font-medium">
                            Cost:
                          </span>
                          <span className="font-bold text-emerald-600">
                            ${Number(u.total_cost || 0).toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {showDeleted ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-600/10"
                          onClick={() => handleRestoreFromTable(u.id)}
                        >
                          <Undo className="size-4 mr-2" /> Restore
                        </Button>
                      ) : editingUserId === u.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-600/10"
                            onClick={() => handleUpdateUser(u.id)}
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingUserId(null)}
                          >
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditingEmail(u.email);
                              setEditingRole(u.role);
                            }}
                            disabled={session?.user?.id === u.id}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => setUserToDelete(u.id)}
                            disabled={session?.user?.id === u.id}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action can be
              undone later from the deleted users view.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!userToReopen}
        onOpenChange={(open) => !open && setUserToReopen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Previously Deleted</DialogTitle>
            <DialogDescription>
              This user was previously deleted from the workspace. Do you want
              to reopen their account instead?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToReopen(null)}>
              No, Cancel
            </Button>
            <Button onClick={executeRestore}>Yes, Reopen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
