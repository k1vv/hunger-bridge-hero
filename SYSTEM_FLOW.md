# FoodBridge - System Flow Diagram

## Overview
FoodBridge is a food rescue platform connecting food vendors with NGOs to reduce food waste and help those in need.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FOODBRIDGE SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                │
│   │   VENDOR    │      │     NGO     │      │    ADMIN    │                │
│   │   Portal    │      │   Portal    │      │   Portal    │                │
│   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘                │
│          │                    │                    │                        │
│          └────────────────────┼────────────────────┘                        │
│                               │                                             │
│                               ▼                                             │
│                    ┌─────────────────────┐                                  │
│                    │   React Frontend    │                                  │
│                    │   (Vite + TypeScript)│                                 │
│                    └──────────┬──────────┘                                  │
│                               │                                             │
│                               ▼                                             │
│                    ┌─────────────────────┐                                  │
│                    │     Supabase        │                                  │
│                    │  ┌───────────────┐  │                                  │
│                    │  │  PostgreSQL   │  │                                  │
│                    │  │   Database    │  │                                  │
│                    │  ├───────────────┤  │                                  │
│                    │  │     Auth      │  │                                  │
│                    │  ├───────────────┤  │                                  │
│                    │  │   Storage     │  │                                  │
│                    │  │ (Food Images) │  │                                  │
│                    │  └───────────────┘  │                                  │
│                    └─────────────────────┘                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## User Roles & Permissions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ROLES                                      │
├─────────────────┬─────────────────────┬─────────────────────────────────────┤
│     VENDOR      │        NGO          │              ADMIN                  │
├─────────────────┼─────────────────────┼─────────────────────────────────────┤
│ • Create        │ • Browse donations  │ • Manage all users                  │
│   donations     │ • Claim food items  │ • Verify accounts                   │
│ • Manage        │ • Manage claims     │ • Monitor donations                 │
│   batches       │ • Track inventory   │ • Handle complaints                 │
│ • Track pickups │ • Record            │ • View analytics                    │
│ • View impact   │   distribution      │ • System settings                   │
│   reports       │ • Generate reports  │ • Audit logs                        │
└─────────────────┴─────────────────────┴─────────────────────────────────────┘
```

---

## Core Workflow: Food Donation Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         FOOD DONATION LIFECYCLE                               │
└──────────────────────────────────────────────────────────────────────────────┘

    VENDOR                                NGO                         ADMIN
      │                                    │                            │
      │  1. CREATE DONATION                │                            │
      │  ┌─────────────────┐               │                            │
      ├──│ Create Batch    │               │                            │
      │  │ + Food Items    │               │                            │
      │  │ + Location      │               │                            │
      │  │ + Pickup Time   │               │                            │
      │  └────────┬────────┘               │                            │
      │           │                        │                            │
      │           ▼                        │                            │
      │  ┌─────────────────┐               │                            │
      │  │ Status:         │               │                            │
      │  │ "available"     │◄──────────────┼────── Monitor ─────────────┤
      │  └────────┬────────┘               │                            │
      │           │                        │                            │
      │           │  2. BROWSE & CLAIM     │                            │
      │           │  ┌─────────────────┐   │                            │
      │           └──►│ View Available │───┤                            │
      │              │ Donations       │   │                            │
      │              └────────┬────────┘   │                            │
      │                       │            │                            │
      │                       ▼            │                            │
      │              ┌─────────────────┐   │                            │
      │              │ Select Items    │   │                            │
      │              │ & Claim         │   │                            │
      │              └────────┬────────┘   │                            │
      │                       │            │                            │
      │                       ▼            │                            │
      │              ┌─────────────────┐   │                            │
      │              │ Status:         │   │                            │
      │              │ "claimed"       │◄──┼────── Monitor ─────────────┤
      │              └────────┬────────┘   │                            │
      │                       │            │                            │
      │  3. PICKUP            │            │                            │
      │  ┌─────────────────┐  │            │                            │
      ├──│ Confirm         │◄─┘            │                            │
      │  │ Handover        │               │                            │
      │  └────────┬────────┘               │                            │
      │           │                        │                            │
      │           ▼                        │                            │
      │  ┌─────────────────┐               │                            │
      │  │ Status:         │               │                            │
      │  │ "completed"     │◄──────────────┼────── Monitor ─────────────┤
      │  └────────┬────────┘               │                            │
      │           │                        │                            │
      │           │  4. DISTRIBUTION       │                            │
      │           │  ┌─────────────────┐   │                            │
      │           └──►│ Add to         │───┤                            │
      │              │ Inventory       │   │                            │
      │              └────────┬────────┘   │                            │
      │                       │            │                            │
      │                       ▼            │                            │
      │              ┌─────────────────┐   │                            │
      │              │ Distribute to   │   │                            │
      │              │ Beneficiaries   │   │                            │
      │              └────────┬────────┘   │                            │
      │                       │            │                            │
      │                       ▼            │                            │
      │              ┌─────────────────┐   │                            │
      │              │ Record          │   │                            │
      │              │ Distribution    │◄──┼────── View Reports ────────┤
      │              └─────────────────┘   │                            │
      │                                    │                            │
      ▼                                    ▼                            ▼
```

