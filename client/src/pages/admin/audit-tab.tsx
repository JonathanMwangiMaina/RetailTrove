import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminAuditLog } from "./types";

interface Props {
  auditLogs: AdminAuditLog[];
}

export default function AuditTab({ auditLogs }: Props) {
  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">
        {auditLogs.length} recent log{auditLogs.length !== 1 ? "s" : ""}
      </div>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No audit logs yet
                </TableCell>
              </TableRow>
            ) : (
              auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.entityType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">#{log.entityId}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.ipAddress || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
