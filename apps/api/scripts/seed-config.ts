import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.platformConfig
  .upsert({ where: { key: 'vendorCommissionPct' }, update: {}, create: { key: 'vendorCommissionPct', value: '12' } })
  .then(r => {
    console.log('config:', r.key, '=', r.value);
  })
  .finally(() => p.$disconnect());
