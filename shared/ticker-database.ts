export interface TickerInfo {
  symbol: string;
  name: string;
  type: 'futures' | 'stock' | 'index';
  exchange?: string;
}

export const TICKER_DATABASE: TickerInfo[] = [
  // Futures
  { symbol: 'ES', name: 'E-mini S&P 500', type: 'futures', exchange: 'CME' },
  { symbol: 'NQ', name: 'E-mini NASDAQ-100', type: 'futures', exchange: 'CME' },
  { symbol: 'YM', name: 'E-mini Dow', type: 'futures', exchange: 'CBOT' },
  { symbol: 'RTY', name: 'E-mini Russell 2000', type: 'futures', exchange: 'CME' },
  { symbol: 'CL', name: 'Crude Oil', type: 'futures', exchange: 'NYMEX' },
  { symbol: 'GC', name: 'Gold', type: 'futures', exchange: 'COMEX' },
  { symbol: 'SI', name: 'Silver', type: 'futures', exchange: 'COMEX' },
  { symbol: 'NG', name: 'Natural Gas', type: 'futures', exchange: 'NYMEX' },
  { symbol: 'ZB', name: '30-Year T-Bond', type: 'futures', exchange: 'CBOT' },
  { symbol: 'ZN', name: '10-Year T-Note', type: 'futures', exchange: 'CBOT' },
  { symbol: '6E', name: 'Euro FX', type: 'futures', exchange: 'CME' },
  { symbol: '6J', name: 'Japanese Yen', type: 'futures', exchange: 'CME' },
  { symbol: 'MES', name: 'Micro E-mini S&P 500', type: 'futures', exchange: 'CME' },
  { symbol: 'MNQ', name: 'Micro E-mini NASDAQ-100', type: 'futures', exchange: 'CME' },
  { symbol: 'MYM', name: 'Micro E-mini Dow', type: 'futures', exchange: 'CBOT' },
  { symbol: 'M2K', name: 'Micro E-mini Russell 2000', type: 'futures', exchange: 'CME' },
  
  // Popular Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'GOOG', name: 'Alphabet Inc. Class C', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', type: 'stock', exchange: 'NYSE' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'V', name: 'Visa Inc.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'MA', name: 'Mastercard Incorporated', type: 'stock', exchange: 'NYSE' },
  { symbol: 'WMT', name: 'Walmart Inc.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock', exchange: 'NYSE' },
  { symbol: 'PG', name: 'Procter & Gamble Company', type: 'stock', exchange: 'NYSE' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', type: 'stock', exchange: 'NYSE' },
  { symbol: 'CVX', name: 'Chevron Corporation', type: 'stock', exchange: 'NYSE' },
  { symbol: 'BAC', name: 'Bank of America Corporation', type: 'stock', exchange: 'NYSE' },
  { symbol: 'KO', name: 'The Coca-Cola Company', type: 'stock', exchange: 'NYSE' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'DIS', name: 'The Walt Disney Company', type: 'stock', exchange: 'NYSE' },
  { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'INTC', name: 'Intel Corporation', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'CRM', name: 'Salesforce Inc.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'ORCL', name: 'Oracle Corporation', type: 'stock', exchange: 'NYSE' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'T', name: 'AT&T Inc.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'VZ', name: 'Verizon Communications Inc.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'NKE', name: 'NIKE Inc.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'MCD', name: 'McDonald\'s Corporation', type: 'stock', exchange: 'NYSE' },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', type: 'stock', exchange: 'NYSE' },
  { symbol: 'HD', name: 'The Home Depot Inc.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'LOW', name: 'Lowe\'s Companies Inc.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'BA', name: 'The Boeing Company', type: 'stock', exchange: 'NYSE' },
  { symbol: 'GE', name: 'General Electric Company', type: 'stock', exchange: 'NYSE' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', type: 'stock', exchange: 'NYSE' },
  { symbol: 'IBM', name: 'International Business Machines Corporation', type: 'stock', exchange: 'NYSE' },
  
  // ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'stock', exchange: 'NYSE' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'stock', exchange: 'NASDAQ' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', type: 'stock', exchange: 'NYSE' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'stock', exchange: 'NYSE' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', type: 'stock', exchange: 'NYSE' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'stock', exchange: 'NYSE' },
];

export function searchTickers(query: string): TickerInfo[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.toLowerCase().trim();
  
  return TICKER_DATABASE.filter(ticker => 
    ticker.symbol.toLowerCase().includes(searchTerm) ||
    ticker.name.toLowerCase().includes(searchTerm)
  ).slice(0, 10); // Limit to top 10 results
}

export function getTickerBySymbol(symbol: string): TickerInfo | undefined {
  return TICKER_DATABASE.find(ticker => 
    ticker.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

export function getTickerByName(name: string): TickerInfo | undefined {
  return TICKER_DATABASE.find(ticker => 
    ticker.name.toLowerCase() === name.toLowerCase()
  );
}
