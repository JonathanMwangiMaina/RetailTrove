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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ban, RefreshCw, Trash } from "lucide-react";
import type { AdminUser } from "./types";

interface Props {
  customers: AdminUser[];
}

export default function UsersTab({ customers }: Props) {
  const { toast } = useToast();

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
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No customers yet
              </TableCell>
            </TableRow>
          ) : (
            customers.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u.id);
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
  );
}
