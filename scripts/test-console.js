/**
 * BROWSER CONSOLE TEST SCRIPT
 *
 * HOW TO USE:
 * 1. Open your app in browser (http://localhost:5173 or similar)
 * 2. Login as NGO
 * 3. Open DevTools (F12) → Console tab
 * 4. Copy and paste this ENTIRE script
 * 5. Run the test functions as shown at the bottom
 */

// ============================================================================
// SETUP - Get Supabase client from window
// ============================================================================

const getSupabase = () => {
  // Try to find supabase in React's internals
  const root = document.getElementById('root');
  if (root && root._reactRootContainer) {
    // React 17
    const fiber = root._reactRootContainer._internalRoot?.current;
  }

  // Alternative: Use the global if available
  if (window.__SUPABASE_CLIENT__) {
    return window.__SUPABASE_CLIENT__;
  }

  // Fallback: Create new client (requires your project URL and anon key)
  console.warn('Could not find existing Supabase client. Using fallback...');
  return null;
};

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

window.FoodBridgeTests = {

  // Check current logged in user
  async checkUser() {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
      console.error('❌ No user logged in. Please login first.');
      return null;
    }

    const user = session.user;
    const { data: roles } = await window.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const { data: profile } = await window.supabase
      .from('profiles')
      .select('name, business_name')
      .eq('id', user.id)
      .single();

    console.log('✅ Current User:', {
      id: user.id,
      email: user.email,
      roles: roles?.map(r => r.role),
      name: profile?.business_name || profile?.name
    });

    return user;
  },

  // List available batches with items
  async listAvailable() {
    console.log('📦 Fetching available batches...');

    const { data: batches, error } = await window.supabase
      .from('donation_batches')
      .select(`
        id, batch_number, status, pickup_location,
        donation_items(id, food_name, status, claimed_by, quantity, unit)
      `)
      .in('status', ['available', 'partially_claimed'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`Found ${batches.length} batches:\n`);

    batches.forEach(batch => {
      const items = batch.donation_items || [];
      const available = items.filter(i => i.status === 'available');
      const claimed = items.filter(i => i.status === 'claimed');

      console.log(`📦 ${batch.batch_number} [${batch.status}]`);
      console.log(`   Location: ${batch.pickup_location}`);
      console.log(`   Available: ${available.length}, Claimed: ${claimed.length}`);

      available.slice(0, 3).forEach(item => {
        console.log(`   ✓ ${item.food_name} (${item.quantity} ${item.unit}) - ID: ${item.id}`);
      });
      console.log('');
    });

    return batches;
  },

  // Test claiming an item
  async claimItem(itemId) {
    const user = await this.checkUser();
    if (!user) return;

    console.log(`\n🔄 Claiming item ${itemId}...`);

    // Get item first
    const { data: item } = await window.supabase
      .from('donation_items')
      .select('*, donation_batches(id, batch_number, status)')
      .eq('id', itemId)
      .single();

    if (!item) {
      console.error('❌ Item not found');
      return;
    }

    if (item.status !== 'available') {
      console.error(`❌ Item is not available (status: ${item.status})`);
      return;
    }

    console.log('Before:', { status: item.status, claimed_by: item.claimed_by });

    // Claim it
    const { error } = await window.supabase
      .from('donation_items')
      .update({
        status: 'claimed',
        claimed_by: user.id,
        claimed_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) {
      console.error('❌ Failed to claim:', error);
      return;
    }

    // Verify
    const { data: after } = await window.supabase
      .from('donation_items')
      .select('status, claimed_by')
      .eq('id', itemId)
      .single();

    console.log('After:', after);
    console.log('✅ Item claimed successfully!');

    return after;
  },

  // Test cancelling a claim (FULL FLOW)
  async cancelClaim(itemId) {
    const user = await this.checkUser();
    if (!user) return;

    console.log(`\n🔄 Testing CANCEL flow for item ${itemId}...`);
    console.log('='.repeat(50));

    // 1. Get item
    const { data: item } = await window.supabase
      .from('donation_items')
      .select('*, donation_batches(id, batch_number, status)')
      .eq('id', itemId)
      .single();

    if (!item) {
      console.error('❌ Item not found');
      return;
    }

    console.log('\n📋 Item before cancel:', {
      food_name: item.food_name,
      status: item.status,
      claimed_by: item.claimed_by,
      batch_status: item.donation_batches?.status
    });

    if (item.status !== 'claimed') {
      console.error(`❌ Item is not claimed (status: ${item.status})`);
      return;
    }

    // 2. Log cancellation
    console.log('\n📝 Step 1: Logging cancellation to history...');
    const { error: logError } = await window.supabase
      .from('claim_cancellations')
      .insert({
        item_id: itemId,
        batch_id: item.batch_id,
        ngo_id: user.id,
        food_name: item.food_name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category
      });

    if (logError) {
      console.warn('⚠️ Failed to log cancellation:', logError.message);
    } else {
      console.log('   ✓ Cancellation logged');
    }

    // 3. Reset item
    console.log('\n🔄 Step 2: Resetting item to available...');
    const { error: updateError } = await window.supabase
      .from('donation_items')
      .update({
        status: 'available',
        claimed_by: null,
        claimed_at: null
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('❌ Failed to reset item:', updateError);
      return;
    }
    console.log('   ✓ Item reset to available');

    // 4. Update batch status
    console.log('\n📦 Step 3: Recalculating batch status...');
    const batchId = item.batch_id;

    const { data: claimed } = await window.supabase
      .from('donation_items')
      .select('id')
      .eq('batch_id', batchId)
      .eq('status', 'claimed');

    const { data: available } = await window.supabase
      .from('donation_items')
      .select('id')
      .eq('batch_id', batchId)
      .eq('status', 'available');

    const claimedCount = claimed?.length || 0;
    const availableCount = available?.length || 0;

    let newStatus = 'available';
    if (claimedCount > 0 && availableCount > 0) {
      newStatus = 'partially_claimed';
    } else if (claimedCount > 0) {
      newStatus = 'reserved';
    }

    console.log(`   Claimed: ${claimedCount}, Available: ${availableCount}`);
    console.log(`   New batch status: ${newStatus}`);

    await window.supabase
      .from('donation_batches')
      .update({ status: newStatus })
      .eq('id', batchId);

    console.log('   ✓ Batch status updated');

    // 5. Verify
    console.log('\n✅ Step 4: Verifying final state...');

    const { data: itemAfter } = await window.supabase
      .from('donation_items')
      .select('*, donation_batches(status)')
      .eq('id', itemId)
      .single();

    const { data: cancelRecord } = await window.supabase
      .from('claim_cancellations')
      .select('*')
      .eq('item_id', itemId)
      .order('cancelled_at', { ascending: false })
      .limit(1)
      .single();

    console.log('\n📋 Item after cancel:', {
      status: itemAfter?.status,
      claimed_by: itemAfter?.claimed_by,
      batch_status: itemAfter?.donation_batches?.status
    });

    console.log('\n📋 Cancellation record:', cancelRecord ? {
      food_name: cancelRecord.food_name,
      cancelled_at: cancelRecord.cancelled_at
    } : 'NOT FOUND');

    // Results
    console.log('\n' + '='.repeat(50));
    console.log('TEST RESULTS:');
    console.log('='.repeat(50));

    const tests = [
      ['Item status is available', itemAfter?.status === 'available'],
      ['Item claimed_by is null', itemAfter?.claimed_by === null],
      ['Cancellation record exists', !!cancelRecord],
      ['Batch status updated', itemAfter?.donation_batches?.status === newStatus]
    ];

    tests.forEach(([name, pass]) => {
      console.log(pass ? `✅ ${name}` : `❌ ${name}`);
    });

    const allPassed = tests.every(t => t[1]);
    console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'));

    return { itemAfter, cancelRecord, allPassed };
  },

  // View cancellation history
  async viewHistory() {
    const user = await this.checkUser();
    if (!user) return;

    console.log('\n📜 Fetching cancellation history...');

    const { data, error } = await window.supabase
      .from('claim_cancellations')
      .select('*, donation_batches(batch_number)')
      .eq('ngo_id', user.id)
      .order('cancelled_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`\nFound ${data.length} cancellation records:\n`);

    data.forEach(c => {
      console.log(`🚫 ${c.food_name} (${c.quantity} ${c.unit})`);
      console.log(`   Batch: ${c.donation_batches?.batch_number}`);
      console.log(`   Cancelled: ${new Date(c.cancelled_at).toLocaleString()}`);
      console.log('');
    });

    return data;
  },

  // Check data consistency
  async checkConsistency() {
    console.log('\n🔍 Checking data consistency...\n');

    const { data: batches } = await window.supabase
      .from('donation_batches')
      .select('id, batch_number, status, donation_items(status)')
      .order('created_at', { ascending: false })
      .limit(20);

    let issues = 0;

    batches?.forEach(batch => {
      const items = batch.donation_items || [];
      const available = items.filter(i => i.status === 'available').length;
      const claimed = items.filter(i => i.status === 'claimed').length;
      const completed = items.filter(i => i.status === 'completed').length;

      let expected = 'available';
      if (completed === items.length && items.length > 0) {
        expected = 'completed';
      } else if (claimed > 0 && available > 0) {
        expected = 'partially_claimed';
      } else if (claimed > 0) {
        expected = 'reserved';
      }

      const ok = batch.status === expected;
      if (!ok) issues++;

      console.log(
        ok ? '✅' : '❌',
        batch.batch_number,
        `[${batch.status}]`,
        ok ? '' : `(expected: ${expected})`,
        `- avail:${available} claimed:${claimed} done:${completed}`
      );
    });

    console.log('\n' + (issues === 0
      ? '✅ All batch statuses are consistent!'
      : `⚠️ Found ${issues} inconsistent batches`));

    return issues === 0;
  },

  // Run full E2E test
  async runFullTest() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 FULL E2E TEST: CLAIM & CANCEL FLOW');
    console.log('='.repeat(60) + '\n');

    // 1. Check user
    const user = await this.checkUser();
    if (!user) return;

    // 2. Find available item
    console.log('\n📦 Finding available item...');
    const batches = await this.listAvailable();

    if (!batches?.length) {
      console.error('❌ No available batches. Create a donation first.');
      return;
    }

    const availableItem = batches
      .flatMap(b => b.donation_items || [])
      .find(i => i.status === 'available');

    if (!availableItem) {
      console.error('❌ No available items found.');
      return;
    }

    console.log(`\n🎯 Selected: ${availableItem.food_name} (${availableItem.id})`);

    // 3. Claim
    console.log('\n' + '-'.repeat(40));
    await this.claimItem(availableItem.id);

    // Wait
    await new Promise(r => setTimeout(r, 1000));

    // 4. Cancel
    console.log('\n' + '-'.repeat(40));
    const result = await this.cancelClaim(availableItem.id);

    // 5. View history
    console.log('\n' + '-'.repeat(40));
    await this.viewHistory();

    // 6. Check consistency
    console.log('\n' + '-'.repeat(40));
    await this.checkConsistency();

    console.log('\n' + '='.repeat(60));
    console.log('🏁 E2E TEST COMPLETE');
    console.log('='.repeat(60) + '\n');

    return result;
  }
};

// ============================================================================
// INSTRUCTIONS
// ============================================================================

console.log(`
%c╔══════════════════════════════════════════════════════════════╗
║          FOODBRIDGE TEST SCRIPT LOADED                       ║
╚══════════════════════════════════════════════════════════════╝

%cAvailable commands:

%cFoodBridgeTests.checkUser()       %c- Check logged in user
%cFoodBridgeTests.listAvailable()   %c- List available batches
%cFoodBridgeTests.claimItem(id)     %c- Claim an item by ID
%cFoodBridgeTests.cancelClaim(id)   %c- Cancel a claim (full test)
%cFoodBridgeTests.viewHistory()     %c- View cancellation history
%cFoodBridgeTests.checkConsistency()%c- Check data consistency
%cFoodBridgeTests.runFullTest()     %c- Run complete E2E test

%cQuick start:
%c1. Run: FoodBridgeTests.listAvailable()
2. Copy an item ID from the output
3. Run: FoodBridgeTests.claimItem('paste-id-here')
4. Run: FoodBridgeTests.cancelClaim('paste-id-here')

%cOr just run: FoodBridgeTests.runFullTest()
`,
'color: #10b981; font-weight: bold; font-size: 14px;',
'color: #6366f1; font-weight: bold;',
'color: #f59e0b;', 'color: #888;',
'color: #f59e0b;', 'color: #888;',
'color: #f59e0b;', 'color: #888;',
'color: #f59e0b;', 'color: #888;',
'color: #f59e0b;', 'color: #888;',
'color: #f59e0b;', 'color: #888;',
'color: #f59e0b;', 'color: #888;',
'color: #10b981; font-weight: bold;',
'color: #888;',
'color: #10b981; font-weight: bold;'
);

// Try to get supabase from window
if (!window.supabase) {
  console.warn(`
%c⚠️ Supabase client not found on window.
   The app needs to expose it. Add this to your app:

   window.supabase = supabase;

   Or the tests will need manual setup.
`, 'color: #f59e0b;');
}
