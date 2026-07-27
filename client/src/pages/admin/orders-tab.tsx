import { useCurrency } from "@/hooks/use-currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminOrder } from "./types";

interface Props {
  orders: AdminOrder[];
}

export default function OrdersTab({ orders }: Props) {
  const { formatPrice } = useCurrency();
  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total ?? "0"), 0);

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
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No orders yet
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-xs text-muted-foreground">#{o.id}</TableCell>
                  <TableCell className="font-medium">
                    {o.firstName} {o.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.email}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatPrice(parseFloat(o.total))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {orders.length > 0 && (
        <div className="mt-3 text-right text-sm text-muted-foreground">
          Total revenue:{" "}
          <span className="font-bold text-gray-900">{formatPrice(totalRevenue)}</span>
        </div>
      )}
    </>
  );
}
