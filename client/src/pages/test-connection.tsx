import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TestConnection() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    environment: "demo",
  });
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    authData?: any;
    accounts?: any;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await apiRequest(
        "POST",
        "/api/tradovate/test-connection",
        formData
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Login to Trading Platform</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect to Tradovate or NinjaTrader with just your username and password
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="card-3d p-6">
          <h2 className="mb-4 text-lg font-semibold">Login Credentials</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={formData.environment}
                onValueChange={(value) =>
                  setFormData({ ...formData, environment: value })
                }
              >
                <SelectTrigger id="environment" data-testid="select-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Use Demo for testing (no real money)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                data-testid="input-password"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleTest}
              disabled={testing}
              data-testid="button-test-connection"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="card-3d p-6">
            <h2 className="mb-4 text-lg font-semibold">Connection Status</h2>
            {!result ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Enter your credentials and click "Test Connection" to verify
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-chart-2" />
                      <Badge variant="default" className="bg-chart-2">
                        Connected
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      <Badge variant="destructive">Failed</Badge>
                    </>
                  )}
                </div>

                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm">{result.message}</p>
                </div>

                {result.authData && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Authentication Details:</p>
                    <div className="rounded-md border p-3 text-xs">
                      <p>
                        <span className="text-muted-foreground">User ID:</span>{" "}
                        {result.authData.userId}
                      </p>
                      <p className="mt-1">
                        <span className="text-muted-foreground">Token Expires:</span>{" "}
                        {new Date(result.authData.tokenExpiration).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {result.accounts && result.accounts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Accounts Found: {result.accounts.length}
                    </p>
                    <div className="max-h-64 overflow-y-auto rounded-md border">
                      {result.accounts.map((account: any, index: number) => (
                        <div
                          key={index}
                          className="border-b p-3 text-xs last:border-0"
                        >
                          <p className="font-medium">{account.name || `Account ${account.id}`}</p>
                          <p className="text-muted-foreground">ID: {account.id}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="card-3d p-6">
            <h2 className="mb-4 text-lg font-semibold">Requirements</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Tradovate account (Demo or Live with $1,000+ equity)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Username/Password credentials (not Google sign-in)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>API Access Add-On subscription (for Live trading)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>Generated API Key and CID from Application Settings</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
