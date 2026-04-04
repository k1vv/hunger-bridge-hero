# FoodBridge - System Architecture

> **Version:** 1.0
> **Last Updated:** 2026-04-04
> **Overall Completion:** 96%

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FOODBRIDGE PLATFORM                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐   │
│   │   VENDOR     │     │   SYSTEM     │     │     NGO      │     │  ADMIN   │   │
│   │   Portal     │     │   Engine     │     │   Portal     │     │  Portal  │   │
│   ├──────────────┤     ├──────────────┤     ├──────────────┤     ├──────────┤   │
│   │• Donations   │────▶│• Matching    │────▶│• Claims      │     │• Users   │   │
│   │• Scheduling  │     │• Scoring     │     │• Inventory   │     │• Monitor │   │
│   │• Templates   │◀────│• Predictions │◀────│• Distribution│     │• Reports │   │
│   │• Impact      │     │• Alerts      │     │• Reports     │     │• Resolve │   │
│   └──────────────┘     └──────────────┘     └──────────────┘     └──────────┘   │
│          │                    │                    │                   │         │
│          └────────────────────┼────────────────────┼───────────────────┘         │
│                               │                    │                             │
│                    ┌──────────▼────────────────────▼──────────┐                  │
│                    │           SUPABASE BACKEND               │                  │
│                    ├──────────────────────────────────────────┤                  │
│                    │  PostgreSQL  │  Auth  │  Storage  │ RLS  │                  │
│                    └──────────────────────────────────────────┘                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend
| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 18 + TypeScript | UI Components |
| Build Tool | Vite | Fast development & bundling |
| Styling | Tailwind CSS | Utility-first CSS |
| UI Components | shadcn/ui (Radix) | Accessible components |
| State Management | TanStack Query | Server state & caching |
| Routing | React Router v6 | Client-side routing |
| Animation | Framer Motion | UI animations |
| Charts | Recharts | Data visualization |
| Maps | Leaflet | Location picker |
| Forms | React Hook Form | Form handling |
| Notifications | Sonner | Toast notifications |

### Backend (Supabase)
| Service | Purpose |
|---------|---------|
| PostgreSQL | Primary database |
| Supabase Auth | Authentication & sessions |
| Storage | Image uploads (5MB limit) |
| Row Level Security | Data access control |
| Realtime | Live updates (notifications) |

---

