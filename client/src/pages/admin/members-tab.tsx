import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, CheckCircle, XCircle, Ban, RefreshCw, Trash } from "lucide-react";
import { roleColor } from "./constants";
import type { AdminUser } from "./types";

interface Props {
  admins: AdminUser[];
  vendors: AdminUser[];
  currentUserId: number;
}

export default function MembersTab({ admins, vendors, currentUserId }: Props) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", password: "", role: "vendor" });

  const addMutation = useMutation({
    mutationFn: (data: Record<string, string>) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Created" });
      setIsAddOpen(false);
      setNewMember({ name: "", email: "", password: "", role: "vendor" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest("PUT", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/users/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-red-600">{admins.length}/3</span> admins &nbsp;·&nbsp;
          <span className="font-medium text-emerald-600">{vendors.length}/20</span> vendors
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Member
        </Button>
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-center">Approved</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...admins, ...vendors].length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No members yet
                </TableCell>
              </TableRow>
            ) : (
              [...admins, ...vendors].map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-xs text-white ${roleColor(u.role)}`}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {u.isApproved ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={u.status === "active" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {!u.isApproved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-green-600"
                        onClick={() =>
                          updateMutation.mutate({ id: u.id, data: { isApproved: true } })
                        }
                      >
                        Approve
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        updateMutation.mutate({
                          id: u.id,
                          data: { status: u.status === "active" ? "suspended" : "active" },
                        })
                      }
                    >
                      {u.status === "active" ? (
                        <Ban className="h-3.5 w-3.5 text-orange-500" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </Button>
                    {u.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u.id);
                        }}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              {admins.length}/3 admins · {vendors.length}/20 vendors
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                value={newMember.name}
                onChange={(e) => setNewMember((m) => ({ ...m, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember((m) => ({ ...m, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input
                type="password"
                value={newMember.password}
                onChange={(e) => setNewMember((m) => ({ ...m, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={newMember.role}
                onValueChange={(v) => setNewMember((m) => ({ ...m, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="admin" disabled={admins.length >= 3}>
                    Admin {admins.length >= 3 ? "(limit reached)" : ""}
                  </SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => addMutation.mutate(newMember)} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
