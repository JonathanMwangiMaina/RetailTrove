import { useQuery } from "@tanstack/react-query";
import {
  formatPrice as formatPriceUtil,
  convertCurrency,
  getCurrency,
  type Currency,
} from "@/lib/currencies";

const DEFAULT_CURRENCY = "USD";

export function useCurrency() {
  const { data: settings } = useQuery<Array<{ key: string; value: string }>>({
    queryKey: ["/api/site-settings"],
  });

  const currencyCode = settings?.find((s) => s.key === "site_currency")?.value || DEFAULT_CURRENCY;

  const currency: Currency | undefined = getCurrency(currencyCode);

  function formatPrice(amountUsd: number): string {
    return formatPriceUtil(amountUsd, currencyCode);
  }

  function convert(amountUsd: number): number {
    return convertCurrency(amountUsd, currencyCode);
  }

  return { currencyCode, currency, formatPrice, convert };
}
