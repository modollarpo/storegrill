/**
 * The shared Storegrill category taxonomy.
 *
 * This is the single source of truth for the category tree every pod ships:
 * roots are the curated storefront departments, and every importer resolves its
 * rows against this tree so imports reuse existing categories instead of forking
 * per-feed lookalikes (e.g. a DI Y Tools root or "Pet Supplies" vs "Pets").
 *
 * New importers MUST resolve through `resolveAosomCategory` / `clampToCanonical`
 * (or add their own rules that produce paths already present here). Never emit a
 * path that does not exist in `CANONICAL_CATEGORY_PATHS`.
 */

export const PATH_DELIMITER = ' > ';

/** Every node of the canonical tree as a fully-qualified path (parents first). */
export const CANONICAL_CATEGORY_PATHS: string[] = [
  // Appliances
  'Appliances',
  'Appliances > Climate Control Appliances',
  'Appliances > Climate Control Appliances > Air Purifiers',
  'Appliances > Climate Control Appliances > Dehumidifiers',
  'Appliances > Climate Control Appliances > Fans',
  'Appliances > Climate Control Appliances > Fireplaces',
  'Appliances > Kitchen Appliances',
  'Appliances > Kitchen Appliances > Ice Makers',
  'Appliances > Kitchen Appliances > Refrigerators & Freezers',
  'Appliances > Kitchen Appliances > Small Appliances',
  'Appliances > Laundry Appliances',
  'Appliances > Laundry Appliances > Dryers',
  'Appliances > Laundry Appliances > Washing Machines',
  'Appliances > Vacuums & Cleaners',
  // Baby & Kids
  'Baby & Kids',
  'Baby & Kids > Baby Activity',
  'Baby & Kids > Baby Activity > Baby Bouncers & Rockers',
  'Baby & Kids > Baby Activity > Baby Gyms & Playmats',
  'Baby & Kids > Baby Activity > Baby Playpen & Playards',
  'Baby & Kids > Baby Activity > Baby Walkers',
  'Baby & Kids > Baby Safety',
  'Baby & Kids > Baby Safety > Bed Rails',
  'Baby & Kids > Baby Strollers',
  'Baby & Kids > Kids Luggage',
  'Baby & Kids > Kids Vanities',
  'Baby & Kids > Nursery Furniture',
  'Baby & Kids > Nursery Furniture > Bassinets & Bedside Sleepers',
  'Baby & Kids > Nursery Furniture > Changing Tables',
  'Baby & Kids > Nursery Furniture > High Chairs',
  'Baby & Kids > Toddler & Kids Furniture',
  'Baby & Kids > Toddler & Kids Furniture > Kids Chairs & Seating',
  'Baby & Kids > Toddler & Kids Furniture > Kids Storage',
  'Baby & Kids > Toddler & Kids Furniture > Kids Table & Chair Sets',
  'Baby & Kids > Toddler & Kids Furniture > Kids Vanities',
  'Baby & Kids > Toddler & Kids Furniture > Toddler Beds',
  // Bath
  'Bath',
  'Bath > Floor Cabinets',
  'Bath > Laundry Baskets',
  'Bath > Over the Toilet Storage',
  'Bath > Towel Racks & Drying Racks',
  'Bath > Wall Cabinets',
  // Decor
  'Decor',
  'Decor > Bedroom',
  'Decor > Decorative Accessories',
  'Decor > Decorative Accessories > Decorative Fencing & Flooring',
  'Decor > Decorative Accessories > Faux Plants',
  'Decor > Decorative Accessories > Outdoor Decor',
  'Decor > Decorative Accessories > Room Dividers',
  'Decor > Decorative Accessories > Rugs',
  'Decor > Holiday Decor',
  'Decor > Holiday Decor > Christmas',
  'Decor > Holiday Decor > Christmas > Christmas Decor & Accessories',
  'Decor > Holiday Decor > Christmas > Christmas Inflatables',
  'Decor > Holiday Decor > Christmas > Christmas Tree',
  'Decor > Holiday Decor > Halloween',
  'Decor > Holiday Decor > Thanksgiving',
  'Decor > Lighting',
  'Decor > Mirrors',
  // Furniture
  'Furniture',
  'Furniture > Bedroom',
  'Furniture > Bedroom > Bedding',
  'Furniture > Bedroom > Beds & Bed Frames',
  'Furniture > Bedroom > Clothing & Closet Storage',
  'Furniture > Bedroom > Dressers & Chests',
  'Furniture > Bedroom > Jewelry Armoires',
  'Furniture > Bedroom > Makeup Vanities',
  'Furniture > Bedroom > Nightstands',
  'Furniture > Entryway',
  'Furniture > Entryway > Coat Racks & Hall Trees',
  'Furniture > Entryway > Console Tables',
  'Furniture > Entryway > Shoe Racks & Storage Benches',
  'Furniture > Home Office',
  'Furniture > Home Office > Bookcases',
  'Furniture > Home Office > File Cabinets',
  'Furniture > Home Office > Gaming Chairs',
  'Furniture > Home Office > Laptop Tables & Printer Stands',
  'Furniture > Home Office > Office Chairs',
  'Furniture > Home Office > Office Desks',
  'Furniture > Home Office > Presentation Supplies',
  'Furniture > Home Office > Safe Box',
  'Furniture > Home Office > Workspace Tables',
  'Furniture > Kitchen & Dining',
  'Furniture > Kitchen & Dining > Bar Stools',
  'Furniture > Kitchen & Dining > Dining Chairs',
  'Furniture > Kitchen & Dining > Dining Room Sets',
  'Furniture > Kitchen & Dining > Dining Tables',
  'Furniture > Kitchen & Dining > Kitchen Islands & Carts',
  'Furniture > Kitchen & Dining > Sideboards, Cabinets & Buffets',
  'Furniture > Living Room',
  'Furniture > Living Room > Cabinets & Chests',
  'Furniture > Living Room > Chairs',
  'Furniture > Living Room > Chairs > Accent Chairs',
  'Furniture > Living Room > Chairs > Floor Chairs',
  'Furniture > Living Room > Chairs > Recliners',
  'Furniture > Living Room > Coffee Tables',
  'Furniture > Living Room > End & Side Tables',
  'Furniture > Living Room > Entertainment Centers & TV Stands',
  'Furniture > Living Room > Ottomans',
  'Furniture > Living Room > Sofas & Loveseats',
  // Health & Beauty
  'Health & Beauty',
  'Health & Beauty > Health Care',
  'Health & Beauty > Health Care > Bath Safety',
  'Health & Beauty > Health Care > Walkers & Rollators',
  'Health & Beauty > Makeup Vanities',
  'Health & Beauty > Massage & Relaxation',
  'Health & Beauty > Massage & Relaxation > Foot Massagers',
  'Health & Beauty > Massage & Relaxation > Massage Chairs',
  'Health & Beauty > Massage & Relaxation > Spa & Salon',
  // Kitchen
  'Kitchen',
  'Kitchen > Cookware & Bakeware',
  'Kitchen > Kitchen Organization',
  'Kitchen > Kitchen Organization > Baker\'s Racks',
  'Kitchen > Kitchen Organization > Dish Racks',
  'Kitchen > Kitchen Organization > Kitchen Trash Cans',
  'Kitchen > Kitchen Organization > Wine Racks',
  'Kitchen > Shopping Totes',
  // Outdoor
  'Outdoor',
  'Outdoor > Camping',
  'Outdoor > Camping > Camping Furniture',
  'Outdoor > Camping > Coolers',
  'Outdoor > Camping > Sleeping Bags',
  'Outdoor > Camping > Tents',
  'Outdoor > Garden',
  'Outdoor > Garden > Garden Tools',
  'Outdoor > Garden > Garden Tools > Garden Carts',
  'Outdoor > Garden > Garden Tools > Ladders',
  'Outdoor > Garden > Garden Tools > Lawn Care Tools',
  'Outdoor > Garden > Greenhouses',
  'Outdoor > Garden > Plant Stands',
  'Outdoor > Garden > Plant Supports',
  'Outdoor > Garden > Potting Benches & Tables',
  'Outdoor > Garden > Raised Garden Beds',
  'Outdoor > Outdoor Grills',
  'Outdoor > Outdoor Heating',
  'Outdoor > Outdoor Heating > Fire Pits',
  'Outdoor > Outdoor Heating > Fireplace Tools',
  'Outdoor > Outdoor Heating > Log Storage',
  'Outdoor > Outdoor & Patio Furniture',
  'Outdoor > Outdoor & Patio Furniture > Hammocks',
  'Outdoor > Outdoor & Patio Furniture > Outdoor Furniture Accessories',
  'Outdoor > Outdoor & Patio Furniture > Outdoor Seating & Patio Chairs',
  'Outdoor > Outdoor & Patio Furniture > Outdoor Seating & Patio Chairs > Adirondack Chairs',
  'Outdoor > Outdoor & Patio Furniture > Outdoor Seating & Patio Chairs > Beach & Lawn Chairs',
  'Outdoor > Outdoor & Patio Furniture > Outdoor Seating & Patio Chairs > Outdoor Benches',
  'Outdoor > Outdoor & Patio Furniture > Outdoor Seating & Patio Chairs > Outdoor Chaise Lounges',
  'Outdoor > Outdoor & Patio Furniture > Outdoor Seating & Patio Chairs > Patio Dining Chairs',
  'Outdoor > Outdoor & Patio Furniture > Outdoor Seating & Patio Chairs > Patio Rocking Chairs & Gliders',
  'Outdoor > Outdoor & Patio Furniture > Patio Furniture Sets',
  'Outdoor > Outdoor & Patio Furniture > Patio Tables',
  'Outdoor > Outdoor & Patio Furniture > Porch Swings',
  'Outdoor > Outdoor Shades',
  'Outdoor > Outdoor Shades > Awnings',
  'Outdoor > Outdoor Shades > Canopies & Gazebos',
  'Outdoor > Outdoor Shades > Outdoor Umbrellas',
  'Outdoor > Outdoor Storage & Garages',
  'Outdoor > Outdoor Storage & Garages > Garages',
  'Outdoor > Outdoor Storage & Garages > Sheds & Outdoor Storage',
  // Pets
  'Pets',
  'Pets > Cat Supplies',
  'Pets > Cat Supplies > Cat Furniture',
  'Pets > Cat Supplies > Cat Trees',
  'Pets > Cat Supplies > Dog Strollers',
  'Pets > Dog Supplies',
  'Pets > Dog Supplies > Dog Beds',
  'Pets > Dog Supplies > Dog Kennels',
  'Pets > Dog Supplies > Dog Strollers',
  'Pets > Dog Supplies > Pet Gates',
  'Pets > Small Animal Supplies',
  'Pets > Small Animal Supplies > Bird Supplies',
  'Pets > Small Animal Supplies > Chicken Coops',
  'Pets > Small Animal Supplies > Pet Gates',
  // Sports
  'Sports',
  'Sports > Exercise Machines',
  'Sports > Exercise Machines > Exercise Bikes',
  'Sports > Exercise Machines > Treadmills',
  'Sports > Golf',
  'Sports > Sport Equipments',
  'Sports > Strength Training',
  'Sports > Strength Training > Benches, Racks & Bars',
  'Sports > Strength Training > Boxing & Martial Arts',
  'Sports > Strength Training > Dumbbells',
  'Sports > Strength Training > Weights Accessories',
  'Sports > Surfing',
  'Sports > Yoga',
  'Sports > Yoga > Yoga Accessories',
  'Sports > Yoga > Yoga & Gym Mats',
  // Toys & Hobbies
  'Toys & Hobbies',
  'Toys & Hobbies > Art Easels',
  'Toys & Hobbies > Game Room',
  'Toys & Hobbies > Indoor Play',
  'Toys & Hobbies > Indoor Play > Kids Slides',
  'Toys & Hobbies > Indoor Play > Soft Play Sets',
  'Toys & Hobbies > Learning Toys',
  'Toys & Hobbies > Musical Instruments',
  'Toys & Hobbies > Musical Instruments > Drums & Percussion',
  'Toys & Hobbies > Musical Instruments > Guitar & Strings',
  'Toys & Hobbies > Musical Instruments > Musical Toys',
  'Toys & Hobbies > Musical Instruments > Pianos & Keyboards',
  'Toys & Hobbies > Outdoor Play',
  'Toys & Hobbies > Outdoor Play > Bouncy Castle',
  'Toys & Hobbies > Outdoor Play > Inflatable Water Slides',
  'Toys & Hobbies > Outdoor Play > Lawn Games',
  'Toys & Hobbies > Outdoor Play > Sandboxes',
  'Toys & Hobbies > Outdoor Play > Swing & Playsets',
  'Toys & Hobbies > Outdoor Play > Toy Sports',
  'Toys & Hobbies > Outdoor Play > Trampolines',
  'Toys & Hobbies > Pretend Toys',
  'Toys & Hobbies > Pretend Toys > Play Kitchen Sets',
  'Toys & Hobbies > Pretend Toys > Play Tents & Playhouse',
  'Toys & Hobbies > Ride On Toys',
  'Toys & Hobbies > Ride On Toys > Balance Bikes',
  'Toys & Hobbies > Ride On Toys > Kids Bikes',
  'Toys & Hobbies > Ride On Toys > Kids Electric Cars',
  'Toys & Hobbies > Ride On Toys > Push & Pedal Ride On Toys',
  'Toys & Hobbies > Ride On Toys > Scooters',
  'Toys & Hobbies > Sport Equipments',
];

