import '../src/load-env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  console.error('Set DATABASE_URL to the pod PostgreSQL connection string first.');
  process.exit(1);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const VENDOR_HINTS = ['Costway'];

const NARROW_PARENTS: Record<string, string> = {
  'makeup vanities': 'health & beauty',
};

const UNCATEGORISED = new Set(['uncategorised', 'uncategorized', 'other']);

const PRODUCT_OVERRIDES: Record<string, string> = {
  'Floor Standing Utility Cabinet with Adjustable': 'Furniture',
  'Dining Stool Set of 2 with Rubber Wood Frame and Woven Paper Seat': 'Furniture',
  'Industrial': 'Furniture',
  '2-Piece Counter Height Bar Stool Set with Padded Seat and Rubber Wood Legs-Brown': 'Furniture',
  'Mobile Serving Trolley Cart with Rubber Wood Top and Drawer': 'Kitchen',
  '2-seat Cushioned Couch with Rubber Wood Frame and Classic Tufted Design-Grey': 'Furniture',
  '3-4 Kids Large Play Tent House with 2 Opening Doors Star Lights and Plaid': 'Toys & Hobbies',
  '3-In-1 Cat Tree with 3 Full-Wrapped Sisal Posts and Removable Mat & Platforms-Multicolor': 'Pets',
  '3 Piece Patio Furniture Set with Seat and Back Cushions for Backyard Porch Garden-Grey': 'Outdoor',
  'Double-Shelf Movable BBQ Cart with 4 Lockable Wheels and Side Handle-Black': 'Outdoor',
  'Industrial Entertainment Center with 4 Open Shelves-Rustic Brown': 'Furniture',
  'Home Towel Warmer with 0-90Min Timer and Overheat Protection-White': 'Bath',
  'Reclining Home Office Chair Chenille Fabric Upholstered Computer Desk Chair with Padded Linkage Armrests-Grey': 'Furniture',
  'Kids Kitchen Playset Toy Play Kitchen with 4 Fabric Drawers for 3+ Years Old-White': 'Toys & Hobbies',
  '4 PCS Armless Side Chairs with Upholstered Cushion and Sturdy Metal Frame': 'Furniture',
  'Licensed Jeep Ride On Push Car with Steering Wheel and Engine Sound for Ages 18-36 Months': 'Toys & Hobbies',
  'Entryway Wall Mounted Coat Rack Coat Rack with 5 Double Hooks and 2-Door Cabinet': 'Furniture',
  '3-Tray': 'Kitchen',
  'Outdoor Adjustable Chaise Lounge Chair with 5-Position Backrest-Black': 'Outdoor',
};

const KEYWORDS: { match: string; target: string }[] = [];

const TAGLINES: Record<string, string> = {
  appliances: 'Upgrade your home with the essentials that actually do the work.',
  'baby & kids': 'Nurseries, toys and everyday essentials for growing families.',
  bath: 'Cabinets, storage and fixtures to keep every washroom organised.',
  decor: 'Mirrors, lighting and accents that give every room its character.',
  furniture: 'Beds, desks, dining and living pieces for every room in the house.',
  'health & beauty': 'Wellness, massage and self-care for home and on the go.',
  kitchen: 'Cookware, organisers and storage for a kitchen that works.',
  outdoor: 'Grills, patio furniture and garden gear made for the outdoors.',
  pets: 'Beds, feeders and supplies your cat, dog or small pet will love.',
  sports: 'Exercise machines, yoga and gear for every kind of active day.',
  'toys & hobbies': 'Play, learning and creative hobbies for kids of all ages.',
  fragrances: 'Designer perfumes and colognes for every season and occasion.',
};

const MIN_FEATURED_PRODUCTS = 10;

const DENY_FEATURED = new Set(['uncategorised', 'uncategorized', 'other', 'costway']);

type Category = { id: string; name: string; slug: string; parentId: string | null };
type Product = { id: string; name: string; categoryId: string };

