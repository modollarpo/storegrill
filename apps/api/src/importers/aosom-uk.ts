import { createMoney, roundUpTo99 } from '@Storegrill/shared';
import type {
  AdaptResult,
  AdapterRowError,
  NormalizedProduct,
  NormalizedVariant,
} from './costway.js';
import { OUT_OF_STOCK_THRESHOLD } from './costway.js';

export const AOSOM_UK_PRODUCT_FEED_URL =
  'https://pop-eu-prod.s3.eu-central-1.amazonaws.com/390/200_feed/0/0/51/056920.txt';

export const AOSOM_UK_STOCK_FEED_URL =
  'https://pop-eu-prod.s3.eu-central-1.amazonaws.com/390/200_feed/0/0/4e/056920.txt';

export const AOSOM_UK_SOURCE = `${AOSOM_UK_PRODUCT_FEED_URL}|${AOSOM_UK_STOCK_FEED_URL}`;

export function isAosomUkSource(source: string): boolean {
  return typeof source === 'string' && source.split('|').length === 2 && source.includes(AOSOM_UK_PRODUCT_FEED_URL);
}

export const HOUSE_BRAND = 'HOMCOM';

export interface AosomUkProductRow {
  SKU: string;
  Title: string;
  'Short Description': string;
  Description: string;
  'Base image': string;
  Image: string;
  Category: string;
  Colour: string;
  'Category One': string;
  'Category Two': string;
  Psin: string;
}

export interface AosomUkStockRow {
  SKU: string;
  Stock: string;
  '2B Product Price': string;
  shiping_fee: string;
  '2B-VIP': string;
  '2B-S': string;
  '2B-A': string;
  '2B-B': string;
  '2B-C': string;
  Sin: string;
}

export interface AosomUkMergedRow {
  sku: string;
  title: string;
  shortDescription: string;
  description: string;
  baseImage: string;
  images: string;
  category: string;
  categoryOne: string;
  categoryTwo: string;
  colour: string;
  stock: number;
  sellPriceMinorUnits: number;
}

const PRODUCT_COLS = 11;
const STOCK_COLS = 10;

export function parseAosomUkProductTsv(text: string): AosomUkProductRow[] {
  return (parseTsv(text, PRODUCT_COLS) as string[][]).map(c => ({
    SKU: (c[0] ?? '').trim(),
    Title: (c[1] ?? '').trim(),
    'Short Description': (c[2] ?? '').trim(),
    Description: (c[3] ?? '').trim(),
    'Base image': (c[4] ?? '').trim(),
    Image: (c[5] ?? '').trim(),
    Category: (c[6] ?? '').trim(),
    Colour: (c[7] ?? '').trim(),
    'Category One': (c[8] ?? '').trim(),
    'Category Two': (c[9] ?? '').trim(),
    Psin: (c[10] ?? '').trim(),
  }));
}

export function parseAosomUkStockTsv(text: string): AosomUkStockRow[] {
  return (parseTsv(text, STOCK_COLS) as string[][]).map(c => ({
    SKU: (c[0] ?? '').trim(),
    Stock: (c[1] ?? '').trim(),
    '2B Product Price': (c[2] ?? '').trim(),
    shiping_fee: (c[3] ?? '').trim(),
    '2B-VIP': (c[4] ?? '').trim(),
    '2B-S': (c[5] ?? '').trim(),
    '2B-A': (c[6] ?? '').trim(),
    '2B-B': (c[7] ?? '').trim(),
    '2B-C': (c[8] ?? '').trim(),
    Sin: (c[9] ?? '').trim(),
  }));
}

function parseTsv(text: string, columnCount: number): unknown[][] {
  const rows: string[][] = [];
  const buffer: string[] = [];
  let isHeader = true;
  for (const line of text.split(/\r?\n/)) {
    buffer.push(line);
    if (buffer.join('\n').split('\t').length >= columnCount) {
      const wasHeader = isHeader;
      isHeader = false;
      if (!wasHeader) rows.push(buffer.join('\n').split('\t'));
      buffer.length = 0;
    }
  }
  return rows;
}

