require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInventory() {
  try {
    const purchases = await prisma.purchase.findMany({
      include: { items: true },
    });

    for (const purchase of purchases) {
      for (const item of purchase.items) {
        const inv = await prisma.inventory.findFirst({
          where: { productId: item.productId, location: 'WAREHOUSE' },
        });
        
        if (!inv) {
          console.log(`Creating inventory for product ${item.productId}: ${item.quantity} units`);
          await prisma.inventory.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              location: 'WAREHOUSE',
            },
          });
        }
      }
    }
    
    console.log('✓ Inventory fixed!');
    await prisma.$disconnect();
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
  }
}

fixInventory();