async function main() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, parentId: true },
  });
  const vendorNames = new Set(
    (await prisma.vendorProfile.findMany({ select: { storeName: true } })).map(v => norm(v.storeName)),
  );
  const productRows = await prisma.product.findMany({
    select: { id: true, name: true, categoryId: true },
  });
  const activeByCategory = new Map(
    (await prisma.product.groupBy({ by: ['categoryId'], where: { status: 'ACTIVE' }, _count: true })).map(
      r => [r.categoryId, r._count] as const,
    ),
  );

  const byId = new Map(categories.map(c => [c.id, c]));
  const childrenOf = new Map<string, Category[]>();
  for (const c of categories) {
    if (c.parentId && byId.has(c.parentId)) {
      const arr = childrenOf.get(c.parentId) ?? [];
      arr.push(c);
      childrenOf.set(c.parentId, arr);
    }
  }
  const roots = categories.filter(c => !c.parentId || !byId.has(c.parentId));

  const plan: string[] = [];
  const warnings: string[] = [];
  const writes: Promise<unknown>[] = [];
  const log = (line: string) => plan.push(line);

  function subtreeActive(c: Category): number {
    let total = activeByCategory.get(c.id) ?? 0;
    for (const child of childrenOf.get(c.id) ?? []) total += subtreeActive(child);
    return total;
  }

  function moveProducts(fromId: string, toId: string) {
    const products = productRows.filter(p => p.categoryId === fromId);
    if (products.length === 0) return;
    for (const p of products) p.categoryId = toId;
    writes.push(prisma.product.updateMany({ where: { categoryId: fromId }, data: { categoryId: toId } }));
    log(`  move ${products.length} product(s) out of "${byId.get(fromId)?.name}" -> "${byId.get(toId)?.name}"`);
  }

  function moveProduct(prod: Product, toId: string) {
    prod.categoryId = toId;
    writes.push(prisma.product.update({ where: { id: prod.id }, data: { categoryId: toId } }));
    log(`  move product "${prod.name}" -> "${byId.get(toId)?.name}"`);
  }

  function removeChild(parentId: string | null, childId: string) {
    if (!parentId) return;
    const arr = childrenOf.get(parentId);
    if (!arr) return;
    const index = arr.findIndex(c => c.id === childId);
    if (index >= 0) arr.splice(index, 1);
  }

  function reparent(child: Category, newParentId: string) {
    removeChild(child.parentId, child.id);
    child.parentId = newParentId;
    const arr = childrenOf.get(newParentId) ?? [];
    arr.push(child);
    childrenOf.set(newParentId, arr);
    writes.push(prisma.category.update({ where: { id: child.id }, data: { parentId: newParentId } }));
    log(`  re-parent "${child.name}" under "${byId.get(newParentId)?.name ?? 'root'}"`);
  }

  function promoteToRoot(child: Category) {
    removeChild(child.parentId, child.id);
    child.parentId = null;
    writes.push(prisma.category.update({ where: { id: child.id }, data: { parentId: null } }));
    log(`  promote "${child.name}" to top-level`);
  }

  function deleteCategory(c: Category) {
    if ((childrenOf.get(c.id) ?? []).length > 0 || productRows.some(p => p.categoryId === c.id)) return false;
    writes.push(prisma.category.delete({ where: { id: c.id } }));
    removeChild(c.parentId, c.id);
    childrenOf.delete(c.id);
    log(`  delete empty category "${c.name}"`);
    return true;
  }

  function postOrder(node: Category, acc: Category[] = []): Category[] {
    for (const child of childrenOf.get(node.id) ?? []) postOrder(child, acc);
    acc.push(node);
    return acc;
  }

  function mergeInto(sub: Category, canonical: Category) {
    for (const child of [...(childrenOf.get(sub.id) ?? [])]) {
      const twin = (childrenOf.get(canonical.id) ?? []).find(c2 => norm(c2.name) === norm(child.name));
      if (twin) {
        mergeInto(child, twin);
      } else {
        reparent(child, canonical.id);
      }
    }
    moveProducts(sub.id, canonical.id);
    deleteCategory(sub);
  }

  log(`Tree: ${roots.length} root(s), ${categories.length} categor(y|ies), ${productRows.length} product(s).`);

  const vendorRoots = roots.filter(r => VENDOR_HINTS.includes(r.name) || vendorNames.has(norm(r.name)));
  for (const vendorRoot of vendorRoots) {
    log(`Vendor-named root: "${vendorRoot.name}" (${subtreeActive(vendorRoot)} active product(s))`);
    const subtreeIds = new Set(postOrder(vendorRoot).map(c => c.id));

    for (const descendant of postOrder(vendorRoot).slice(0, -1)) {
      const namesake = categories
        .filter(x => !subtreeIds.has(x.id) && norm(x.name) === norm(descendant.name))
        .sort((a, b) => subtreeActive(b) - subtreeActive(a))[0];
      if (namesake) {
        log(`  merge "${descendant.name}" into canonical "${namesake.name}"`);
        mergeInto(descendant, namesake);
      } else if (subtreeActive(descendant) > 0) {
        log(`  promote "${descendant.name}" (${subtreeActive(descendant)} active) to top-level - no canonical found`);
        promoteToRoot(descendant);
        roots.push(descendant);
      } else {
        deleteCategory(descendant);
      }
    }

    const direct = productRows.filter(p => p.categoryId === vendorRoot.id);
    const unmatched: string[] = [];
    for (const prod of direct) {
      const override = PRODUCT_OVERRIDES[prod.name];
      const target = override
        ? roots.find(r => norm(r.name) === norm(override)) ?? categories.find(c => norm(c.name) === norm(override))
        : undefined;
      if (target) moveProduct(prod, target.id);
      else unmatched.push(prod.name);
    }
    if (unmatched.length > 0) {
      warnings.push(
        `Cannot remove root "${vendorRoot.name}": ${unmatched.length} unmapped direct product(s): ${unmatched.map(n => `"${n}"`).join(', ')}`,
      );
    } else if (deleteCategory(vendorRoot)) {
      const index = roots.indexOf(vendorRoot);
      if (index >= 0) roots.splice(index, 1);
    } else {
      warnings.push(`Root "${vendorRoot.name}" not empty after cleanup - review manually`);
    }
  }

  const nameGroups = new Map<string, Category[]>();
  for (const root of roots) {
    const key = norm(root.name);
    if (nameGroups.has(key)) nameGroups.get(key)!.push(root);
    else nameGroups.set(key, [root]);
  }
  for (const [name, group] of nameGroups) {
    if (group.length < 2) continue;
    log(`Duplicate root name "${name}" x${group.length}`);
    const canonical = [...group].sort((a, b) => subtreeActive(b) - subtreeActive(a))[0];
    for (const dup of group) {
      if (dup.id === canonical.id) continue;
      log(`  merge "${dup.name}" (${dup.slug}) into "${canonical.name}" (${canonical.slug})`);
      mergeInto(dup, canonical);
      const index = roots.indexOf(dup);
      if (index >= 0) roots.splice(index, 1);
    }
  }

  for (const root of [...roots]) {
    const targetName = NARROW_PARENTS[norm(root.name)];
    if (!targetName) continue;
    const target = roots.find(r => norm(r.name) === targetName);
    if (!target) {
      warnings.push(`Narrow root "${root.name}" has no canonical parent "${targetName}" - skipped`);
      continue;
    }
    log(`Re-parent narrow root "${root.name}" under "${target.name}"`);
    reparent(root, target.id);
    const index = roots.indexOf(root);
    if (index >= 0) roots.splice(index, 1);
  }

  for (const root of [...roots]) {
    if (!UNCATEGORISED.has(norm(root.name))) continue;
    const unmatched: string[] = [];
    for (const prod of productRows.filter(p => p.categoryId === root.id)) {
      const override = PRODUCT_OVERRIDES[prod.name];
      const match = override
        ? { target: override }
        : KEYWORDS.find(k => norm(prod.name).includes(k.match));
      if (match) {
        const target = roots.find(r => norm(r.name) === norm(match.target));
        if (target) {
          moveProduct(prod, target.id);
          continue;
        }
      }
      unmatched.push(prod.name);
    }
    if (unmatched.length > 0) {
      warnings.push(`Uncategorised bucket keeps ${unmatched.length} product(s): ${unmatched.map(n => `"${n}"`).join(', ')}`);
    } else if (deleteCategory(root)) {
      const index = roots.indexOf(root);
      if (index >= 0) roots.splice(index, 1);
    }
  }

  const featuredCandidates = roots.map(r => ({ root: r, count: subtreeActive(r) })).sort((a, b) => b.count - a.count);
  for (let i = 0; i < featuredCandidates.length; i++) {
    const { root, count } = featuredCandidates[i];
    const key = norm(root.name);
    const featured = count >= MIN_FEATURED_PRODUCTS && !DENY_FEATURED.has(key);
    writes.push(
      prisma.category.update({
        where: { id: root.id },
        data: { isFeatured: featured, displayOrder: featured ? i + 1 : 0, tagline: featured ? (TAGLINES[key] ?? null) : null },
      }),
    );
    log(`${featured ? 'FEATURED' : 'hidden  '} #${i + 1} ${root.name} (${count} active)`);
  }

  console.log('\n=== PLAN ===');
  for (const line of plan) console.log(line);
  if (warnings.length > 0) {
    console.log('\n=== WARNINGS ===');
    for (const line of warnings) console.log('- ' + line);
  }

  if (!APPLY) {
    console.log('\nDry run - pass --apply to execute.');
  } else {
    await prisma.$transaction(writes);
    console.log(`\nApplied ${writes.length} write(s).`);
  }
}

main()
  .catch(e => {
    console.error('Curation failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());