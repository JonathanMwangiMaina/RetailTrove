import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currencies";
import type { SiteSetting } from "./types";

interface Props {
  siteSettings: SiteSetting[];
}

export default function CurrencyTab({ siteSettings }: Props) {
  const { toast } = useToast();

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiRequest("PUT", `/api/site-settings/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Setting Saved" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Store Currency</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Select the currency used to display prices and charge card payments (Lemon Squeezy) across
          the store. All prices are stored in USD internally and converted on display and at
          checkout. M-Pesa payments are always charged in Kenyan Shillings (KES).
        </p>
        <div className="max-w-md">
          <Label>Display Currency</Label>
          <Select
            value={siteSettings.find((s) => s.key === "site_currency")?.value || "USD"}
            onValueChange={(val) =>
              updateSettingMutation.mutate({ key: "site_currency", value: val })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
          <p className="font-medium mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Product prices are stored in USD in the database</li>
            <li>The selected currency symbol is shown to customers at checkout and in the cart</li>
            <li>Exchange rates are approximate and used for display purposes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
