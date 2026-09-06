import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123';

async function upsertDemoUser(kind: 'customer' | 'admin', regionKey: string) {
  const email = kind === 'customer' ? 'customer@storegrill.net' : 'admin@storegrill.net';
  const name = kind === 'customer' ? 'John Customer' : 'Admin User';
  const role = kind === 'customer' ? 'CUSTOMER' : 'ADMIN';
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      role,
      name,
    },
    create: {
      email,
      password: passwordHash,
      name,
      role,
      customerProfile:
        kind === 'customer'
          ? {
              create: {
                preferredRegionKey: regionKey,
                defaultCurrency: regionKey === 'US' ? 'USD' : regionKey === 'UK' ? 'GBP' : 'EUR',
                defaultLanguage: 'en',
                shippingAddresses: '[]',
              },
            }
          : undefined,
    },
  });

  console.log(`Demo ${kind} ready: ${email} / ${DEMO_PASSWORD}`);
  return user;
}

async function main() {
  const regionKey = process.env.DEMO_REGION_KEY || 'US';
  await upsertDemoUser('customer', regionKey);
  await upsertDemoUser('admin', regionKey);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
