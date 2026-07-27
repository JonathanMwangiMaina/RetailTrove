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
import { Trash } from "lucide-react";
import type { AdminSubscriber } from "./types";

interface Props {
  subscribers: AdminSubscriber[];
}

export default function NewsletterTab({ subscribers }: Props) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/newsletter/subscribers/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter/subscribers"] });
      toast({ title: "Subscriber removed" });
    },
  });

  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">
        {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No subscribers yet
                </TableCell>
              </TableRow>
            ) : (
              subscribers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.subscribedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={s.status === "active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm(`Remove subscriber ${s.email}?`))
                          deleteMutation.mutate(s.id);
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
    </>
  );
}
