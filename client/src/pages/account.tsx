import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import LoyaltyDashboard from "@/components/loyalty/loyalty-dashboard";
import OrderHistory from "@/components/orders/order-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AccountPage() {
  useEffect(() => {
    document.title = "My Account - RetailTrove";
  }, []);
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Account</h1>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <OrderHistory />
        </TabsContent>
        <TabsContent value="loyalty">
          <LoyaltyDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
