import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, DollarSign, BarChart3, MapPin } from "lucide-react";

interface CompanyData {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  exchange: string;
  marketCap: string;
  peRatio: string;
  eps: string;
  dividendYield: string;
  week52High: string;
  week52Low: string;
  beta: string;
  revenue: string;
  profitMargin: string;
  address: string;
  country: string;
}

interface CompanyDetailsDialogProps {
  ticker: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatLargeNumber(value: string | undefined): string {
  if (!value || value === "None") return "N/A";
  const num = parseFloat(value);
  if (isNaN(num)) return "N/A";
  
  if (num >= 1_000_000_000_000) {
    return `$${(num / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }
  return `$${num.toLocaleString()}`;
}

function formatPercent(value: string | undefined): string {
  if (!value || value === "None") return "N/A";
  const num = parseFloat(value);
  if (isNaN(num)) return "N/A";
  return `${(num * 100).toFixed(2)}%`;
}

function formatNumber(value: string | undefined): string {
  if (!value || value === "None") return "N/A";
  const num = parseFloat(value);
  if (isNaN(num)) return "N/A";
  return num.toFixed(2);
}

export function CompanyDetailsDialog({ ticker, open, onOpenChange }: CompanyDetailsDialogProps) {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: CompanyData }>({
    queryKey: ['/api/company', ticker],
    enabled: open && !!ticker,
  });

  const company = data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid={`dialog-company-${ticker}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl" data-testid="text-company-name">
            {isLoading ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              <>
                <Building2 className="h-6 w-6" />
                {company?.name || ticker}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="py-12 text-center" data-testid="error-message">
            <p className="text-muted-foreground">
              Failed to load company information. Please try again later.
            </p>
          </div>
        ) : company ? (
          <div className="space-y-6">
            {/* Header badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" data-testid="badge-symbol">
                {company.symbol}
              </Badge>
              {company.exchange && (
                <Badge variant="secondary" data-testid="badge-exchange">
                  {company.exchange}
                </Badge>
              )}
              {company.sector && (
                <Badge variant="outline" data-testid="badge-sector">
                  {company.sector}
                </Badge>
              )}
            </div>

            {/* Description */}
            {company.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">About</h3>
                <p className="text-sm leading-relaxed" data-testid="text-description">
                  {company.description}
                </p>
              </div>
            )}

            {/* Company Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              {company.industry && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    Industry
                  </div>
                  <p className="font-medium" data-testid="text-industry">{company.industry}</p>
                </div>
              )}
              
              {company.address && company.country && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Location
                  </div>
                  <p className="font-medium text-sm" data-testid="text-location">
                    {company.country}
                  </p>
                </div>
              )}
            </div>

            {/* Financial Metrics */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Key Metrics
              </h3>
              
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Market Cap</p>
                  <p className="text-lg font-semibold" data-testid="text-market-cap">
                    {formatLargeNumber(company.marketCap)}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">P/E Ratio</p>
                  <p className="text-lg font-semibold" data-testid="text-pe-ratio">
                    {formatNumber(company.peRatio)}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">EPS</p>
                  <p className="text-lg font-semibold" data-testid="text-eps">
                    ${formatNumber(company.eps)}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Revenue (TTM)</p>
                  <p className="text-lg font-semibold" data-testid="text-revenue">
                    {formatLargeNumber(company.revenue)}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Profit Margin</p>
                  <p className="text-lg font-semibold" data-testid="text-profit-margin">
                    {formatPercent(company.profitMargin)}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Dividend Yield</p>
                  <p className="text-lg font-semibold" data-testid="text-dividend-yield">
                    {formatPercent(company.dividendYield)}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Beta</p>
                  <p className="text-lg font-semibold" data-testid="text-beta">
                    {formatNumber(company.beta)}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">52 Week High</p>
                  <p className="text-lg font-semibold text-[#00c805]" data-testid="text-52w-high">
                    ${formatNumber(company.week52High)}
                  </p>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">52 Week Low</p>
                  <p className="text-lg font-semibold text-[#ff5000]" data-testid="text-52w-low">
                    ${formatNumber(company.week52Low)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
