# Futures Trade Copier Dashboard

## Overview

This is a futures trading copy system that enables traders to automatically replicate trades from a master trading account to multiple follower accounts. The application supports NinjaTrader and Tradovate trading platforms, allowing users to manage multiple accounts, monitor live trading activity, track performance metrics, and configure position scaling for each follower account.

The system provides real-time trade synchronization, comprehensive activity logging, and a visual dashboard for monitoring account balances, P&L, and trade execution status.

## User Preferences

Preferred communication style: Simple, everyday language.

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
5. Position scaling controls for follower accounts
6. Chart visualizations using Recharts library
7. Theme toggle (light/dark mode) with localStorage persistence
8. User profile management with bio editor (200 character limit) and profile picture upload (base64 storage, 2MB client limit)

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

3. **Trades Table:**
   - Trade execution history
   - Links to master account for trade origin
   - Symbol, action (BUY/SELL), quantity, price
   - Status tracking (success/failed/pending)
   - Timestamp for chronological ordering

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