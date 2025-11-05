import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { searchTickers, type TickerInfo } from "@shared/ticker-database";
import { Plus, Search } from "lucide-react";

interface TickerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (ticker: TickerInfo) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search by symbol or name (e.g., AAPL or Apple)",
  disabled = false,
}: TickerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TickerInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length > 0) {
      const results = searchTickers(value);
      setSuggestions(results);
      setIsOpen(true); // Always open dropdown when there's input (even for no results)
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case "Enter":
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelectTicker(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelectTicker = (ticker: TickerInfo) => {
    onSelect(ticker);
    setIsOpen(false);
    onChange("");
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim().length > 0 && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          data-testid="input-ticker-autocomplete"
          className="pr-10"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {isOpen && (
        <Card className="absolute z-50 w-full mt-1 max-h-[300px] overflow-auto shadow-lg">
          {suggestions.length > 0 ? (
            <div className="p-1" data-testid="ticker-suggestions">
              {suggestions.map((ticker, index) => (
                <button
                  key={ticker.symbol}
                  onClick={() => handleSelectTicker(ticker)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover-elevate"
                  }`}
                  data-testid={`suggestion-${ticker.symbol}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{ticker.symbol}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {ticker.name}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {ticker.type === 'futures' ? 'Futures' : ticker.type === 'index' ? 'Index' : 'Stock'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-center text-muted-foreground" data-testid="no-results">
              No tickers found matching "{value}"
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
