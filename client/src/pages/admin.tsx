import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowUpDown, Edit, Trash, Search, Plus, Save,
  Database, ShoppingBag, PackageCheck, TrendingDown, Shield,
} from "lucide-react";

const EMPTY_PRODUCT = {
  name: "", description: "", price: "", originalPrice: "",
  imageUrl: "", category: "", subcategory: "", badge: "",
  featured: false, newArrival: false, inStock: true, stockQuantity: 0,
};

function discountPct(price: string, originalPrice?: string | null) {
  const p = parseFloat(price);
  const op = parseFloat(originalPrice ?? "0");
  if (!op || op <= p) return null;
  return Math.round(((op - p) / op) * 100);
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<any>({ ...EMPTY_PRODUCT });

  // Redirect non-admin/vendor
  if (user && user.role === "customer") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Access Restricted</h2>
        <p className="text-gray-500">This area is for admins and vendors only.</p>
        <Link href="/"><Button variant="outline">Back to Store</Button></Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Sign in required</h2>
        <Button onClick={() => navigate("/login")}>Sign In</Button>
      </div>
    );
  }

  // ── Queries ──
  const { data: products = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  const { data: banner, refetch: refetchBanner } = useQuery<any>({
    queryKey: ["/api/banner"],
  });

  // ── Mutations ──
  const addProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Added", description: "New product added to catalogue." });
      setIsAddOpen(false);
      setNewProduct({ ...EMPTY_PRODUCT });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/products/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Updated" });
      setIsEditOpen(false);
    },
    onError: (e: Error) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete Failed", description: e.message, variant: "destructive" }),
  });

  const updateBannerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/banner", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banner"] });
      toast({ title: "Banner Updated" });
    },
  });

  // ── Helpers ──
  const filtered = products.filter((p: any) => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const highDiscountProducts = products.filter((p: any) => {
    const pct = discountPct(p.price, p.originalPrice);
    return pct !== null && pct >= 20;
  });

  const outOfStock = products.filter((p: any) => !p.inStock);
  const lowStock = products.filter((p: any) => p.inStock && (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) < 5);

  function handleInputChange(setter: (v: any) => void, current: any) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter({ ...current, [e.target.name]: e.target.value });
    };
  }

  function handleSelectChange(setter: (v: any) => void, current: any, key: string, val: string) {
    setter({ ...current, [key]: val === "true" ? true : val === "false" ? false : val });
  }

  // ── Stats ──
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total ?? "0"), 0);

  return (
    <div className="container py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as <span className="font-medium">{user.name}</span>{" "}
            <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${user.role === "admin" ? "bg-red-600" : "bg-emerald-600"}`}>
              {user.role}
            </span>
          </p>
        </div>
        <Link href="/"><Button variant="outline" size="sm"><ShoppingBag className="h-4 w-4 mr-2" />Store</Button></Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Products</p>
            <p className="text-2xl font-bold">{products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-orange-500" />On Sale (≥20% off)
            </p>
            <p className="text-2xl font-bold text-orange-600">{highDiscountProducts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <PackageCheck className="h-3 w-3 text-red-500" />Out of Stock
            </p>
            <p className="text-2xl font-bold text-red-600">{outOfStock.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="products"><Database className="h-4 w-4 mr-2" />Inventory</TabsTrigger>
              <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 mr-2" />Orders</TabsTrigger>
              <TabsTrigger value="banner">Banner</TabsTrigger>
            </TabsList>

            {/* ── Products Tab ── */}
            <TabsContent value="products">
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button size="sm" className="ml-2" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Add Product
                </Button>
              </div>

              {lowStock.length > 0 && (
                <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800">
                  ⚠ <strong>{lowStock.length}</strong> product{lowStock.length > 1 ? "s" : ""} with low stock (&lt;5 units): {lowStock.map((p: any) => p.name).join(", ")}
                </div>
              )}

              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Discount</TableHead>
                      <TableHead className="text-center">Stock Qty</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
                    ) : filtered.map((product: any) => {
                      const pct = discountPct(product.price, product.originalPrice);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="text-muted-foreground text-xs">{product.id}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold">${product.price}</span>
                            {product.originalPrice && (
                              <span className="text-xs text-muted-foreground line-through ml-1">${product.originalPrice}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {pct !== null ? (
                              <Badge variant={pct >= 30 ? "destructive" : "secondary"} className="text-xs">
                                {pct}% off
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-medium ${
                              (product.stockQuantity ?? 0) === 0
                                ? "text-red-600"
                                : (product.stockQuantity ?? 0) < 5
                                ? "text-orange-600"
                                : "text-green-700"
                            }`}>
                              {product.stockQuantity ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={product.inStock ? "default" : "destructive"} className="text-xs">
                              {product.inStock ? "In Stock" : "Out of Stock"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingProduct({ ...product }); setIsEditOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (window.confirm(`Delete "${product.name}"?`)) deleteProductMutation.mutate(product.id);
                            }}>
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ── Orders Tab ── */}
            <TabsContent value="orders">
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
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No orders yet</TableCell></TableRow>
                    ) : orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-muted-foreground text-xs">#{order.id}</TableCell>
                        <TableCell className="font-medium">{order.firstName} {order.lastName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{order.email}</TableCell>
                        <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">${parseFloat(order.total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {orders.length > 0 && (
                <div className="mt-3 text-right text-sm text-muted-foreground">
                  Total revenue: <span className="font-bold text-gray-900">${totalRevenue.toFixed(2)}</span>
                </div>
              )}
            </TabsContent>

            {/* ── Banner Tab ── */}
            <TabsContent value="banner">
              <div className="max-w-lg space-y-4">
                <p className="text-sm text-muted-foreground">
                  Edit the announcement banner that appears at the top of every page.
                </p>
                {banner && (
                  <div
                    className="p-3 rounded text-white text-sm text-center font-medium"
                    style={{ backgroundColor: banner.bgColor }}
                  >
                    {banner.text}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <Label>Banner Text</Label>
                    <Input
                      defaultValue={banner?.text}
                      key={banner?.text}
                      onBlur={(e) => updateBannerMutation.mutate({ text: e.target.value })}
                      placeholder="Free shipping on all orders over $50!"
                    />
                  </div>
                  <div>
                    <Label>Background Colour</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        defaultValue={banner?.bgColor ?? "#1d4ed8"}
                        key={banner?.bgColor}
                        onChange={(e) => updateBannerMutation.mutate({ bgColor: e.target.value })}
                        className="h-9 w-16 rounded border cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">{banner?.bgColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Active</Label>
                    <Select
                      value={banner?.isActive ? "true" : "false"}
                      onValueChange={(v) => updateBannerMutation.mutate({ isActive: v === "true" })}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Visible</SelectItem>
                        <SelectItem value="false">Hidden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Edit Product Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details, stock, and pricing.</DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input name="name" value={editingProduct.name} onChange={handleInputChange(setEditingProduct, editingProduct)} />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Input name="category" value={editingProduct.category} onChange={handleInputChange(setEditingProduct, editingProduct)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Subcategory</Label>
                  <Input name="subcategory" value={editingProduct.subcategory ?? ""} onChange={handleInputChange(setEditingProduct, editingProduct)} />
                </div>
                <div className="space-y-1">
                  <Label>Badge (e.g. "Sale", "New")</Label>
                  <Input name="badge" value={editingProduct.badge ?? ""} onChange={handleInputChange(setEditingProduct, editingProduct)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input name="description" value={editingProduct.description} onChange={handleInputChange(setEditingProduct, editingProduct)} />
              </div>
              <div className="space-y-1">
                <Label>Image URL</Label>
                <Input name="imageUrl" value={editingProduct.imageUrl} onChange={handleInputChange(setEditingProduct, editingProduct)} />
              </div>
              <Separator />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing & Inventory</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Price ($)</Label>
                  <Input name="price" value={editingProduct.price} onChange={handleInputChange(setEditingProduct, editingProduct)} />
                </div>
                <div className="space-y-1">
                  <Label>Original Price ($)</Label>
                  <Input name="originalPrice" value={editingProduct.originalPrice ?? ""} placeholder="Leave blank if no discount"
                    onChange={handleInputChange(setEditingProduct, editingProduct)} />
                </div>
                <div className="space-y-1">
                  <Label>Stock Quantity</Label>
                  <Input type="number" name="stockQuantity" min={0}
                    value={editingProduct.stockQuantity ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              {editingProduct.price && editingProduct.originalPrice && (
                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-1">
                  Current discount: <strong>{discountPct(editingProduct.price, editingProduct.originalPrice)}%</strong> off original price
                </p>
              )}
              <Separator />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</p>
              <div className="grid grid-cols-3 gap-4">
                {(["inStock", "featured", "newArrival"] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label>{key === "inStock" ? "In Stock" : key === "featured" ? "Featured" : "New Arrival"}</Label>
                    <Select
                      value={editingProduct[key]?.toString() ?? "false"}
                      onValueChange={(v) => handleSelectChange(setEditingProduct, editingProduct, key, v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateProductMutation.mutate(editingProduct)} disabled={updateProductMutation.isPending}>
              {updateProductMutation.isPending ? "Saving…" : <><Save className="h-4 w-4 mr-2" />Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Product Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>Fill in the product details to add it to the catalogue.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input name="name" value={newProduct.name} onChange={handleInputChange(setNewProduct, newProduct)} />
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Input name="category" value={newProduct.category} onChange={handleInputChange(setNewProduct, newProduct)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Subcategory</Label>
                <Input name="subcategory" value={newProduct.subcategory} onChange={handleInputChange(setNewProduct, newProduct)} />
              </div>
              <div className="space-y-1">
                <Label>Badge</Label>
                <Input name="badge" value={newProduct.badge} placeholder='e.g. "New" or "Sale"' onChange={handleInputChange(setNewProduct, newProduct)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Input name="description" value={newProduct.description} onChange={handleInputChange(setNewProduct, newProduct)} />
            </div>
            <div className="space-y-1">
              <Label>Image URL *</Label>
              <Input name="imageUrl" value={newProduct.imageUrl} placeholder="https://images.unsplash.com/…" onChange={handleInputChange(setNewProduct, newProduct)} />
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing & Stock</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Price ($) *</Label>
                <Input name="price" value={newProduct.price} placeholder="29.99" onChange={handleInputChange(setNewProduct, newProduct)} />
              </div>
              <div className="space-y-1">
                <Label>Original Price ($)</Label>
                <Input name="originalPrice" value={newProduct.originalPrice} placeholder="Optional" onChange={handleInputChange(setNewProduct, newProduct)} />
              </div>
              <div className="space-y-1">
                <Label>Stock Quantity</Label>
                <Input type="number" min={0} value={newProduct.stockQuantity}
                  onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              {(["inStock", "featured", "newArrival"] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <Label>{key === "inStock" ? "In Stock" : key === "featured" ? "Featured" : "New Arrival"}</Label>
                  <Select
                    value={newProduct[key]?.toString() ?? "false"}
                    onValueChange={(v) => handleSelectChange(setNewProduct, newProduct, key, v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setNewProduct({ ...EMPTY_PRODUCT }); }}>Cancel</Button>
            <Button
              onClick={() => addProductMutation.mutate(newProduct)}
              disabled={addProductMutation.isPending || !newProduct.name || !newProduct.price || !newProduct.imageUrl}
            >
              {addProductMutation.isPending ? "Adding…" : <><Plus className="h-4 w-4 mr-2" />Add Product</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
