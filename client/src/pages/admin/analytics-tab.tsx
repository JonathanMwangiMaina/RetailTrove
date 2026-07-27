import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, ShoppingBag, Users, Package, Eye } from "lucide-react";

interface SummaryData {
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  paidRevenue: number;
  totalCustomers: number;
  totalVendors: number;
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalVisits: number;
}

interface SalesTrend {
  date: string;
  orders: number;
  revenue: number;
}

interface VisitsTrend {
  date: string;
  count: number;
}

interface TopProduct {
  id: number;
  name: string;
  price: number;
  rating: number;
  stockQuantity: number;
  category: string;
}

export default function AnalyticsTab() {
  const { formatPrice } = useCurrency();

  const { data: summary, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ["/api/admin/analytics/summary"],
  });

  const { data: salesTrend = [] } = useQuery<SalesTrend[]>({
    queryKey: ["/api/admin/analytics/sales-trend"],
  });

  const { data: visitsTrend = [] } = useQuery<VisitsTrend[]>({
    queryKey: ["/api/admin/analytics/visits-trend"],
  });

  const { data: topProducts = [] } = useQuery<TopProduct[]>({
    queryKey: ["/api/admin/analytics/top-products"],
  });

  if (summaryLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Total Revenue
            </div>
            <p className="text-2xl font-bold">{formatPrice(summary?.totalRevenue ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary?.paidOrders ?? 0} paid orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ShoppingBag className="h-3.5 w-3.5" />
              Total Orders
            </div>
            <p className="text-2xl font-bold">{summary?.totalOrders ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(
                ((summary?.paidOrders ?? 0) / Math.max(summary?.totalOrders ?? 1, 1)) *
                100
              ).toFixed(0)}
              % paid
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" />
              Customers
            </div>
            <p className="text-2xl font-bold">{summary?.totalCustomers ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary?.totalVendors ?? 0} vendors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Eye className="h-3.5 w-3.5" />
              Page Visits
            </div>
            <p className="text-2xl font-bold">{summary?.totalVisits ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Package className="h-3.5 w-3.5" />
              Products
            </div>
            <p className="text-2xl font-bold">{summary?.totalProducts ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary?.totalStock ?? 0} total units
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Low Stock Items
            </div>
            <p className="text-2xl font-bold text-amber-600">{summary?.lowStockCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary?.outOfStockCount ?? 0} out of stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {salesTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === "revenue" ? formatPrice(value) : value
                    }
                    labelFormatter={(label: string) => label}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Visits Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Visits Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {visitsTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No visit data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={visitsTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No products yet</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPrice(p.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      ★ {p.rating.toFixed(1)} · {p.stockQuantity} in stock
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
