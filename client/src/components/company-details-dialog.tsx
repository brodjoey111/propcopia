import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { StockPriceChart } from "./stock-price-chart";

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
  logo?: string;
  website?: string;
  phone?: string;
}

interface QuoteData {
  current: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

interface CompanyDetailsDialogProps {
  ticker: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatLargeNumber(value: string | undefined): string {
  if (!value || value === "None" || value === "N/A") return "N/A";
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

function formatPercent(value: string | number | undefined): string {
  if (!value || value === "None" || value === "N/A") return "N/A";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "N/A";
  return `${(num * 100).toFixed(2)}%`;
}

function formatNumber(value: string | number | undefined): string {
  if (!value || value === "None" || value === "N/A") return "N/A";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "N/A";
  return num.toFixed(2);
}

export function CompanyDetailsDialog({ ticker, open, onOpenChange }: CompanyDetailsDialogProps) {
  const { data: companyData, isLoading: companyLoading } = useQuery<{ success: boolean; data: CompanyData }>({
    queryKey: [`/api/company/${ticker}`],
    enabled: open && !!ticker,
  });

  const { data: quoteData, isLoading: quoteLoading } = useQuery<{ success: boolean; data: QuoteData }>({
    queryKey: [`/api/stock/${ticker}/quote`],
    enabled: open && !!ticker,
    refetchInterval: 15000, // Refresh every 15 seconds for real-time price updates
  });

  const company = companyData?.data;
  const quote = quoteData?.data;
  const isLoading = companyLoading || quoteLoading;

  const isPositive = (quote?.change ?? 0) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid={`dialog-company-${ticker}`}>
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : company ? (
          <div className="space-y-6">
            {/* Header with company name and logo */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold mb-2" data-testid="text-company-name">
                  {company.name}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" data-testid="badge-symbol">
                    {company.symbol}
                  </Badge>
                  {company.exchange && company.exchange !== 'N/A' && (
                    <Badge variant="secondary" data-testid="badge-exchange">
                      {company.exchange}
                    </Badge>
                  )}
                  {company.sector && company.sector !== 'N/A' && (
                    <Badge variant="outline" data-testid="badge-sector">
                      {company.sector}
                    </Badge>
                  )}
                </div>
              </div>
              {company.logo && (
                <img src={company.logo} alt={company.name} className="h-16 w-16 rounded-lg" data-testid="img-company-logo" />
              )}
            </div>

            {/* Current Price and Change */}
            {quote && (
              <div className="space-y-2">
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-bold" data-testid="text-current-price">
                    ${quote.current.toFixed(2)}
                  </span>
                  <div className={`flex items-center gap-2 text-lg font-semibold ${isPositive ? 'text-[#00c805]' : 'text-[#ff5000]'}`} data-testid="text-price-change">
                    {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    <span>{isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.percentChange.toFixed(2)}%)</span>
                  </div>
                </div>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>Open: ${quote.open.toFixed(2)}</span>
                  <span>High: ${quote.high.toFixed(2)}</span>
                  <span>Low: ${quote.low.toFixed(2)}</span>
                  <span>Prev Close: ${quote.previousClose.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Separator />

            {/* Price Chart */}
            <StockPriceChart symbol={ticker} />

            <Separator />

            {/* Statistics Grid */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Statistics</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Market Cap</p>
                  <p className="text-base font-semibold" data-testid="text-market-cap">
                    {formatLargeNumber(company.marketCap)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">P/E Ratio</p>
                  <p className="text-base font-semibold" data-testid="text-pe-ratio">
                    {formatNumber(company.peRatio)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">EPS</p>
                  <p className="text-base font-semibold" data-testid="text-eps">
                    ${formatNumber(company.eps)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Beta</p>
                  <p className="text-base font-semibold" data-testid="text-beta">
                    {formatNumber(company.beta)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">52 Week High</p>
                  <p className="text-base font-semibold text-[#00c805]" data-testid="text-52w-high">
                    ${formatNumber(company.week52High)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">52 Week Low</p>
                  <p className="text-base font-semibold text-[#ff5000]" data-testid="text-52w-low">
                    ${formatNumber(company.week52Low)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Dividend Yield</p>
                  <p className="text-base font-semibold" data-testid="text-dividend-yield">
                    {formatPercent(company.dividendYield)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Profit Margin</p>
                  <p className="text-base font-semibold" data-testid="text-profit-margin">
                    {formatPercent(company.profitMargin)}
                  </p>
                </div>

                {company.revenue && company.revenue !== 'N/A' && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Revenue (TTM)</p>
                    <p className="text-base font-semibold" data-testid="text-revenue">
                      {formatLargeNumber(company.revenue)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* About Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">About</h3>
              {company.description && company.description !== 'N/A' && (
                <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-description">
                  {company.description}
                </p>
              )}
              
              <div className="grid gap-3 sm:grid-cols-2">
                {company.industry && company.industry !== 'N/A' && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="text-sm font-medium" data-testid="text-industry">{company.industry}</p>
                  </div>
                )}
                
                {company.country && company.country !== 'N/A' && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="text-sm font-medium" data-testid="text-location">
                      {company.country}
                    </p>
                  </div>
                )}

                {company.website && company.website !== 'N/A' && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
                      data-testid="link-website"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {company.phone && company.phone !== 'N/A' && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium" data-testid="text-phone">{company.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center" data-testid="error-message">
            <p className="text-muted-foreground">
              Failed to load company information. Please try again later.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
