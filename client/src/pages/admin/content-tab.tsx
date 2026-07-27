import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { CONTENT_LABELS } from "./constants";
import type { SiteContentData } from "./types";

export default function ContentTab() {
  const { toast } = useToast();
  const [contentType, setContentType] = useState("about");
  const [contentDraft, setContentDraft] = useState("");

  const { data: siteContentData } = useQuery<SiteContentData>({
    queryKey: [`/api/site-content/${contentType}`],
    retry: false,
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (siteContentData?.content !== undefined) {
      setContentDraft(siteContentData.content);
    }
  }, [siteContentData?.content, contentType]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateContentMutation = useMutation({
    mutationFn: ({ type, content }: { type: string; content: string }) =>
      apiRequest("PUT", `/api/site-content/${type}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/site-content/${contentType}`] });
      toast({ title: "Content Saved" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Label>Page to Edit</Label>
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger className="w-64 mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONTENT_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Content — {CONTENT_LABELS[contentType]}</Label>
        <Textarea
          className="mt-1 min-h-[360px] font-mono text-sm"
          value={contentDraft}
          onChange={(e) => setContentDraft(e.target.value)}
          placeholder="Enter page content…"
        />
      </div>
      <Button
        onClick={() => updateContentMutation.mutate({ type: contentType, content: contentDraft })}
        disabled={updateContentMutation.isPending}
      >
        <Save className="h-4 w-4 mr-2" />
        {updateContentMutation.isPending ? "Saving…" : "Save Content"}
      </Button>
    </div>
  );
}
