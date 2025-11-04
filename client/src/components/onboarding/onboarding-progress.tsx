import { Check } from "lucide-react";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: { title: string; description: string }[];
}

export function OnboardingProgress({ currentStep, totalSteps, steps }: OnboardingProgressProps) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8" data-testid="onboarding-progress">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {index > 0 && (
                <div
                  className={`flex-1 h-0.5 transition-all duration-300 ${
                    index <= currentStep ? "bg-green-500" : "bg-border"
                  }`}
                  data-testid={`progress-line-${index}`}
                />
              )}
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300 ${
                  index < currentStep
                    ? "bg-green-500 text-white"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-indicator-${index}`}
              >
                {index < currentStep ? (
                  <Check className="w-5 h-5" data-testid={`check-icon-${index}`} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={`flex-1 h-0.5 transition-all duration-300 ${
                    index < currentStep ? "bg-green-500" : "bg-border"
                  }`}
                  data-testid={`progress-line-${index + 1}`}
                />
              )}
            </div>
            <div className="mt-3 text-center">
              <p
                className={`text-sm font-medium transition-colors ${
                  index <= currentStep ? "text-foreground" : "text-muted-foreground"
                }`}
                data-testid={`step-title-${index}`}
              >
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1" data-testid={`step-description-${index}`}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
