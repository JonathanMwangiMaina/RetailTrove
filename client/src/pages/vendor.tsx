import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, Plus, Edit, Trash, ShoppingBag, HelpCircle, Users, Shield, Clock,
  CheckCircle, XCircle, Save, Search,
} from "lucide-react";

const EMPTY_PRODUCT = {
  name: "", description: "", price: "", originalPrice: "",
  imageUrl: "", category: "", subcategory: "", badge: "",
  featured: false, newArrival: false, inStock: true, stockQuantity: 0,
};

function statusColor(status: string) {
  if (status === "approved") return "default";
  if (status === "pending") return "secondary";
  return "destructive";
}

export default function VendorPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("products");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState<any>({ ...EMPTY_PRODUCT });
  const [isAddFaqOpen, setIsAddFaqOpen] = useState(false);
  const [isEditFaqOpen, setIsEditFaqOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [searchQuery, setSearchQuery] = useState("");

  // Auth guard
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Sign in required</h2>
        <Button onClick={() => navigate("/login")}>Sign In</Button>
      </div>
    );
  }
  if (user.role !== "vendor") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Vendor Access Only</h2>
        <Button variant="outline" onClick={() => navigate("/")}>Back to Store</Button>
      </div>
    );
  }

  // Pending approval screen
  if (!user.isApproved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Clock className="h-16 w-16 text-yellow-400" />
        <h2 className="text-xl font-semibold text-gray-700">Pending Admin Approval</h2>
        <p className="text-gray-500 max-w-sm">
          Your vendor account is awaiting approval from an admin. You'll receive access to your dashboard once approved.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>Browse Store</Button>
      </div>
    );
  }

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: myProducts = [], isLoading: productsLoading } = useQuery<any[]>({ queryKey: ["/api/vendor/products"] });
  const { data: myFaqs = [] } = useQuery<any[]>({ queryKey: ["/api/faqs/mine"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/users/customers"] });

  // ── Derived ──────────────────────────────────────────────────────────────────
  const approvedProducts = (myProducts as any[]).filter(p => p.approvalStatus === "approved");
  const pendingProducts = (myProducts as any[]).filter(p => p.approvalStatus === "pending");
  const rejectedProducts = (myProducts as any[]).filter(p => p.approvalStatus === "rejected");
  const filteredProducts = (myProducts as any[]).filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Mutations ────────────────────────────────────────────────────────────────
  const addProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/products"] });
      toast({ title: "Product Submitted", description: "Your product is pending admin approval." });
      setIsAddProductOpen(false);
      setNewProduct({ ...EMPTY_PRODUCT });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/products/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/products"] });
      toast({ title: "Product Updated", description: "Submitted for admin review." });
      setIsEditProductOpen(false);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/products"] });
      toast({ title: "Product Removed" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const addFaqMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/faqs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs/mine"] });
      toast({ title: "FAQ Submitted", description: "Pending admin approval." });
      setIsAddFaqOpen(false);
      setNewFaq({ question: "", answer: "" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateFaqMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/faqs/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs/mine"] });
      toast({ title: "FAQ Updated", description: "Submitted for admin review." });
      setIsEditFaqOpen(false);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  function handleInput(setter: (v: any) => void, current: any) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setter({ ...current, [e.target.name]: e.target.value });
  }

  const ProductForm = ({ data, setData }: { data: any; setData: (v: any) => void }) => (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><Label>Name</Label>
          <Input name="name" value={data.name} onChange={handleInput(setData, data)} /></div>
        <div className="space-y-1"><Label>Category</Label>
          <Input name="category" value={data.category} onChange={handleInput(setData, data)} /></div>
      </div>
      <div className="space-y-1"><Label>Description</Label>
        <Input name="description" value={data.description} onChange={handleInput(setData, data)} /></div>
      <div className="space-y-1"><Label>Image URL</Label>
        <Input name="imageUrl" value={data.imageUrl} onChange={handleInput(setData, data)} /></div>
      <Separator />
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1"><Label>Price ($)</Label>
          <Input name="price" value={data.price} onChange={handleInput(setData, data)} /></div>
        <div className="space-y-1"><Label>Original Price ($)</Label>
          <Input name="originalPrice" value={data.originalPrice ?? ""} onChange={handleInput(setData, data)} /></div>
        <div className="space-y-1"><Label>Stock Qty</Label>
          <Input type="number" min={0} value={data.stockQuantity ?? 0}
            onChange={e => setData({ ...data, stockQuantity: parseInt(e.target.value) || 0 })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><Label>In Stock</Label>
          <Select value={String(data.inStock ?? true)} onValueChange={v => setData({ ...data, inStock: v === "true" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Subcategory</Label>
          <Input name="subcategory" value={data.subcategory ?? ""} onChange={handleInput(setData, data)} /></div>
      </div>
      <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-1.5">
        ⏳ Your submission will be reviewed by an admin before going live on the store.
      </p>
    </div>
  );

  return (
    <div className="container py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vendor Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome, <span className="font-medium">{user.name}</span>
            <span className="ml-2 inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white bg-emerald-600">vendor</span>
          </p>
        </div>
        <Link href="/"><Button variant="outline" size="sm"><ShoppingBag className="h-4 w-4 mr-2" />Store</Button></Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">My Products</p>
          <p className="text-2xl font-bold">{(myProducts as any[]).length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />Live</p>
          <p className="text-2xl font-bold text-green-600">{approvedProducts.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" />Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingProducts.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />Rejected</p>
          <p className="text-2xl font-bold text-red-600">{rejectedProducts.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="products" className="gap-1.5"><Package className="h-4 w-4" />My Products</TabsTrigger>
              <TabsTrigger value="new" className="gap-1.5"><Plus className="h-4 w-4" />Add Product</TabsTrigger>
              <TabsTrigger value="faqs" className="gap-1.5"><HelpCircle className="h-4 w-4" />My FAQs</TabsTrigger>
              <TabsTrigger value="customers" className="gap-1.5"><Users className="h-4 w-4" />Customers</TabsTrigger>
            </TabsList>

            {/* ── My Products ── */}
            <TabsContent value="products">
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search my products…" className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Button size="sm" className="ml-2" onClick={() => setActiveTab("new")}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No products yet — <button className="text-primary underline" onClick={() => setActiveTab("new")}>add your first product</button>
                      </TableCell></TableRow>
                    ) : filteredProducts.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusColor(p.approvalStatus) as any} className="text-xs capitalize">{p.approvalStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">${p.price}</TableCell>
                        <TableCell className="text-center text-sm">{p.stockQuantity ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingProduct({ ...p }); setIsEditProductOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {p.approvalStatus !== "approved" && (
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (window.confirm(`Remove "${p.name}"?`)) deleteProductMutation.mutate(p.id);
                            }}>
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ── Add Product ── */}
            <TabsContent value="new">
              <div className="max-w-2xl">
                <h3 className="font-semibold mb-4">Submit New Product</h3>
                <ProductForm data={newProduct} setData={setNewProduct} />
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => addProductMutation.mutate(newProduct)} disabled={addProductMutation.isPending}>
                    {addProductMutation.isPending ? "Submitting…" : <><Plus className="h-4 w-4 mr-2" />Submit for Review</>}
                  </Button>
                  <Button variant="outline" onClick={() => setNewProduct({ ...EMPTY_PRODUCT })}>Reset</Button>
                </div>
              </div>
            </TabsContent>

            {/* ── My FAQs ── */}
            <TabsContent value="faqs">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">{(myFaqs as any[]).length} submissions</p>
                <Button size="sm" onClick={() => setIsAddFaqOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Submit FAQ
                </Button>
              </div>
              {(myFaqs as any[]).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <HelpCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No FAQ submissions yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsAddFaqOpen(true)}>Submit a FAQ</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(myFaqs as any[]).map((f: any) => (
                    <Card key={f.id} className="border">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">{f.question}</p>
                              <Badge variant={statusColor(f.status) as any} className="text-xs capitalize">{f.status}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{f.answer}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingFaq({ ...f }); setIsEditFaqOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                        {f.status === "rejected" && (
                          <p className="text-xs text-red-600 mt-2 bg-red-50 rounded px-2 py-1">
                            Rejected — edit and resubmit to request approval again.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Customers ── */}
            <TabsContent value="customers">
              <p className="text-sm text-muted-foreground mb-4">{(customers as any[]).length} registered customers (read-only view)</p>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customers as any[]).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No customers yet</TableCell></TableRow>
                    ) : (customers as any[]).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={c.status === "active" ? "default" : "destructive"} className="text-xs">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Edit Product Dialog ── */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Editing resets status to pending — admin will review your changes.</DialogDescription>
          </DialogHeader>
          {editingProduct && <ProductForm data={editingProduct} setData={setEditingProduct} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
            <Button onClick={() => updateProductMutation.mutate(editingProduct)} disabled={updateProductMutation.isPending}>
              {updateProductMutation.isPending ? "Saving…" : <><Save className="h-4 w-4 mr-2" />Save & Resubmit</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add FAQ Dialog ── */}
      <Dialog open={isAddFaqOpen} onOpenChange={setIsAddFaqOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Submit FAQ</DialogTitle>
            <DialogDescription>Your FAQ will be reviewed by an admin before publishing.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1"><Label>Question</Label>
              <Input value={newFaq.question} onChange={e => setNewFaq(f => ({ ...f, question: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Answer</Label>
              <Textarea className="min-h-[100px]" value={newFaq.answer} onChange={e => setNewFaq(f => ({ ...f, answer: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFaqOpen(false)}>Cancel</Button>
            <Button onClick={() => addFaqMutation.mutate(newFaq)} disabled={addFaqMutation.isPending}>
              {addFaqMutation.isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit FAQ Dialog ── */}
      <Dialog open={isEditFaqOpen} onOpenChange={setIsEditFaqOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Edit FAQ</DialogTitle></DialogHeader>
          {editingFaq && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1"><Label>Question</Label>
                <Input value={editingFaq.question} onChange={e => setEditingFaq((f: any) => ({ ...f, question: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Answer</Label>
                <Textarea className="min-h-[100px]" value={editingFaq.answer} onChange={e => setEditingFaq((f: any) => ({ ...f, answer: e.target.value }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFaqOpen(false)}>Cancel</Button>
            <Button onClick={() => updateFaqMutation.mutate(editingFaq)} disabled={updateFaqMutation.isPending}>
              {updateFaqMutation.isPending ? "Saving…" : "Save & Resubmit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
