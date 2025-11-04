# Futures Trade Copier Dashboard

## Overview

This is a futures trading copy system that enables traders to automatically replicate trades from a master trading account to multiple follower accounts. The application supports NinjaTrader and Tradovate trading platforms, allowing users to manage multiple accounts, monitor live trading activity, track performance metrics, and configure position scaling for each follower account.

The system provides real-time trade synchronization, comprehensive activity logging, and a visual dashboard for monitoring account balances, P&L, and trade execution status.

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

**Framework & Tooling:**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and caching

**UI Component System:**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Design System:** Inspired by Linear and modern fintech dashboards (Stripe, Robinhood) emphasizing information density, clarity, and scannable hierarchies
- **Typography:** Inter font family loaded via Google Fonts CDN
- **Color System:** CSS custom properties for theme variables supporting light/dark modes
- **Interactive Features:** Drag-and-drop dashboard customization using @dnd-kit libraries

**State Management Strategy:**
- React Query for API data fetching, caching, and synchronization
- Local component state for UI interactions
- No global state management library (Redux, Zustand, etc.) - keeping state close to components

**Key Frontend Features:**
1. Dashboard with draggable widget grid for customization
2. Account management with connection status indicators (separate Connect/Disconnect buttons with color-coded states)
3. Real-time activity feed for trade execution monitoring
4. Trading calendar with P&L visualization
5. **Dark Mode Theme Toggle:**
   - Moon/Sun icon toggle for easy theme switching
   - Accessible across all pages (public and protected)
   - localStorage persistence for user preference
   - Smooth transitions between light and dark modes
   - WCAG 2.0 compliant with proper aria-labels
   - Positioned in top-right header on all pages
6. **Enhanced position scaling controls for follower accounts:**
   - Position scaling percentage (10-200%, adjustable via slider)
   - Maximum contracts per trade limit (optional, prevents over-leveraging)
   - Blocked ticker symbols (blacklist specific instruments)
   - Real-time validation with visual feedback
   - Configuration dialog with comprehensive controls
6. **Social media community platform:**
   - Feed for sharing trading insights and market analysis
   - Post creation with real-time updates
   - Like and engagement functionality
   - Trending traders leaderboard with performance metrics
   - Follow/following system for trader connections
   - Verified trader badges
7. Chart visualizations using Recharts library
8. Theme toggle (light/dark mode) with localStorage persistence
9. User profile management with bio editor (200 character limit) and profile picture upload (base64 storage, 2MB client limit)
10. Public pricing page with three subscription tiers (Starter, Professional, Enterprise) and FAQ section
11. Landing page with integrated pricing section

**Public Pages:**
- Landing page (/) - Marketing homepage with integrated pricing section
- Authentication page (/auth) - Login and signup with link to pricing
- Pricing page (/pricing) - Three subscription tiers with features, pricing, and FAQ

**Position Scaling Configuration:**
- **ConfigureAccountDialog Component** - Comprehensive configuration dialog for follower accounts
  - Slider control for position scaling (10-200% in 5% increments)
  - Optional max contracts input with strict validation (positive integers only)
  - Ticker blacklist with add/remove functionality
  - Real-time validation: rejects zero, negatives, decimals, exponential notation, leading zeros
  - Visual feedback: error messages, red borders, disabled save button
  - Enter key support for adding tickers
  - Automatic uppercase conversion for ticker symbols
  - Duplicate ticker prevention
- **Account Card Display** - Visual indicators for configured restrictions
  - "Max X contracts" badge when limit is set
  - "X blocked ticker(s)" badge when tickers are blacklisted
  - Scaling percentage display for all follower accounts
  - Only follower accounts can be configured (master accounts disabled)

**Social Media Features:**
- **Social Feed Tab** - Main community feed
  - Post creation textarea with character input
  - Real-time post updates and state management
  - Like/unlike functionality with visual feedback (heart icon fills)
  - Comment and share buttons
  - Performance badges showing trader returns
  - Verified trader badges
  - Relative timestamps ("3h ago", "just now")
  - **Automatic Picture Posting:**
    - Smart keyword detection for trading-related posts (ES, NQ, SPX, trading, market, futures, etc.)
    - Real-time visual feedback with sparkles icon when trading keywords detected
    - Automatic stock market image generation for trading posts
    - 3 pre-loaded high-quality stock trading images
    - "Auto-generated" badge on images
    - Posts without trading keywords post normally without images
    - Loading state during image generation
    - Toast notification confirms image was added
- **Live Leaderboard Tab** - Real-time trader rankings
  - Displays top 5 traders ranked by performance (return %)
  - Real-time P&L updates driven by live market data
  - WebSocket connection for streaming price updates
  - Position badges showing symbol, direction (LONG/SHORT), quantity
  - Color-coded returns and P&L (green for positive, red for negative)
  - Live status indicator with pulsing icon
  - Auto-reconnection on disconnect
  - Rankings dynamically shift as market prices change
  - Integrated with Finnhub API for real futures prices
  - Fallback to simulated data when API unavailable
- **Trending Tab** - Top performers showcase
  - Leaderboard of top traders by performance
  - Return percentages with time period
  - Follower counts
  - Follow buttons for each trader
