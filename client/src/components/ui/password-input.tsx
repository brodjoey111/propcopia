import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative flex items-center">
        <Input
          type={showPassword ? "text" : "password"}
          className={`pr-12 ${className || ""}`}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 h-8 w-8 px-0 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          data-testid="button-toggle-password"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" data-testid="icon-eye-off" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" data-testid="icon-eye" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
