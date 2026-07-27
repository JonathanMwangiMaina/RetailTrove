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
import type { AdminFaq } from "./types";

interface Props {
  allFaqs: AdminFaq[];
  getVendorName: (id: number) => string;
}

export default function FaqTab({ allFaqs, getVendorName }: Props) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFaq | null>(null);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", displayOrder: 0 });

  const pendingFaqs = allFaqs.filter((f) => f.status === "pending");

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/faqs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({ title: "FAQ Added" });
      setIsAddOpen(false);
      setNewFaq({ question: "", answer: "", displayOrder: 0 });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("PUT", `/api/faqs/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({ title: "FAQ Updated" });
      setIsEditOpen(false);
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/faqs/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({ title: "FAQ Deleted" });
    },
  });

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {allFaqs.length} FAQs total · {pendingFaqs.length} pending
        </p>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add FAQ
        </Button>
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allFaqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No FAQs yet
                </TableCell>
              </TableRow>
            ) : (
              allFaqs.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-xs text-muted-foreground">{f.displayOrder}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{f.question}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{f.answer}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        f.status === "approved"
                          ? "default"
                          : f.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-xs"
                    >
                      {f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.submittedBy ? getVendorName(f.submittedBy) : "Admin"}
                  </TableCell>
                  <TableCell className="text-right">
                    {f.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-green-600"
                          onClick={() => updateMutation.mutate({ id: f.id, status: "approved" })}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-500"
                          onClick={() => updateMutation.mutate({ id: f.id, status: "rejected" })}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing({ ...f });
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm("Delete this FAQ?")) deleteMutation.mutate(f.id);
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

      {/* Add FAQ Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add FAQ</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Question</Label>
              <Input
                value={newFaq.question}
                onChange={(e) => setNewFaq((f) => ({ ...f, question: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Answer</Label>
              <Textarea
                className="min-h-[120px]"
                value={newFaq.answer}
                onChange={(e) => setNewFaq((f) => ({ ...f, answer: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={newFaq.displayOrder}
                onChange={(e) =>
                  setNewFaq((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => addMutation.mutate(newFaq)} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding…" : "Add FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit FAQ Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1">
                <Label>Question</Label>
                <Input
                  value={editing.question}
                  onChange={(e) => setEditing((f) => (f ? { ...f, question: e.target.value } : f))}
                />
              </div>
              <div className="space-y-1">
                <Label>Answer</Label>
                <Textarea
                  className="min-h-[120px]"
                  value={editing.answer}
                  onChange={(e) => setEditing((f) => (f ? { ...f, answer: e.target.value } : f))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={editing.displayOrder ?? 0}
                    onChange={(e) =>
                      setEditing((f) =>
                        f ? { ...f, displayOrder: parseInt(e.target.value) || 0 } : f,
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={editing.status}
                    onValueChange={(v) => setEditing((f) => (f ? { ...f, status: v } : f))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
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
