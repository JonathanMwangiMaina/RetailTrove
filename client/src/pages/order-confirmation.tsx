import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/use-currency";
import { CheckCircle2Icon } from "lucide-react";

function getSearchParams() {
  if (typeof window === "undefined") return { id: "ORDER123456", total: 0, payment: "" };
  const sp = new URLSearchParams(window.location.search);
  return {
    id: sp.get("id") || "ORDER123456",
    total: parseFloat(sp.get("total") || "0"),
    payment: sp.get("payment") || "",
  };
}

export default function OrderConfirmation() {
  useEffect(() => {
    document.title = "Order Confirmation - RetailTrove";
  }, []);
  const { formatPrice } = useCurrency();
  const [params] = useState(getSearchParams);

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

  return (
    <div className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center">
          <CheckCircle2Icon className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-primary-900">Thank you!</h1>
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
      </div>
    </div>
  );
}
