import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BannerData } from "./types";

export default function BannerTab() {
  const { data: banner } = useQuery<BannerData>({ queryKey: ["/api/banner"] });

  const updateBannerMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("PUT", "/api/banner", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/banner"] }),
  });

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        Edit the announcement banner shown at the top of every page.
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
          <Label>Visibility</Label>
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
  );
}
