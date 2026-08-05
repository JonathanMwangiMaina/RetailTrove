import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  pageCount: number;
  itemCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  page,
  pageCount,
  itemCount,
  pageSize,
  onPageChange,
}: PaginationControlsProps) {
  if (itemCount === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, itemCount);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {itemCount} item{itemCount !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page + 1} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
