import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import {
  Copy,
  Zap,
  Shield,
  BarChart3,
  Settings,
  Users,
  Globe,
  CheckCircle2,
  ArrowRight,
  Check,
  TrendingUp,
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Copy,
      title: "Automated Trade Copying",
      description:
        "Instantly replicate trades from your master account to multiple follower accounts with zero delay.",
    },
    {
      icon: Zap,
      title: "Real-Time Synchronization",
      description:
        "Bidirectional sync ensures all accounts stay in perfect harmony, executing trades simultaneously.",
    },
    {
      icon: Settings,
      title: "Position Scaling Controls",
      description:
        "Fine-tune position sizes for each follower account with customizable scaling multipliers.",
    },
    {
      icon: Shield,
      title: "Platform Support",
      description:
        "Native integration with NinjaTrader and Tradovate, with extensibility for additional platforms.",
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description:
        "Comprehensive dashboard with P&L tracking, trade calendar, and detailed activity logs.",
    },
    {
      icon: Globe,
      title: "Multi-Account Management",
      description:
        "Manage unlimited master and follower accounts from a single, intuitive interface.",
    },
  ];

  const stats = [
    { value: "99.9%", label: "Uptime" },
    { value: "<50ms", label: "Latency" },
    { value: "24/7", label: "Monitoring" },
    { value: "∞", label: "Accounts" },
  ];

  const benefits = [
    "Simple username/password authentication",
    "No complex API key setup required",
    "Live and demo trading environments",
    "Comprehensive trade history and analytics",
    "Customizable position scaling per account",
    "Real-time connection status monitoring",
  ];

  const pricingTiers = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      description: "Perfect for individual traders getting started",
      features: [
        "1 Master Account",
        "Up to 3 Follower Accounts",
        "Real-time trade copying",
        "Position scaling controls",
        "Basic performance tracking",
        "Email support",
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
        "Comprehensive analytics",
        "Custom trade filters",
        "Priority email support",
        "Trade history & reports",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$399",
      period: "/month",
      description: "For professional trading firms",
      features: [
        "Unlimited Master Accounts",
        "Unlimited Follower Accounts",
        "Advanced position scaling",
        "Full analytics & reporting",
        "Custom trade strategies",
        "API access",
        "Dedicated account manager",
        "24/7 priority support",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Logo size="md" showText={false} />
            <Link href="/auth">
              <Button variant="default" data-testid="button-signin">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing">
              <Button variant="ghost" data-testid="link-pricing">
                Pricing
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative pt-20">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-8 text-6xl font-black tracking-tight sm:text-8xl bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent" data-testid="heading-hero">
              Propcopia
            </h1>
            <p className="mb-6 text-2xl font-semibold">
              Professional Futures Trade Copier
            </p>
            <p className="mb-10 text-lg leading-8 text-muted-foreground" data-testid="text-hero-description">
              Automate your trading strategy across multiple accounts with
              enterprise-grade reliability. Built for serious traders managing
              funded accounts and trading combines.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="gap-2" data-testid="button-get-started" asChild>
                <Link href="/auth">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" data-testid="button-test-connection" asChild>
                <Link href="/test-connection">
                  Test Connection
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative border-y bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center" data-testid={`stat-${index}`}>
                <div className="mb-2 text-4xl font-bold tabular-nums">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl" data-testid="heading-features">
              Everything You Need to Scale Your Trading
            </h2>
            <p className="mb-16 text-lg text-muted-foreground" data-testid="text-features-description">
              Powerful features designed for professional traders managing
              multiple funded accounts and trading combines.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="overflow-visible p-6 hover-elevate"
                data-testid={`card-feature-${index}`}
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative border-y bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-8">
            <div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight" data-testid="heading-benefits">
                Built for Trading Combines
              </h2>
              <p className="mb-6 text-lg text-muted-foreground" data-testid="text-benefits-description">
                Managing multiple funded accounts has never been easier. Our
                trade copier is specifically designed for traders running
                combines and scaling funded accounts.
              </p>
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3" data-testid={`benefit-${index}`}>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="p-6" data-testid="card-platform-ninjatrader">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">NinjaTrader</h3>
                <p className="text-sm text-muted-foreground">
                  Full integration with NinjaTrader platform for futures trading.
                </p>
              </Card>
              <Card className="p-6" data-testid="card-platform-tradovate">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">Tradovate</h3>
                <p className="text-sm text-muted-foreground">
                  Seamless connection to Tradovate with demo and live environments.
                </p>
              </Card>
              <Card className="p-6 sm:col-span-2" data-testid="card-monitoring">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">Real-Time Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Track all your accounts, trades, and performance metrics from a
                  single, comprehensive dashboard with live updates.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl" data-testid="heading-pricing">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground" data-testid="text-pricing-description">
              Choose the plan that fits your trading needs. All plans include a 14-day free trial.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative flex flex-col ${tier.popular ? "border-primary shadow-lg" : ""}`}
                data-testid={`card-pricing-${tier.name.toLowerCase()}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="px-3 py-1" data-testid="badge-pricing-popular">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="space-y-4 p-6 pb-8">
                  <h3 className="text-2xl font-semibold" data-testid={`text-pricing-tier-${tier.name.toLowerCase()}`}>
                    {tier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid={`text-pricing-desc-${tier.name.toLowerCase()}`}>
                    {tier.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold" data-testid={`text-pricing-price-${tier.name.toLowerCase()}`}>
                      {tier.price}
                    </span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 p-6 pt-0">
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2"
                        data-testid={`pricing-feature-${tier.name.toLowerCase()}-${index}`}
                      >
                        <Check className="h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 pt-0">
                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                    size="lg"
                    data-testid={`button-pricing-cta-${tier.name.toLowerCase()}`}
                    asChild
                  >
                    <Link href="/auth">
                      {tier.cta}
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-gradient-to-br from-primary/10 via-transparent to-transparent p-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight" data-testid="heading-cta">
                Ready to Scale Your Trading?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground" data-testid="text-cta-description">
                Start copying trades across your funded accounts in minutes. No
                credit card required.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="gap-2" data-testid="button-cta-primary" asChild>
                  <Link href="/auth">
                    Get Started Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" data-testid="button-cta-secondary" asChild>
                  <Link href="/test-connection">
                    Test Connection
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground" data-testid="text-footer">
              Propcopia © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
