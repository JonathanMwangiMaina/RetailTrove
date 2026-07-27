import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  useEffect(() => {
    document.title = "Forgot Password - RetailTrove";
  }, []);
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/login">
            <span className="font-bold text-2xl text-primary-900 cursor-pointer">
              Modern<span className="text-accent-500">Retail</span>
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Forgot your password?</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-sm text-green-800">
                    If an account with that email exists, a password reset link has been sent. Check
                    your inbox and follow the instructions.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setSubmitted(false)}>
                  Try another email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending reset link…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
