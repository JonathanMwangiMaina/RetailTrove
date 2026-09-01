import { useState, useEffect, useRef } from "react";
import { useCart } from "@/hooks/use-cart";
import { CartItem } from "@/components/ui/cart-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { COUNTRIES_BY_NAME, getCurrencyForCountry } from "@/lib/countries";
import { formatPrice as formatPriceIn } from "@/lib/currencies";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Loader2Icon } from "lucide-react";

// Extend order schema with validation
const checkoutFormSchema = insertOrderSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  postalCode: z.string().min(5, "Please enter a valid postal code"),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

// Client-generated order-creation idempotency key. One per checkout page load,
// reused across retries of the same submit so a timed-out POST /orders can never
// create a duplicate order (the server dedupes on this key).
function createClientRequestKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // UUID-v4-shaped fallback for browsers without crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function Checkout() {
  useEffect(() => {
    document.title = "Checkout - RetailTrove";
  }, []);
  const { cart, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const { formatPrice, currencyCode } = useCurrency();
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"lemonsqueezy" | "mpesa">("lemonsqueezy");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaWaiting, setMpesaWaiting] = useState(false);

  const requestKeyRef = useRef<string | null>(null);
  if (requestKeyRef.current === null) {
    requestKeyRef.current = createClientRequestKey();
  }

  // Calculate tax (10%)
  const tax = subtotal * 0.1;
  // Calculate total
  const total = subtotal + tax;

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      apartment: "",
      city: "",
      state: "",
      postalCode: "",
      country: "United States",
      total: total.toString(),
    },
  });

  // Country-currency approximation hint (display-only — the store charges in
  // the configured site currency)
  const selectedCountry = form.watch("country");
  const countryCurrency = selectedCountry ? getCurrencyForCountry(selectedCountry) : undefined;
  const showCountryApprox = !!countryCurrency && countryCurrency !== currencyCode;
  const countryApprox =
    showCountryApprox && Number.isFinite(total)
      ? formatPriceIn(total, countryCurrency as string)
      : "";

  const onSubmit = async (values: CheckoutFormValues) => {
    // Don't submit if cart is empty
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before checking out",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "mpesa" && !mpesaPhone.trim()) {
      toast({
        title: "Phone number required",
        description: "Enter your M-Pesa phone number to receive the payment prompt",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Update total with current value
      values.total = total.toString();

      // Create order items from cart
      const orderItems = cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.variant?.price ?? item.product.price,
        quantity: item.quantity,
        ...(item.variantId !== undefined && item.variantId !== null
          ? { variantId: item.variantId, variantName: item.variant?.name }
          : {}),
      }));

      // Create order first — the clientRequestKey is reused on any retry so a
      // timed-out request never results in a duplicate order.
      const response = await apiRequest("POST", "/api/orders", {
        order: { ...values, paymentProvider: paymentMethod },
        items: orderItems,
        clientRequestKey: requestKeyRef.current,
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const orderData = await response.json();
      const orderId = orderData.id;

      if (paymentMethod === "lemonsqueezy") {
        // Initiate Lemon Squeezy hosted checkout
        const checkoutRes = await apiRequest("POST", "/api/checkout/lemonsqueezy", { orderId });

        if (!checkoutRes.ok) {
          const err = await checkoutRes.json();
          throw new Error(err.message ?? "Failed to create checkout session");
        }

        const { url } = await checkoutRes.json();
        clearCart();
        // Redirect to Lemon Squeezy hosted checkout
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = url;
        return;
      }

      if (paymentMethod === "mpesa") {
        // Initiate M-Pesa STK Push
        setMpesaWaiting(true);
        const mpesaRes = await apiRequest("POST", "/api/checkout/mpesa", {
          orderId,
          phone: mpesaPhone.trim(),
        });

        if (!mpesaRes.ok) {
          setMpesaWaiting(false);
          const err = await mpesaRes.json();
          throw new Error(err.message ?? "Failed to initiate M-Pesa payment");
        }

        toast({
          title: "Order created!",
          description:
            'Your order has been created. Click "Pay with M-Pesa" on the next page to complete the payment.',
        });

        // Clear cart and redirect to confirmation — the confirmation page will
        // let the user initiate the M-Pesa STK push on demand (lazy initiation).
        clearCart();
        navigate(
          `/order-confirmation?id=${orderId}&total=${total}&payment=mpesa&phone=${encodeURIComponent(mpesaPhone.trim())}`,
        );
        return;
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Error",
        description: "Failed to submit your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          {/* Left column - Checkout form */}
          <div className="lg:col-span-7">
            <h2 className="text-2xl font-bold text-primary-900 mb-8">Checkout</h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Contact Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                  <h3 className="text-lg font-medium text-primary-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                  <h3 className="text-lg font-medium text-primary-900 mb-4">Shipping Address</h3>
                  <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="apartment"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Apartment, suite, etc.</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State / Province</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal code</FormLabel>
                          <FormControl>
                            <Input {...field} className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px]">
                              {COUNTRIES_BY_NAME.map((c) => (
                                <SelectItem key={c.code} value={c.name}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-primary-900 mb-4">Payment Method</h3>
                  <div className="space-y-3">
                    {/* Lemon Squeezy (Card) */}
                    <label
                      className={`flex items-center gap-3 border rounded-md p-4 cursor-pointer transition-colors ${paymentMethod === "lemonsqueezy" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        checked={paymentMethod === "lemonsqueezy"}
                        onChange={() => setPaymentMethod("lemonsqueezy")}
                        className="h-4 w-4 text-primary-600"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          Credit / Debit Card
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Powered by Lemon Squeezy — secure hosted checkout
                        </p>
                      </div>
                      <img
                        src="https://cdn.prod.website-files.com/6347244ba8d63489ba51c08e/6a30261d7c3d5620431187e0_ls-logo-stripe-company.svg"
                        alt="Lemon Squeezy"
                        className="h-5 w-auto"
                      />
                    </label>

                    {/* M-Pesa */}
                    <label
                      className={`flex items-center gap-3 border rounded-md p-4 cursor-pointer transition-colors ${paymentMethod === "mpesa" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        checked={paymentMethod === "mpesa"}
                        onChange={() => setPaymentMethod("mpesa")}
                        className="h-4 w-4 text-primary-600"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">M-Pesa</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Pay via Safaricom M-Pesa STK Push
                        </p>
                      </div>
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg"
                        alt="M-Pesa"
                        className="h-6 w-auto"
                      />
                    </label>

                    {/* M-Pesa phone input */}
                    {paymentMethod === "mpesa" && (
                      <div className="border rounded-md p-4 bg-gray-50 mt-2">
                        <Label
                          htmlFor="mpesa-phone"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          M-Pesa Phone Number
                        </Label>
                        <Input
                          id="mpesa-phone"
                          type="tel"
                          placeholder="254 7XX XXX XXX"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          You will receive an STK push prompt on this number to complete the
                          payment.
                        </p>
                      </div>
                    )}

                    {/* M-Pesa waiting state */}
                    {mpesaWaiting && (
                      <div className="border rounded-md p-4 bg-blue-50 border-blue-200 mt-2">
                        <div className="flex items-center gap-3">
                          <Loader2Icon className="h-5 w-5 animate-spin text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              Waiting for M-Pesa confirmation...
                            </p>
                            <p className="text-xs text-blue-700">
                              Check your phone and enter your PIN
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit button - only visible on mobile */}
                <div className="mt-10 lg:hidden">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || cart.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : paymentMethod === "mpesa" ? (
                      "Pay with M-Pesa"
                    ) : (
                      "Pay with Card"
                    )}
                  </Button>
                  <p className="mt-4 text-xs text-center text-gray-500">
                    By placing your order, you agree to our{" "}
                    <span
                      className="text-secondary-600 hover:text-secondary-500 cursor-pointer"
                      onClick={() => alert("Terms & Conditions - Coming Soon")}
                    >
                      Terms & Conditions
                    </span>{" "}
                    and{" "}
                    <span
                      className="text-secondary-600 hover:text-secondary-500 cursor-pointer"
                      onClick={() => alert("Privacy Policy - Coming Soon")}
                    >
                      Privacy Policy
                    </span>
                    .
                  </p>
                </div>
              </form>
            </Form>
          </div>

          {/* Right column - Order Summary */}
          <div className="mt-10 lg:mt-0 lg:col-span-5">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 sticky top-20">
              <h2 className="text-lg font-medium text-primary-900 mb-6">Order Summary</h2>

              <div className="flow-root">
                {cart.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500">Your cart is empty</p>
                    <Link href="/shop">
                      <Button className="mt-4" variant="outline">
                        Go shopping
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ul role="list" className="-my-6 divide-y divide-gray-200">
                    {cart.map((item) => (
                      <CartItem key={item.id} item={item} showControls={false} />
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between text-sm mb-2">
                  <p className="text-gray-500">Subtotal</p>
                  <p className="font-medium text-primary-900">{formatPrice(subtotal)}</p>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <p className="text-gray-500">Shipping</p>
                  <p className="font-medium text-primary-900">Free</p>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <p className="text-gray-500">Tax</p>
                  <p className="font-medium text-primary-900">{formatPrice(tax)}</p>
                </div>
                <div className="flex justify-between text-base font-medium mt-6">
                  <p className="text-primary-900">Total</p>
                  <p className="text-primary-900">{formatPrice(total)}</p>
                </div>
                {showCountryApprox && (
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    ≈ {countryApprox} ({countryCurrency}) in your country&apos;s currency
                  </p>
                )}
              </div>

              {/* Desktop submit button */}
              <div className="mt-6 hidden lg:block">
                <Button
                  type="submit"
                  onClick={form.handleSubmit(onSubmit)}
                  className="w-full"
                  disabled={isSubmitting || cart.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : paymentMethod === "mpesa" ? (
                    "Pay with M-Pesa"
                  ) : (
                    "Pay with Card"
                  )}
                </Button>
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    By placing your order, you agree to our{" "}
                    <span
                      className="text-secondary-600 hover:text-secondary-500 cursor-pointer"
                      onClick={() => alert("Terms & Conditions - Coming Soon")}
                    >
                      Terms & Conditions
                    </span>{" "}
                    and{" "}
                    <span
                      className="text-secondary-600 hover:text-secondary-500 cursor-pointer"
                      onClick={() => alert("Privacy Policy - Coming Soon")}
                    >
                      Privacy Policy
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
