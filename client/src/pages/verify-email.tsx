import { useState, useEffect } from "react";
import { useSearch, useLocation, Link } from "wouter";
import { useAuth, AuthError } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MailCheck, AlertCircle } from "lucide-react";

export default function VerifyEmailPage() {
  useEffect(() => {
    document.title = "Confirm Your Email - RetailTrove";
  }, []);

  const search = useSearch();
  const [, navigate] = useLocation();
  const { verifyEmail } = useAuth();

  const token = new URLSearchParams(search).get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        if (!cancelled) setStatus("missing");
        return;
      }
      setStatus("loading");
      try {
        await verifyEmail(token);
        if (!cancelled) setStatus("success");
      } catch (err: any) {
        if (!cancelled) {
          setStatus("error");
          setMessage(err instanceof AuthError ? err.message : "We couldn't confirm your email.");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="font-bold text-2xl text-primary-900 cursor-pointer">
              Modern<span className="text-accent-500">Retail</span>
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              {status === "success" ? (
                <MailCheck className="h-6 w-6 text-emerald-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-600" />
              )}
            </div>
            <CardTitle>
              {status === "loading" && "Confirming your email…"}
              {status === "success" && "Email confirmed!"}
              {status === "error" && "We couldn't confirm your email"}
              {status === "missing" && "No confirmation link found"}
            </CardTitle>
            <CardDescription>
              {status === "loading" && "Just a moment…"}
              {status === "success" && "Your account is now active. You're being signed in."}
              {status === "error" && message}
              {status === "missing" &&
                "Open the confirmation link from your inbox to activate your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === "success" && (
              <Button className="w-full" onClick={() => navigate("/")}>
                Start Shopping
              </Button>
            )}
            {(status === "error" || status === "missing") && (
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                Go to Sign In
              </Button>
            )}
            {status === "loading" && (
              <Button variant="outline" className="w-full" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Please wait…
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
