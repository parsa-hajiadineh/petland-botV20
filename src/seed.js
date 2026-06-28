const prisma = require("./database/prisma");
const productData = require("./data/products");
const { DEFAULT_PROFIT_PERCENT } = require("./config");

async function main() {
  console.log("Clearing existing data...");
  await prisma.cartItem.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  console.log("Existing products and categories cleared.");

  console.log("Seeding categories and products...");

  for (const group of productData) {
    const category = await prisma.category.create({
      data: { title: group.category },
    });
    console.log("Category created:", group.category);

    for (const item of group.items) {
      const status =
        item.costPrice > 0 ? "AVAILABLE" : "UNAVAILABLE";

      await prisma.product.upsert({
        where: { code: item.code },
        update: {
          title: item.title,
          description: item.description || null,
          costPrice: item.costPrice || 0,
          profitPercent:
            item.profitPercent ?? DEFAULT_PROFIT_PERCENT,
          status: item.status || "AVAILABLE",
          categoryId: category.id,
        },
        create: {
          code: item.code,
          title: item.title,
          description: item.description || null,
          costPrice: item.costPrice || 0,
          profitPercent:
            item.profitPercent ?? DEFAULT_PROFIT_PERCENT,
          status: item.status || "AVAILABLE",
          categoryId: category.id,
        },
      });
    }
  }

  const count = await prisma.product.count();
  console.log(`Seed complete. ${count} products in database.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