## 3. Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐        │
│  │    profiles     │       │   user_roles    │       │  announcements  │        │
│  ├─────────────────┤       ├─────────────────┤       ├─────────────────┤        │
│  │ id (PK)         │──┐    │ user_id (FK)    │───┐   │ id (PK)         │        │
│  │ full_name       │  │    │ role            │   │   │ title           │        │
│  │ organization    │  │    │ created_at      │   │   │ content         │        │
│  │ phone           │  └────│                 │   │   │ target_role     │        │
│  │ address         │       └─────────────────┘   │   │ is_active       │        │
│  │ address_lat     │                             │   │ author_id (FK)  │        │
│  │ address_lng     │                             │   └─────────────────┘        │
│  │ verification    │                             │                              │
│  │ food_preferences│                             │   ┌─────────────────┐        │
│  │ storage_caps    │                             │   │   audit_logs    │        │
│  │ priority_needs  │                             │   ├─────────────────┤        │
│  │ suspension_*    │                             │   │ id (PK)         │        │
│  │ rejection_reason│                             │   │ action          │        │
│  └─────────────────┘                             │   │ entity_type     │        │
│          │                                       │   │ entity_id       │        │
│          │                                       │   │ user_id (FK)    │        │
│  ┌───────▼─────────┐                             │   │ details (JSON)  │        │
│  │ donation_batches│                             │   └─────────────────┘        │
│  ├─────────────────┤                             │                              │
│  │ id (PK)         │                             │   ┌─────────────────┐        │
│  │ vendor_id (FK)  │───────────────────────────┐ │   │   complaints    │        │
│  │ batch_number    │                           │ │   ├─────────────────┤        │
│  │ donation_type   │                           │ │   │ id (PK)         │        │
│  │ pickup_location │                           │ │   │ reporter_id(FK) │───┐    │
│  │ pickup_lat/lng  │                           │ │   │ reported_user_id│   │    │
│  │ pickup_date     │                           │ │   │ complaint_type  │   │    │
│  │ pickup_time_*   │                           │ │   │ status          │   │    │
│  │ contact_person  │                           │ │   │ resolution      │   │    │
│  │ contact_phone   │                           │ │   │ resolved_by     │   │    │
│  │ status          │                           │ │   └─────────────────┘   │    │
│  │ claimed_by (FK) │────┐                      │ │                         │    │
│  │ notes           │    │                      │ │   ┌─────────────────┐   │    │
│  └─────────────────┘    │                      │ │   │  notifications  │   │    │
│          │              │                      │ │   ├─────────────────┤   │    │
│          │              │                      │ └───│ user_id (FK)    │───┘    │
│  ┌───────▼─────────┐    │                      │     │ title           │        │
│  │ donation_items  │    │                      │     │ message         │        │
│  ├─────────────────┤    │                      │     │ type            │        │
│  │ id (PK)         │    │                      │     │ read            │        │
│  │ batch_id (FK)   │    │                      │     │ data (JSON)     │        │
│  │ food_name       │    │                      │     └─────────────────┘        │
│  │ category        │    │                      │                                │
│  │ quantity        │    │                      │     ┌─────────────────┐        │
│  │ unit            │    │                      │     │donation_templates│       │
│  │ halal_status    │    │                      │     ├─────────────────┤        │
│  │ storage_cond    │    │                      └─────│ vendor_id (FK)  │        │
│  │ expiry_date     │    │                            │ template_name   │        │
│  │ expiry_time     │    │                            │ items (JSON)    │        │
│  │ spoilage_risk   │    │                            │ is_active       │        │
│  │ estimated_value │    │                            └─────────────────┘        │
│  │ status          │    │                                                       │
│  │ claimed_by (FK) │────┤                                                       │
│  │ image_url       │    │                                                       │
│  │ notes           │    │                            ┌─────────────────┐        │
│  └─────────────────┘    │                            │    inventory    │        │
│                         │                            ├─────────────────┤        │
│                         │                            │ id (PK)         │        │
│                         │                            │ ngo_user_id(FK) │────┐   │
│                         └────────────────────────────│ item_id (FK)    │    │   │
│                                                      │ batch_id (FK)   │    │   │
│                                                      │ qty_received    │    │   │
│                                                      │ qty_remaining   │    │   │
│                                                      │ qty_distributed │    │   │
│                                                      │ storage_location│    │   │
│                                                      │ expiry_date     │    │   │
│                                                      │ status          │    │   │
│                                                      └─────────────────┘    │   │
│                                                             │               │   │
│                                                      ┌──────▼──────────┐    │   │
│                                                      │distribution_rec │    │   │
│                                                      ├─────────────────┤    │   │
│                                                      │ id (PK)         │    │   │
│                                                      │ ngo_user_id(FK) │────┘   │
│                                                      │ inventory_id(FK)│        │
│                                                      │ qty_distributed │        │
│                                                      │ beneficiary_grp │        │
│                                                      │ beneficiaries_# │        │
│                                                      │ dist_type       │        │
│                                                      │ photo_urls      │        │
│                                                      │ waste_reason    │        │
│                                                      │ feedback_rating │        │
│                                                      │ feedback_comment│        │
│                                                      └─────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Application Structure

