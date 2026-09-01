import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const REGIONS = [
  { key: 'UK', name: 'United Kingdom', languages: 'en', defaultLanguage: 'en', currencies: 'GBP', defaultCurrency: 'GBP', defaultTimezone: 'Europe/London' },
  { key: 'US', name: 'United States', languages: 'en', defaultLanguage: 'en', currencies: 'USD', defaultCurrency: 'USD', defaultTimezone: 'America/New_York' },
  { key: 'EU', name: 'European Union', languages: 'en,de,fr', defaultLanguage: 'en', currencies: 'EUR', defaultCurrency: 'EUR', defaultTimezone: 'Europe/Berlin' },
  { key: 'AE', name: 'United Arab Emirates', languages: 'ar,en', defaultLanguage: 'ar', currencies: 'AED', defaultCurrency: 'AED', defaultTimezone: 'Asia/Dubai' },
  { key: 'NG', name: 'Nigeria', languages: 'en,ha,yo,ig', defaultLanguage: 'en', currencies: 'NGN', defaultCurrency: 'NGN', defaultTimezone: 'Africa/Lagos' },
  { key: 'GH', name: 'Ghana', languages: 'en', defaultLanguage: 'en', currencies: 'GHS', defaultCurrency: 'GHS', defaultTimezone: 'Africa/Accra' },
];

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  for (const region of REGIONS) {
    await prisma.region.upsert({
      where: { key: region.key },
      update: {},
      create: region,
    });
    console.log(`Region ready: ${region.key}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: { email, password: passwordHash, name: 'Platform Admin', role: 'ADMIN' },
  });
  console.log(`Admin ready: ${email}`);

  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set in the environment.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    void prisma.$disconnect();
    process.exit(1);
  });
