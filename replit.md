# Futures Trade Copier Dashboard

## Overview
The Futures Trade Copier Dashboard is a comprehensive application designed to automate futures trading by replicating trades from master accounts to multiple follower accounts. It supports NinjaTrader and Tradovate platforms, offering features like real-time trade synchronization, performance monitoring, and customizable position scaling. The system provides a visual dashboard for tracking account balances, P&L, and trade execution, aiming to deliver a professional financial app experience.

## User Preferences
Preferred communication style: Simple, everyday language.

**Design System:** Robinhood 2024 theme with minimalist aesthetic
- Pure black and white foundation
- Robin Neon (#d5fd51) yellow-green accent color for primary actions
- Green (#00c805) for positive returns/gains
- Orange-tinted red (#ff5000) for negative returns/losses
- Clean, professional financial app aesthetic
- "Less is more" design philosophy

## System Architecture

### Frontend Architecture
The frontend is built with **React 18** and **TypeScript**, using **Vite** for development and **Wouter** for routing. **TanStack Query** manages server state. The UI leverages **shadcn/ui** (built on Radix UI) and **Tailwind CSS** for styling, adhering to a "less is more" design philosophy inspired by modern fintech. Key features include a draggable dashboard, real-time activity feed, a dark mode toggle, enhanced position scaling controls, a social media community platform with an economic calendar, market movers, and an interactive watchlist with dual chart modes (line and candlestick). Chart visualizations are handled by Recharts.

### Backend Architecture
The backend uses **Express.js** with **TypeScript**. It provides RESTful API endpoints for managing trading accounts, user profiles, social features, and market data. A custom `TradovateAPI` class handles integration with the Tradovate platform, supporting both demo and live environments. Market data integration is powered by **Finnhub API** for real-time futures data, with an intelligent fallback to simulated data.

### Data Storage Solutions
The primary database is **PostgreSQL** (Neon serverless) managed by **Drizzle ORM** for type-safe queries. The schema includes tables for `Users`, `Accounts` (with enhanced position control fields), `Trades`, `Posts`, and `Follows`. An in-memory storage implementation is used for development.

### Authentication & Authorization
The system uses session-based authentication with username/password login. Sessions are persisted in PostgreSQL using **connect-pg-simple**, ensuring users remain logged in across page refreshes and server restarts. 

**Session Configuration:**
- Cookie expiration: 30 days
- Proxy trust: Enabled (`trust proxy: 1`) for Replit's infrastructure
- Cookie security: `secure: true`, `sameSite: 'none'` for cross-tab/cross-origin access
- Session persistence: Automatic via PostgreSQL store

This configuration enables the app to work both in Replit's embedded preview and when opened in separate browser tabs. User profiles include a bio and profile picture upload. Trading platform authentication is handled separately for each platform, with secure credential management and token refresh mechanisms.

## External Dependencies

### Trading Platform APIs
- **Tradovate API**: For futures trading operations, account data, and trade execution in demo and live environments.

### Database Services
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL database for persistent data storage.

### Third-Party Libraries
- **Recharts**: For data visualization and charting.
- **date-fns**: For date manipulation and formatting.
- **Zod**: For runtime schema validation.
- **React Hook Form**: For form management and validation.

### Market Data APIs
- **Finnhub API**: Provides real-time futures market data via WebSocket, with symbols like ES, NQ, YM, RTY.
- **Alpha Vantage API**: Provides market movers data (top gainers, top losers, most active stocks) for the Market Movers feature. Free tier with 500 API calls per day.

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework.
- **class-variance-authority**, **clsx**, **tailwind-merge**: For advanced styling and class management.