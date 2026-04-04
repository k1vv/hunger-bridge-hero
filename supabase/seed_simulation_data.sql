-- ============================================================================
-- SIMULATION DATA FOR FOODBRIDGE
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Vendor IDs
-- Permai Bakery: 4b62fcb4-9c67-47c8-b4e9-6f5746b536ae
-- Warung Selera: d53aed42-abcd-461c-b41a-488cc288a471
-- Kedai Mas: 5d528b96-63bf-40b7-b0ff-d1add04c159d

-- NGO IDs
-- Terminal Kasih: b3186cb3-b3a0-47eb-8054-b186cbe7cc5a
-- Food Aid Foundation: 539f2bd9-918f-4a67-85ba-e2ae69389186
-- Bantu Makan Malaysia: 4dd5c1fc-ee11-446a-9317-324029685af2

-- Admin ID
-- System Administrator: a841c60a-fddd-4f96-8129-28d67206238c

-- ============================================================================
-- 1. DONATION BATCHES
-- ============================================================================

INSERT INTO donation_batches (id, vendor_id, pickup_location, pickup_lat, pickup_lng, pickup_date, pickup_time_start, pickup_time_end, contact_person, contact_phone, donation_type, status, notes, created_at) VALUES

-- Permai Bakery batches
('a1111111-1111-1111-1111-111111111101', '4b62fcb4-9c67-47c8-b4e9-6f5746b536ae', '12, Jalan Bukit Bintang, 55100 Kuala Lumpur', 3.1466, 101.7108, '2026-04-04', '14:00', '18:00', 'Ahmad', '+60123456001', 'immediate', 'completed', 'Fresh from today morning batch', '2026-04-01 08:00:00+00'),
('a1111111-1111-1111-1111-111111111102', '4b62fcb4-9c67-47c8-b4e9-6f5746b536ae', '12, Jalan Bukit Bintang, 55100 Kuala Lumpur', 3.1466, 101.7108, '2026-04-05', '15:00', '19:00', 'Ahmad', '+60123456001', 'immediate', 'available', 'End of day pastries', '2026-04-04 10:00:00+00'),
('a1111111-1111-1111-1111-111111111103', '4b62fcb4-9c67-47c8-b4e9-6f5746b536ae', '12, Jalan Bukit Bintang, 55100 Kuala Lumpur', 3.1466, 101.7108, '2026-04-06', '14:00', '17:00', 'Ahmad', '+60123456001', 'scheduled', 'available', NULL, '2026-04-04 12:00:00+00'),

-- Warung Selera batches
('b2222222-2222-2222-2222-222222222201', 'd53aed42-abcd-461c-b41a-488cc288a471', '45, Jalan Ampang, 50450 Kuala Lumpur', 3.159, 101.72, '2026-04-03', '21:00', '22:00', 'Mak Cik Siti', '+60123456003', 'immediate', 'completed', 'Leftover from dinner service', '2026-04-03 18:00:00+00'),
('b2222222-2222-2222-2222-222222222202', 'd53aed42-abcd-461c-b41a-488cc288a471', '45, Jalan Ampang, 50450 Kuala Lumpur', 3.159, 101.72, '2026-04-04', '21:30', '22:30', 'Mak Cik Siti', '+60123456003', 'immediate', 'partially_claimed', 'Tonight dinner extras', '2026-04-04 14:00:00+00'),
('b2222222-2222-2222-2222-222222222203', 'd53aed42-abcd-461c-b41a-488cc288a471', '45, Jalan Ampang, 50450 Kuala Lumpur', 3.159, 101.72, '2026-04-05', '14:00', '15:00', 'Mak Cik Siti', '+60123456003', 'immediate', 'available', 'Lunch leftovers', '2026-04-04 11:00:00+00'),

