/**
 * Test Script for Claim & Cancel Flow
 *
 * HOW TO USE:
 * 1. Open your app in browser
 * 2. Login as NGO
 * 3. Open browser DevTools (F12)
 * 4. Go to Console tab
 * 5. Copy and paste the test functions you want to run
 *
 * Or import and run in a test environment
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TEST UTILITIES
// ============================================================================

const log = (message: string, data?: any) => {
  console.log(`%c[TEST] ${message}`, "color: #10b981; font-weight: bold;", data || "");
};

const error = (message: string, data?: any) => {
  console.error(`%c[ERROR] ${message}`, "color: #ef4444; font-weight: bold;", data || "");
};

const warn = (message: string, data?: any) => {
  console.warn(`%c[WARN] ${message}`, "color: #f59e0b; font-weight: bold;", data || "");
};

const success = (message: string) => {
  console.log(`%c[PASS] ✓ ${message}`, "color: #10b981; font-weight: bold;");
};

const fail = (message: string) => {
  console.log(`%c[FAIL] ✗ ${message}`, "color: #ef4444; font-weight: bold;");
};

// ============================================================================
// TEST: Check Current User
// ============================================================================

export async function testCurrentUser() {
  log("Checking current user...");

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    error("No user logged in. Please login first.");
    return null;
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, business_name")
    .eq("id", user.id)
    .single();

  log("Current user:", {
    id: user.id,
    email: user.email,
    roles: roles?.map(r => r.role),
    name: profile?.business_name || profile?.name,
  });

  return user;
}

// ============================================================================
// TEST: List Available Batches
// ============================================================================

export async function testListAvailableBatches() {
  log("Fetching available batches...");

  const { data: batches, error: err } = await supabase
    .from("donation_batches")
    .select(`
      id, batch_number, status, pickup_location, pickup_date,
      donation_items(id, food_name, status, claimed_by, quantity, unit)
    `)
    .in("status", ["available", "partially_claimed"])
    .order("created_at", { ascending: false })
    .limit(5);

  if (err) {
    error("Failed to fetch batches", err);
    return null;
  }

  log(`Found ${batches?.length || 0} available batches:`);

  batches?.forEach(batch => {
    const availableItems = batch.donation_items?.filter((i: any) => i.status === "available") || [];
    const claimedItems = batch.donation_items?.filter((i: any) => i.status === "claimed") || [];

    console.log(`  ${batch.batch_number} [${batch.status}]`);
    console.log(`    - Available items: ${availableItems.length}`);
    console.log(`    - Claimed items: ${claimedItems.length}`);
    console.log(`    - Items:`, batch.donation_items?.map((i: any) => `${i.food_name} (${i.status})`));
  });

  return batches;
}

// ============================================================================
// TEST: Claim an Item
// ============================================================================

export async function testClaimItem(itemId: string) {
  const user = await testCurrentUser();
  if (!user) return;

  log(`Claiming item ${itemId}...`);

  // Get item before
  const { data: itemBefore } = await supabase
    .from("donation_items")
    .select("*, donation_batches(status)")
    .eq("id", itemId)
    .single();

  log("Item before claim:", itemBefore);

  if (itemBefore?.status !== "available") {
    warn("Item is not available for claiming");
    return;
  }

  // Claim the item
  const { error: claimError } = await supabase
    .from("donation_items")
    .update({
      status: "claimed",
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (claimError) {
    error("Failed to claim item", claimError);
    return;
  }

  // Get item after
  const { data: itemAfter } = await supabase
    .from("donation_items")
    .select("*, donation_batches(status)")
    .eq("id", itemId)
    .single();

  log("Item after claim:", itemAfter);

  // Verify
  if (itemAfter?.status === "claimed" && itemAfter?.claimed_by === user.id) {
    success("Item claimed successfully");
  } else {
    fail("Item claim verification failed");
  }

  return itemAfter;
}

// ============================================================================
// TEST: Cancel a Claim (Full Flow)
// ============================================================================

export async function testCancelClaim(itemId: string) {
  const user = await testCurrentUser();
  if (!user) return;

  log(`Testing cancel flow for item ${itemId}...`);

  // 1. Get item before
  const { data: itemBefore } = await supabase
    .from("donation_items")
    .select("*, donation_batches(id, batch_number, status)")
    .eq("id", itemId)
    .single();

  log("Item before cancel:", itemBefore);

  if (itemBefore?.status !== "claimed") {
    warn("Item is not claimed, cannot cancel");
    return;
  }

  if (itemBefore?.claimed_by !== user.id) {
    warn("Item is not claimed by current user");
    return;
  }

  // 2. Log cancellation
  log("Step 1: Logging cancellation...");
  const { error: logError } = await supabase
    .from("claim_cancellations")
    .insert({
      item_id: itemId,
      batch_id: itemBefore.batch_id,
      ngo_id: user.id,
      food_name: itemBefore.food_name,
      quantity: itemBefore.quantity,
      unit: itemBefore.unit,
      category: itemBefore.category,
    });

  if (logError) {
    error("Failed to log cancellation", logError);
    // Continue anyway
  } else {
    success("Cancellation logged");
  }

  // 3. Reset item to available
  log("Step 2: Resetting item to available...");
  const { error: updateError } = await supabase
    .from("donation_items")
    .update({
      status: "available",
      claimed_by: null,
      claimed_at: null,
    })
    .eq("id", itemId);

  if (updateError) {
    error("Failed to reset item", updateError);
    return;
  }
  success("Item reset to available");

  // 4. Update batch status
  log("Step 3: Updating batch status...");
  const batchId = itemBefore.batch_id;

  const { data: claimedItems } = await supabase
    .from("donation_items")
    .select("id")
    .eq("batch_id", batchId)
    .eq("status", "claimed");

  const { data: availableItems } = await supabase
    .from("donation_items")
    .select("id")
    .eq("batch_id", batchId)
    .eq("status", "available");

  const claimedCount = claimedItems?.length || 0;
  const availableCount = availableItems?.length || 0;

  let newBatchStatus = "available";
  if (claimedCount > 0 && availableCount > 0) {
    newBatchStatus = "partially_claimed";
  } else if (claimedCount > 0 && availableCount === 0) {
    newBatchStatus = "reserved";
  } else if (availableCount > 0) {
    newBatchStatus = "available";
  }

  log(`Batch status calculation: claimed=${claimedCount}, available=${availableCount} → ${newBatchStatus}`);

  await supabase
    .from("donation_batches")
    .update({ status: newBatchStatus })
    .eq("id", batchId);

  success(`Batch status updated to: ${newBatchStatus}`);

  // 5. Verify final state
  log("Step 4: Verifying final state...");

  const { data: itemAfter } = await supabase
    .from("donation_items")
    .select("*, donation_batches(status)")
    .eq("id", itemId)
    .single();

  const { data: cancellationRecord } = await supabase
    .from("claim_cancellations")
    .select("*")
    .eq("item_id", itemId)
    .eq("ngo_id", user.id)
    .order("cancelled_at", { ascending: false })
    .limit(1)
    .single();

  log("Item after cancel:", itemAfter);
  log("Cancellation record:", cancellationRecord);

  // Final verification
  const tests = [
    { name: "Item status is available", pass: itemAfter?.status === "available" },
    { name: "Item claimed_by is null", pass: itemAfter?.claimed_by === null },
    { name: "Cancellation record exists", pass: !!cancellationRecord },
    { name: "Batch status is correct", pass: itemAfter?.donation_batches?.status === newBatchStatus },
  ];

  console.log("\n%c=== TEST RESULTS ===", "color: #6366f1; font-weight: bold;");
  tests.forEach(t => t.pass ? success(t.name) : fail(t.name));

  const allPassed = tests.every(t => t.pass);
  console.log(allPassed
    ? "\n%c✓ ALL TESTS PASSED"
    : "\n%c✗ SOME TESTS FAILED",
    `color: ${allPassed ? "#10b981" : "#ef4444"}; font-weight: bold; font-size: 14px;`
  );

  return { itemAfter, cancellationRecord, allPassed };
}

// ============================================================================
// TEST: View Cancellation History
// ============================================================================

export async function testViewCancellationHistory() {
  const user = await testCurrentUser();
  if (!user) return;

  log("Fetching cancellation history...");

  const { data: cancellations, error: err } = await supabase
    .from("claim_cancellations")
    .select(`
      *,
      donation_batches(batch_number, pickup_location)
    `)
    .eq("ngo_id", user.id)
    .order("cancelled_at", { ascending: false })
    .limit(10);

  if (err) {
    error("Failed to fetch cancellations", err);
    return;
  }

  log(`Found ${cancellations?.length || 0} cancellation records:`);

  cancellations?.forEach(c => {
    console.log(`  ${c.food_name} (${c.quantity} ${c.unit})`);
    console.log(`    - Batch: ${c.donation_batches?.batch_number}`);
    console.log(`    - Cancelled at: ${new Date(c.cancelled_at).toLocaleString()}`);
  });

  return cancellations;
}

// ============================================================================
// TEST: Full E2E Flow
// ============================================================================

export async function testFullFlow() {
  console.log("%c\n========================================", "color: #6366f1;");
  console.log("%c  FULL E2E TEST: CLAIM & CANCEL FLOW", "color: #6366f1; font-weight: bold; font-size: 16px;");
  console.log("%c========================================\n", "color: #6366f1;");

  // 1. Check user
  const user = await testCurrentUser();
  if (!user) return;

  // 2. Find an available item
  log("\n--- Finding available item ---");
  const batches = await testListAvailableBatches();

  if (!batches || batches.length === 0) {
    warn("No available batches found. Create a donation first.");
    return;
  }

  const availableItem = batches
    .flatMap((b: any) => b.donation_items || [])
    .find((i: any) => i.status === "available");

  if (!availableItem) {
    warn("No available items found in batches.");
    return;
  }

  log(`Found available item: ${availableItem.food_name} (${availableItem.id})`);

  // 3. Claim the item
  log("\n--- Claiming item ---");
  const claimedItem = await testClaimItem(availableItem.id);
  if (!claimedItem) return;

  // Wait a moment
  await new Promise(r => setTimeout(r, 1000));

  // 4. Cancel the claim
  log("\n--- Cancelling claim ---");
  const result = await testCancelClaim(availableItem.id);

  // 5. View history
  log("\n--- Viewing cancellation history ---");
  await testViewCancellationHistory();

  console.log("%c\n========================================", "color: #6366f1;");
  console.log("%c  E2E TEST COMPLETE", "color: #6366f1; font-weight: bold; font-size: 16px;");
  console.log("%c========================================\n", "color: #6366f1;");

  return result;
}

// ============================================================================
// TEST: Verify Data Consistency
// ============================================================================

export async function testDataConsistency() {
  console.log("%c\n========================================", "color: #6366f1;");
  console.log("%c  DATA CONSISTENCY CHECK", "color: #6366f1; font-weight: bold; font-size: 16px;");
  console.log("%c========================================\n", "color: #6366f1;");

  // Check batch statuses match their items
  const { data: batches } = await supabase
    .from("donation_batches")
    .select(`
      id, batch_number, status,
      donation_items(id, status, claimed_by)
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  let issues = 0;

  batches?.forEach((batch: any) => {
    const items = batch.donation_items || [];
    const available = items.filter((i: any) => i.status === "available").length;
    const claimed = items.filter((i: any) => i.status === "claimed").length;
    const completed = items.filter((i: any) => i.status === "completed").length;

    let expectedStatus = "available";
    if (completed === items.length && items.length > 0) {
      expectedStatus = "completed";
    } else if (claimed > 0 && available > 0) {
      expectedStatus = "partially_claimed";
    } else if (claimed > 0 && available === 0) {
      expectedStatus = "reserved";
    } else if (available > 0) {
      expectedStatus = "available";
    }

    const isCorrect = batch.status === expectedStatus;

    if (!isCorrect) {
      issues++;
      fail(`${batch.batch_number}: status=${batch.status}, expected=${expectedStatus}`);
      console.log(`    Items: available=${available}, claimed=${claimed}, completed=${completed}`);
    } else {
      success(`${batch.batch_number}: status=${batch.status} ✓`);
    }
  });

  console.log("\n" + (issues === 0
    ? "%c✓ All batch statuses are consistent"
    : `%c✗ Found ${issues} inconsistent batch(es)`),
    `color: ${issues === 0 ? "#10b981" : "#ef4444"}; font-weight: bold;`
  );

  return issues === 0;
}

// ============================================================================
// CONSOLE HELPERS - Copy these to browser console
// ============================================================================

/*
QUICK TEST COMMANDS (copy to browser console):

// 1. First, get supabase client
const { supabase } = await import('/src/integrations/supabase/client.ts');

// 2. Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user?.email);

// 3. List available batches
const { data: batches } = await supabase
  .from('donation_batches')
  .select('*, donation_items(*)')
  .in('status', ['available', 'partially_claimed'])
  .limit(5);
console.table(batches?.map(b => ({
  batch: b.batch_number,
  status: b.status,
  items: b.donation_items?.length
})));

// 4. Check cancellation history
const { data: cancellations } = await supabase
  .from('claim_cancellations')
  .select('*')
  .eq('ngo_id', user.id)
  .order('cancelled_at', { ascending: false });
console.table(cancellations);

// 5. Data consistency check
const { data: check } = await supabase
  .from('donation_batches')
  .select('batch_number, status, donation_items(status)')
  .limit(10);
check?.forEach(b => {
  const items = b.donation_items || [];
  console.log(b.batch_number, b.status,
    'avail:', items.filter(i => i.status === 'available').length,
    'claimed:', items.filter(i => i.status === 'claimed').length
  );
});

*/
