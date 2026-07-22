import { Switch, Route, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { CartProvider } from "@/hooks/use-cart";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

// ── Lazy-loaded Page Components for Code Splitting ──────────────────────────
const Home = lazy(() => import("@/pages/home"));
const Shop = lazy(() => import("@/pages/shop"));
const Product = lazy(() => import("@/pages/product"));
const Checkout = lazy(() => import("@/pages/checkout"));
const OrderConfirmation = lazy(() => import("@/pages/order-confirmation"));
const About = lazy(() => import("@/pages/about"));
const Contact = lazy(() => import("@/pages/contact"));
const FaqPage = lazy(() => import("@/pages/faq"));
const Privacy = lazy(() => import("@/pages/privacy"));
const LoginPage = lazy(() => import("@/pages/login"));
const AdminPage = lazy(() => import("@/pages/admin"));
const VendorPage = lazy(() => import("@/pages/vendor"));
const NotFound = lazy(() => import("@/pages/not-found"));

// ── Fallback Loading Component ──────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function VisitTracker() {
  const [location] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      apiRequest("POST", "/api/visits", { path: location }).catch(() => {});
    }
  }, [location, user?.id]);

  return null;
}

function Router() {
  return (
    <>
      <VisitTracker />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/shop" component={Shop} />
          <Route path="/shop/:category" component={Shop} />
          <Route path="/product/:id" component={Product} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/order-confirmation" component={OrderConfirmation} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/faq" component={FaqPage} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/login" component={LoginPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/vendor" component={VendorPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              <Router />
            </main>
            <Footer />
          </div>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