-- Kedai Mas batches
('c3333333-3333-3333-3333-333333333301', '5d528b96-63bf-40b7-b0ff-d1add04c159d', '8, Jalan SS2/55, 47300 Petaling Jaya', 3.1185, 101.6178, '2026-04-02', '16:00', '17:00', 'Uncle Lim', '+60123456004', 'immediate', 'completed', 'Closing time items', '2026-04-02 12:00:00+00'),
('c3333333-3333-3333-3333-333333333302', '5d528b96-63bf-40b7-b0ff-d1add04c159d', '8, Jalan SS2/55, 47300 Petaling Jaya', 3.1185, 101.6178, '2026-04-04', '16:00', '17:30', 'Uncle Lim', '+60123456004', 'immediate', 'reserved', 'Today closing items', '2026-04-04 09:00:00+00'),
('c3333333-3333-3333-3333-333333333303', '5d528b96-63bf-40b7-b0ff-d1add04c159d', '8, Jalan SS2/55, 47300 Petaling Jaya', 3.1185, 101.6178, '2026-04-05', '16:00', '17:00', 'Uncle Lim', '+60123456004', 'scheduled', 'available', NULL, '2026-04-04 13:00:00+00');

-- ============================================================================
-- 2. DONATION ITEMS (with estimated_value)
-- ============================================================================

INSERT INTO donation_items (id, batch_id, food_name, category, quantity, unit, expiry_date, expiry_time, storage_condition, halal_status, status, spoilage_risk, estimated_value, notes, claimed_by, claimed_at, created_at) VALUES

-- Batch 001 (Permai Bakery - COMPLETED)
('d4444444-4444-4444-4444-444444444401', 'a1111111-1111-1111-1111-111111111101', 'Croissants', 'Bakery & Bread', 20, 'pieces', '2026-04-05', '18:00', 'room_temperature', 'halal', 'completed', 'low', 60.00, 'Butter croissants', 'b3186cb3-b3a0-47eb-8054-b186cbe7cc5a', '2026-04-01 10:00:00+00', '2026-04-01 08:00:00+00'),
('d4444444-4444-4444-4444-444444444402', 'a1111111-1111-1111-1111-111111111101', 'Roti Canai', 'Bakery & Bread', 30, 'pieces', '2026-04-04', '20:00', 'room_temperature', 'halal', 'completed', 'medium', 45.00, 'Frozen, reheat before serving', 'b3186cb3-b3a0-47eb-8054-b186cbe7cc5a', '2026-04-01 10:00:00+00', '2026-04-01 08:00:00+00'),
('d4444444-4444-4444-4444-444444444403', 'a1111111-1111-1111-1111-111111111101', 'Kaya Buns', 'Bakery & Bread', 15, 'pieces', '2026-04-05', '12:00', 'room_temperature', 'halal', 'completed', 'low', 37.50, NULL, 'b3186cb3-b3a0-47eb-8054-b186cbe7cc5a', '2026-04-01 10:00:00+00', '2026-04-01 08:00:00+00'),

-- Batch 002 (Permai Bakery - AVAILABLE)
('d4444444-4444-4444-4444-444444444404', 'a1111111-1111-1111-1111-111111111102', 'Chocolate Muffins', 'Bakery & Bread', 12, 'pieces', '2026-04-06', '18:00', 'room_temperature', 'halal', 'available', 'low', 36.00, 'Fresh baked this morning', NULL, NULL, '2026-04-04 10:00:00+00'),
('d4444444-4444-4444-4444-444444444405', 'a1111111-1111-1111-1111-111111111102', 'Banana Bread', 'Bakery & Bread', 5, 'loaves', '2026-04-07', '12:00', 'room_temperature', 'halal', 'available', 'low', 50.00, 'Homemade recipe', NULL, NULL, '2026-04-04 10:00:00+00'),
('d4444444-4444-4444-4444-444444444406', 'a1111111-1111-1111-1111-111111111102', 'Danish Pastries', 'Bakery & Bread', 8, 'pieces', '2026-04-05', '20:00', 'room_temperature', 'halal', 'available', 'medium', 32.00, NULL, NULL, NULL, '2026-04-04 10:00:00+00'),

-- Batch 003 (Permai Bakery - AVAILABLE scheduled)
('d4444444-4444-4444-4444-444444444407', 'a1111111-1111-1111-1111-111111111103', 'Assorted Bread Rolls', 'Bakery & Bread', 25, 'pieces', '2026-04-07', '18:00', 'room_temperature', 'halal', 'available', 'low', 50.00, 'Mix of white and wholemeal', NULL, NULL, '2026-04-04 12:00:00+00'),