export const CANONICAL_CATEGORY_PATH_SET: ReadonlySet<string> = new Set(CANONICAL_CATEGORY_PATHS);

/** Storefront roots shown as departments (curated order, lower first). */
export const CANONICAL_ROOTS: string[] = [
  'Appliances',
  'Baby & Kids',
  'Bath',
  'Decor',
  'Furniture',
  'Health & Beauty',
  'Kitchen',
  'Outdoor',
  'Pets',
  'Sports',
  'Toys & Hobbies',
];

/** Root metadata mirrored from the curated GB tree (displayOrder + storefront tagline). */
export const CANONICAL_ROOT_META: Record<string, { displayOrder: number; tagline: string }> = {
  Furniture: {
    displayOrder: 1,
    tagline: 'Beds, desks, dining and living pieces for every room in the house.',
  },
  Outdoor: {
    displayOrder: 2,
    tagline: 'Grills, patio furniture and garden gear made for the outdoors.',
  },
  'Toys & Hobbies': {
    displayOrder: 3,
    tagline: 'Play, learning and creative hobbies for kids of all ages.',
  },
  'Baby & Kids': {
    displayOrder: 4,
    tagline: 'Nurseries, toys and everyday essentials for growing families.',
  },
  Decor: {
    displayOrder: 5,
    tagline: 'Mirrors, lighting and accents that give every room its character.',
  },
  Pets: {
    displayOrder: 6,
    tagline: 'Beds, feeders and supplies your cat, dog or small pet will love.',
  },
  Sports: {
    displayOrder: 7,
    tagline: 'Exercise machines, yoga and gear for every kind of active day.',
  },
  Bath: {
    displayOrder: 8,
    tagline: 'Cabinets, storage and fixtures to keep every washroom organised.',
  },
  Appliances: {
    displayOrder: 9,
    tagline: 'Upgrade your home with the essentials that actually do the work.',
  },
  Kitchen: {
    displayOrder: 10,
    tagline: 'Cookware, organisers and storage for a kitchen that works.',
  },
  'Health & Beauty': {
    displayOrder: 11,
    tagline: 'Wellness, massage and self-care for home and on the go.',
  },
};

