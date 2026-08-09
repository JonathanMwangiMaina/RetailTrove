import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Download, Loader2, ShoppingBag } from "lucide-react";

interface OrderLineItem {
  productId: number | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

interface UserOrder {
  id: number;
  total: number;
  createdAt: string | null;
  paymentStatus: string | null;
  paymentProvider: string | null;
  mpesaReceiptNumber: string | null;
  shippingStatus: string | null;
  lineItems: OrderLineItem[];
  subtotal: number;
  tax: number;
  pointsEarned: number;
}

interface OrderHistoryResponse {
  orders: UserOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE = 5;

const PAYMENT_BADGES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-red-100 text-red-700",
};

const SHIPPING_BADGES: Record<string, string> = {
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-green-100 text-green-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function badgeClass(map: Record<string, string>, status: string | null | undefined) {
  return status ? (map[status] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-600";
}

function statusLabel(status: string | null | undefined) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function OrderHistory() {
  const { formatPrice } = useCurrency();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery<OrderHistoryResponse>({
    queryKey: ["/api/orders", page, PAGE_SIZE],
    queryFn: async () => {
      const res = await fetch(`/api/orders?page=${page + 1}&pageSize=${PAGE_SIZE}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const orders = data?.orders ?? [];
  const pageCount = data?.totalPages ?? 1;

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-medium">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            When you place an order you will find it here with your receipt.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardContent className="pt-6">
            {/* Order header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Order #{order.id}</p>
                  <Badge className={badgeClass(PAYMENT_BADGES, order.paymentStatus)}>
                    {statusLabel(order.paymentStatus)}
                  </Badge>
                  <Badge className={badgeClass(SHIPPING_BADGES, order.shippingStatus)}>
                    {statusLabel(order.shippingStatus)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold">{formatPrice(order.total)}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/orders/${order.id}/receipt`} download>
                    <Download className="h-4 w-4" />
                    Receipt
                  </a>
                </Button>
              </div>
            </div>

            {/* Itemized line items — transparency on what was bought & charged */}
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lineItems.map((item, i) => (
                    <TableRow key={`${order.id}-${item.productId}-${i}`}>
                      <TableCell>
                        <p className="text-sm font-medium">{item.productName}</p>
                        {item.variantName ? (
                          <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">
                        {formatPrice(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatPrice(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Breakdown — subtotal / tax / total */}
            <div className="flex justify-end mt-3">
              <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (10%)</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
                {order.pointsEarned > 0 ? (
                  <p className="text-xs text-muted-foreground pt-1">
                    You earned {order.pointsEarned} loyalty point
                    {order.pointsEarned !== 1 ? "s" : ""} on this order.
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <PaginationControls
        page={page}
        pageCount={pageCount}
        itemCount={data?.total ?? 0}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