-- Batch 004 (Warung Selera - COMPLETED)
('d4444444-4444-4444-4444-444444444408', 'b2222222-2222-2222-2222-222222222201', 'Nasi Lemak', 'Cooked Meals', 15, 'packs', '2026-04-03', '23:00', 'room_temperature', 'halal', 'completed', 'high', 75.00, 'With sambal and egg', '4dd5c1fc-ee11-446a-9317-324029685af2', '2026-04-03 19:00:00+00', '2026-04-03 18:00:00+00'),
('d4444444-4444-4444-4444-444444444409', 'b2222222-2222-2222-2222-222222222201', 'Ayam Goreng', 'Cooked Meals', 10, 'pieces', '2026-04-03', '23:00', 'room_temperature', 'halal', 'completed', 'high', 50.00, 'Fried chicken', '4dd5c1fc-ee11-446a-9317-324029685af2', '2026-04-03 19:00:00+00', '2026-04-03 18:00:00+00'),
('d4444444-4444-4444-4444-444444444410', 'b2222222-2222-2222-2222-222222222201', 'Kuih Muih', 'Snacks & Desserts', 20, 'pieces', '2026-04-04', '12:00', 'room_temperature', 'halal', 'completed', 'medium', 30.00, 'Traditional kuih', '4dd5c1fc-ee11-446a-9317-324029685af2', '2026-04-03 19:00:00+00', '2026-04-03 18:00:00+00'),

-- Batch 005 (Warung Selera - PARTIALLY CLAIMED)
('d4444444-4444-4444-4444-444444444411', 'b2222222-2222-2222-2222-222222222202', 'Mee Goreng', 'Cooked Meals', 12, 'packs', '2026-04-04', '23:59', 'room_temperature', 'halal', 'claimed', 'high', 48.00, 'Spicy fried noodles', 'b3186cb3-b3a0-47eb-8054-b186cbe7cc5a', '2026-04-04 15:00:00+00', '2026-04-04 14:00:00+00'),
('d4444444-4444-4444-4444-444444444412', 'b2222222-2222-2222-2222-222222222202', 'Nasi Goreng Kampung', 'Cooked Meals', 10, 'packs', '2026-04-04', '23:59', 'room_temperature', 'halal', 'available', 'high', 50.00, 'Village style fried rice', NULL, NULL, '2026-04-04 14:00:00+00'),
('d4444444-4444-4444-4444-444444444413', 'b2222222-2222-2222-2222-222222222202', 'Rojak Buah', 'Fruits', 8, 'portions', '2026-04-04', '22:00', 'refrigerated', 'halal', 'available', 'high', 32.00, 'Fresh fruit rojak', NULL, NULL, '2026-04-04 14:00:00+00'),

-- Batch 006 (Warung Selera - AVAILABLE)
('d4444444-4444-4444-4444-444444444414', 'b2222222-2222-2222-2222-222222222203', 'Rendang Daging', 'Cooked Meals', 5, 'kg', '2026-04-06', '20:00', 'refrigerated', 'halal', 'available', 'medium', 150.00, 'Beef rendang', NULL, NULL, '2026-04-04 11:00:00+00'),
('d4444444-4444-4444-4444-444444444415', 'b2222222-2222-2222-2222-222222222203', 'Sayur Lodeh', 'Vegetables', 3, 'kg', '2026-04-05', '18:00', 'refrigerated', 'halal', 'available', 'medium', 36.00, 'Vegetable curry', NULL, NULL, '2026-04-04 11:00:00+00'),

