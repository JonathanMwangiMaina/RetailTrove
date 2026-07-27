import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { SOCIAL_FIELDS } from "./constants";
import type { SiteSetting } from "./types";

export default function SocialTab() {
  const { toast } = useToast();
  const [socialDrafts, setSocialDrafts] = useState<Record<string, string>>({});

  const { data: siteSettings = [] } = useQuery<SiteSetting[]>({ queryKey: ["/api/site-settings"] });

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (siteSettings.length > 0) {
      const drafts: Record<string, string> = {};
      siteSettings.forEach((s) => {
        drafts[s.key] = s.value;
      });
      setSocialDrafts(drafts);
    }
  }, [siteSettings.length]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

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
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the full URL for each platform. Leave blank to hide that icon in the footer.
      </p>
      {SOCIAL_FIELDS.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label>{field.label}</Label>
          <div className="flex gap-2">
            <Input
              placeholder={field.placeholder}
              value={socialDrafts[field.key] ?? ""}
              onChange={(e) => setSocialDrafts((d) => ({ ...d, [field.key]: e.target.value }))}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateSettingMutation.mutate({
                  key: field.key,
                  value: socialDrafts[field.key] ?? "",
                })
              }
              disabled={updateSettingMutation.isPending}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
