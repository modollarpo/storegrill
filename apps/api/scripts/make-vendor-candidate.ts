import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EMAIL = 'vendor-apply-ui@example.com';
const PASSWORD = 'Passw0rd123';

async function main() {
  const hashed = await bcrypt.hash(PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      password: hashed,
      emailVerified: new Date(),
      role: 'CUSTOMER',
    },
    create: {
      email: EMAIL,
      name: 'Apply UI Tester',
      password: hashed,
      role: 'CUSTOMER',
      emailVerified: new Date(),
    },
  });

  await prisma.vendorProfile.deleteMany({ where: { userId: user.id } });
  console.log(`candidate ready: ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
