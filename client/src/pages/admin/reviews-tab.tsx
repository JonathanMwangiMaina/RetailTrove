import { useMutation, useQuery } from "@tanstack/react-query";
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
import { StarIcon, Trash } from "lucide-react";
import type { AdminProductReview } from "./types";

export default function ReviewsTab() {
  const { toast } = useToast();
  const { data: reviews = [] } = useQuery<AdminProductReview[]>({
    queryKey: ["/api/admin/reviews"],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PUT", `/api/admin/reviews/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Review updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/reviews/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Review deleted" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const rejectedCount = reviews.filter((r) => r.status === "rejected").length;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {reviews.length} reviews total · {rejectedCount} rejected
        </p>
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-center">Rating</TableHead>
              <TableHead>Review</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No reviews yet
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">
                    {r.productName ?? `Product #${r.productId}`}
                  </TableCell>
                  <TableCell className="text-sm">{r.userName ?? "Anonymous"}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-0.5">
                      {r.rating}
                      <StarIcon className="h-3.5 w-3.5 text-yellow-400 fill-current" />
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {r.title && <p className="font-medium text-sm">{r.title}</p>}
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.comment}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={r.status === "approved" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {r.status !== "approved" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-green-600"
                        onClick={() => statusMutation.mutate({ id: r.id, status: "approved" })}
                      >
                        Approve
                      </Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-500"
                        onClick={() => statusMutation.mutate({ id: r.id, status: "rejected" })}
                      >
                        Reject
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm("Delete this review?")) deleteMutation.mutate(r.id);
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