```
src/
├── components/                 # Reusable UI components
│   ├── ui/                    # shadcn/ui components (50+ components)
│   ├── vendor/                # Vendor-specific components
│   │   ├── DonationTemplates.tsx
│   │   └── RecommendedNGOs.tsx
│   ├── AppLayout.tsx          # Main layout wrapper
│   ├── AppSidebar.tsx         # Navigation sidebar
│   ├── FeedbackForm.tsx       # Beneficiary feedback
│   ├── LocationPickerMap.tsx  # Map for pickup location
│   ├── NotificationBell.tsx   # Notification dropdown
│   ├── PageLayout.tsx         # Page wrapper
│   ├── PickupLocationMap.tsx  # Read-only location display
│   ├── ProtectedRoute.tsx     # Auth guard
│   └── StatCard.tsx           # Dashboard statistics
│
├── contexts/
│   └── AuthContext.tsx        # Authentication state
│
├── hooks/
│   ├── use-mobile.tsx         # Responsive detection
│   └── use-toast.ts           # Toast notifications
│
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client config
│       └── types.ts           # Database types (auto-generated)
│
├── lib/                       # Core utilities
│   ├── admin-queries.ts       # Admin data fetching
│   ├── constants.ts           # App constants (categories, units)
│   ├── export-utils.ts        # CSV/PDF export
│   ├── impact-calculations.ts # Value, meals, CO2, risk
│   ├── logger.ts              # Standardized logging
│   ├── matching-utils.ts      # Reverse matching algorithm
│   ├── notifications.ts       # Notification helpers
│   └── utils.ts               # General utilities
│
├── pages/
│   ├── admin/                 # Admin portal
│   │   ├── AdminAnalytics.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminSettings.tsx
│   │   ├── Announcements.tsx
│   │   ├── AuditLogs.tsx
│   │   ├── ClaimsMonitoring.tsx
│   │   ├── Complaints.tsx
│   │   ├── DonationManagement.tsx
│   │   ├── LoginAdmin.tsx
│   │   ├── RulesSettings.tsx
│   │   ├── UserDetail.tsx
│   │   └── UserManagement.tsx
│   │
│   ├── ngo/                   # NGO portal
│   │   ├── AvailableDonations.tsx
│   │   ├── CollectionManagement.tsx
│   │   ├── Distribution.tsx
│   │   ├── LoginNGO.tsx
│   │   ├── MyClaims.tsx
│   │   ├── NgoDashboard.tsx
│   │   ├── NgoInventory.tsx
│   │   ├── NgoProfile.tsx
│   │   ├── NgoReports.tsx
│   │   └── SignupNGO.tsx
│   │
│   ├── vendor/                # Vendor portal
│   │   ├── CreateDonation.tsx
│   │   ├── DonationDetails.tsx
│   │   ├── EditDonation.tsx
│   │   ├── ImpactReport.tsx
│   │   ├── LoginVendor.tsx
│   │   ├── MyDonations.tsx
│   │   ├── PickupManagement.tsx
│   │   ├── SignupVendor.tsx
│   │   └── VendorDashboard.tsx
│   │
│   └── shared/                # Shared pages
│       ├── FileComplaint.tsx
│       ├── ForgotPassword.tsx
│       ├── Index.tsx
│       ├── NotFound.tsx
│       ├── Notifications.tsx
│       └── RoleDashboard.tsx
│
└── App.tsx                    # Root component & routes
```

---

## 5. Core Algorithms

### 5.1 NGO Recommendation Scoring (100 points max)

