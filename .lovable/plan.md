
## Phase 1: Foundation
1. **Adaptive Sidebar** — Refactor `AppSidebar` to show different menu items based on `useAuth().role`
2. **Role-based routing** — Update `App.tsx` with all new routes and proper `allowedRoles`

## Phase 2: Vendor Pages (Food Donor)
- **Vendor Dashboard** — Active donations, pending pickups, completed, expiring soon, quick stats
- **Create Donation** — Refactor existing listing creation (image, category, quantity, expiry, pickup window, halal/storage, notes)
- **My Donations** — Filterable list (pending, claimed, picked up, completed, expired, cancelled)
- **Donation Details** — Full item info, status, claimer, pickup details, timeline
- **Edit Donation** — Edit if not claimed/expired/completed
- **Pickup Management** — Scheduled pickups, NGO assigned, confirmation
- **Notifications** — Claimed, pickup confirmed, cancellation, expiry warnings
- **Profile** — Business name, branch/location, contact, hours, food types
- **Impact Report** — Total donations, food saved, meals, monthly trends

## Phase 3: NGO Pages (Receiver/Distributor)
- **NGO Dashboard** — Available nearby, matched urgent, claimed, completed, distribution stats
- **Available Donations** — Filterable list (distance, category, halal, urgency, quantity)
- **Recommended Donations** — AI-matched listings with priority scores
- **Donation Details** — Donor info, food details, pickup location, claim button
- **My Claims** — Pending pickup, in transit, completed, cancelled
- **Collection Management** — Schedule pickup, assign volunteer, confirm collection
- **Inventory** — Received stock, quantity, expiry tracking, distributed/remaining
- **Distribution** — Record beneficiary, date, quantity, category
- **Notifications** — New food, urgent claims, pickup updates, admin announcements
- **Reports** — Food received, meals distributed, waste prevented, sources, monthly stats
- **NGO Profile** — Name, registration, service area, storage capacity, preferences

## Phase 4: Admin Pages (System Controller)
- **Admin Dashboard** — Total vendors/NGOs, active donations, completions, expired, urgent, health
- **User Management** — Manage vendors, NGOs, admins; verification status, suspend/activate
- **User Verification** — Review documents, approve/reject with remarks
- **Donation Management** — All donations: active, claimed, expired, cancelled, suspicious
- **Claims Monitoring** — Claims, pickups, delivery, failed/cancelled transactions
- **Complaints** — No-show, unsafe food, misuse, disputes
- **Analytics** — Food saved by month, categories, most active users, claim rate, heatmap
- **Announcements** — Send system alerts, maintenance notices, urgent redistribution
- **Rules & Settings** — Food safety rules, categories, guidelines, FAQ
- **Audit Logs** — User actions, approvals, listing changes, suspicious behavior
- **Settings** — Role permissions, matching rules, notification config

## Database Changes
- Add tables: `notifications`, `claims`, `complaints`, `audit_logs`, `announcements`, `distribution_records`, `inventory`
- Add columns to `food_listings`: `halal_status`, `storage_condition`, `notes_for_receiver`, `pickup_time_start`, `pickup_time_end`
- Add columns to `profiles`: `business_name`, `operation_hours`, `food_types`, `service_area`, `storage_capacity`

## Notes
- All pages use the shared `PageLayout` with adaptive sidebar
- Pages are scaffolded with realistic UI but some features (like AI matching) will be placeholder until backend is ready
- Notifications will use a `notifications` table with realtime subscriptions
