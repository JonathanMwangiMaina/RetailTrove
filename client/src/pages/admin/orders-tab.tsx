import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import { useInTabPagination } from "@/hooks/use-in-tab-pagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { AdminOrder } from "./types";

interface Props {
  orders: AdminOrder[];
}

const SHIPPING_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

function paymentBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>;
    case "refunded":
      return <Badge className="bg-amber-100 text-amber-700">Refunded</Badge>;
    case "failed":
      return <Badge className="bg-rose-100 text-rose-700">Failed</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-600">Pending</Badge>;
  }
}

function shippingBadge(status: string) {
  switch (status) {
    case "shipped":
      return <Badge className="bg-blue-100 text-blue-700">Shipped</Badge>;
    case "delivered":
      return <Badge className="bg-emerald-100 text-emerald-700">Delivered</Badge>;
    case "processing":
      return <Badge className="bg-violet-100 text-violet-700">Processing</Badge>;
    case "cancelled":
      return <Badge className="bg-rose-100 text-rose-700">Cancelled</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-600">Pending</Badge>;
  }
}

function StatusCell({ order }: { order: AdminOrder }) {
  const { toast } = useToast();
  const [value, setValue] = useState(order.shippingStatus);

  const mutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PUT", `/api/admin/orders/${order.id}/shipping`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary"] });
      toast({ title: "Shipping status updated" });
    },
    onError: () => {
      setValue(order.shippingStatus);
      toast({
        title: "Update failed",
        description: "Could not update shipping status.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onValueChange={(v) => {
          setValue(v);
          mutation.mutate(v);
        }}
        disabled={mutation.isPending}
      >
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SHIPPING_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
    </div>
  );
}

export default function OrdersTab({ orders }: Props) {
  const { formatPrice } = useCurrency();
  const { page, pageCount, pageItems, setPage } = useInTabPagination(orders, 10);
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((s, o) => s + parseFloat(o.total ?? "0"), 0);

  return (
    <>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Shipping</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No orders yet
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-xs text-muted-foreground">#{o.id}</TableCell>
                  <TableCell className="font-medium">
                    {o.firstName} {o.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.email}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{paymentBadge(o.paymentStatus)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {shippingBadge(o.shippingStatus)}
                      <StatusCell order={o} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatPrice(parseFloat(o.total))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PaginationControls
          page={page}
          pageCount={pageCount}
          itemCount={orders.length}
          pageSize={10}
          onPageChange={setPage}
        />
      </div>
      {orders.length > 0 && (
        <div className="mt-3 text-right text-sm text-muted-foreground">
          Paid revenue: <span className="font-bold text-gray-900">{formatPrice(totalRevenue)}</span>
        </div>
      )}
    </>
  );
}
