import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Database, Clock, ShoppingBag, Users, User, Activity, HelpCircle,
  FileText, Share2, Megaphone, Edit, Trash, Plus, Search, Save,
  Shield, CheckCircle, XCircle, Ban, RefreshCw, Eye, TrendingDown, PackageCheck,
} from "lucide-react";

const EMPTY_PRODUCT = {
  name: "", description: "", price: "", originalPrice: "",
  imageUrl: "", category: "", subcategory: "", badge: "",
  featured: false, newArrival: false, inStock: true, stockQuantity: 0,
};

const CONTENT_LABELS: Record<string, string> = {
  about: "About Page",
  contact: "Contact Page",
  footer_about: "Footer — About Text",
  tos: "Terms of Service",
  privacy: "Privacy Policy",
};

const SOCIAL_FIELDS = [
  { key: "facebook_url", label: "Facebook URL", placeholder: "https://facebook.com/yourpage" },
  { key: "twitter_url", label: "Twitter / X URL", placeholder: "https://twitter.com/yourhandle" },
  { key: "instagram_url", label: "Instagram URL", placeholder: "https://instagram.com/yourhandle" },
  { key: "linkedin_url", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/yourcompany" },
  { key: "youtube_url", label: "YouTube URL", placeholder: "https://youtube.com/@yourchannel" },
];

function discountPct(price: string, originalPrice?: string | null) {
  const p = parseFloat(price);
  const op = parseFloat(originalPrice ?? "0");
  if (!op || op <= p) return null;
  return Math.round(((op - p) / op) * 100);
}

function timeAgo(date: string | Date) {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function roleColor(role: string) {
  if (role === "admin") return "bg-red-600";
  if (role === "vendor") return "bg-emerald-600";
  return "bg-blue-600";
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<any>({ ...EMPTY_PRODUCT });
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "", password: "", role: "vendor" });
  const [isAddFaqOpen, setIsAddFaqOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [isEditFaqOpen, setIsEditFaqOpen] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", displayOrder: 0 });
  const [contentType, setContentType] = useState("about");
  const [contentDraft, setContentDraft] = useState("");
  const [socialDrafts, setSocialDrafts] = useState<Record<string, string>>({});

  // Guard: admin only
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Sign in required</h2>
        <Button onClick={() => navigate("/login")}>Sign In</Button>
      </div>
    );
  }
  if (user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Admin Access Only</h2>
        <p className="text-gray-500">Vendors please use the Vendor Dashboard.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/vendor")}>Vendor Dashboard</Button>
          <Button variant="outline" onClick={() => navigate("/")}>Back to Store</Button>
        </div>
      </div>
    );
  }

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: products = [], isLoading: productsLoading } = useQuery<any[]>({ queryKey: ["/api/products"] });
  const { data: pendingProducts = [] } = useQuery<any[]>({ queryKey: ["/api/admin/products/pending"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/orders"] });
  const { data: allUsers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: visits = [] } = useQuery<any[]>({ queryKey: ["/api/admin/visits"] });
  const { data: allFaqs = [] } = useQuery<any[]>({ queryKey: ["/api/faqs/all"] });
  const { data: siteSettings = [] } = useQuery<any[]>({ queryKey: ["/api/site-settings"] });
  const { data: banner } = useQuery<any>({ queryKey: ["/api/banner"] });
  const { data: siteContentData } = useQuery<any>({
    queryKey: [`/api/site-content/${contentType}`],
    retry: false,
  });

  // Sync site content into draft
  useEffect(() => {
    if (siteContentData?.content !== undefined) {
      setContentDraft(siteContentData.content);
    }
  }, [siteContentData?.content, contentType]);

  // Sync social settings into drafts
  useEffect(() => {
    if ((siteSettings as any[]).length > 0) {
      const drafts: Record<string, string> = {};
      (siteSettings as any[]).forEach((s: any) => { drafts[s.key] = s.value; });
      setSocialDrafts(drafts);
    }
  }, [(siteSettings as any[]).length]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const vendors = (allUsers as any[]).filter(u => u.role === "vendor");
  const customers = (allUsers as any[]).filter(u => u.role === "customer");
  const admins = (allUsers as any[]).filter(u => u.role === "admin");
  const pendingFaqs = (allFaqs as any[]).filter(f => f.status === "pending");
  const totalRevenue = (orders as any[]).reduce((s: number, o: any) => s + parseFloat(o.total ?? "0"), 0);
  const filtered = (products as any[]).filter((p: any) => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });
  const getVendorName = (id: number) => (allUsers as any[]).find(u => u.id === id)?.name ?? `Vendor #${id}`;

  // ── Mutations ────────────────────────────────────────────────────────────────
  const addProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Added" });
      setIsAddProductOpen(false);
      setNewProduct({ ...EMPTY_PRODUCT });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/products/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Updated" });
      setIsEditProductOpen(false);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product Deleted" });
    },
  });

  const approveProductMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PUT", `/api/admin/products/${id}/approve`, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: vars.status === "approved" ? "Product Approved ✓" : "Product Rejected" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Created" });
      setIsAddMemberOpen(false);
      setNewMember({ name: "", email: "", password: "", role: "vendor" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Updated" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/users/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User Deleted" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const addFaqMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/faqs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({ title: "FAQ Added" });
      setIsAddFaqOpen(false);
      setNewFaq({ question: "", answer: "", displayOrder: 0 });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateFaqMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/faqs/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({ title: "FAQ Updated" });
      setIsEditFaqOpen(false);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/faqs/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({ title: "FAQ Deleted" });
    },
  });

  const updateContentMutation = useMutation({
    mutationFn: ({ type, content }: { type: string; content: string }) =>
      apiRequest("PUT", `/api/site-content/${type}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/site-content/${contentType}`] });
      toast({ title: "Content Saved" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiRequest("PUT", `/api/site-settings/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Setting Saved" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateBannerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/banner", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/banner"] }),
  });

  function handleProductInput(setter: (v: any) => void, current: any) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setter({ ...current, [e.target.name]: e.target.value });
  }

  function handleProductSelect(setter: (v: any) => void, current: any, key: string, val: string) {
    setter({ ...current, [key]: val === "true" ? true : val === "false" ? false : val });
  }

  const ProductFormFields = ({ data, setData }: { data: any; setData: (v: any) => void }) => (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><Label>Name</Label>
          <Input name="name" value={data.name} onChange={handleProductInput(setData, data)} /></div>
        <div className="space-y-1"><Label>Category</Label>
          <Input name="category" value={data.category} onChange={handleProductInput(setData, data)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><Label>Subcategory</Label>
          <Input name="subcategory" value={data.subcategory ?? ""} onChange={handleProductInput(setData, data)} /></div>
        <div className="space-y-1"><Label>Badge</Label>
          <Input name="badge" value={data.badge ?? ""} onChange={handleProductInput(setData, data)} /></div>
      </div>
      <div className="space-y-1"><Label>Description</Label>
        <Input name="description" value={data.description} onChange={handleProductInput(setData, data)} /></div>
      <div className="space-y-1"><Label>Image URL</Label>
        <Input name="imageUrl" value={data.imageUrl} onChange={handleProductInput(setData, data)} /></div>
      <Separator />
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1"><Label>Price ($)</Label>
          <Input name="price" value={data.price} onChange={handleProductInput(setData, data)} /></div>
        <div className="space-y-1"><Label>Original Price ($)</Label>
          <Input name="originalPrice" value={data.originalPrice ?? ""} onChange={handleProductInput(setData, data)} /></div>
        <div className="space-y-1"><Label>Stock Qty</Label>
          <Input type="number" name="stockQuantity" min={0} value={data.stockQuantity ?? 0}
            onChange={(e) => setData({ ...data, stockQuantity: parseInt(e.target.value) || 0 })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {(["inStock", "featured", "newArrival"] as const).map(key => (
          <div key={key} className="space-y-1">
            <Label>{key === "inStock" ? "In Stock" : key === "featured" ? "Featured" : "New Arrival"}</Label>
            <Select value={String(data[key] ?? false)} onValueChange={v => handleProductSelect(setData, data, key, v)}>
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
  );

  return (
    <div className="container py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as <span className="font-medium">{user.name}</span>{" "}
            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white bg-red-600">admin</span>
          </p>
        </div>
        <Link href="/"><Button variant="outline" size="sm"><ShoppingBag className="h-4 w-4 mr-2" />Store</Button></Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Products</p>
          <p className="text-2xl font-bold">{(products as any[]).length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-500" />Pending Approvals</p>
          <p className="text-2xl font-bold text-yellow-600">{(pendingProducts as any[]).length + pendingFaqs.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Members (Vendors)</p>
          <p className="text-2xl font-bold">{vendors.length}<span className="text-sm text-muted-foreground">/20</span></p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Customers</p>
          <p className="text-2xl font-bold">{customers.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4 justify-start">
              <TabsTrigger value="inventory" className="text-xs gap-1"><Database className="h-3.5 w-3.5" />Inventory</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs gap-1">
                <Clock className="h-3.5 w-3.5" />Pending
                {(pendingProducts as any[]).length > 0 && <span className="ml-1 bg-yellow-500 text-white text-[10px] rounded-full px-1.5">{(pendingProducts as any[]).length}</span>}
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs gap-1"><ShoppingBag className="h-3.5 w-3.5" />Orders</TabsTrigger>
              <TabsTrigger value="members" className="text-xs gap-1"><Users className="h-3.5 w-3.5" />Members</TabsTrigger>
              <TabsTrigger value="users" className="text-xs gap-1"><User className="h-3.5 w-3.5" />Users</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs gap-1"><Activity className="h-3.5 w-3.5" />Activity</TabsTrigger>
              <TabsTrigger value="faqs" className="text-xs gap-1">
                <HelpCircle className="h-3.5 w-3.5" />FAQs
                {pendingFaqs.length > 0 && <span className="ml-1 bg-yellow-500 text-white text-[10px] rounded-full px-1.5">{pendingFaqs.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="content" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" />Content</TabsTrigger>
              <TabsTrigger value="social" className="text-xs gap-1"><Share2 className="h-3.5 w-3.5" />Social</TabsTrigger>
              <TabsTrigger value="banner" className="text-xs gap-1"><Megaphone className="h-3.5 w-3.5" />Banner</TabsTrigger>
            </TabsList>

            {/* ── Inventory ── */}
            <TabsContent value="inventory">
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search products…" className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Button size="sm" className="ml-2" onClick={() => setIsAddProductOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Add
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
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
                    ) : filtered.map((p: any) => {
                      const pct = discountPct(p.price, p.originalPrice);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs text-muted-foreground">{p.id}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                          <TableCell className="text-center">
                            <Badge variant={p.approvalStatus === "approved" ? "default" : p.approvalStatus === "pending" ? "secondary" : "destructive"} className="text-xs">
                              {p.approvalStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold">${p.price}</span>
                            {pct && <span className="text-xs text-muted-foreground ml-1">(-{pct}%)</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-medium ${(p.stockQuantity ?? 0) === 0 ? "text-red-600" : (p.stockQuantity ?? 0) < 5 ? "text-orange-600" : "text-green-700"}`}>
                              {p.stockQuantity ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingProduct({ ...p }); setIsEditProductOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (window.confirm(`Delete "${p.name}"?`)) deleteProductMutation.mutate(p.id);
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

            {/* ── Pending Products ── */}
            <TabsContent value="pending">
              {(pendingProducts as any[]).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-400" />
                  No pending products — all clear!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(pendingProducts as any[]).map((p: any) => (
                    <Card key={p.id} className="overflow-hidden">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-40 object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                      <CardContent className="pt-3 pb-3 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-semibold text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.category}</p>
                          </div>
                          <span className="font-bold text-sm">${p.price}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                        <p className="text-xs text-blue-600">Vendor: {getVendorName(p.vendorId)}</p>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                            onClick={() => approveProductMutation.mutate({ id: p.id, status: "approved" })}
                            disabled={approveProductMutation.isPending}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1 text-xs"
                            onClick={() => approveProductMutation.mutate({ id: p.id, status: "rejected" })}
                            disabled={approveProductMutation.isPending}>
                            <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Orders ── */}
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
                    {(orders as any[]).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No orders yet</TableCell></TableRow>
                    ) : (orders as any[]).map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs text-muted-foreground">#{o.id}</TableCell>
                        <TableCell className="font-medium">{o.firstName} {o.lastName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.email}</TableCell>
                        <TableCell className="text-sm">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">${parseFloat(o.total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {(orders as any[]).length > 0 && (
                <div className="mt-3 text-right text-sm text-muted-foreground">
                  Total revenue: <span className="font-bold text-gray-900">${totalRevenue.toFixed(2)}</span>
                </div>
              )}
            </TabsContent>

            {/* ── Members (Vendors) ── */}
            <TabsContent value="members">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-red-600">{admins.length}/3</span> admins &nbsp;·&nbsp;
                  <span className="font-medium text-emerald-600">{vendors.length}/20</span> vendors
                </div>
                <Button size="sm" onClick={() => setIsAddMemberOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Add Member
                </Button>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Role</TableHead>
                      <TableHead className="text-center">Approved</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...admins, ...vendors].length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No members yet</TableCell></TableRow>
                    ) : [...admins, ...vendors].map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-xs text-white ${roleColor(u.role)}`}>{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {u.isApproved
                            ? <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            : <XCircle className="h-4 w-4 text-red-400 mx-auto" />}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={u.status === "active" ? "default" : "destructive"} className="text-xs">{u.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {!u.isApproved && (
                            <Button variant="ghost" size="sm" className="text-xs text-green-600"
                              onClick={() => updateUserMutation.mutate({ id: u.id, data: { isApproved: true } })}>
                              Approve
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="text-xs"
                            onClick={() => updateUserMutation.mutate({ id: u.id, data: { status: u.status === "active" ? "suspended" : "active" } })}>
                            {u.status === "active" ? <Ban className="h-3.5 w-3.5 text-orange-500" /> : <RefreshCw className="h-3.5 w-3.5 text-green-500" />}
                          </Button>
                          {u.id !== user.id && (
                            <Button variant="ghost" size="icon"
                              onClick={() => { if (window.confirm(`Delete ${u.name}?`)) deleteUserMutation.mutate(u.id); }}>
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

            {/* ── Users (Customers) ── */}
            <TabsContent value="users">
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No customers yet</TableCell></TableRow>
                    ) : customers.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={u.status === "active" ? "default" : "destructive"} className="text-xs">{u.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-xs"
                            onClick={() => updateUserMutation.mutate({ id: u.id, data: { status: u.status === "active" ? "suspended" : "active" } })}>
                            {u.status === "active" ? <Ban className="h-3.5 w-3.5 text-orange-500" /> : <RefreshCw className="h-3.5 w-3.5 text-green-500" />}
                          </Button>
                          <Button variant="ghost" size="icon"
                            onClick={() => { if (window.confirm(`Delete ${u.name}?`)) deleteUserMutation.mutate(u.id); }}>
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ── Activity Log ── */}
            <TabsContent value="activity">
              <div className="mb-3 text-sm text-muted-foreground">
                Showing last 500 page visits across all signed-in users.
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-center">Role</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(visits as any[]).length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No activity recorded yet</TableCell></TableRow>
                    ) : (visits as any[]).slice(0, 200).map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{v.userName}</div>
                          <div className="text-xs text-muted-foreground">{v.userEmail}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-xs text-white ${roleColor(v.userRole)}`}>{v.userRole}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{v.path}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{timeAgo(v.visitedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ── FAQs ── */}
            <TabsContent value="faqs">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">{(allFaqs as any[]).length} FAQs total · {pendingFaqs.length} pending</p>
                <Button size="sm" onClick={() => setIsAddFaqOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Add FAQ
                </Button>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allFaqs as any[]).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No FAQs yet</TableCell></TableRow>
                    ) : (allFaqs as any[]).map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs text-muted-foreground">{f.displayOrder}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{f.question}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{f.answer}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={f.status === "approved" ? "default" : f.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                            {f.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {f.submittedBy ? getVendorName(f.submittedBy) : "Admin"}
                        </TableCell>
                        <TableCell className="text-right">
                          {f.status === "pending" && (
                            <>
                              <Button variant="ghost" size="sm" className="text-xs text-green-600"
                                onClick={() => updateFaqMutation.mutate({ id: f.id, status: "approved" })}>
                                Approve
                              </Button>
                              <Button variant="ghost" size="sm" className="text-xs text-red-500"
                                onClick={() => updateFaqMutation.mutate({ id: f.id, status: "rejected" })}>
                                Reject
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { setEditingFaq({ ...f }); setIsEditFaqOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (window.confirm("Delete this FAQ?")) deleteFaqMutation.mutate(f.id); }}>
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ── Content ── */}
            <TabsContent value="content">
              <div className="max-w-2xl space-y-4">
                <div>
                  <Label>Page to Edit</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger className="w-64 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTENT_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Content — {CONTENT_LABELS[contentType]}</Label>
                  <Textarea
                    className="mt-1 min-h-[360px] font-mono text-sm"
                    value={contentDraft}
                    onChange={e => setContentDraft(e.target.value)}
                    placeholder="Enter page content…"
                  />
                </div>
                <Button onClick={() => updateContentMutation.mutate({ type: contentType, content: contentDraft })}
                  disabled={updateContentMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateContentMutation.isPending ? "Saving…" : "Save Content"}
                </Button>
              </div>
            </TabsContent>

            {/* ── Social Media ── */}
            <TabsContent value="social">
              <div className="max-w-lg space-y-4">
                <p className="text-sm text-muted-foreground">Enter the full URL for each platform. Leave blank to hide that icon in the footer.</p>
                {SOCIAL_FIELDS.map(field => (
                  <div key={field.key} className="space-y-1">
                    <Label>{field.label}</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={field.placeholder}
                        value={socialDrafts[field.key] ?? ""}
                        onChange={e => setSocialDrafts(d => ({ ...d, [field.key]: e.target.value }))}
                      />
                      <Button size="sm" variant="outline"
                        onClick={() => updateSettingMutation.mutate({ key: field.key, value: socialDrafts[field.key] ?? "" })}
                        disabled={updateSettingMutation.isPending}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── Banner ── */}
            <TabsContent value="banner">
              <div className="max-w-lg space-y-4">
                <p className="text-sm text-muted-foreground">Edit the announcement banner shown at the top of every page.</p>
                {banner && (
                  <div className="p-3 rounded text-white text-sm text-center font-medium" style={{ backgroundColor: banner.bgColor }}>
                    {banner.text}
                  </div>
                )}
                <div className="space-y-3">
                  <div><Label>Banner Text</Label>
                    <Input defaultValue={banner?.text} key={banner?.text}
                      onBlur={e => updateBannerMutation.mutate({ text: e.target.value })} />
                  </div>
                  <div><Label>Background Colour</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input type="color" defaultValue={banner?.bgColor ?? "#1d4ed8"} key={banner?.bgColor}
                        onChange={e => updateBannerMutation.mutate({ bgColor: e.target.value })}
                        className="h-9 w-16 rounded border cursor-pointer" />
                      <span className="text-sm text-muted-foreground">{banner?.bgColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2"><Label>Visibility</Label>
                    <Select value={banner?.isActive ? "true" : "false"}
                      onValueChange={v => updateBannerMutation.mutate({ isActive: v === "true" })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
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

      {/* ── Add Product Dialog ── */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Product</DialogTitle><DialogDescription>Admin-added products go live immediately.</DialogDescription></DialogHeader>
          <ProductFormFields data={newProduct} setData={setNewProduct} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>Cancel</Button>
            <Button onClick={() => addProductMutation.mutate(newProduct)} disabled={addProductMutation.isPending}>
              {addProductMutation.isPending ? "Adding…" : <><Plus className="h-4 w-4 mr-2" />Add</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Product Dialog ── */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Product</DialogTitle><DialogDescription>Admin edits are saved directly.</DialogDescription></DialogHeader>
          {editingProduct && <ProductFormFields data={editingProduct} setData={setEditingProduct} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
            <Button onClick={() => updateProductMutation.mutate(editingProduct)} disabled={updateProductMutation.isPending}>
              {updateProductMutation.isPending ? "Saving…" : <><Save className="h-4 w-4 mr-2" />Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Member Dialog ── */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              {admins.length}/3 admins · {vendors.length}/20 vendors
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1"><Label>Full Name</Label>
              <Input value={newMember.name} onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Email</Label>
              <Input type="email" value={newMember.email} onChange={e => setNewMember(m => ({ ...m, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Password</Label>
              <Input type="password" value={newMember.password} onChange={e => setNewMember(m => ({ ...m, password: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Role</Label>
              <Select value={newMember.role} onValueChange={v => setNewMember(m => ({ ...m, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="admin" disabled={admins.length >= 3}>Admin {admins.length >= 3 ? "(limit reached)" : ""}</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
            <Button onClick={() => addMemberMutation.mutate(newMember)} disabled={addMemberMutation.isPending}>
              {addMemberMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add FAQ Dialog ── */}
      <Dialog open={isAddFaqOpen} onOpenChange={setIsAddFaqOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Add FAQ</DialogTitle><DialogDescription>Admin FAQs are published immediately.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1"><Label>Question</Label>
              <Input value={newFaq.question} onChange={e => setNewFaq(f => ({ ...f, question: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Answer</Label>
              <Textarea className="min-h-[120px]" value={newFaq.answer} onChange={e => setNewFaq(f => ({ ...f, answer: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Display Order</Label>
              <Input type="number" value={newFaq.displayOrder} onChange={e => setNewFaq(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFaqOpen(false)}>Cancel</Button>
            <Button onClick={() => addFaqMutation.mutate(newFaq)} disabled={addFaqMutation.isPending}>
              {addFaqMutation.isPending ? "Adding…" : "Add FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit FAQ Dialog ── */}
      <Dialog open={isEditFaqOpen} onOpenChange={setIsEditFaqOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Edit FAQ</DialogTitle></DialogHeader>
          {editingFaq && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1"><Label>Question</Label>
                <Input value={editingFaq.question} onChange={e => setEditingFaq((f: any) => ({ ...f, question: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Answer</Label>
                <Textarea className="min-h-[120px]" value={editingFaq.answer} onChange={e => setEditingFaq((f: any) => ({ ...f, answer: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Display Order</Label>
                  <Input type="number" value={editingFaq.displayOrder ?? 0} onChange={e => setEditingFaq((f: any) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} /></div>
                <div className="space-y-1"><Label>Status</Label>
                  <Select value={editingFaq.status} onValueChange={v => setEditingFaq((f: any) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFaqOpen(false)}>Cancel</Button>
            <Button onClick={() => updateFaqMutation.mutate(editingFaq)} disabled={updateFaqMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />{updateFaqMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