/** Fallback bucket when nothing matches; also kept out of featured roots. */
export const UNCATEGORISED = 'Uncategorised';

export function partsOf(path: string): string[] {
  return path
    .split(PATH_DELIMITER)
    .map(s => s.trim())
    .filter(Boolean);
}

export function joinPath(segments: string[]): string {
  return segments.map(s => (s ?? '').trim()).filter(Boolean).join(PATH_DELIMITER);
}

/**
 * Truncates a candidate path to the longest prefix that exists in the canonical
 * tree, so a feed can never fork the taxonomy. Returns [] when nothing matches.
 */
export function clampToCanonical(segments: string[]): string[] {
  const cleaned = segments.map(s => (s ?? '').trim()).filter(Boolean);
  for (let n = cleaned.length; n > 0; n--) {
    const prefix = cleaned.slice(0, n).join(PATH_DELIMITER);
    if (CANONICAL_CATEGORY_PATH_SET.has(prefix)) return cleaned.slice(0, n);
  }
  return [];
}

/**
 * Keyword-based resolution used by feeds without their own category columns
 * (Aosom EU) and as the fallback for mapped feeds. First matching rule wins.
 * Always returns a canonical path or ['Uncategorised'].
 */
export const AOSOM_KEYWORD_RULES: Array<{ keys: string[]; path: string }> = [
  { keys: ['furniture', 'sofa', 'armchair', 'wardrobe', 'bed', 'table', 'chair', 'shelf', 'cabinet', 'dresser', 'chest', 'couch', 'stool'], path: 'Furniture' },
  { keys: ['office', 'desk', 'stationery'], path: 'Furniture > Home Office' },
  { keys: ['kitchen', 'dining', 'cookware', 'cleaning', 'appliance', 'toaster', 'kettle', 'blender'], path: 'Kitchen' },
  { keys: ['garden', 'outdoor', 'barbecue', 'greenhouse', 'shed', 'planter', 'gazebo', 'parasol', 'fire pit', 'patio'], path: 'Outdoor' },
  { keys: ['christmas', 'halloween', 'holiday'], path: 'Decor > Holiday Decor' },
  { keys: ['toy', 'kids', 'children', 'scooter', 'ride on', 'playhouse'], path: 'Toys & Hobbies' },
  { keys: ['baby', 'nursery', 'cot', 'bassinet', 'pram', 'stroller'], path: 'Baby & Kids' },
  { keys: ['fitness', 'gym', 'sport', 'trampoline', 'bike', 'treadmill', 'dumbbell', 'kettlebell', 'yoga'], path: 'Sports' },
  { keys: ['camp', 'tent', 'sleeping bag', 'barbecue'], path: 'Outdoor > Camping' },
  { keys: ['beauty', 'massage', 'salon', 'health'], path: 'Health & Beauty' },
  { keys: ['pet', 'dog', 'cat', 'bird', 'reptile', 'rabbit', 'chicken', 'fish', 'aquarium'], path: 'Pets' },
  { keys: ['tool', 'workbench', 'ladder', 'drill', 'workshop'], path: 'Outdoor > Garden > Garden Tools' },
];