-- Batch 007 (Kedai Mas - COMPLETED)
('d4444444-4444-4444-4444-444444444416', 'c3333333-3333-3333-3333-333333333301', 'Char Kuey Teow', 'Cooked Meals', 8, 'packs', '2026-04-02', '20:00', 'room_temperature', 'non_halal', 'completed', 'high', 48.00, 'Contains pork lard', '539f2bd9-918f-4a67-85ba-e2ae69389186', '2026-04-02 14:00:00+00', '2026-04-02 12:00:00+00'),
('d4444444-4444-4444-4444-444444444417', 'c3333333-3333-3333-3333-333333333301', 'Kopi O Ice', 'Beverages', 10, 'cups', '2026-04-02', '18:00', 'refrigerated', 'halal', 'completed', 'high', 25.00, 'Iced black coffee', '539f2bd9-918f-4a67-85ba-e2ae69389186', '2026-04-02 14:00:00+00', '2026-04-02 12:00:00+00'),

-- Batch 008 (Kedai Mas - RESERVED)
('d4444444-4444-4444-4444-444444444418', 'c3333333-3333-3333-3333-333333333302', 'Curry Puff', 'Snacks & Desserts', 20, 'pieces', '2026-04-05', '17:00', 'room_temperature', 'halal', 'claimed', 'low', 40.00, 'Potato curry filling', '539f2bd9-918f-4a67-85ba-e2ae69389186', '2026-04-04 10:00:00+00', '2026-04-04 09:00:00+00'),
('d4444444-4444-4444-4444-444444444419', 'c3333333-3333-3333-3333-333333333302', 'Egg Tarts', 'Snacks & Desserts', 12, 'pieces', '2026-04-05', '17:00', 'room_temperature', 'halal', 'claimed', 'low', 36.00, 'Portuguese style', '539f2bd9-918f-4a67-85ba-e2ae69389186', '2026-04-04 10:00:00+00', '2026-04-04 09:00:00+00'),
('d4444444-4444-4444-4444-444444444420', 'c3333333-3333-3333-3333-333333333302', 'Iced Lemon Tea', 'Beverages', 15, 'cups', '2026-04-04', '18:00', 'refrigerated', 'halal', 'claimed', 'high', 30.00, NULL, '539f2bd9-918f-4a67-85ba-e2ae69389186', '2026-04-04 10:00:00+00', '2026-04-04 09:00:00+00'),

-- Batch 009 (Kedai Mas - AVAILABLE scheduled)
('d4444444-4444-4444-4444-444444444421', 'c3333333-3333-3333-3333-333333333303', 'Toast Set', 'Bakery & Bread', 10, 'sets', '2026-04-06', '12:00', 'room_temperature', 'halal', 'available', 'low', 35.00, 'Kaya butter toast with egg', NULL, NULL, '2026-04-04 13:00:00+00'),
('d4444444-4444-4444-4444-444444444422', 'c3333333-3333-3333-3333-333333333303', 'Fried Carrot Cake', 'Cooked Meals', 8, 'portions', '2026-04-05', '18:00', 'room_temperature', 'halal', 'available', 'medium', 32.00, 'White radish cake', NULL, NULL, '2026-04-04 13:00:00+00');

-- ============================================================================
-- 3. COMPLAINTS
-- ============================================================================

INSERT INTO complaints (id, reporter_id, reported_user_id, complaint_type, description, related_entity_type, related_entity_id, status, resolution, resolved_by, created_at, updated_at) VALUES

-- Complaint 1: NGO didn't show up for pickup
('e5555555-5555-5555-5555-555555555501', '4b62fcb4-9c67-47c8-b4e9-6f5746b536ae', '4dd5c1fc-ee11-446a-9317-324029685af2', 'no_show',
'NGO claimed 15 packs of nasi lemak but did not show up for pickup. We waited for 2 hours past the scheduled time. Food had to be discarded as it was getting late.',
'donation_batch', 'b2222222-2222-2222-2222-222222222201', 'resolved',
'Contacted NGO - they had a vehicle breakdown. Issued warning and updated their reliability score. Advised better communication in future.',
'a841c60a-fddd-4f96-8129-28d67206238c', '2026-04-03 23:00:00+00', '2026-04-04 09:00:00+00'),

