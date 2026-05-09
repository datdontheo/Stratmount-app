const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== RECEIVED STOCK ===');
  const purchases = await prisma.purchase.findMany({
    include: {
      items: { include: { product: true } },
      supplier: true,
    },
  });
  
  purchases.forEach((p) => {
    console.log(`\nPurchase ID: ${p.id}`);
    console.log(`Date: ${p.purchaseDate}`);
    console.log(`Supplier: ${p.supplier.name}`);
    console.log('Items:');
    p.items.forEach((item) => {
      console.log(`  - ${item.product.name}: ${item.quantity} units`);
    });
  });

  console.log('\n\n=== INVENTORY ===');
  const inventory = await prisma.inventory.findMany({
    include: { product: true },
  });
  
  inventory.forEach((inv) => {
    console.log(`${inv.product.name}: ${inv.quantity} units (${inv.location})`);
  });

  await prisma.$disconnect();
}

diagnose().catch(console.error);