```
┌─────────────────────────────────────────────────────────────────┐
│                   RECOMMENDATION SCORING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ Food Preference  │  0-25 points                              │
│  │ Match            │  • Full match: 25pts                      │
│  │                  │  • Partial: 15pts                         │
│  │                  │  • None: 0pts                             │
│  └────────┬─────────┘                                           │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │ Location/        │  0-20 points                              │
│  │ Distance         │  • <2km: 20pts                            │
│  │                  │  • 2-5km: 15pts                           │
│  │                  │  • 5-10km: 10pts                          │
│  │                  │  • 10-15km: 5pts                          │
│  └────────┬─────────┘                                           │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │ Urgency/         │  0-20 points                              │
│  │ Spoilage Risk    │  • High risk: 20pts                       │
│  │                  │  • Medium: 12pts                          │
│  │                  │  • Low: 5pts                              │
│  └────────┬─────────┘                                           │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │ Storage          │  0-15 points                              │
│  │ Compatibility    │  • Has capability: 15pts                  │
│  │                  │  • No capability: 0pts                    │
│  └────────┬─────────┘                                           │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │ Priority Needs   │  0-12 points                              │
│  │ Match            │  • Matches priority: +12pts               │
│  │                  │  • No match: 0pts                         │
│  └────────┬─────────┘                                           │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │ Freshness        │  0-8 points                               │
│  │ (Days until      │  • Today/tomorrow: 8pts                   │
│  │  pickup)         │  • 2-3 days: 5pts                         │
│  │                  │  • 4+ days: 2pts                          │
│  └────────┬─────────┘                                           │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │ TOTAL SCORE      │  0-100 points                             │
│  │                  │  • 70+: Highly Recommended                │
│  │                  │  • 50-69: Recommended                     │
│  │                  │  • 35-49: Suitable                        │
│  │                  │  • <35: Not shown                         │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Impact Calculations

```typescript
// Meals Served Estimation
meals = quantity × categoryMultiplier × unitFactor
// Category multipliers: Cooked Meals (1.0), Produce (2.0), Dairy (1.5), etc.

// CO2 Saved (kg)
co2Saved = quantity × categoryFactor × unitFactor
// Factors: Meat (6.0), Dairy (3.5), Produce (2.0), Bakery (1.0), etc.

// Unclaimed Risk Prediction
risk = f(spoilage_risk, hours_until_pickup, storage_condition, category)
// Risk thresholds: >70% = High, 30-70% = Medium, <30% = Low
```

### 5.3 Spoilage Risk Calculation

```
spoilage_risk = f(hours_until_expiry, storage_condition, category)

if hours < 0:          risk = "expired"
elif hours < 6:        risk = "high"
elif hours < 24:       risk = "medium"
else:                  risk = "low"

// Adjusted by storage (frozen items get lower risk)
// Adjusted by category (produce spoils faster)
```

---

## 6. Data Flow

### 6.1 Donation Lifecycle

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│   CREATE   │───▶│   MATCH    │───▶│   CLAIM    │───▶│   PICKUP   │
│  (Vendor)  │    │  (System)  │    │   (NGO)    │    │ (Confirm)  │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
      │                 │                 │                 │
      ▼                 ▼                 ▼                 ▼
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ Batch +    │    │ Score NGOs │    │ Update     │    │ Add to     │
│ Items      │    │ Notify     │    │ Status     │    │ Inventory  │
│ Created    │    │ Best Match │    │ claimed    │    │ Auto       │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
                                                            │
                                                            ▼
                        ┌────────────┐    ┌────────────────────────┐
                        │ DISTRIBUTE │◀───│  NGO Inventory         │
                        │   (NGO)    │    │  • FIFO sorting        │
                        └────────────┘    │  • Expiry monitoring   │
                              │           └────────────────────────┘
                              ▼
                        ┌────────────┐
                        │  IMPACT    │
                        │  TRACKED   │
                        │ • Meals    │
                        │ • RM Value │
                        │ • CO2      │
                        └────────────┘
```

### 6.2 Notification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION TRIGGERS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Vendor Creates Donation                                        │
│      │                                                          │
│      ├──▶ System scores all NGOs                                │
│      │                                                          │
│      └──▶ Top NGOs (score > 35) receive "donation_recommended"  │
│           notification with match score                         │
│                                                                  │
│  NGO Claims Donation                                            │
│      │                                                          │
│      └──▶ Vendor receives "claim_received" notification         │
│                                                                  │
│  Pickup Confirmed                                                │
│      │                                                          │
│      └──▶ NGO receives "pickup_confirmed" notification          │
│                                                                  │
│  Admin Actions                                                  │
│      │                                                          │
│      ├──▶ User verified: "user_verified"                        │
│      ├──▶ User rejected: "user_rejected" (with reason)          │
│      ├──▶ User suspended: "user_suspended" (with reason)        │
│      └──▶ Complaint resolved: "complaint_resolved"              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Security Model

