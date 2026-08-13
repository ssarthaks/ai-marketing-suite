"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Globe, Lock, Plus, Users, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { addQuickTeamMemberAction } from "@/features/users/actions/user.actions";

export type VisibilityStatus = "PUBLIC" | "PRIVATE" | "SHARED";

export interface UserOption {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface VisibilitySelectorProps {
  visibility: VisibilityStatus;
  sharedWithUserIds: string[];
  onChangeVisibility: (status: VisibilityStatus) => void;
  onChangeSharedWithUserIds: (ids: string[]) => void;
  users?: UserOption[];
  disabled?: boolean;
}

export function VisibilitySelector({
  visibility,
  sharedWithUserIds,
  onChangeVisibility,
  onChangeSharedWithUserIds,
  users = [],
  disabled = false,
}: VisibilitySelectorProps) {
  const [extraUsers, setExtraUsers] = useState<UserOption[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Combine passed users and newly quick-added members uniquely by ID and email
  const allUsers = useMemo(() => {
    const map = new Map<string, UserOption>();

    for (const u of users) {
      if (u && u.id) {
        map.set(u.id, u);
      }
    }
    for (const u of extraUsers) {
      if (u && u.id) {
        map.set(u.id, u);
      }
    }

    return Array.from(map.values());
  }, [users, extraUsers]);

  const query = searchQuery.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!query) return allUsers;
    return allUsers.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(query) ||
        (u.email || "").toLowerCase().includes(query)
    );
  }, [allUsers, query]);

  function toggleUser(userId: string) {
    if (sharedWithUserIds.includes(userId)) {
      onChangeSharedWithUserIds(sharedWithUserIds.filter((id) => id !== userId));
    } else {
      onChangeSharedWithUserIds([...sharedWithUserIds, userId]);
    }
  }

  function removeUser(userId: string) {
    onChangeSharedWithUserIds(sharedWithUserIds.filter((id) => id !== userId));
  }

  function onAddQuickMember() {
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    startTransition(async () => {
      const res = await addQuickTeamMemberAction(cleanEmail);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const newUser = res.data;
      if (!allUsers.some((u) => u.id === newUser.id)) {
        setExtraUsers((prev) => [...prev, newUser]);
      }
      if (!sharedWithUserIds.includes(newUser.id)) {
        onChangeSharedWithUserIds([...sharedWithUserIds, newUser.id]);
      }
      setNewEmail("");
      toast.success(`Added ${newUser.email} to shared members`);
    });
  }

  const selectedUsers = allUsers.filter((u) => sharedWithUserIds.includes(u.id));

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3.5 shadow-2xs">
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          Access & Visibility
        </Label>
        <p className="text-[11px] text-muted-foreground leading-normal">
          Control who can view and access this resource.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        <Select
          value={visibility}
          onValueChange={(val) => onChangeVisibility(val as VisibilityStatus)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PUBLIC">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium text-xs">Public (Workspace)</p>
                  <p className="text-[10px] text-muted-foreground">Visible to everyone in this workspace</p>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="PRIVATE">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-amber-500" />
                <div className="text-left">
                  <p className="font-medium text-xs">Private</p>
                  <p className="text-[10px] text-muted-foreground">Only visible to you (owner)</p>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="SHARED">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-purple-500" />
                <div className="text-left">
                  <p className="font-medium text-xs">Shared with Specific Members</p>
                  <p className="text-[10px] text-muted-foreground">Visible to selected team members</p>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {visibility === "SHARED" && (
          <div className="space-y-2 pt-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Select members to share with ({sharedWithUserIds.length} selected)
            </Label>

            {/* Dropdown Menu Trigger for Team Members */}
            <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={dropdownOpen}
                  disabled={disabled}
                  className="w-full justify-between h-9 text-xs bg-background font-normal"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Users className="size-3.5 text-purple-500 shrink-0" />
                    {sharedWithUserIds.length === 0
                      ? "Select platform team members..."
                      : `${sharedWithUserIds.length} member${sharedWithUserIds.length === 1 ? "" : "s"} selected`}
                  </span>
                  <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-2.5" align="start">
                <div className="space-y-2.5">
                  {/* Search Input inside Dropdown */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  {/* Quick Add Member Input inside Dropdown */}
                  <div className="flex items-center gap-1.5 pt-1 border-t">
                    <Input
                      type="email"
                      placeholder="Add member by email..."
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onAddQuickMember();
                        }
                      }}
                      disabled={isPending}
                      className="h-7 text-xs min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={onAddQuickMember}
                      disabled={isPending || !newEmail.trim()}
                      className="h-7 text-xs shrink-0 px-2"
                    >
                      {isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3 mr-1" />}
                      Add
                    </Button>
                  </div>

                  {/* Members List inside Dropdown */}
                  <div className="max-h-52 overflow-y-auto space-y-1 pt-1 border-t">
                    {filteredUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic text-center py-2">
                        No members found matching &quot;{searchQuery}&quot;
                      </p>
                    ) : (
                      filteredUsers.map((user) => {
                        const isChecked = sharedWithUserIds.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            onClick={() => toggleUser(user.id)}
                            className="flex items-center justify-between rounded-md p-1.5 hover:bg-muted cursor-pointer transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleUser(user.id)}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate text-foreground">
                                  {user.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                            {isChecked && (
                              <Check className="size-3.5 text-purple-600 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Selected Members Badges */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedUsers.map((u) => (
                  <Badge
                    key={u.id}
                    variant="secondary"
                    className="text-[11px] bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 gap-1 pr-1"
                  >
                    <span className="truncate max-w-36">{u.name || u.email}</span>
                    <button
                      type="button"
                      onClick={() => removeUser(u.id)}
                      className="hover:text-destructive shrink-0"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