-- Complaint 2: Food quality issue
('e5555555-5555-5555-5555-555555555502', 'b3186cb3-b3a0-47eb-8054-b186cbe7cc5a', '5d528b96-63bf-40b7-b0ff-d1add04c159d', 'food_quality',
'Received bread that was already stale and had mold on some pieces. The expiry date stated was still 2 days away but the condition suggests it was older stock.',
'donation_batch', 'c3333333-3333-3333-3333-333333333301', 'resolved',
'Investigated with vendor. Found storage issue at their end. Vendor has agreed to improve storage conditions and label items more accurately.',
'a841c60a-fddd-4f96-8129-28d67206238c', '2026-04-02 18:00:00+00', '2026-04-03 10:00:00+00'),

-- Complaint 3: Incorrect quantity
('e5555555-5555-5555-5555-555555555503', '539f2bd9-918f-4a67-85ba-e2ae69389186', 'd53aed42-abcd-461c-b41a-488cc288a471', 'quantity_mismatch',
'Listed 20 pieces of ayam goreng but only received 12 pieces. This affected our distribution planning for the day.',
'donation_item', 'd4444444-4444-4444-4444-444444444409', 'pending', NULL, NULL, '2026-04-04 08:00:00+00', '2026-04-04 08:00:00+00'),

-- Complaint 4: Late pickup by NGO
('e5555555-5555-5555-5555-555555555504', 'd53aed42-abcd-461c-b41a-488cc288a471', 'b3186cb3-b3a0-47eb-8054-b186cbe7cc5a', 'late_pickup',
'NGO was supposed to pickup at 9pm but only arrived at 10:30pm. Our staff had to stay back overtime.',
'donation_batch', 'b2222222-2222-2222-2222-222222222202', 'pending', NULL, NULL, '2026-04-04 12:00:00+00', '2026-04-04 12:00:00+00'),

-- Complaint 5: Communication issue
('e5555555-5555-5555-5555-555555555505', '4dd5c1fc-ee11-446a-9317-324029685af2', '4b62fcb4-9c67-47c8-b4e9-6f5746b536ae', 'communication',
'Vendor did not respond to our calls when we arrived for pickup. Location was also incorrect - had to call multiple times to find the actual pickup point.',
'donation_batch', 'a1111111-1111-1111-1111-111111111101', 'resolved',
'Vendor apologized - phone was on silent during busy period. Updated pickup instructions with clearer directions.',
'a841c60a-fddd-4f96-8129-28d67206238c', '2026-04-01 16:00:00+00', '2026-04-02 11:00:00+00');

-- ============================================================================
-- 4. DISTRIBUTION RECORDS (Pickups completed by NGOs)
-- ============================================================================

INSERT INTO distribution_records (id, ngo_user_id, claim_id, distribution_date, quantity_distributed, beneficiary_group, notes, created_at) VALUES

-- Terminal Kasih distributions
('f6666666-6666-6666-6666-666666666601', 'b3186cb3-b3a0-47eb-8054-b186cbe7cc5a', NULL, '2026-04-01', '65 items', 'Homeless community', 'Distributed at Jalan TAR area - croissants, roti canai, kaya buns from Permai Bakery', '2026-04-01 20:00:00+00'),
('f6666666-6666-6666-6666-666666666602', 'b3186cb3-b3a0-47eb-8054-b186cbe7cc5a', NULL, '2026-04-04', '12 packs', 'Low-income families', 'Mee goreng from Warung Selera distributed to Flat Sri Pahang residents', '2026-04-04 18:00:00+00'),

-- Bantu Makan Malaysia distributions
('f6666666-6666-6666-6666-666666666603', '4dd5c1fc-ee11-446a-9317-324029685af2', NULL, '2026-04-03', '45 items', 'Elderly care center', 'Nasi lemak, ayam goreng and kuih distributed to Pusat Jagaan Warga Emas', '2026-04-03 21:00:00+00'),

-- Food Aid Foundation distributions
('f6666666-6666-6666-6666-666666666604', '539f2bd9-918f-4a67-85ba-e2ae69389186', NULL, '2026-04-02', '18 items', 'Refugee community', 'Char kuey teow and drinks distributed at UNHCR center', '2026-04-02 19:00:00+00'),
('f6666666-6666-6666-6666-666666666605', '539f2bd9-918f-4a67-85ba-e2ae69389186', NULL, '2026-04-04', '47 items', 'School feeding program', 'Curry puffs, egg tarts, and drinks for SK Setapak students', '2026-04-04 12:00:00+00');

