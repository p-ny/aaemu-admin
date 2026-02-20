import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Settings, Users, Lock, Trash2, Plus, Loader2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [changeNewPassword, setChangeNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    },
  });

  const addUser = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add user");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setNewUsername("");
      setNewPassword("");
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete user");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword: changeNewPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to change password");
      }
      return await res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setChangeNewPassword("");
      setConfirmPassword("");
    },
  });

  const passwordMismatch = confirmPassword !== "" && changeNewPassword !== confirmPassword;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-display text-white">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage users and account settings.</p>
      </div>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
        <h3 className="text-lg font-bold font-display text-white mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          User Management
        </h3>

        <div className="rounded-lg border border-white/5 overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Username</TableHead>
                <TableHead className="text-muted-foreground">Role</TableHead>
                <TableHead className="text-muted-foreground">Created</TableHead>
                <TableHead className="text-muted-foreground w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading && (
                <TableRow className="border-white/5">
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                    Loading users...
                  </TableCell>
                </TableRow>
              )}
              {users?.map((u: any) => (
                <TableRow key={u.id} className="border-white/5">
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-white/10">
                      {u.role || "user"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteUser.mutate(u.id)}
                      disabled={u.id === user?.id || deleteUser.isPending}
                      className="text-muted-foreground hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!usersLoading && users?.length === 0 && (
                <TableRow className="border-white/5">
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Separator className="bg-white/5 mb-6" />

        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Add User
        </h4>
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="addUsername">Username</Label>
            <Input
              id="addUsername"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username"
              className="bg-black/20 border-white/10"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="addPassword">Password</Label>
            <Input
              id="addPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password"
              className="bg-black/20 border-white/10"
            />
          </div>
          <Button
            onClick={() => addUser.mutate()}
            disabled={!newUsername || !newPassword || addUser.isPending}
            className="gap-2"
          >
            {addUser.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add User
          </Button>
        </div>
        {addUser.isError && (
          <p className="text-red-400 text-sm mt-2">{addUser.error.message}</p>
        )}
        {addUser.isSuccess && (
          <p className="text-green-400 text-sm mt-2">User added successfully!</p>
        )}
      </Card>

      <Card className="bg-card/40 backdrop-blur-sm border-white/5 p-6">
        <h3 className="text-lg font-bold font-display text-white mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Change Password
        </h3>

        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="bg-black/20 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={changeNewPassword}
              onChange={(e) => setChangeNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="bg-black/20 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={`bg-black/20 border-white/10 ${passwordMismatch ? "border-red-400/50" : ""}`}
            />
            {passwordMismatch && (
              <p className="text-red-400 text-xs">Passwords do not match.</p>
            )}
          </div>
          <Button
            onClick={() => changePassword.mutate()}
            disabled={
              !currentPassword ||
              !changeNewPassword ||
              passwordMismatch ||
              !confirmPassword ||
              changePassword.isPending
            }
            className="gap-2"
          >
            {changePassword.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Change Password
          </Button>
          {changePassword.isError && (
            <p className="text-red-400 text-sm">{changePassword.error.message}</p>
          )}
          {changePassword.isSuccess && (
            <p className="text-green-400 text-sm">Password changed successfully!</p>
          )}
        </div>
      </Card>
    </div>
  );
}