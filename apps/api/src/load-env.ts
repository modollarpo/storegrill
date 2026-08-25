import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { config } from 'dotenv';

for (const p of [join(process.cwd(), '.env'), resolve(process.cwd(), 'apps/api/.env')]) {
  if (existsSync(p)) {
    config({ path: p });
    break;
  }
}
