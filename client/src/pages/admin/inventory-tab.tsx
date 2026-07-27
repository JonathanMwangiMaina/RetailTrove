import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash, Save, AlertTriangle, Package } from "lucide-react";
import { discountPct } from "./constants";
import ProductFormFields from "./product-form-fields";
import { EMPTY_PRODUCT } from "./constants";
import type { AdminProduct } from "./types";

interface Props {
  products: AdminProduct[];
  productsLoading: boolean;
}

export default function InventoryTab({ products, productsLoading }: Props) {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [newProduct, setNewProduct] = useState<Record<string, unknown>>({ ...EMPTY_PRODUCT });

  const { data: lowStockProducts = [] } = useQuery<AdminProduct[]>({
    queryKey: ["/api/admin/low-stock", { threshold: 5 }],
  });

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    if (stockFilter === "low")
      return matchesSearch && (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= 5;
    if (stockFilter === "out") return matchesSearch && (!p.inStock || (p.stockQuantity ?? 0) === 0);
    return matchesSearch;
  });

  const totalStock = products.reduce((sum, p) => sum + (p.stockQuantity ?? 0), 0);
  const outOfStockCount = products.filter((p) => !p.inStock || (p.stockQuantity ?? 0) === 0).length;

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Added" });
      setIsAddOpen(false);
      setNewProduct({ ...EMPTY_PRODUCT });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PUT", `/api/products/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Updated" });
      setIsEditOpen(false);
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Deleted" });
    },
  });

  return (
    <>
      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-medium">
              {lowStockProducts.length} product{lowStockProducts.length !== 1 ? "s" : ""}
            </span>{" "}
            with low stock (≤5 units remaining)
          </p>
        </div>
      )}

      {/* Stock summary */}
      <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Package className="h-3.5 w-3.5" />
          <span>
            Total stock: <span className="font-medium text-foreground">{totalStock}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span>
            Out of stock: <span className="font-medium text-foreground">{outOfStockCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          <span>
            Low stock:{" "}
            <span className="font-medium text-foreground">{lowStockProducts.length}</span>
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(["all", "low", "out"] as const).map((f) => (
              <Button
                key={f}
                variant={stockFilter === f ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setStockFilter(f)}
              >
                {f === "all" ? "All" : f === "low" ? "Low Stock" : "Out of Stock"}
              </Button>
            ))}
          </div>
        </div>
        <Button size="sm" className="ml-2" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const pct = discountPct(p.price, p.originalPrice);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground">{p.id}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {p.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          p.approvalStatus === "approved"
                            ? "default"
                            : p.approvalStatus === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {p.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold">{formatPrice(Number(p.price))}</span>
                      {pct && <span className="text-xs text-muted-foreground ml-1">(-{pct}%)</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`text-sm font-medium ${(p.stockQuantity ?? 0) === 0 ? "text-red-600" : (p.stockQuantity ?? 0) < 5 ? "text-orange-600" : "text-green-700"}`}
                      >
                        {p.stockQuantity ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing({ ...p });
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id);
                        }}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Admin-added products go live immediately.</DialogDescription>
          </DialogHeader>
          <ProductFormFields data={newProduct} setData={setNewProduct} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => addMutation.mutate(newProduct)} disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                "Adding…"
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Admin edits are saved directly.</DialogDescription>
          </DialogHeader>
          {editing && <ProductFormFields data={editing} setData={setEditing} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate(editing!)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                "Saving…"
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
