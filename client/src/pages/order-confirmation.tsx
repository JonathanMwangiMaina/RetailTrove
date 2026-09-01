import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/use-currency";
import {
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  AlertTriangleIcon,
  PhoneIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function getSearchParams() {
  if (typeof window === "undefined") return { id: "ORDER123456", total: 0, payment: "", phone: "" };
  const sp = new URLSearchParams(window.location.search);
  return {
    id: sp.get("id") || "ORDER123456",
    total: parseFloat(sp.get("total") || "0"),
    payment: sp.get("payment") || "",
    phone: sp.get("phone") || "",
  };
}

export default function OrderConfirmation() {
  useEffect(() => {
    document.title = "Order Confirmation - RetailTrove";
  }, []);
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [params] = useState(getSearchParams);

  const realOrderId = Number(params.id);
  const isRealPaymentFlow = params.payment === "mpesa" || params.payment === "lemonsqueezy";
  // Poll only when this is a real order tied to a payment provider.
  const showPaymentStatus = isRealPaymentFlow && Number.isFinite(realOrderId) && realOrderId > 0;

  const [orderStatus, setOrderStatus] = useState("pending");
  const [checkingStopped, setCheckingStopped] = useState(false);
  const [isInitiatingMpesa, setIsInitiatingMpesa] = useState(false);

  // Initiate M-Pesa STK push on demand (lazy initiation)
  const handleInitiateMpesa = async () => {
    if (isInitiatingMpesa) return;
    setIsInitiatingMpesa(true);
    try {
      const res = await apiRequest("POST", "/api/checkout/mpesa", {
        orderId: realOrderId,
        phone: params.phone || "",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to initiate M-Pesa payment");
      }
      toast({
        title: "STK push sent!",
        description: "Check your phone for the M-Pesa payment prompt. Enter your PIN to complete.",
      });
    } catch (error) {
      console.error("Error initiating M-Pesa:", error);
      toast({
        title: "Error",
        description: "Failed to initiate M-Pesa payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInitiatingMpesa(false);
    }
  };

  useEffect(() => {
    if (!showPaymentStatus) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const check = async () => {
      try {
        const res = await fetch(`/api/orders/${realOrderId}/status`, { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as { paymentStatus: string };
          if (cancelled) return;
          setOrderStatus(data.paymentStatus);
          if (
            data.paymentStatus === "paid" ||
            data.paymentStatus === "failed" ||
            data.paymentStatus === "refunded"
          ) {
            setCheckingStopped(true);
            return;
          }
        }
      } catch {
        // transient network error — keep polling
      }
      if (cancelled) return;
      attempts += 1;
      if (attempts >= 30) {
        setCheckingStopped(true);
      } else {
        timer = setTimeout(check, 2000);
      }
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [showPaymentStatus, realOrderId]);

  // Format current date
  const orderDate = new Date();
  const formattedDate = orderDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Estimated delivery date (7 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let view: "success" | "pending" | "failed" | "refunded" = "success";
  if (showPaymentStatus) {
    if (orderStatus === "paid") view = "success";
    else if (orderStatus === "failed") view = "failed";
    else if (orderStatus === "refunded") view = "refunded";
    else view = "pending";
  }

  return (
    <div className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {view === "pending" && (
          <div className="max-w-xl mx-auto text-center">
            <Loader2Icon className="mx-auto h-16 w-16 animate-spin text-secondary-600" />
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-primary-900">
              Waiting for payment…
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              {params.payment === "mpesa"
                ? "Your order is ready. Click below to initiate the M-Pesa payment."
                : "Confirming your payment. This usually takes a few seconds."}
            </p>
            {params.payment === "mpesa" && !isInitiatingMpesa && (
              <div className="mt-6">
                <Button onClick={handleInitiateMpesa} className="w-full sm:w-auto">
                  <PhoneIcon className="mr-2 h-4 w-4" />
                  Pay with M-Pesa
                </Button>
                <p className="mt-2 text-xs text-gray-500">
                  You will receive an STK push prompt on your phone to complete the payment.
                </p>
              </div>
            )}
            {isInitiatingMpesa && (
              <div className="mt-6">
                <Button disabled className="w-full sm:w-auto">
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Sending STK push...
                </Button>
              </div>
            )}
            {checkingStopped && (
              <div className="mt-6 flex items-start justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
                <AlertTriangleIcon
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
                <p className="text-sm text-amber-800">
                  Payment confirmation is taking longer than expected. If you already approved the
                  payment, your order will be confirmed shortly. You can also contact support for
                  help.
                </p>
              </div>
            )}
            <div className="mt-8 flex justify-center">
              <Link href="/contact">
                <Button variant="outline">Contact Support</Button>
              </Link>
            </div>
          </div>
        )}

        {view === "failed" && (
          <div className="max-w-xl mx-auto text-center">
            <XCircleIcon className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-primary-900">
              Payment failed
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              Your order was not completed and no charge was made. Please try again.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/checkout">
                <Button className="w-full sm:w-auto">Try Again</Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="w-full sm:w-auto">
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        )}

        {view === "refunded" && (
          <div className="max-w-xl mx-auto text-center">
            <AlertTriangleIcon className="mx-auto h-16 w-16 text-amber-500" />
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-primary-900">
              Order refunded
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              Your payment has been refunded. If you have questions, contact our support team.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/contact">
                <Button>Contact Support</Button>
              </Link>
            </div>
          </div>
        )}

        {view === "success" && (
          <>
            <div className="max-w-xl mx-auto text-center">
              <CheckCircle2Icon className="mx-auto h-16 w-16 text-green-500" />
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-primary-900">
                Thank you!
              </h1>
              <p className="mt-2 text-lg text-gray-500">Your order has been placed successfully</p>
            </div>

            <div className="mt-10 border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-2xl font-medium text-primary-900">Order Summary</h2>
                <p className="mt-2 text-sm text-gray-500">Order placed on {formattedDate}</p>
              </div>

              <div className="py-6 border-b border-gray-200">
                <div className="flex justify-between text-base font-medium text-primary-900">
                  <p>Order number</p>
                  <p className="font-semibold">{params.id}</p>
                </div>
                <div className="mt-4 flex justify-between text-base font-medium text-primary-900">
                  <p>Order total</p>
                  <p className="font-semibold">{formatPrice(params.total)}</p>
                </div>
                {params.payment && (
                  <div className="mt-3 flex justify-between text-sm text-gray-500">
                    <p>Payment method</p>
                    <p className="font-medium text-gray-700">
                      {params.payment === "mpesa" ? "M-Pesa" : "Credit / Debit Card"}
                    </p>
                  </div>
                )}
              </div>

              <div className="py-6">
                <h3 className="text-lg font-medium text-primary-900">Shipping Information</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Estimated delivery date: {formattedDeliveryDate}
                </p>
                <div className="mt-6 flex items-center">
                  <div className="relative">
                    <div className="h-6 w-6 rounded-full bg-secondary-600 flex items-center justify-center ring-8 ring-white">
                      <CheckCircle2Icon className="h-4 w-4 text-white" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="ml-4 text-sm font-medium text-gray-900">Order placed</p>
                </div>
                <div className="mt-6 flex items-center">
                  <div className="relative">
                    <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center ring-8 ring-white">
                      <span className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="ml-4 text-sm font-medium text-gray-500">Order processing</p>
                </div>
                <div className="mt-6 flex items-center">
                  <div className="relative">
                    <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center ring-8 ring-white">
                      <span className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="ml-4 text-sm font-medium text-gray-500">Shipped</p>
                </div>
                <div className="mt-6 flex items-center">
                  <div className="relative">
                    <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center ring-8 ring-white">
                      <span className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="ml-4 text-sm font-medium text-gray-500">Delivered</p>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Link href="/shop">
                  <Button className="w-full sm:w-auto">Continue Shopping</Button>
                </Link>
              </div>
            </div>

            <div className="mt-10 text-center">
              <p className="text-sm text-gray-500">
                If you have any questions about your order, please contact our customer support.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                <Link href="/contact">
                  <span className="text-secondary-600 hover:text-secondary-500 cursor-pointer">
                    Contact Support
                  </span>
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
