import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star, TrendingUp, Gift, ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";

interface LoyaltyAccount {
  id: number;
  userId: number;
  points: number;
  tier: string;
  createdAt: string;
  updatedAt: string;
}

interface LoyaltyTransaction {
  id: number;
  userId: number;
  type: string;
  points: number;
  description: string;
  orderId: number | null;
  createdAt: string;
}

const TIER_CONFIG: Record<
  string,
  { label: string; color: string; next: number; nextTier: string }
> = {
  bronze: { label: "Bronze", color: "bg-orange-600", next: 500, nextTier: "Silver" },
  silver: { label: "Silver", color: "bg-gray-400", next: 2000, nextTier: "Gold" },
  gold: { label: "Gold", color: "bg-yellow-500", next: 5000, nextTier: "Platinum" },
  platinum: { label: "Platinum", color: "bg-purple-600", next: Infinity, nextTier: "" },
};

function timeAgo(date: string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LoyaltyDashboard() {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const [redeemAmount, setRedeemAmount] = useState("");

  const { data: account, isLoading: accountLoading } = useQuery<LoyaltyAccount>({
    queryKey: ["/api/loyalty/account"],
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery<LoyaltyTransaction[]>({
    queryKey: ["/api/loyalty/transactions"],
  });

  const redeemMutation = useMutation({
    mutationFn: async (points: number) => {
      const res = await apiRequest("POST", "/api/loyalty/redeem", {
        points,
        description: "Points redeemed for store credit",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/account"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/transactions"] });
      setRedeemAmount("");
      toast({ title: "Points redeemed!" });
    },
    onError: (err: Error) => {
      toast({ title: "Redemption failed", description: err.message, variant: "destructive" });
    },
  });

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tier = TIER_CONFIG[account?.tier ?? "bronze"];
  const progress =
    tier.next === Infinity ? 100 : Math.min(100, ((account?.points ?? 0) / tier.next) * 100);

  return (
    <div className="space-y-6">
      {/* Points + Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available Points</p>
                <p className="text-2xl font-bold">{account?.points ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Tier</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{tier.label}</p>
                  <Badge className={`text-white text-[10px] ${tier.color}`}>{tier.label}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Gift className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Store Credit Value</p>
                <p className="text-2xl font-bold">{formatPrice((account?.points ?? 0) * 0.01)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      {tier.next !== Infinity && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Progress to {tier.nextTier}</p>
              <p className="text-sm text-muted-foreground">
                {account?.points ?? 0} / {tier.next} pts
              </p>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redeem Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Redeem Points</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="redeem-points">Points to redeem</Label>
              <Input
                id="redeem-points"
                type="number"
                min={1}
                max={account?.points ?? 0}
                placeholder="e.g. 100"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                const pts = parseInt(redeemAmount, 10);
                if (!pts || pts < 1) {
                  toast({
                    title: "Invalid amount",
                    description: "Enter at least 1 point",
                    variant: "destructive",
                  });
                  return;
                }
                redeemMutation.mutate(pts);
              }}
              disabled={redeemMutation.isPending || !redeemAmount}
            >
              {redeemMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Redeem
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            100 points = {formatPrice(1.0)} store credit
          </p>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet. Earn points by making purchases!
            </p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {tx.type === "earned" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{tx.description}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${tx.points > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {tx.points > 0 ? "+" : ""}
                        {tx.points}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {timeAgo(tx.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