### Row Level Security (RLS)

```sql
-- Profiles: Users can read their own profile
-- Admins can read all profiles
CREATE POLICY profiles_read ON profiles
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Donation Batches: Vendors can manage their own
-- NGOs can view available/claimed
CREATE POLICY batches_vendor ON donation_batches
  FOR ALL USING (vendor_id = auth.uid());

CREATE POLICY batches_ngo_read ON donation_batches
  FOR SELECT USING (
    status IN ('available', 'claimed') AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ngo')
  );

-- Inventory: NGOs can manage their own
CREATE POLICY inventory_ngo ON inventory
  FOR ALL USING (ngo_user_id = auth.uid());
```

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Signup    │────▶│  Pending    │────▶│  Verified   │
│   Form      │     │  Approval   │     │   (Active)  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Rejected   │     │  Suspended  │
                    │  (Reason)   │     │  (Reason)   │
                    └─────────────┘     └─────────────┘
```

---

## 8. API Endpoints (Supabase)

### Tables & Common Operations

| Table | Operations | RLS |
|-------|------------|-----|
| `profiles` | CRUD | Own + Admin read all |
| `user_roles` | Read | Own role only |
| `donation_batches` | CRUD | Vendor: own, NGO: read available |
| `donation_items` | CRUD | Via batch ownership |
| `inventory` | CRUD | NGO: own inventory |
| `distribution_records` | Insert/Read | NGO: own records |
| `complaints` | Insert/Read | Reporter: own, Admin: all |
| `notifications` | Read/Update | Own notifications |
| `announcements` | Read | Based on target_role |
| `audit_logs` | Insert/Read | Admin only |

---

## 9. External Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| Supabase Auth | User authentication | ✅ Active |
| Supabase Storage | Image uploads | ✅ Active |
| Leaflet/OpenStreetMap | Location picker | ✅ Active |
| Nominatim | Address geocoding | ✅ Active |

---

## 10. Test Coverage

```
Total Tests: 310+ passing

┌────────────────────────────┬───────┬────────────────────────────┐
│ Test File                  │ Tests │ Coverage Area              │
├────────────────────────────┼───────┼────────────────────────────┤
│ impact-calculations.test   │  86   │ Value, meals, CO2, risk    │
│ matching-utils.test        │  44   │ Reverse matching algorithm │
│ export-utils.test          │  37   │ CSV/PDF export             │
│ logger.test                │  33   │ Standardized logging       │
│ utils.test                 │  29   │ General utilities          │
│ notifications.test         │  28   │ Notification helpers       │
│ FeedbackForm.test          │  22   │ Component testing          │
│ use-toast.test             │  22   │ Hook testing               │
│ admin-queries.test         │  15   │ Admin data fetching        │
└────────────────────────────┴───────┴────────────────────────────┘
```

---

## 11. Remaining Features (4 items)

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| Volunteer Assignment UI | Medium | Medium | UI to assign volunteers to pickups (DB fields exist) |
| Beneficiary Registration | Medium | Medium | Individual beneficiary tracking |
| Pickup Photo Evidence | Low | Low | Photo upload during pickup confirmation |
| Route Optimization | Low | High | Multi-stop pickup route optimization |

---

## 12. Deployment

### Environment Variables

```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

### Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run tests
npm run test:watch   # Tests in watch mode
```

---

## 13. Logging Standards

```typescript
// Role-based logging format
logger.vendor.info("message")    // [VENDOR] [INFO] timestamp - message
logger.ngo.debug("message")      // [NGO] [DEBUG] timestamp - message
logger.admin.warn("message")     // [ADMIN] [WARN] timestamp - message
logger.system.error("message")   // [SYSTEM] [ERROR] timestamp - message
```

---

**Document Version:** 1.0
**Generated:** 2026-04-04
**Platform Completion:** 96%
