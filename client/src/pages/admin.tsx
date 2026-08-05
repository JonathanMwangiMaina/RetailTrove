import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Clock,
  ShoppingBag,
  Users,
  User,
  Activity,
  HelpCircle,
  FileText,
  Share2,
  Megaphone,
  Shield,
  DollarSign,
  Users2,
} from "lucide-react";

import InventoryTab from "./admin/inventory-tab";
import PendingTab from "./admin/pending-tab";
import OrdersTab from "./admin/orders-tab";
import MembersTab from "./admin/members-tab";
import UsersTab from "./admin/users-tab";
import ActivityTab from "./admin/activity-tab";
import FaqTab from "./admin/faq-tab";
import ContentTab from "./admin/content-tab";
import SocialTab from "./admin/social-tab";
import BannerTab from "./admin/banner-tab";
import NewsletterTab from "./admin/newsletter-tab";
import CurrencyTab from "./admin/currency-tab";
import AuditTab from "./admin/audit-tab";
import AnalyticsTab from "./admin/analytics-tab";
import TeamTab from "./admin/team-tab";

import type {
  AdminProduct,
  AdminUser,
  AdminOrder,
  AdminFaq,
  AdminVisit,
  AdminSubscriber,
  AdminAuditLog,
  AdminTeamMember,
  SiteSetting,
} from "./admin/types";

