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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash, Save } from "lucide-react";
import type { AdminTeamMember } from "./types";

interface Props {
  members: AdminTeamMember[];
}

const EMPTY_FORM = { name: "", title: "", bio: "", imageUrl: "", displayOrder: 0, isPublished: true };

export default function TeamTab({ members }: Props) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTeamMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/admin/team-members", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Team member added" });
      setIsAddOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PUT", `/api/admin/team-members/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Team member updated" });
      setIsEditOpen(false);
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/team-members/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Team member deleted" });
    },
  });

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {members.length} team member{members.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Member
        </Button>
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Bio</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No team members yet. Add one to populate the About page.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs text-muted-foreground">{m.displayOrder ?? 0}</TableCell>
                  <TableCell>
                    <img
                      src={m.imageUrl}
                      alt={m.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-sm">{m.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.title}</TableCell>
                  <TableCell>
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                      {m.bio}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={m.isPublished ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {m.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing({ ...m });
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm(`Delete team member ${m.name}?`))
                          deleteMutation.mutate(m.id);
                      }}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sarah Johnson"
              />
            </div>
            <div className="space-y-1">
              <Label>Title / Role</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Founder & CEO"
              />
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea
                className="min-h-[100px]"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Short bio about this team member…"
              />
            </div>
            <div className="space-y-1">
              <Label>Image URL</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Visibility</Label>
                <Select
                  value={form.isPublished ? "true" : "false"}
                  onValueChange={(v) => setForm((f) => ({ ...f, isPublished: v === "true" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Published</SelectItem>
                    <SelectItem value="false">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate(form)}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? "Adding…" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing((m) => (m ? { ...m, name: e.target.value } : m))}
                />
              </div>
              <div className="space-y-1">
                <Label>Title / Role</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing((m) => (m ? { ...m, title: e.target.value } : m))}
                />
              </div>
              <div className="space-y-1">
                <Label>Bio</Label>
                <Textarea
                  className="min-h-[100px]"
                  value={editing.bio}
                  onChange={(e) => setEditing((m) => (m ? { ...m, bio: e.target.value } : m))}
                />
              </div>
              <div className="space-y-1">
                <Label>Image URL</Label>
                <Input
                  value={editing.imageUrl}
                  onChange={(e) =>
                    setEditing((m) => (m ? { ...m, imageUrl: e.target.value } : m))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={editing.displayOrder ?? 0}
                    onChange={(e) =>
                      setEditing((m) =>
                        m ? { ...m, displayOrder: parseInt(e.target.value) || 0 } : m,
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Visibility</Label>
                  <Select
                    value={editing.isPublished ? "true" : "false"}
                    onValueChange={(v) =>
                      setEditing((m) => (m ? { ...m, isPublished: v === "true" } : m))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Published</SelectItem>
                      <SelectItem value="false">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate(editing!)}
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