---

## Database Schema (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE TABLES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     profiles     │       │   user_roles     │       │  notifications   │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │◄──────│ user_id (FK)     │       │ id (PK)          │
│ email            │       │ role             │       │ user_id (FK)     │
│ name             │       │ (vendor/ngo/     │       │ title            │
│ business_name    │       │  admin)          │       │ message          │
│ phone            │       └──────────────────┘       │ is_read          │
│ address          │                                  └──────────────────┘
│ verification_    │
│   status         │
└────────┬─────────┘
         │
         │ vendor_id
         ▼
┌──────────────────┐       ┌──────────────────┐
│ donation_batches │       │  donation_items  │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │◄──────│ batch_id (FK)    │
│ batch_number     │       │ id (PK)          │
│ vendor_id (FK)   │       │ food_name        │
│ pickup_location  │       │ category         │
│ pickup_date      │       │ quantity         │
│ pickup_time_*    │       │ unit             │
│ status           │       │ expiry_date      │
│ donation_type    │       │ status           │
│ notes            │       │ claimed_by (FK)  │──────┐
└──────────────────┘       │ claimed_at       │      │
                           │ spoilage_risk    │      │
                           │ halal_status     │      │
                           │ image_url        │      │
                           └──────────────────┘      │
                                                     │
         ┌───────────────────────────────────────────┘
         │ ngo_user_id
         ▼
┌──────────────────┐       ┌──────────────────┐
│    inventory     │       │ distribution_    │
├──────────────────┤       │    records       │
│ id (PK)          │       ├──────────────────┤
│ ngo_user_id (FK) │       │ id (PK)          │
│ food_title       │       │ ngo_user_id (FK) │
│ quantity_*       │       │ beneficiary_group│
│ expiry_date      │       │ quantity_        │
│ category         │       │   distributed    │
└──────────────────┘       │ distribution_date│
                           │ notes            │
                           └──────────────────┘
```

---

## Status Flow for Donation Items

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DONATION ITEM STATUS FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │  AVAILABLE  │  ◄── Vendor creates donation
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            │            ▼
       ┌─────────────┐     │     ┌─────────────┐
       │   CLAIMED   │     │     │   EXPIRED   │  ◄── Past expiry date
       │  (by NGO)   │     │     └─────────────┘
       └──────┬──────┘     │
              │            │
              │    NGO cancels claim
              │     ───────┘
              ▼
       ┌─────────────┐
       │  COMPLETED  │  ◄── Pickup confirmed
       └─────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                        DONATION BATCH STATUS FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

      ┌─────────────┐
      │  AVAILABLE  │  ◄── All items available
      └──────┬──────┘
             │
             ▼
  ┌───────────────────┐
  │ PARTIALLY_CLAIMED │  ◄── Some items claimed
  └─────────┬─────────┘
            │
            ▼
     ┌─────────────┐
     │   RESERVED  │  ◄── All items claimed
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐
     │  COMPLETED  │  ◄── All items picked up
     └─────────────┘
```

---

## Page Structure by Role

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VENDOR PAGES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /vendor/dashboard     → Overview, stats, recent activity                   │
│  /vendor/create        → Create new donation batch with items               │
│  /vendor/donations     → List all donation batches                          │
│  /vendor/donations/:id → View batch details                                 │
│  /vendor/pickups       → Manage scheduled pickups                           │
│  /vendor/impact        → View impact reports                                │
│  /vendor/profile       → Manage profile                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                NGO PAGES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /ngo/dashboard        → Overview, stats, recent activity                   │
│  /ngo/available        → Browse & claim available donations (+ recommended) │
│  /ngo/claims           → View claimed items, cancel claims                  │
│  /ngo/inventory        → Track received food stock                          │
│  /ngo/distribution     → Record distribution to beneficiaries               │
│  /ngo/reports          → View distribution reports                          │
│  /ngo/profile          → Manage profile                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                               ADMIN PAGES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  /admin/dashboard      → System overview, key metrics                       │
│  /admin/users          → Manage all users                                   │
│  /admin/verification   → Approve/reject user registrations                  │
│  /admin/donations      → Monitor all donations                              │
│  /admin/claims         → Monitor all claims                                 │
│  /admin/complaints     → Handle user complaints                             │
│  /admin/analytics      → System-wide analytics                              │
│  /admin/announcements  → Create/manage announcements                        │
│  /admin/rules          → Configure system rules                             │
│  /admin/audit          → View audit logs                                    │
│  /admin/settings       → System settings                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TECH STACK                                      │
├─────────────────┬───────────────────────────────────────────────────────────┤
│ Frontend        │ React 18, TypeScript, Vite                                │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Styling         │ Tailwind CSS, Shadcn/UI (Radix primitives)                │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ State Mgmt      │ TanStack React Query (server state)                       │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Routing         │ React Router v6                                           │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Backend         │ Supabase (PostgreSQL, Auth, Storage)                      │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Forms           │ React Hook Form + Zod validation                          │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Animations      │ Framer Motion                                             │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Charts          │ Recharts                                                  │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Testing         │ Vitest, Playwright, Testing Library                       │
└─────────────────┴───────────────────────────────────────────────────────────┘
```