/** Aosom UK "Category One | Category Two" -> canonical path (leaves present in the tree). */
export const AOSOM_CATEGORY_MAP: Array<{ one: string; two: string; path: string }> = [
  { one: 'Home Furniture', two: 'Sofas', path: 'Furniture > Living Room > Sofas & Loveseats' },
  { one: 'Home Furniture', two: 'Armchairs & Massage Chairs', path: 'Furniture > Living Room > Chairs > Accent Chairs' },
  { one: 'Home Furniture', two: 'Ottomans & Footstools', path: 'Furniture > Living Room > Ottomans' },
  { one: 'Home Furniture', two: 'TV Units & Stands', path: 'Furniture > Living Room > Entertainment Centers & TV Stands' },
  { one: 'Home Furniture', two: 'Coffee Tables', path: 'Furniture > Living Room > Coffee Tables' },
  { one: 'Home Furniture', two: 'Side Tables', path: 'Furniture > Living Room > End & Side Tables' },
  { one: 'Home Furniture', two: 'Bookcases & Shelves', path: 'Furniture > Home Office > Bookcases' },
  { one: 'Home Furniture', two: 'Chest of Drawers', path: 'Furniture > Bedroom > Dressers & Chests' },
  { one: 'Office Furniture', two: 'Office Chairs', path: 'Furniture > Home Office > Office Chairs' },
  { one: 'Office Furniture', two: 'Office Desks', path: 'Furniture > Home Office > Office Desks' },
  { one: 'Office Furniture', two: 'Office Storage', path: 'Furniture > Home Office > Bookcases' },
  { one: 'Kitchen & Dining', two: 'Dining Furniture & Bar Stools', path: 'Furniture > Kitchen & Dining > Dining Chairs' },
  { one: 'Kitchen & Dining', two: 'Kitchen Furniture', path: 'Furniture > Kitchen & Dining' },
  { one: 'Kitchen & Dining', two: 'Cleaning', path: 'Kitchen' },
  { one: 'Kitchen & Dining', two: 'Small Kitchen Appliances', path: 'Appliances > Kitchen Appliances > Small Appliances' },
  { one: 'Kitchen & Dining', two: 'Wine Racks & Cabinets', path: 'Kitchen > Kitchen Organization > Wine Racks' },
  { one: 'Bedroom Furniture', two: 'Beds', path: 'Furniture > Bedroom > Beds & Bed Frames' },
  { one: 'Bedroom Furniture', two: 'Wardrobes', path: 'Furniture > Bedroom > Clothing & Closet Storage' },
  { one: 'Bedroom Furniture', two: 'Dressing Tables', path: 'Furniture > Bedroom > Makeup Vanities' },
  { one: 'Bedroom Furniture', two: 'Bedside Cabinets & Tables', path: 'Furniture > Bedroom > Nightstands' },
  { one: 'Bathroom Furniture', two: 'Bathroom Cabinets', path: 'Bath > Wall Cabinets' },
  { one: 'Bathroom Furniture', two: 'Bathroom Mirrors', path: 'Decor > Mirrors' },
  { one: 'Bathroom Furniture', two: 'Laundry', path: 'Bath > Laundry Baskets' },
  { one: 'Bathroom Furniture', two: 'Bathroom Accessories', path: 'Bath' },
  { one: 'Storage Solutions', two: 'Storage Cabinets', path: 'Furniture > Living Room > Cabinets & Chests' },
  { one: 'Storage Solutions', two: 'Chest of Drawers', path: 'Furniture > Bedroom > Dressers & Chests' },
  { one: 'Hallway Furniture', two: 'Shoe Storages', path: 'Furniture > Entryway > Shoe Racks & Storage Benches' },
  { one: 'Hallway Furniture', two: 'Coat Racks & Stands', path: 'Furniture > Entryway > Coat Racks & Hall Trees' },
  { one: 'Hallway Furniture', two: 'Console Tables', path: 'Furniture > Entryway > Console Tables' },
  { one: 'Kids Furniture', two: 'Kids Sofas', path: 'Baby & Kids > Toddler & Kids Furniture > Kids Chairs & Seating' },
  { one: 'Kids Furniture', two: 'Kids Desks', path: 'Baby & Kids > Toddler & Kids Furniture > Kids Table & Chair Sets' },
  { one: 'Kids Furniture', two: 'Kids Beds', path: 'Baby & Kids > Toddler & Kids Furniture > Toddler Beds' },
  { one: 'Kids Furniture', two: 'Kids Storages', path: 'Baby & Kids > Toddler & Kids Furniture > Kids Storage' },
  { one: 'Kids Furniture', two: 'Kids Step Stools', path: 'Baby & Kids > Toddler & Kids Furniture' },
  { one: 'Lighting', two: 'Floor & Table Lamps', path: 'Decor > Lighting' },
  { one: 'Lighting', two: 'Ceiling Lights', path: 'Decor > Lighting' },
  { one: 'Lighting', two: 'Wall Lamps', path: 'Decor > Lighting' },
  { one: 'Heating & Cooling', two: 'Heating', path: 'Appliances > Climate Control Appliances > Fireplaces' },
  { one: 'Heating & Cooling', two: 'Fans', path: 'Appliances > Climate Control Appliances > Fans' },
  { one: 'Heating & Cooling', two: 'Air conditioning', path: 'Appliances > Climate Control Appliances' },
  { one: 'Heating & Cooling', two: 'Dehumidifiers & Air Purifiers', path: 'Appliances > Climate Control Appliances > Air Purifiers' },
  { one: 'Home Accessories', two: 'Artificial Plants', path: 'Decor > Decorative Accessories > Faux Plants' },
  { one: 'Home Accessories', two: 'Rugs', path: 'Decor > Decorative Accessories > Rugs' },
  { one: 'Mirrors', two: 'Wall Mirrors', path: 'Decor > Mirrors' },
  { one: 'Mirrors', two: 'Full Length Mirrors', path: 'Decor > Mirrors' },
  { one: 'Mirrors', two: 'Dressing Table Mirrors', path: 'Decor > Mirrors' },
  { one: 'Garden Furniture', two: 'Rattan Furniture', path: 'Outdoor > Outdoor & Patio Furniture' },
  { one: 'Garden Furniture', two: 'Sun Loungers', path: 'Outdoor > Outdoor & Patio Furniture > Outdoor Seating & Patio Chairs' },
  { one: 'Garden Furniture', two: 'Garden Chairs & Seating', path: 'Outdoor > Outdoor & Patio Furniture > Outdoor Seating & Patio Chairs' },
  { one: 'Garden Furniture', two: 'Garden Tables', path: 'Outdoor > Outdoor & Patio Furniture > Patio Tables' },
  { one: 'Garden Furniture', two: 'Garden Dining Sets', path: 'Outdoor > Outdoor & Patio Furniture > Patio Furniture Sets' },
  { one: 'Garden Furniture', two: 'Bistro Sets', path: 'Outdoor > Outdoor & Patio Furniture > Patio Furniture Sets' },
  { one: 'Garden Furniture', two: 'Garden Furniture Sets', path: 'Outdoor > Outdoor & Patio Furniture > Patio Furniture Sets' },
  { one: 'Garden Furniture', two: 'Swing Chairs', path: 'Outdoor > Outdoor & Patio Furniture > Porch Swings' },
  { one: 'Garden Furniture', two: 'Cushions & Protective Covers', path: 'Outdoor > Outdoor & Patio Furniture > Outdoor Furniture Accessories' },
  { one: 'Garden Shades', two: 'Gazebo & Marquees', path: 'Outdoor > Outdoor Shades > Canopies & Gazebos' },
  { one: 'Garden Shades', two: 'Parasol Umbrellas & Accessories', path: 'Outdoor > Outdoor Shades > Outdoor Umbrellas' },
  { one: 'Garden Shades', two: 'Awnings', path: 'Outdoor > Outdoor Shades > Awnings' },
  { one: 'Garden Buildings', two: 'Greenhouse', path: 'Outdoor > Garden > Greenhouses' },
  { one: 'Garden Buildings', two: 'Garden Sheds', path: 'Outdoor > Outdoor Storage & Garages > Sheds & Outdoor Storage' },
  { one: 'Garden Buildings', two: 'Garden Storage', path: 'Outdoor > Outdoor Storage & Garages' },
  { one: 'Garden Planters & Stands', two: 'Pots & Planters', path: 'Outdoor > Garden' },
  { one: 'Garden Planters & Stands', two: 'Plant Stands', path: 'Outdoor > Garden > Plant Stands' },
  { one: 'Garden Décor', two: 'Garden Fountains', path: 'Outdoor > Garden' },
  { one: 'Garden Décor', two: 'Garden Lighting', path: 'Outdoor > Garden' },
  { one: 'Garden Tools', two: 'Garden Trolleys', path: 'Outdoor > Garden > Garden Tools > Garden Carts' },
  { one: 'Garden Tools', two: 'Water Hoses', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Garden Tools', two: 'Lawn Rollers', path: 'Outdoor > Garden > Garden Tools > Lawn Care Tools' },
  { one: 'Garden Tools', two: 'Electric Chainsaws', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Barbecues', two: 'Charcoal Grills', path: 'Outdoor > Outdoor Grills' },
  { one: 'Barbecues', two: 'Gas BBQs', path: 'Outdoor > Outdoor Grills' },
  { one: 'Barbecues', two: 'Barbecue Carts', path: 'Outdoor > Outdoor Grills' },
  { one: 'Fire Pits & Patio Heaters', two: 'Fire Pits', path: 'Outdoor > Outdoor Heating > Fire Pits' },
  { one: 'Fire Pits & Patio Heaters', two: 'Patio Heaters', path: 'Outdoor > Outdoor Heating' },
  { one: 'Fire Pits & Patio Heaters', two: 'Log Holders', path: 'Outdoor > Outdoor Heating > Log Storage' },
  { one: 'Hot Tubs & Pools', two: 'Swimming Pools', path: 'Outdoor' },
  { one: 'Camping & Hiking', two: 'Camping Tents', path: 'Outdoor > Camping > Tents' },
  { one: 'Camping & Hiking', two: 'Camping Chairs', path: 'Outdoor > Camping > Camping Furniture' },
  { one: 'Camping & Hiking', two: 'Camping Beds', path: 'Outdoor > Camping > Sleeping Bags' },
  { one: 'Camping & Hiking', two: 'Camping Furniture', path: 'Outdoor > Camping > Camping Furniture' },
  { one: 'Camping & Hiking', two: 'Camping Toilets', path: 'Outdoor > Camping' },
  { one: 'Fitness & Cardio', two: 'Exercise Bikes & Trainers', path: 'Sports > Exercise Machines > Exercise Bikes' },
  { one: 'Fitness & Cardio', two: 'Treadmills', path: 'Sports > Exercise Machines > Treadmills' },
  { one: 'Fitness & Cardio', two: 'Rowing Machines', path: 'Sports > Exercise Machines' },
  { one: 'Fitness & Cardio', two: 'Cross Trainers', path: 'Sports > Exercise Machines' },
  { one: 'Fitness & Cardio', two: 'Mini steppers', path: 'Sports > Strength Training' },
  { one: 'Fitness & Cardio', two: 'Boxing', path: 'Sports > Strength Training > Boxing & Martial Arts' },
  { one: 'Strength Training', two: 'Dumbbells', path: 'Sports > Strength Training > Dumbbells' },
  { one: 'Strength Training', two: 'Kettlebells', path: 'Sports > Strength Training > Dumbbells' },
  { one: 'Strength Training', two: 'Barbells & Weight Plates', path: 'Sports > Strength Training > Benches, Racks & Bars' },
  { one: 'Strength Training', two: 'Bench', path: 'Sports > Strength Training > Benches, Racks & Bars' },
  { one: 'Strength Training', two: 'Weight Vests', path: 'Sports > Strength Training > Weights Accessories' },
  { one: 'Strength Training', two: 'Power Towers & Pull Up Bars', path: 'Sports > Strength Training > Benches, Racks & Bars' },
  { one: 'Strength Training', two: 'Home Gym Systems', path: 'Sports > Strength Training' },
  { one: 'Active Fun', two: 'Trampolines & Accessories', path: 'Toys & Hobbies > Outdoor Play > Trampolines' },
  { one: 'Active Fun', two: 'Football', path: 'Sports > Sport Equipments' },
  { one: 'Active Fun', two: 'Basketball', path: 'Sports > Sport Equipments' },
  { one: 'Active Fun', two: 'Racquet Sports', path: 'Sports > Sport Equipments' },
  { one: 'Outdoor Gear', two: 'Scooters', path: 'Toys & Hobbies > Ride On Toys > Scooters' },
  { one: 'Outdoor Gear', two: 'Trailers', path: 'Furniture' },
  { one: 'Outdoor Gear', two: 'Inflatable Kayaks', path: 'Sports > Surfing' },
  { one: 'Outdoor Gear', two: 'Paddle Boards', path: 'Sports > Surfing' },
  { one: 'Outdoor Gear', two: 'Picnic', path: 'Outdoor > Outdoor & Patio Furniture' },
  { one: 'Wheeled Toys', two: 'Ride-On Cars', path: 'Toys & Hobbies > Ride On Toys > Push & Pedal Ride On Toys' },
  { one: 'Wheeled Toys', two: 'Kids Scooters', path: 'Toys & Hobbies > Ride On Toys > Scooters' },
  { one: 'Outdoor Toys', two: 'Slide', path: 'Toys & Hobbies > Indoor Play > Kids Slides' },
  { one: 'Outdoor Toys', two: 'Bouncy Castles', path: 'Toys & Hobbies > Outdoor Play > Bouncy Castle' },
  { one: 'Outdoor Toys', two: 'Swing Sets', path: 'Toys & Hobbies > Outdoor Play > Swing & Playsets' },
  { one: 'Outdoor Toys', two: 'Sandboxes', path: 'Toys & Hobbies > Outdoor Play > Sandboxes' },
  { one: 'Toys for Kids', two: 'Rocking Horses & Animals', path: 'Toys & Hobbies > Pretend Toys' },
  { one: 'Toys for Kids', two: 'Role Play Toys', path: 'Toys & Hobbies > Pretend Toys' },
  { one: 'Toys for Kids', two: 'Musical Toys & Instruments', path: 'Toys & Hobbies > Musical Instruments > Musical Toys' },
  { one: 'Toys for Kids', two: 'Soft Play Set', path: 'Toys & Hobbies > Indoor Play > Soft Play Sets' },
  { one: 'Toys for Kids', two: 'Playhouses', path: 'Toys & Hobbies > Pretend Toys > Play Tents & Playhouse' },
  { one: 'Baby Products', two: 'Baby Nursery Furniture', path: 'Baby & Kids > Nursery Furniture' },
  { one: 'Baby Products', two: 'Baby Toys', path: 'Baby & Kids > Baby Activity' },
  { one: 'Massage & Relaxation', two: 'Stylist Stools', path: 'Health & Beauty > Massage & Relaxation > Spa & Salon' },
  { one: 'Massage & Relaxation', two: 'Massage Table', path: 'Health & Beauty > Massage & Relaxation' },
  { one: 'Massage & Relaxation', two: 'Body massagers', path: 'Health & Beauty > Massage & Relaxation' },
  { one: 'Mobility Aids & Equipment', two: 'Shower Seats', path: 'Health & Beauty > Health Care > Bath Safety' },
  { one: 'Mobility Aids & Equipment', two: 'Rollators', path: 'Health & Beauty > Health Care > Walkers & Rollators' },
  { one: 'Mobility Aids & Equipment', two: 'Wheelchair Ramps', path: 'Health & Beauty > Health Care' },
  { one: 'Pet Supplies', two: 'Cat Supplies', path: 'Pets > Cat Supplies' },
  { one: 'Pet Supplies', two: 'Dog Supplies', path: 'Pets > Dog Supplies' },
  { one: 'Pet Supplies', two: 'Bird Pet Supplies', path: 'Pets > Small Animal Supplies > Bird Supplies' },
  { one: 'Pet Supplies', two: 'Small Animal Cages & Habitats', path: 'Pets > Small Animal Supplies' },
  { one: 'Pet Supplies', two: 'Reptiles & Amphibians Products', path: 'Pets' },
  { one: 'Pet Supplies', two: 'Rabbit Hutch', path: 'Pets > Small Animal Supplies' },
  { one: 'Pet Supplies', two: 'Chicken Coop', path: 'Pets > Small Animal Supplies > Chicken Coops' },
  { one: 'Pet Supplies', two: 'Fish Tanks', path: 'Pets' },
  { one: 'Christmas Trees', two: 'Artificial Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Trees', two: 'White Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Trees', two: 'Pre Lit Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Trees', two: 'Pencil Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Trees', two: 'Tabletop Christmas Trees', path: 'Decor > Holiday Decor > Christmas > Christmas Tree' },
  { one: 'Christmas Decorations', two: 'Christmas Inflatables', path: 'Decor > Holiday Decor > Christmas > Christmas Inflatables' },
  { one: 'Christmas Decorations', two: 'LED Christmas Lights', path: 'Decor > Holiday Decor > Christmas > Christmas Decor & Accessories' },
  { one: 'Halloween Decorations', two: 'Halloween Inflatables', path: 'Decor > Holiday Decor > Halloween' },
  { one: 'Halloween Decorations', two: 'Halloween Witches', path: 'Decor > Holiday Decor > Halloween' },
  { one: 'Halloween Decorations', two: 'Scary Clowns', path: 'Decor > Holiday Decor > Halloween' },
  { one: 'Halloween Decorations', two: 'Halloween Skeletons', path: 'Decor > Holiday Decor > Halloween' },
  { one: 'Tool Storage', two: 'Tool Cabinets', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Tool Storage', two: 'Tool Boxes', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Tool Storage', two: 'Tool Organisation', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Workshop Equipment', two: 'Trestles & Work Benches', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Workshop Equipment', two: 'Carts & Trolleys', path: 'Outdoor > Garden > Garden Tools > Garden Carts' },
  { one: 'Workshop Equipment', two: 'Ladders', path: 'Outdoor > Garden > Garden Tools > Ladders' },
  { one: 'Car Tools', two: 'Stands & Jacks', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Car Tools', two: 'Car Ramps', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Home Maintenance', two: 'Pressure Washers', path: 'Outdoor > Garden > Garden Tools' },
  { one: 'Home Maintenance', two: 'Sliding Door Kits', path: 'Outdoor > Garden > Garden Tools' },
];

const AOSOM_CATEGORY_MAP_BY_KEY = new Map(
  AOSOM_CATEGORY_MAP.map(m => [`${String(m.one).trim()}\u0000${String(m.two).trim()}`, m.path]),
);

function keywordPath(title: string, description: string): string[] {
  const haystack = `${String(title ?? '')} ${String(description ?? '')}`.toLowerCase();
  for (const rule of AOSOM_KEYWORD_RULES) {
    if (rule.keys.some(k => haystack.includes(k))) return partsOf(rule.path);
  }
  return [UNCATEGORISED];
}

/**
 * Resolves an Aosom row (UK: one/two columns; EU: no category columns) onto the
 * canonical taxonomy using, in order: the direct one/two map, the keyword rules,
 * then a hard clamp so unknown combos collapse to a canonical ancestor instead of
 * forking the tree. The only escape is the Uncategorised bucket.
 */
export function resolveAosomCategory(one: string, two: string, title: string, description = ''): string[] {
  const direct = AOSOM_CATEGORY_MAP_BY_KEY.get(`${String(one ?? '').trim()}\u0000${String(two ?? '').trim()}`);
  if (direct) return partsOf(direct);
  const guessed = clampToCanonical(keywordPath(title, description));
  return guessed.length > 0 ? guessed : [UNCATEGORISED];
}

/** Clamps ANY feed's path onto the canonical tree (used by e.g. Costway). */
export function canonicalizePath(segments: string[]): string[] {
  const clamped = clampToCanonical(segments);
  return clamped.length > 0 ? clamped : [UNCATEGORISED];
}