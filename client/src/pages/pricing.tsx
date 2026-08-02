import { Check } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

const pricingTiers = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "Perfect for individual traders getting started with copy trading",
    features: [
      "1 Master Account",
      "Up to 3 Follower Accounts",
      "Real-time trade copying",
      "Position scaling controls",
      "Basic performance tracking",
      "Email support",
      "NinjaTrader & Tradovate support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    price: "$149",
    period: "/month",
    description: "For active traders managing multiple accounts",
    features: [
      "1 Master Account",
      "Up to 10 Follower Accounts",
      "Real-time trade copying",
      "Advanced position scaling",
      "Comprehensive analytics dashboard",
      "Custom trade filters",
      "Priority email support",
      "NinjaTrader & Tradovate support",
      "Trade history & reports",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$399",
    period: "/month",
    description: "For professional trading firms and prop traders",
    features: [
      "Unlimited Master Accounts",
      "Unlimited Follower Accounts",
      "Real-time trade copying",
      "Advanced position scaling",
      "Full analytics & reporting suite",
      "Custom trade strategies",
      "API access",
      "Dedicated account manager",
      "24/7 priority support",
      "All platform integrations",
      "White-label options",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[rgba(5,10,20,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <div className="cursor-pointer hover-elevate rounded-md p-1">
                <Logo size="md" showText={true} />
              </div>
            </Link>
            <Link href="/auth">
              <Button variant="default" data-testid="button-signin-pricing">
                Sign In
              </Button>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-16 pt-32">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight" data-testid="text-pricing-title">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground" data-testid="text-pricing-subtitle">
            Choose the plan that fits your trading needs. All plans include a 14-day free trial.
          </p>
          <div className="mt-6">
            <Link href="/auth">
              <span className="inline-block cursor-pointer text-sm text-muted-foreground hover-elevate active-elevate-2 rounded-md px-3 py-2" data-testid="link-back-auth">
                ← Back to Login
              </span>
            </Link>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${tier.popular ? "border-primary shadow-lg shadow-[0_18px_40px_rgba(19,78,216,0.18)]" : ""}`}
              data-testid={`card-tier-${tier.name.toLowerCase()}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-1" data-testid="badge-popular">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="space-y-4 pb-8">
                <CardTitle className="text-2xl" data-testid={`text-tier-name-${tier.name.toLowerCase()}`}>
                  {tier.name}
                </CardTitle>
                <CardDescription data-testid={`text-tier-desc-${tier.name.toLowerCase()}`}>
                  {tier.description}
                </CardDescription>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" data-testid={`text-tier-price-${tier.name.toLowerCase()}`}>
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground" data-testid={`text-tier-period-${tier.name.toLowerCase()}`}>
                    {tier.period}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2"
                      data-testid={`feature-${tier.name.toLowerCase()}-${index}`}
                    >
                      <Check className="h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  size="lg"
                  data-testid={`button-cta-${tier.name.toLowerCase()}`}
                  asChild
                >
                  <Link href="/auth">
                    {tier.cta}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24">
          <h2 className="mb-8 text-center text-3xl font-bold" data-testid="text-faq-title">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold" data-testid="text-faq-question-1">
                Can I change plans later?
              </h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold" data-testid="text-faq-question-2">
                What payment methods do you accept?
              </h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards, debit cards, and ACH transfers for Enterprise plans.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold" data-testid="text-faq-question-3">
                Is there a free trial?
              </h3>
              <p className="text-sm text-muted-foreground">
                Yes! All plans include a 14-day free trial. No credit card required to start.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold" data-testid="text-faq-question-4">
                What happens after my trial ends?
              </h3>
              <p className="text-sm text-muted-foreground">
                You can choose to subscribe to a paid plan or your account will be downgraded to view-only mode.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="panel-surface mt-24 rounded-[1.5rem] p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold" data-testid="text-cta-title">
            Ready to get started?
          </h2>
          <p className="mb-6 text-muted-foreground" data-testid="text-cta-subtitle">
            Join thousands of traders who trust our platform for reliable trade copying.
          </p>
          <Button size="lg" data-testid="button-cta-signup" asChild>
            <Link href="/auth">
              Start Your Free Trial
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