export function parseGbpPrice(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const m = String(raw).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const value = Number(m[0]);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function charmGbp(minorUnits: number): number {
  return Number(roundUpTo99(createMoney(BigInt(minorUnits), 'GBP')).amountMinorUnits);
}

export function stripUkBrand(title: string): string {
  let clean = String(title ?? '').trim();
  clean = clean
    .replace(/\bHOMCOM\b/gi, ' ')
    .replace(/\bAosom\b/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  clean = clean.replace(/[-–—]\s*$/, '').trim();
  return clean;
}

export function stripTextBrand(text: string): string {
  return String(text ?? '')
    .replace(/\bHOMCOM\b/gi, ' ')
    .replace(/\bAosom\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanHtml(html: string): string {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

function httpsify(url: string): string {
  return String(url ?? '').trim().replace(/^http:\/\//i, 'https://');
}

export function normalizeAosomUkImages(base: string, images: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (url: string | undefined) => {
    const rewritten = httpsify(String(url ?? '').trim());
    if (!rewritten || rewritten === 'https://') return;
    if (seen.has(rewritten)) return;
    seen.add(rewritten);
    out.push(rewritten);
  };
  push(base);
  for (const url of (images ?? '').split(',')) push(url);
  return out;
}

function sourceUrl(sku: string): string {
  return `https://www.aosom.co.uk/search/?searchterm=${encodeURIComponent(sku)}`;
}

function familyKey(title: string, colour: string): string {
  const clean = stripUkBrand(title).toLowerCase();
  const colourLower = String(colour ?? '').trim().toLowerCase();
  const parts = clean.split(' ').filter(Boolean).filter(p => p !== colourLower);
  return parts.join(' ');
}

/**
 * Maps an Aosom "Category | Category One | Category Two" path onto the canonical
 * Storegrill/Costway category path (the taxonomy Costway dropship feeds already populate).
 * Unmapped combos fall through to the keyword matcher, then to a Storegrill-native path.
 */
const CATEGORY_MAP: Array<{ one: string; two: string; path: string }> = [
  { one: 'Home Furniture', two: 'Sofas', path: 'Furniture > Living Room > Sofas' },
  { one: 'Home Furniture', two: 'Armchairs & Massage Chairs', path: 'Furniture > Living Room > Armchairs' },
  { one: 'Home Furniture', two: 'Ottomans & Footstools', path: 'Furniture > Living Room > Ottomans' },
  { one: 'Home Furniture', two: 'TV Units & Stands', path: 'Furniture > Living Room > TV Stands' },
  { one: 'Home Furniture', two: 'Coffee Tables', path: 'Furniture > Living Room > Coffee Tables' },
  { one: 'Home Furniture', two: 'Side Tables', path: 'Furniture > Living Room > Side Tables' },
  { one: 'Home Furniture', two: 'Bookcases & Shelves', path: 'Furniture > Home Office > Bookcases' },
  { one: 'Home Furniture', two: 'Chest of Drawers', path: 'Furniture > Bedroom > Chest of Drawers' },
  { one: 'Office Furniture', two: 'Office Chairs', path: 'Furniture > Home Office > Office Chairs' },
  { one: 'Office Furniture', two: 'Office Desks', path: 'Furniture > Home Office > Office Desks' },
  { one: 'Office Furniture', two: 'Office Storage', path: 'Furniture > Home Office > Bookcases' },
  { one: 'Kitchen & Dining', two: 'Dining Furniture & Bar Stools', path: 'Kitchen > Kitchen Furniture > Dining Chairs' },
  { one: 'Kitchen & Dining', two: 'Kitchen Furniture', path: 'Kitchen > Kitchen Furniture' },
  { one: 'Kitchen & Dining', two: 'Cleaning', path: 'Kitchen > Cleaning' },
  { one: 'Kitchen & Dining', two: 'Small Kitchen Appliances', path: 'Appliances > Kitchen Appliances' },
  { one: 'Kitchen & Dining', two: 'Wine Racks & Cabinets', path: 'Kitchen > Kitchen Organization > Wine Racks' },
  { one: 'Bedroom Furniture', two: 'Beds', path: 'Furniture > Bedroom > Beds' },
  { one: 'Bedroom Furniture', two: 'Wardrobes', path: 'Furniture > Bedroom > Wardrobes' },
  { one: 'Bedroom Furniture', two: 'Dressing Tables', path: 'Furniture > Bedroom > Dressing Tables' },
  { one: 'Bedroom Furniture', two: 'Bedside Cabinets & Tables', path: 'Furniture > Bedroom > Nightstands' },
  { one: 'Bathroom Furniture', two: 'Bathroom Cabinets', path: 'Bath > Bathroom Cabinets' },
  { one: 'Bathroom Furniture', two: 'Bathroom Mirrors', path: 'Bath > Bathroom Mirrors' },
  { one: 'Bathroom Furniture', two: 'Laundry', path: 'Bath > Laundry' },
  { one: 'Bathroom Furniture', two: 'Bathroom Accessories', path: 'Bath > Bathroom Accessories' },
  { one: 'Storage Solutions', two: 'Storage Cabinets', path: 'Furniture > Living Room > Storage' },
  { one: 'Storage Solutions', two: 'Chest of Drawers', path: 'Furniture > Bedroom > Chest of Drawers' },
  { one: 'Hallway Furniture', two: 'Shoe Storages', path: 'Furniture > Entryway > Shoe Racks & Storage Benches' },
  { one: 'Hallway Furniture', two: 'Coat Racks & Stands', path: 'Furniture > Entryway > Coat Racks & Hall Trees' },
  { one: 'Hallway Furniture', two: 'Console Tables', path: 'Furniture > Entryway > Console Tables' },
  { one: 'Kids Furniture', two: 'Kids Sofas', path: 'Toys & Hobbies > Kids Furniture > Sofas' },
  { one: 'Kids Furniture', two: 'Kids Desks', path: 'Toys & Hobbies > Kids Furniture > Desks' },
  { one: 'Kids Furniture', two: 'Kids Beds', path: 'Toys & Hobbies > Kids Furniture > Beds' },
  { one: 'Kids Furniture', two: 'Kids Storages', path: 'Furniture > Kids > Storage' },
  { one: 'Kids Furniture', two: 'Kids Step Stools', path: 'Furniture > Kids > Step Stools' },
  { one: 'Lighting', two: 'Floor & Table Lamps', path: 'Decor > Lighting > Lamps' },
  { one: 'Lighting', two: 'Ceiling Lights', path: 'Decor > Lighting > Ceiling Lights' },
  { one: 'Lighting', two: 'Wall Lamps', path: 'Decor > Lighting > Wall Sconces' },
  { one: 'Heating & Cooling', two: 'Heating', path: 'Appliances > Heating' },
  { one: 'Heating & Cooling', two: 'Fans', path: 'Appliances > Cooling > Fans' },
  { one: 'Heating & Cooling', two: 'Air conditioning', path: 'Appliances > Cooling > Air Conditioners' },
  { one: 'Heating & Cooling', two: 'Dehumidifiers & Air Purifiers', path: 'Appliances > Vacuums & Cleaners > Air Purifiers' },
  { one: 'Home Accessories', two: 'Artificial Plants', path: 'Decor > Decorative Accessories > Artificial Plants' },
  { one: 'Home Accessories', two: 'Rugs', path: 'Decor > Rugs' },
  { one: 'Mirrors', two: 'Wall Mirrors', path: 'Decor > Mirrors' },
  { one: 'Mirrors', two: 'Full Length Mirrors', path: 'Decor > Mirrors' },
  { one: 'Mirrors', two: 'Dressing Table Mirrors', path: 'Decor > Mirrors' },
  { one: 'Garden Furniture', two: 'Rattan Furniture', path: 'Outdoor > Outdoor & Patio Furniture > Rattan Furniture' },
  { one: 'Garden Furniture', two: 'Sun Loungers', path: 'Outdoor > Outdoor & Patio Furniture > Sun Loungers' },
  { one: 'Garden Furniture', two: 'Garden Chairs & Seating', path: 'Outdoor > Outdoor & Patio Furniture > Chairs' },
  { one: 'Garden Furniture', two: 'Garden Tables', path: 'Outdoor > Outdoor & Patio Furniture > Tables' },
  { one: 'Garden Furniture', two: 'Garden Dining Sets', path: 'Outdoor > Outdoor & Patio Furniture > Dining Sets' },
  { one: 'Garden Furniture', two: 'Bistro Sets', path: 'Outdoor > Outdoor & Patio Furniture > Bistro Sets' },
  { one: 'Garden Furniture', two: 'Garden Furniture Sets', path: 'Outdoor > Outdoor & Patio Furniture > Sets' },
  { one: 'Garden Furniture', two: 'Swing Chairs', path: 'Outdoor > Outdoor & Patio Furniture > Swing Chairs' },
  { one: 'Garden Furniture', two: 'Cushions & Protective Covers', path: 'Outdoor > Outdoor & Patio Furniture > Cushions' },
  { one: 'Garden Shades', two: 'Gazebo & Marquees', path: 'Outdoor > Outdoor Shades > Gazebos' },
  { one: 'Garden Shades', two: 'Parasol Umbrellas & Accessories', path: 'Outdoor > Outdoor Shades > Umbrellas' },
  { one: 'Garden Shades', two: 'Awnings', path: 'Outdoor > Outdoor Shades > Awnings' },
  { one: 'Garden Buildings', two: 'Greenhouse', path: 'Outdoor > Garden > Greenhouses' },
  { one: 'Garden Buildings', two: 'Garden Sheds', path: 'Outdoor > Garden > Sheds' },
  { one: 'Garden Buildings', two: 'Garden Storage', path: 'Outdoor > Garden > Garden Storage' },
  { one: 'Garden Planters & Stands', two: 'Pots & Planters', path: 'Outdoor > Garden > Garden Planters' },
  { one: 'Garden Planters & Stands', two: 'Plant Stands', path: 'Outdoor > Garden > Garden Planters' },
  { one: 'Garden Décor', two: 'Garden Fountains', path: 'Outdoor > Garden > Fountains' },
  { one: 'Garden Décor', two: 'Garden Lighting', path: 'Outdoor > Garden > Lighting' },
  { one: 'Garden Tools', two: 'Garden Trolleys', path: 'Outdoor > Garden > Garden Tools > Carts' },
  { one: 'Garden Tools', two: 'Water Hoses', path: 'Outdoor > Garden > Garden Tools > Hoses' },
  { one: 'Garden Tools', two: 'Lawn Rollers', path: 'Outdoor > Garden > Garden Tools > Lawn Care Tools' },
  { one: 'Garden Tools', two: 'Electric Chainsaws', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Barbecues', two: 'Charcoal Grills', path: 'Outdoor > Outdoor Grills > Charcoal' },
  { one: 'Barbecues', two: 'Gas BBQs', path: 'Outdoor > Outdoor Grills > Gas' },
  { one: 'Barbecues', two: 'Barbecue Carts', path: 'Outdoor > Outdoor Grills > Carts' },
  { one: 'Fire Pits & Patio Heaters', two: 'Fire Pits', path: 'Outdoor > Outdoor Heating > Fire Pits' },
  { one: 'Fire Pits & Patio Heaters', two: 'Patio Heaters', path: 'Outdoor > Outdoor Heating' },
  { one: 'Fire Pits & Patio Heaters', two: 'Log Holders', path: 'Outdoor > Outdoor Heating > Log Holders' },
  { one: 'Hot Tubs & Pools', two: 'Swimming Pools', path: 'Outdoor > Pools & Water Fun > Swimming Pools' },
  { one: 'Camping & Hiking', two: 'Camping Tents', path: 'Outdoor > Camping > Tents' },
  { one: 'Camping & Hiking', two: 'Camping Chairs', path: 'Outdoor > Camping > Chairs' },
  { one: 'Camping & Hiking', two: 'Camping Beds', path: 'Outdoor > Camping > Sleeping Bags' },
  { one: 'Camping & Hiking', two: 'Camping Furniture', path: 'Outdoor > Camping' },
  { one: 'Camping & Hiking', two: 'Camping Toilets', path: 'Outdoor > Camping' },
  { one: 'Fitness & Cardio', two: 'Exercise Bikes & Trainers', path: 'Sports > Fitness > Exercise Bikes' },
  { one: 'Fitness & Cardio', two: 'Treadmills', path: 'Sports > Fitness > Treadmills' },
  { one: 'Fitness & Cardio', two: 'Rowing Machines', path: 'Sports > Fitness > Rowing Machines' },
  { one: 'Fitness & Cardio', two: 'Cross Trainers', path: 'Sports > Fitness > Ellipticals' },
  { one: 'Fitness & Cardio', two: 'Mini steppers', path: 'Sports > Fitness > Steppers' },
  { one: 'Fitness & Cardio', two: 'Boxing', path: 'Sports > Fitness > Boxing' },
  { one: 'Strength Training', two: 'Dumbbells', path: 'Sports > Fitness > Dumbbells' },
  { one: 'Strength Training', two: 'Kettlebells', path: 'Sports > Fitness > Kettlebells' },
  { one: 'Strength Training', two: 'Barbells & Weight Plates', path: 'Sports > Fitness > Barbells' },
  { one: 'Strength Training', two: 'Bench', path: 'Sports > Fitness > Benches' },
  { one: 'Strength Training', two: 'Weight Vests', path: 'Sports > Fitness > Weights' },
  { one: 'Strength Training', two: 'Power Towers & Pull Up Bars', path: 'Sports > Fitness > Pull Up Bars' },
  { one: 'Strength Training', two: 'Home Gym Systems', path: 'Sports > Fitness > Home Gyms' },
  { one: 'Active Fun', two: 'Trampolines & Accessories', path: 'Sports > Trampolines' },
  { one: 'Active Fun', two: 'Football', path: 'Sports > Ball Sports > Football' },
  { one: 'Active Fun', two: 'Basketball', path: 'Sports > Ball Sports > Basketball' },
  { one: 'Active Fun', two: 'Racquet Sports', path: 'Sports > Racquet Sports' },
  { one: 'Outdoor Gear', two: 'Scooters', path: 'Sports > Scooters' },
  { one: 'Outdoor Gear', two: 'Trailers', path: 'Sports > Trailers' },
  { one: 'Outdoor Gear', two: 'Inflatable Kayaks', path: 'Sports > Water Sports > Kayaks' },
  { one: 'Outdoor Gear', two: 'Paddle Boards', path: 'Sports > Water Sports > Paddle Boards' },
  { one: 'Outdoor Gear', two: 'Picnic', path: 'Outdoor > Outdoor & Patio Furniture > Picnic' },
  { one: 'Wheeled Toys', two: 'Ride-On Cars', path: 'Toys & Hobbies > Ride On Toys > Push & Pedal Ride On Toys' },
  { one: 'Wheeled Toys', two: 'Kids Scooters', path: 'Toys & Hobbies > Ride On Toys > Scooters' },
  { one: 'Outdoor Toys', two: 'Slide', path: 'Toys & Hobbies > Outdoor Play > Slides' },
  { one: 'Outdoor Toys', two: 'Bouncy Castles', path: 'Toys & Hobbies > Outdoor Play > Bouncy Castles' },
  { one: 'Outdoor Toys', two: 'Swing Sets', path: 'Toys & Hobbies > Outdoor Play > Swings' },
  { one: 'Outdoor Toys', two: 'Sandboxes', path: 'Toys & Hobbies > Outdoor Play > Sandboxes' },
  { one: 'Toys for Kids', two: 'Rocking Horses & Animals', path: 'Toys & Hobbies > Pretend Toys' },
  { one: 'Toys for Kids', two: 'Role Play Toys', path: 'Toys & Hobbies > Pretend Toys > Role Play' },
  { one: 'Toys for Kids', two: 'Musical Toys & Instruments', path: 'Toys & Hobbies > Toys > Musical' },
  { one: 'Toys for Kids', two: 'Soft Play Set', path: 'Toys & Hobbies > Kids Gym & Play Mats' },
  { one: 'Toys for Kids', two: 'Playhouses', path: 'Toys & Hobbies > Outdoor Play > Playhouses' },
  { one: 'Baby Products', two: 'Baby Nursery Furniture', path: 'Toys & Hobbies > Baby > Nursery' },
  { one: 'Baby Products', two: 'Baby Toys', path: 'Toys & Hobbies > Baby > Toys' },
  { one: 'Massage & Relaxation', two: 'Stylist Stools', path: 'Health & Beauty > Massage & Relaxation > Spa & Salon' },
  { one: 'Massage & Relaxation', two: 'Massage Table', path: 'Health & Beauty > Massage & Relaxation' },
  { one: 'Massage & Relaxation', two: 'Body massagers', path: 'Health & Beauty > Massage & Relaxation > Massagers' },
  { one: 'Mobility Aids & Equipment', two: 'Shower Seats', path: 'Health & Beauty > Health Care > Shower Seats' },
  { one: 'Mobility Aids & Equipment', two: 'Rollators', path: 'Health & Beauty > Health Care > Walkers & Rollators' },
  { one: 'Mobility Aids & Equipment', two: 'Wheelchair Ramps', path: 'Health & Beauty > Health Care > Mobility' },
  { one: 'Pet Supplies', two: 'Cat Supplies', path: 'Pet Supplies > Cats' },
  { one: 'Pet Supplies', two: 'Dog Supplies', path: 'Pet Supplies > Dogs' },
  { one: 'Pet Supplies', two: 'Bird Pet Supplies', path: 'Pet Supplies > Birds' },
  { one: 'Pet Supplies', two: 'Small Animal Cages & Habitats', path: 'Pet Supplies > Small Animals' },
  { one: 'Pet Supplies', two: 'Reptiles & Amphibians Products', path: 'Pet Supplies > Reptiles' },
  { one: 'Pet Supplies', two: 'Rabbit Hutch', path: 'Pet Supplies > Small Animals > Rabbit' },
  { one: 'Pet Supplies', two: 'Chicken Coop', path: 'Pet Supplies > Poultry' },
  { one: 'Pet Supplies', two: 'Fish Tanks', path: 'Pet Supplies > Fish' },
  { one: 'Christmas Trees', two: 'Artificial Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Trees', two: 'White Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Trees', two: 'Pre Lit Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Trees', two: 'Pencil Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Trees', two: 'Tabletop Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Decorations', two: 'Christmas Inflatables', path: 'Decor > Holiday Decor > Christmas > Christmas Inflatables' },
  { one: 'Christmas Decorations', two: 'LED Christmas Lights', path: 'Decor > Holiday Decor > Christmas > Lights' },
  { one: 'Halloween Decorations', two: 'Halloween Inflatables', path: 'Decor > Holiday Decor > Halloween' },
  { one: 'Halloween Decorations', two: 'Halloween Witches', path: 'Decor > Holiday Decor > Halloween' },
  { one: 'Halloween Decorations', two: 'Scary Clowns', path: 'Decor > Holiday Decor > Halloween' },
  { one: 'Halloween Decorations', two: 'Halloween Skeletons', path: 'Decor > Holiday Decor > Halloween' },
  { one: 'Tool Storage', two: 'Tool Cabinets', path: 'DIY Tools > Tool Storage > Cabinets' },
  { one: 'Tool Storage', two: 'Tool Boxes', path: 'DIY Tools > Tool Storage > Tool Boxes' },
  { one: 'Tool Storage', two: 'Tool Organisation', path: 'DIY Tools > Tool Storage' },
  { one: 'Workshop Equipment', two: 'Trestles & Work Benches', path: 'DIY Tools > Workshop > Work Benches' },
  { one: 'Workshop Equipment', two: 'Carts & Trolleys', path: 'DIY Tools > Workshop > Carts' },
  { one: 'Workshop Equipment', two: 'Ladders', path: 'DIY Tools > Workshop > Ladders' },
  { one: 'Car Tools', two: 'Stands & Jacks', path: 'DIY Tools > Car > Jacks & Stands' },
  { one: 'Car Tools', two: 'Car Ramps', path: 'DIY Tools > Car' },
  { one: 'Home Maintenance', two: 'Pressure Washers', path: 'Outdoor > Garden > Garden Tools > Pressure Washers' },
  { one: 'Home Maintenance', two: 'Sliding Door Kits', path: 'DIY Tools > Home Maintenance' },
];

const CATEGORY_KEYWORD_FALLBACK: Array<{ keys: string[]; path: string }> = [
  { keys: ['furniture', 'sofa', 'armchair', 'wardrobe', 'bed', 'table', 'chair', 'shelf', 'cabinet', 'dresser', 'chest'], path: 'Furniture' },
  { keys: ['kitchen', 'dining', 'cookware', 'cleaning', 'appliance', 'toaster', 'kettle', 'blender'], path: 'Kitchen' },
  { keys: ['garden', 'outdoor', 'barbecue', 'greenhouse', 'shed', 'planter', 'gazebo', 'parasol', 'fire pit'], path: 'Outdoor > Garden' },
  { keys: ['christmas', 'halloween', 'holiday'], path: 'Decor > Holiday Decor' },
  { keys: ['toy', 'kids', 'children', 'scooter', 'ride on'], path: 'Toys & Hobbies' },
  { keys: ['fitness', 'gym', 'sport', 'trampoline', 'bike', 'treadmill', 'dumbbell', 'kettlebell', 'camp'], path: 'Sports' },
  { keys: ['beauty', 'massage', 'salon', 'health'], path: 'Health & Beauty' },
  { keys: ['pet', 'dog', 'cat', 'bird', 'reptile', 'rabbit', 'chicken', 'fish'], path: 'Pet Supplies' },
  { keys: ['office', 'desk', 'stationery'], path: 'Furniture > Home Office' },
  { keys: ['tool', 'workbench', 'ladder', 'drill', 'workshop'], path: 'DIY Tools' },
];

export function mapAosomCategory(category: string, one: string, two: string): string[] {
  const c1 = String(one ?? '').trim();
  const c2 = String(two ?? '').trim();
  const direct = CATEGORY_MAP.find(m => m.one === c1 && m.two === c2);
  if (direct) return direct.path.split('>').map(s => s.trim()).filter(Boolean);
  return [];
}

export function deduceAosomUkCategory(category: string, one: string, two: string, title: string, description = ''): string[] {
  const mapped = mapAosomCategory(category, one, two);
  if (mapped.length > 0) return mapped;
  return deduceAosomCostwayCategory(title, description, one, two);
}

export function deduceAosomCostwayCategory(title: string, description = '', one = '', two = ''): string[] {
  const haystack = `${String(title ?? '')} ${String(description ?? '')} ${String(one ?? '')} ${String(two ?? '')}`.toLowerCase();
  for (const rule of CATEGORY_KEYWORD_FALLBACK) {
    if (rule.keys.some(k => haystack.includes(k))) {
      return rule.path.split('>').map(s => s.trim()).filter(Boolean);
    }
  }
  return ['Uncategorised'];
}

export function mergeAosomUkFeeds(
  products: AosomUkProductRow[],
  stockRows: AosomUkStockRow[],
): AosomUkMergedRow[] {
  const stockBySku = new Map<string, AosomUkStockRow>();
  for (const s of stockRows) stockBySku.set(s.SKU.trim(), s);

  const merged: AosomUkMergedRow[] = [];
  for (const p of products) {
    const stock = stockBySku.get(p.SKU.trim());
    if (!stock) continue;
    const wholesale = parseGbpPrice(stock['2B-S']);
    if (wholesale == null) continue;
    const stockCount = Number.parseInt(stock.Stock, 10) || 0;
    merged.push({
      sku: p.SKU.trim(),
      title: p.Title,
      shortDescription: p['Short Description'],
      description: p.Description,
      baseImage: p['Base image'],
      images: p.Image,
      category: p.Category,
      categoryOne: p['Category One'],
      categoryTwo: p['Category Two'],
      colour: p.Colour,
      stock: stockCount,
      sellPriceMinorUnits: wholesale,
    });
  }
  return merged;
}

const AOSOM_UK_MARKUP_RATE = 0.20;

function toVariant(row: AosomUkMergedRow, suffix: string | null): NormalizedVariant | null {
  const listPriceMinorUnits = charmGbp(Math.round(row.sellPriceMinorUnits * (1 + AOSOM_UK_MARKUP_RATE)));
  return {
    sku: row.sku,
    name: row.title,
    variantSuffix: suffix,
    feedPriceMinorUnits: row.sellPriceMinorUnits,
    priceMinorUnits: charmGbp(row.sellPriceMinorUnits),
    listPriceMinorUnits,
    supplierStock: row.stock,
    stock: row.stock,
    images: normalizeAosomUkImages(row.baseImage, row.images),
  };
}

export function adaptAosomUkRows(merged: AosomUkMergedRow[]): AdaptResult {
  const errors: AdapterRowError[] = [];
  const valid: AosomUkMergedRow[] = [];

  merged.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.sku) {
      errors.push({ rowNumber, field: 'SKU', message: 'SKU is required' });
      return;
    }
    if (!row.sellPriceMinorUnits) {
      errors.push({ rowNumber, field: '2B Product Price', message: 'Invalid price' });
      return;
    }
    if (!row.title?.trim()) {
      errors.push({ rowNumber, field: 'Title', message: 'Title is required' });
      return;
    }
    valid.push(row);
  });

  const groups = new Map<string, AosomUkMergedRow[]>();
  for (const row of valid) {
    const key = familyKey(row.title, row.colour);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const products: NormalizedProduct[] = [];
  for (const [, bucket] of groups) {
    const colours = [...new Set(bucket.map(r => r.colour?.trim()).filter(Boolean))];
    const first = bucket[0];
    const isMulti = bucket.length > 1 && colours.length > 1;
    const baseName = isMulti ? familyKey(first.title, first.colour) : stripUkBrand(first.title);

    const variants: NormalizedVariant[] = [];
    for (const row of bucket) {
      const suffix = isMulti ? String(row.colour?.trim() || '') : null;
      const variant = toVariant(row, suffix);
      if (variant && (!isMulti || suffix)) variants.push(variant);
    }
    if (variants.length === 0) continue;

    const description = cleanHtml(stripTextBrand(first.description || first.shortDescription));

    products.push({
      groupKey: isMulti ? baseName.toLowerCase() : null,
      baseName,
      description,
      specification: '',
      categoryPath: deduceAosomUkCategory(first.category, first.categoryOne, first.categoryTwo, first.title, first.shortDescription),
      tags: ['aosom', 'uk'],
      attributes: {},
      sourceUrl: sourceUrl(first.sku),
      brandName: HOUSE_BRAND,
      variants,
    });
  }

  const outOfStock: NormalizedProduct[] = [];
  const sellable: NormalizedProduct[] = [];
  for (const p of products) {
    (p.variants.every(v => v.stock >= OUT_OF_STOCK_THRESHOLD) ? sellable : outOfStock).push(p);
  }
  return { products: sellable, outOfStock, errors };
}