- **Following Tab** - User's followed traders
  - Empty state with call-to-action
  - "Discover Traders" button for exploration
- Currently implemented with in-memory mock data for demonstration

### Backend Architecture

**Server Framework:**
- **Express.js** Node.js web framework
- **TypeScript** for type safety across the stack
- Development server with hot module replacement via Vite middleware
- Custom logging middleware for API request/response tracking

**API Design:**
- RESTful API endpoints under `/api` prefix
- JSON request/response format
- Raw body capture for webhook integrations
- Centralized error handling

**External Trading Platform Integration:**
- Custom `TradovateAPI` class for Tradovate platform authentication and trading operations
- Support for both demo and live trading environments
- Token-based authentication with expiration management
- Reusable API instance caching per user/account

**Current Endpoints:**
- `POST /api/tradovate/test-connection` - Validates credentials and tests Tradovate connectivity
- `GET /api/auth/me` - Returns current user profile including bio and profilePicture
- `PATCH /api/user/profile` - Updates user profile (bio and/or profilePicture)
- `GET /api/leaderboard` - Returns top traders with real-time P&L calculations
- `GET /api/market/prices` - Returns current market prices for all tracked symbols
- `WebSocket /ws/market` - Streams real-time market price updates

**Market Data Integration:**
- **Finnhub API** - Real-time futures market data via WebSocket
  - Tracked symbols: ES, NQ, YM, RTY futures contracts
  - Live price streaming with automatic reconnection
  - Intelligent fallback to simulated data when API unavailable or stale (30s threshold)
  - Simulated updates provide realistic market movement for development/demo
- **Market Data Service** (`server/market-data.ts`)
  - WebSocket connection management
  - Pub/sub pattern for price subscriptions
  - Real-time P&L calculations for trader positions
  - Automatic data source switching (live API → simulated fallback)

### Data Storage Solutions

**Database:**
- **PostgreSQL** via Neon serverless database
- **Drizzle ORM** for type-safe database queries and migrations
- Schema-first approach with TypeScript types generated from database schema

**Database Schema:**

1. **Users Table:**
   - Primary authentication entity
   - Stores username and hashed passwords
   - UUID primary keys
   - Profile fields: bio (text, up to 200 characters) and profilePicture (base64 encoded string)

2. **Accounts Table:**
   - Trading account configurations
   - Fields: name, platform (NinjaTrader/Tradovate), account type (master/follower)
   - API credentials (encrypted keys and secrets)
   - Connection status and last sync timestamp
   - Balance tracking and position scaling multipliers
   - **Enhanced position control fields:**
     - `positionScaling`: integer (default 100) - percentage scaling 10-200%
     - `maxContracts`: integer (nullable) - maximum contracts per trade limit
     - `blockedTickers`: text array - list of blocked ticker symbols

3. **Trades Table:**
   - Trade execution history
   - Links to master account for trade origin
   - Symbol, action (BUY/SELL), quantity, price
   - Status tracking (success/failed/pending)
   - Timestamp for chronological ordering

4. **Posts Table:**
   - Social media posts from traders
   - Fields: userId, content, likes count, comments count, timestamp
   - UUID primary keys
   - Supports community engagement features

5. **Follows Table:**
   - Trader-to-trader following relationships
   - Fields: followerId, followingId, timestamp
   - Enables social networking features

**Temporary Storage:**
- In-memory storage implementation (`MemStorage` class) for development/testing
- Interface-based design (`IStorage`) allows easy swapping between memory and database implementations

### Authentication & Authorization

**Current Implementation:**
- Session-based authentication with username/password login
- User registration and login flows with protected routes
- User context provider for accessing authenticated user data across the application
- Profile management allowing users to add bio and profile picture

**User Profile Features:**
- Bio field with 200 character limit and real-time character counter
- Profile picture upload with client-side 2MB size validation
- Profile pictures stored as base64 encoded strings
- Sidebar displays user avatar (profile picture or initial) and bio
- Settings page provides profile editing interface

**Trading Platform Authentication:**
- Separate credential management per trading platform
- Tradovate: username, password, client ID, and secret
- Token refresh and expiration handling
- Environment-specific endpoints (demo vs. live)

### External Dependencies

**Trading Platform APIs:**
- **Tradovate API** - Futures trading platform
  - Demo environment: `https://demo.tradovateapi.com/v1`
  - Live environment: `https://live.tradovateapi.com/v1`
  - OAuth-style authentication with access tokens
  - Account data retrieval and trade execution capabilities

**Database Services:**
- **Neon Serverless PostgreSQL** - Cloud-hosted database
  - Connection via `@neondatabase/serverless` package
  - DATABASE_URL environment variable for configuration

**Third-Party Libraries:**
- **Recharts** - Chart visualization library for performance metrics
- **date-fns** - Date manipulation and formatting
- **Zod** - Runtime type validation for API payloads and database schemas
- **React Hook Form** - Form state management with validation
- **@hookform/resolvers** - Zod integration for form validation

**Development Tools:**
- **Replit-specific plugins** for development environment integration
- **Vite plugins** for error overlays, cartographer, and dev banners

**Styling & UI:**
- **Tailwind CSS** with PostCSS for processing
- **class-variance-authority** for component variant management
- **clsx** and **tailwind-merge** for conditional class handling