export default function AdminPage() {
  useEffect(() => {
    document.title = "Admin Dashboard - RetailTrove";
  }, []);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: productsResponse, isLoading: productsLoading } = useQuery<
    AdminProduct[] | { data: AdminProduct[] }
  >({ queryKey: ["/api/admin/products"] });
  const products = Array.isArray(productsResponse)
    ? productsResponse
    : ((productsResponse as { data: AdminProduct[] })?.data ?? []);
  const { data: pendingProducts = [] } = useQuery<AdminProduct[]>({
    queryKey: ["/api/admin/products/pending"],
  });
  const { data: orders = [] } = useQuery<AdminOrder[]>({ queryKey: ["/api/admin/orders"] });
  const { data: allUsers = [] } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"] });
  const { data: visits = [] } = useQuery<{ data: AdminVisit[] }>({
    queryKey: ["/api/admin/visits"],
  });
  const { data: allFaqs = [] } = useQuery<AdminFaq[]>({ queryKey: ["/api/faqs/all"] });
  const { data: siteSettings = [] } = useQuery<SiteSetting[]>({ queryKey: ["/api/site-settings"] });
  const { data: newsletterSubscribers = [] } = useQuery<AdminSubscriber[]>({
    queryKey: ["/api/admin/newsletter/subscribers"],
  });
  const { data: auditLogs = [] } = useQuery<AdminAuditLog[]>({
    queryKey: ["/api/admin/audit-logs"],
  });
  const { data: teamMembers = [] } = useQuery<AdminTeamMember[]>({
    queryKey: ["/api/admin/team-members"],
  });

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
          <Button variant="outline" onClick={() => navigate("/vendor")}>
            Vendor Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Store
          </Button>
        </div>
      </div>
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const vendors = allUsers.filter((u) => u.role === "vendor");
  const customers = allUsers.filter((u) => u.role === "customer");
  const admins = allUsers.filter((u) => u.role === "admin");
  const pendingFaqs = allFaqs.filter((f) => f.status === "pending");
  const visitsList = Array.isArray(visits)
    ? visits
    : ((visits as { data: AdminVisit[] })?.data ?? []);
  const getVendorName = (id: number) => allUsers.find((u) => u.id === id)?.name ?? `Vendor #${id}`;

  return (
    <div className="container py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as <span className="font-medium">{user.name}</span>{" "}
            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white bg-red-600">
              admin
            </span>
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Store
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Products</p>
            <p className="text-2xl font-bold">{products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              Pending Approvals
            </p>
            <p className="text-2xl font-bold text-yellow-600">
              {pendingProducts.length + pendingFaqs.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Members (Vendors)</p>
            <p className="text-2xl font-bold">
              {vendors.length}
              <span className="text-sm text-muted-foreground">/20</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Customers</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-0">
          <Tabs defaultValue="inventory" className="mt-4">
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4 justify-start">
              <TabsTrigger value="inventory" className="text-xs gap-1">
                <Database className="h-3.5 w-3.5" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs gap-1">
                <Clock className="h-3.5 w-3.5" />
                Pending
                {pendingProducts.length > 0 && (
                  <span className="ml-1 bg-yellow-500 text-white text-[10px] rounded-full px-1.5">
                    {pendingProducts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs gap-1">
                <ShoppingBag className="h-3.5 w-3.5" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="members" className="text-xs gap-1">
                <Users className="h-3.5 w-3.5" />
                Members
              </TabsTrigger>
              <TabsTrigger value="team" className="text-xs gap-1">
                <Users2 className="h-3.5 w-3.5" />
                Team
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs gap-1">
                <User className="h-3.5 w-3.5" />
                Users
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs gap-1">
                <Activity className="h-3.5 w-3.5" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="faqs" className="text-xs gap-1">
                <HelpCircle className="h-3.5 w-3.5" />
                FAQs
                {pendingFaqs.length > 0 && (
                  <span className="ml-1 bg-yellow-500 text-white text-[10px] rounded-full px-1.5">
                    {pendingFaqs.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="content" className="text-xs gap-1">
                <FileText className="h-3.5 w-3.5" />
                Content
              </TabsTrigger>
              <TabsTrigger value="social" className="text-xs gap-1">
                <Share2 className="h-3.5 w-3.5" />
                Social
              </TabsTrigger>
              <TabsTrigger value="banner" className="text-xs gap-1">
                <Megaphone className="h-3.5 w-3.5" />
                Banner
              </TabsTrigger>
              <TabsTrigger value="newsletter" className="text-xs gap-1">
                <Megaphone className="h-3.5 w-3.5" />
                Newsletter
                {newsletterSubscribers.length > 0 && (
                  <span className="ml-1 bg-blue-500 text-white text-[10px] rounded-full px-1.5">
                    {newsletterSubscribers.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="currency" className="text-xs gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Currency
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs gap-1">
                <Clock className="h-3.5 w-3.5" />
                Audit
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs gap-1">
                <Activity className="h-3.5 w-3.5" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
              <InventoryTab products={products} productsLoading={productsLoading} />
            </TabsContent>

            <TabsContent value="pending">
              <PendingTab
                pendingProducts={pendingProducts}
                allUsers={allUsers}
                getVendorName={getVendorName}
              />
            </TabsContent>

            <TabsContent value="orders">
              <OrdersTab orders={orders} />
            </TabsContent>

            <TabsContent value="members">
              <MembersTab admins={admins} vendors={vendors} currentUserId={user.id} />
            </TabsContent>

            <TabsContent value="team">
              <TeamTab members={teamMembers} />
            </TabsContent>

            <TabsContent value="users">
              <UsersTab customers={customers} />
            </TabsContent>

            <TabsContent value="activity">
              <ActivityTab visits={visitsList} />
            </TabsContent>

            <TabsContent value="faqs">
              <FaqTab allFaqs={allFaqs} getVendorName={getVendorName} />
            </TabsContent>

            <TabsContent value="content">
              <ContentTab />
            </TabsContent>

            <TabsContent value="social">
              <SocialTab />
            </TabsContent>

            <TabsContent value="banner">
              <BannerTab />
            </TabsContent>

            <TabsContent value="newsletter">
              <NewsletterTab subscribers={newsletterSubscribers} />
            </TabsContent>

            <TabsContent value="currency">
              <CurrencyTab siteSettings={siteSettings} />
            </TabsContent>

            <TabsContent value="audit">
              <AuditTab auditLogs={auditLogs} />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
