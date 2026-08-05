import { useState } from "react";

export function useInTabPagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = items.slice(safePage * pageSize, (safePage + 1) * pageSize);
  return { page: safePage, pageCount, pageItems, setPage };
}
