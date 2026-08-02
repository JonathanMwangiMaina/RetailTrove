import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Product } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const WISHLIST_KEY = "/api/wishlist";

interface WishlistContextType {
  wishlist: Product[];
  isLoading: boolean;
  isWishlisted: (productId: number) => boolean;
  toggle: (product: Product) => Promise<void>;
  remove: (productId: number) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wishlist = [], isLoading } = useQuery<Product[]>({
    queryKey: [WISHLIST_KEY],
    enabled: !!user,
  });

  async function setWishlisted(product: Product, target: boolean) {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Create an account or sign in to save items to your wishlist.",
        variant: "destructive",
      });
      return;
    }
    const current = queryClient.getQueryData<Product[]>([WISHLIST_KEY]) ?? [];
    const already = current.some((p) => p.id === product.id);

    queryClient.setQueryData<Product[]>([WISHLIST_KEY], (old) => {
      const list = old ?? [];
      if (target) return list.some((p) => p.id === product.id) ? list : [...list, product];
      return list.filter((p) => p.id !== product.id);
    });

    try {
      if (target && !already) {
        await apiRequest("POST", `/api/wishlist/${product.id}`, undefined);
        toast({ title: "Added to wishlist", description: product.name });
      } else if (!target && already) {
        await apiRequest("DELETE", `/api/wishlist/${product.id}`, undefined);
        toast({ title: "Removed from wishlist", description: product.name });
      }
    } catch {
      queryClient.invalidateQueries({ queryKey: [WISHLIST_KEY] });
      toast({
        title: "Error",
        description: "Could not update your wishlist. Please try again.",
        variant: "destructive",
      });
    }
  }

  const isWishlisted = (productId: number) => wishlist.some((p) => p.id === productId);

  async function toggle(product: Product) {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Create an account or sign in to save items to your wishlist.",
        variant: "destructive",
      });
      return;
    }
    await setWishlisted(product, !isWishlisted(product.id));
  }

  async function remove(productId: number) {
    const product = wishlist.find((p) => p.id === productId);
    if (product) await setWishlisted(product, false);
  }

  return (
    <WishlistContext.Provider value={{ wishlist, isLoading, isWishlisted, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
