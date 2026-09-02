import './src/load-env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const usVendors = await prisma.vendorProfile.findMany({
    where: { warehouseRegionKey: 'US' },
    select: { id: true, storeName: true },
  });

  if (usVendors.length === 0) {
    console.log('No US vendors found. Nothing to clean up.');
    return;
  }

  const usVendorIds = usVendors.map(v => v.id);
  console.log(`Found ${usVendors.length} US vendor(s):`, usVendors.map(v => v.storeName));

  const lowPriceProducts = await prisma.product.findMany({
    where: {
      vendorId: { in: usVendorIds },
      basePriceMinorUnits: { lt: 5000 },
    },
    select: { id: true, name: true, basePriceMinorUnits: true, vendorId: true },
  });

  console.log(`Found ${lowPriceProducts.length} US pod product(s) under $50.`);

  if (lowPriceProducts.length === 0) {
    return;
  }

  const productIds = lowPriceProducts.map(p => p.id);

  await prisma.$transaction(async (tx) => {
    for (const id of productIds) {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.productRegionPrice.deleteMany({ where: { productId: id } });
      await tx.review.deleteMany({ where: { productId: id } });
      await tx.wishlistItem.deleteMany({ where: { productId: id } });
      await tx.orderItem.deleteMany({ where: { productId: id } });
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    }
  });

  console.log(`Deleted ${lowPriceProducts.length} low-priced US pod products.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
