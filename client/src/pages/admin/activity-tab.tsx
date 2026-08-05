import { useInTabPagination } from "@/hooks/use-in-tab-pagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { timeAgo, roleColor } from "./constants";
import type { AdminVisit } from "./types";

interface Props {
  visits: AdminVisit[];
}

export default function ActivityTab({ visits }: Props) {
  const { page, pageCount, pageItems, setPage } = useInTabPagination(visits, 50);
  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">
        Showing last 500 page visits across all signed-in users.
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No activity recorded yet
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{v.userName}</div>
                    <div className="text-xs text-muted-foreground">{v.userEmail}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-xs text-white ${roleColor(v.userRole)}`}>
                      {v.userRole}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {v.path}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {timeAgo(v.visitedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PaginationControls
          page={page}
          pageCount={pageCount}
          itemCount={visits.length}
          pageSize={50}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
