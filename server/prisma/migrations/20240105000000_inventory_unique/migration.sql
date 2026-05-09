-- Collapse duplicate Inventory rows that share (productId, location).
-- Sum their quantities into the earliest row, prefer a non-null holderId, then delete the rest.

WITH agg AS (
  SELECT
    "productId",
    "location",
    SUM("quantity")::int                                                            AS total_qty,
    (ARRAY_AGG("id"        ORDER BY "updatedAt" ASC))[1]                            AS keep_id,
    (ARRAY_AGG("holderId"  ORDER BY ("holderId" IS NULL) ASC, "updatedAt" ASC))[1]  AS keep_holder
  FROM "Inventory"
  GROUP BY "productId", "location"
)
UPDATE "Inventory" i
SET "quantity" = agg.total_qty,
    "holderId" = agg.keep_holder
FROM agg
WHERE i."id" = agg.keep_id;

DELETE FROM "Inventory" i
USING (
  SELECT
    "productId",
    "location",
    (ARRAY_AGG("id" ORDER BY "updatedAt" ASC))[1] AS keep_id
  FROM "Inventory"
  GROUP BY "productId", "location"
) keep
WHERE i."productId" = keep."productId"
  AND i."location"  = keep."location"
  AND i."id"       <> keep.keep_id;

CREATE UNIQUE INDEX "Inventory_productId_location_key" ON "Inventory"("productId", "location");
