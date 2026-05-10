-- Sample Data for Testing "Receive Stock" Feature
-- Insert into your Supabase database using the SQL Editor

-- 1. Create a Supplier (if not exists)
INSERT INTO "Supplier" (id, name, country, currency, contact, email, "createdAt")
VALUES (
  'supplier_uae_001',
  'Dubai Perfumes Trading Co.',
  'UAE',
  'USD',
  '+971-4-123-4567',
  'sales@dubaiperftrade.com',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Products (if not exists)
INSERT INTO "Product" (id, name, sku, category, brand, description, unit, "costPrice", "sellingPrice", currency, "createdAt")
VALUES
(
  'product_perfume_001',
  'Dior Sauvage Eau de Parfum',
  'DIOR-SAV-100ML',
  'PERFUME',
  'Dior',
  '100ml Premium Perfume',
  'bottle',
  45.00,
  120.00,
  'GHS',
  NOW()
),
(
  'product_perfume_002',
  'Chanel No. 5 Classic',
  'CHANEL-5-50ML',
  'PERFUME',
  'Chanel',
  '50ml Classic Perfume',
  'bottle',
  55.00,
  150.00,
  'GHS',
  NOW()
),
(
  'product_gadget_001',
  'Samsung Phone Case',
  'SAM-CASE-001',
  'GADGET',
  'Samsung',
  'Protective Phone Case',
  'piece',
  8.00,
  25.00,
  'GHS',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create a Purchase (Receiving Stock)
INSERT INTO "Purchase" (
  id,
  "supplierId",
  "invoiceNumber",
  "purchaseDate",
  currency,
  "exchangeRate",
  "totalForeign",
  "totalGHS",
  "shippingCostForeign",
  "shippingCostGHS",
  notes,
  "createdAt"
)
VALUES (
  'purchase_001',
  'supplier_uae_001',
  'INV-2024-001',
  NOW(),
  'USD',
  12.50,
  1000.00,
  12500.00,
  50.00,
  625.00,
  'First shipment from Dubai supplier',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. Create Purchase Items (Stock being received)
INSERT INTO "PurchaseItem" (
  id,
  "purchaseId",
  "productId",
  quantity,
  "unitCost",
  "totalCost",
  "unitCostGHS",
  "shippingAllocated",
  "trueCostPerUnit",
  "profitMargin",
  "outletPrice"
)
VALUES
(
  'purchase_item_001',
  'purchase_001',
  'product_perfume_001',
  20,
  45.00,
  900.00,
  562.50,
  25.00,
  587.50,
  20.0,
  120.00
),
(
  'purchase_item_002',
  'purchase_001',
  'product_perfume_002',
  15,
  55.00,
  825.00,
  10312.50,
  18.75,
  10331.25,
  18.0,
  150.00
),
(
  'purchase_item_003',
  'purchase_001',
  'product_gadget_001',
  50,
  8.00,
  400.00,
  100.00,
  6.25,
  106.25,
  25.0,
  25.00
)
ON CONFLICT (id) DO NOTHING;

-- 5. Update or Create Inventory for received products
INSERT INTO "Inventory" (id, "productId", quantity, location, "updatedAt")
VALUES
(
  'inv_perfume_001',
  'product_perfume_001',
  20,
  'Warehouse - Shelf A1',
  NOW()
),
(
  'inv_perfume_002',
  'product_perfume_002',
  15,
  'Warehouse - Shelf A2',
  NOW()
),
(
  'inv_gadget_001',
  'product_gadget_001',
  50,
  'Warehouse - Shelf B1',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Summary of what was inserted:
-- ✅ 1 Supplier: Dubai Perfumes Trading Co. (UAE)
-- ✅ 3 Products:
--    - Dior Sauvage (20 units @ $45 each)
--    - Chanel No. 5 (15 units @ $55 each)
--    - Samsung Phone Case (50 units @ $8 each)
-- ✅ 1 Purchase Order: INV-2024-001 (Total: $1,000 USD / GHS 12,500)
-- ✅ 3 Purchase Items with cost calculations
-- ✅ 3 Inventory entries with quantities and locations

-- To view the data:
-- SELECT * FROM "Purchase" WHERE "invoiceNumber" = 'INV-2024-001';
-- SELECT * FROM "PurchaseItem" WHERE "purchaseId" = 'purchase_001';
-- SELECT * FROM "Inventory" WHERE location LIKE 'Warehouse%';
