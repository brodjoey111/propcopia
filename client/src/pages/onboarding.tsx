import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { Confetti } from "@/components/onboarding/confetti";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Shield, TrendingUp } from "lucide-react";

const steps = [
  { title: "Welcome", description: "Learn the basics" },
  { title: "Connect Broker", description: "Link your account" },
  { title: "Set Risk Limits", description: "Stay safe" },
];

export default function Onboarding() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [brokerPlatform, setBrokerPlatform] = useState("");
  const [brokerAccount, setBrokerAccount] = useState("");
  const [dailyLossLimit, setDailyLossLimit] = useState([5000]);
  const [maxDrawdown, setMaxDrawdown] = useState([10000]);
  const [positionScaling, setPositionScaling] = useState([100]);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: async (data: { step: number; completed?: boolean; dailyLossLimit?: number; maxDrawdown?: number }) => {
      const response = await fetch("/api/onboarding/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to update onboarding");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const handleNext = async () => {
    if (currentStep === 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      await updateOnboardingMutation.mutateAsync({ step: 1 });
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!brokerPlatform || !brokerAccount) {
        toast({
          title: "Missing Information",
          description: "Please select a broker platform and enter your account ID.",
          variant: "destructive",
        });
        return;
      }
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      await updateOnboardingMutation.mutateAsync({ step: 2 });
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      await updateOnboardingMutation.mutateAsync({
        step: 3,
        completed: true,
        dailyLossLimit: dailyLossLimit[0],
        maxDrawdown: maxDrawdown[0],
      });
      
      toast({
        title: "🎉 Onboarding Complete!",
        description: "You're all set! Your risk limits are now active.",
      });
      
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    }
  };

  const handleSkip = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Confetti trigger={showConfetti} />
      
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="onboarding-title">Welcome to Combine Trade Copier</h1>
          <p className="text-muted-foreground" data-testid="onboarding-subtitle">Let's get you set up safely and securely</p>
        </div>

        <OnboardingProgress currentStep={currentStep} totalSteps={steps.length} steps={steps} />

        <Card className="mt-8" data-testid="onboarding-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="step-title">
              {currentStep === 0 && <CheckCircle2 className="w-6 h-6 text-green-500" />}
              {currentStep === 1 && <TrendingUp className="w-6 h-6 text-primary" />}
              {currentStep === 2 && <Shield className="w-6 h-6 text-green-500" />}
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription data-testid="step-description">
              {currentStep === 0 && "Learn about safe trading practices and how Combine Trade Copier protects you"}
              {currentStep === 1 && "Connect your trading platform to start copying trades"}
              {currentStep === 2 && "Set your safety limits to protect your capital"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 0 && (
              <div className="space-y-6" data-testid="step-0-content">
                <div className="bg-muted p-6 rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Risk Management First</h3>
                      <p className="text-sm text-muted-foreground">
                        We prioritize your safety. You'll set daily loss limits and maximum drawdown to protect your capital.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Transparent & Ethical</h3>
                      <p className="text-sm text-muted-foreground">
                        No hidden fees, no pressure to trade. We reward consistent, safe trading habits.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Learn As You Go</h3>
                      <p className="text-sm text-muted-foreground">
                        Earn badges for maintaining safe trading streaks and completing risk education.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6" data-testid="step-1-content">
                <div className="space-y-2">
                  <Label htmlFor="broker-platform">Broker Platform</Label>
                  <Select value={brokerPlatform} onValueChange={setBrokerPlatform}>
                    <SelectTrigger id="broker-platform" data-testid="select-broker-platform">
                      <SelectValue placeholder="Select your broker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tradovate">Tradovate</SelectItem>
                      <SelectItem value="ninjatrader">NinjaTrader</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="broker-account">Account ID / Username</Label>
                  <Input
                    id="broker-account"
                    placeholder="Enter your broker account ID"
                    value={brokerAccount}
                    onChange={(e) => setBrokerAccount(e.target.value)}
                    data-testid="input-broker-account"
                  />
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <strong>Note:</strong> You can configure your API keys later in the Accounts section. For now, we just need to know which platform you use.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6" data-testid="step-2-content">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Daily Loss Limit</Label>
                      <span className="text-lg font-semibold text-green-500" data-testid="daily-loss-limit-value">
                        ${dailyLossLimit[0].toLocaleString()}
                      </span>
                    </div>
                    <Slider
                      value={dailyLossLimit}
                      onValueChange={setDailyLossLimit}
                      min={500}
                      max={20000}
                      step={500}
                      className="mb-2"
                      data-testid="slider-daily-loss-limit"
                    />
                    <p className="text-xs text-muted-foreground">
                      Trading stops automatically if you lose this amount in a single day
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Maximum Drawdown</Label>
                      <span className="text-lg font-semibold text-green-500" data-testid="max-drawdown-value">
                        ${maxDrawdown[0].toLocaleString()}
                      </span>
                    </div>
                    <Slider
                      value={maxDrawdown}
                      onValueChange={setMaxDrawdown}
                      min={1000}
                      max={50000}
                      step={1000}
                      className="mb-2"
                      data-testid="slider-max-drawdown"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum loss from your peak balance before trading is paused
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Position Scaling</Label>
                      <span className="text-lg font-semibold text-primary" data-testid="position-scaling-value">
                        {positionScaling[0]}%
                      </span>
                    </div>
                    <Slider
                      value={positionScaling}
                      onValueChange={setPositionScaling}
                      min={10}
                      max={200}
                      step={10}
                      className="mb-2"
                      data-testid="slider-position-scaling"
                    />
                    <p className="text-xs text-muted-foreground">
                      Scale copied trades to match your risk tolerance
                    </p>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                        Your Safety Net is Active
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        These limits protect your capital. You can adjust them anytime, but removing them requires confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button
                variant="ghost"
                onClick={handleSkip}
                data-testid="button-skip"
              >
                Skip for now
              </Button>
              <Button
                onClick={handleNext}
                disabled={updateOnboardingMutation.isPending}
                data-testid="button-next"
              >
                {currentStep === 2 ? "Complete Setup" : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
