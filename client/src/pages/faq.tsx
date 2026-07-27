import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { HelpCircle, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface Faq {
  id: number;
  question: string;
  answer: string;
}

export default function FaqPage() {
  useEffect(() => {
    document.title = "FAQ - RetailTrove";
  }, []);
  const { data: faqs = [], isLoading } = useQuery<Faq[]>({ queryKey: ["/api/faqs"] });
  const [openId, setOpenId] = useState<number | null>(null);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    }),
    [faqs],
  );

  return (
    <>
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">
            Everything you need to know about shopping with us.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No FAQs available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq) => (
              <div key={faq.id} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full flex justify-between items-start gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${openId === faq.id ? "rotate-180" : ""}`}
                  />
                </button>
                {openId === faq.id && (
                  <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t bg-gray-50">
                    <p className="pt-3">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center p-6 bg-gray-50 rounded-xl border">
          <p className="text-gray-700 font-medium mb-1">Still have questions?</p>
          <p className="text-sm text-muted-foreground mb-4">Our team is here to help.</p>
          <Link href="/contact">
            <span className="inline-flex items-center justify-center px-6 py-2.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
              Contact Us
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
