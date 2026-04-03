# FoodBridge

A food rescue platform that connects food vendors with NGOs to reduce food waste and help those in need.

## Overview

FoodBridge enables restaurants, grocery stores, and food vendors to donate surplus food to NGOs and food banks. The platform facilitates the entire donation lifecycle from listing to pickup to distribution tracking.

## Features

### Vendor Portal
- **Create Donations**: List surplus food items with details like quantity, expiry date, and pickup information
- **Manage Donations**: View, edit, and track all donation batches
- **Pickup Management**: Confirm handovers when NGOs collect donations
- **Impact Reports**: View statistics on food donated and beneficiaries reached
- **File Complaints**: Report issues to platform administrators

### NGO Portal
- **Browse Donations**: Search and filter available food donations
- **Smart Recommendations**: AI-powered matching based on NGO preferences and needs
- **Claim Management**: Reserve and track claimed donations
- **Inventory Management**: Track received food items with FIFO guidance
- **Distribution Tracking**: Record food distributions to beneficiaries
- **Reports**: View collection and distribution statistics
- **File Complaints**: Report issues to platform administrators

### Admin Portal
- **Dashboard**: System-wide overview with key metrics and alerts
- **User Management**: Manage all users with verification approval/rejection
- **Donation Management**: View and cancel donation listings with reason tracking
- **Claims Monitoring**: Track all claim transactions across the platform
- **Complaints**: Handle user disputes and reports with contact information
- **Analytics**: Platform-wide statistics and trends
- **Announcements**: Create and manage platform announcements
- **Audit Logs**: Review system activity logs

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack React Query
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd hunger-bridge-hero
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```
Add your Supabase project URL and anon key.

4. Start the development server
```bash
npm run dev
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/         # React contexts (Auth)
├── integrations/     # Supabase client and types
├── lib/              # Utility functions, notifications, logger
├── pages/
│   ├── admin/        # Admin portal pages
│   ├── ngo/          # NGO portal pages
│   ├── vendor/       # Vendor portal pages
│   └── shared/       # Shared pages (complaints, dashboards)
└── App.tsx           # Main app with routing
```

## User Roles

| Role | Description |
|------|-------------|
| Vendor | Food businesses that donate surplus food |
| NGO | Organizations that collect and distribute food |
| Admin | Platform administrators |

## Verification Flow

1. New users sign up and their status is set to "pending"
2. Admins review and approve/reject users in User Management
3. Only verified users can log in and access the platform

## License

This project is private and proprietary.
