import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { useInTabPagination } from "@/hooks/use-in-tab-pagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { apiRequest, queryClient, invalidateProductQueries } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { CheckCircle, XCircle } from "lucide-react";
import type { AdminProduct, AdminUser } from "./types";

interface Props {
  pendingProducts: AdminProduct[];
  allUsers: AdminUser[];
  getVendorName: (id: number) => string;
}

export default function PendingTab({ pendingProducts, allUsers: _allUsers, getVendorName }: Props) {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { page, pageCount, pageItems, setPage } = useInTabPagination(pendingProducts, 9);

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PUT", `/api/admin/products/${id}/approve`, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products/pending"] });
      void invalidateProductQueries();
      toast({ title: vars.status === "approved" ? "Product Approved ✓" : "Product Rejected" });
    },
  });

  if (pendingProducts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-400" />
        No pending products — all clear!
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageItems.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <OptimizedImage
              src={p.imageUrl}
              alt={p.name}
              width={160}
              height={160}
              hiddenOnError
              sizes="160px"
              className="w-full h-40 object-cover"
            />
            <CardContent className="pt-3 pb-3 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <span className="font-bold text-sm">{formatPrice(Number(p.price))}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
              <p className="text-xs text-blue-600">Vendor: {getVendorName(p.vendorId ?? 0)}</p>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                  onClick={() => approveMutation.mutate({ id: p.id, status: "approved" })}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 text-xs"
                  onClick={() => approveMutation.mutate({ id: p.id, status: "rejected" })}
                  disabled={approveMutation.isPending}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="border rounded-md mt-4">
        <PaginationControls
          page={page}
          pageCount={pageCount}
          itemCount={pendingProducts.length}
          pageSize={9}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