-- ============================================================================
-- 5. NOTIFICATIONS (Sample notifications)
-- ============================================================================

INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at) VALUES

-- Notifications for vendors
('17777777-7777-7777-7777-777777777701', '4b62fcb4-9c67-47c8-b4e9-6f5746b536ae', 'claim_created', 'Food Items Claimed', 'Terminal Kasih has claimed 3 item(s) from batch DON-001. Please prepare for pickup.', 'donation_batch', 'a1111111-1111-1111-1111-111111111101', true, '2026-04-01 10:00:00+00'),
('17777777-7777-7777-7777-777777777702', 'd53aed42-abcd-461c-b41a-488cc288a471', 'claim_created', 'Food Items Claimed', 'Terminal Kasih has claimed 1 item(s) from batch DON-005. Please prepare for pickup.', 'donation_batch', 'b2222222-2222-2222-2222-222222222202', false, '2026-04-04 15:00:00+00'),
('17777777-7777-7777-7777-777777777703', '5d528b96-63bf-40b7-b0ff-d1add04c159d', 'claim_created', 'Food Items Claimed', 'Food Aid Foundation has claimed 3 item(s) from batch DON-008. Please prepare for pickup.', 'donation_batch', 'c3333333-3333-3333-3333-333333333302', false, '2026-04-04 10:00:00+00'),

-- Notifications for NGOs
('17777777-7777-7777-7777-777777777704', 'b3186cb3-b3a0-47eb-8054-b186cbe7cc5a', 'donation_recommended', 'Recommended Donation Available', 'Permai Bakery has posted items matching your preferences (Bakery & Bread) near your location. Available for pickup at 12, Jalan Bukit Bintang.', 'donation_batch', 'a1111111-1111-1111-1111-111111111102', false, '2026-04-04 10:05:00+00'),
('17777777-7777-7777-7777-777777777705', '539f2bd9-918f-4a67-85ba-e2ae69389186', 'donation_recommended', 'Recommended Donation Available', 'Kedai Mas has posted items matching your preferences (Bakery & Bread, Snacks & Desserts) near your location.', 'donation_batch', 'c3333333-3333-3333-3333-333333333303', false, '2026-04-04 13:05:00+00'),
('17777777-7777-7777-7777-777777777706', '4dd5c1fc-ee11-446a-9317-324029685af2', 'pickup_completed', 'Pickup Completed', 'Your pickup of "Nasi Lemak" from Warung Selera has been confirmed. The food is now in your possession.', 'donation_batch', 'b2222222-2222-2222-2222-222222222201', true, '2026-04-03 21:00:00+00'),

-- Admin notifications
('17777777-7777-7777-7777-777777777707', 'a841c60a-fddd-4f96-8129-28d67206238c', 'complaint_resolved', 'Complaint Resolved', 'Complaint #001 regarding no-show has been marked as resolved.', 'complaint', 'e5555555-5555-5555-5555-555555555501', true, '2026-04-04 09:00:00+00');

-- ============================================================================
-- SUMMARY OF GENERATED DATA
-- ============================================================================
-- Donation Batches: 9 (3 per vendor)
--   - Completed: 3
--   - Partially Claimed: 1
--   - Reserved: 1
--   - Available: 4
--
-- Donation Items: 22
--   - With estimated_value ranging from RM 25 to RM 150
--   - Various categories: Bakery, Cooked Meals, Fruits, Vegetables, Beverages, Snacks
--   - Various statuses: available, claimed, completed
--
-- Complaints: 5
--   - Resolved: 3
--   - Pending: 2
--   - Types: no_show, food_quality, quantity_mismatch, late_pickup, communication
--
-- Distribution Records: 5
--   - Shows NGO distributions to various beneficiary groups
--
-- Notifications: 7
--   - Mix of claim notifications, recommendations, and completion notices
-- ============================================================================
