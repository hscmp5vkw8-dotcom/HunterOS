import type { Product } from './types.ts';

export type CatalogActivity = 'hiking' | 'backpacking' | 'hunting' | 'camping' | 'off-road';
export type CatalogVehicle = 'atv' | 'utv' | '4x4';
export type CatalogSort = 'featured' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'weight-asc' | 'weight-desc';

export interface CatalogFilters {
  query?: string;
  brand?: string;
  category?: string;
  kind?: string;
  activity?: CatalogActivity;
  vehicle?: CatalogVehicle;
  photosOnly?: boolean;
  favorites?: readonly string[] | null;
  knownWeight?: boolean;
  knownPrice?: boolean;
  minPriceUSD?: number;
  maxPriceUSD?: number;
  minWeightGrams?: number;
  maxWeightGrams?: number;
  sort?: CatalogSort;
}

export const ACTIVITY_OPTIONS: { value: CatalogActivity; label: string }[] = [
  { value: 'hiking', label: 'Hiking' },
  { value: 'backpacking', label: 'Backpacking' },
  { value: 'hunting', label: 'Hunting' },
  { value: 'camping', label: 'Camping' },
  { value: 'off-road', label: 'Off-road' },
];
export const VEHICLE_OPTIONS: { value: CatalogVehicle; label: string }[] = [
  { value: 'atv', label: 'ATV' },
  { value: 'utv', label: 'UTV / side-by-side' },
  { value: '4x4', label: '4×4' },
];
export const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'weight-asc', label: 'Weight: light to heavy' },
  { value: 'weight-desc', label: 'Weight: heavy to light' },
];

export const normalizeCatalogSearch = (value: string) => value
  .toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/×/g, 'x').replace(/[^a-z0-9]+/g, ' ').trim();

const activityAliases: Record<CatalogActivity, string[]> = {
  hiking: ['hiking', 'hike', 'day hiking', 'day hike'],
  backpacking: ['backpacking', 'backpack', 'backcountry'],
  hunting: ['hunting', 'hunt'],
  camping: ['camping', 'camp', 'base camp', 'car camping'],
  'off-road': ['off road', 'offroad', 'off roading', 'offroading', 'four wheeling', '4 wheeling', 'overlanding'],
};
const vehicleAliases: Record<CatalogVehicle, string[]> = {
  atv: ['atv', 'quad', 'all terrain vehicle'],
  utv: ['utv', 'sxs', 'side by side'],
  '4x4': ['4x4', '4 x 4', '4wd', 'four wheel drive'],
};

function aliasValue<T extends string>(value: string | undefined, aliases: Record<T, string[]>): T | undefined {
  if (!value) return undefined;
  const normalized = normalizeCatalogSearch(value);
  return (Object.keys(aliases) as T[]).find(key => aliases[key].includes(normalized));
}
export const catalogActivity = (value?: string) => aliasValue(value, activityAliases);
export const catalogVehicle = (value?: string) => aliasValue(value, vehicleAliases);

export type RangeKey = 'minPriceUSD' | 'maxPriceUSD' | 'minWeightGrams' | 'maxWeightGrams';
export type CatalogRangeInput = Record<RangeKey, string>;
const rangeKeys: RangeKey[] = ['minPriceUSD', 'maxPriceUSD', 'minWeightGrams', 'maxWeightGrams'];
export const emptyCatalogRanges = (): CatalogRangeInput => ({ minPriceUSD: '', maxPriceUSD: '', minWeightGrams: '', maxWeightGrams: '' });

/** Keep blank distinct from zero, and reject partial parsing such as "50abc". */
export function parseCatalogRanges(input: CatalogRangeInput) {
  const values: Partial<Record<RangeKey, number>> = {};
  const errors: Partial<Record<RangeKey, string>> = {};
  for (const key of rangeKeys) {
    const text = input[key].trim();
    if (!text) continue;
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || !Number.isFinite(Number(text))) {
      errors[key] = 'Enter a number of 0 or more, using a decimal point if needed.';
    } else values[key] = Number(text);
  }
  for (const [min, max, label] of [
    ['minPriceUSD', 'maxPriceUSD', 'price'],
    ['minWeightGrams', 'maxWeightGrams', 'weight'],
  ] as const) {
    if (values[min] !== undefined && values[max] !== undefined && values[min]! > values[max]!) {
      errors[max] = `Maximum ${label} must be at least the minimum.`;
    }
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}

const known = (value: number | null): value is number => value !== null && Number.isFinite(value) && value >= 0;
function numericOrder(a: number | null, b: number | null, descending: boolean) {
  if (!known(a)) return known(b) ? 1 : 0;
  if (!known(b)) return -1;
  return descending ? b - a : a - b;
}

export function filterCatalog(products: readonly Product[], filters: CatalogFilters = {}): Product[] {
  for (const key of rangeKeys) {
    const value = filters[key];
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new RangeError('Catalog ranges must contain nonnegative, finite numbers.');
  }
  if ((filters.minPriceUSD !== undefined && filters.maxPriceUSD !== undefined && filters.minPriceUSD > filters.maxPriceUSD)
    || (filters.minWeightGrams !== undefined && filters.maxWeightGrams !== undefined && filters.minWeightGrams > filters.maxWeightGrams)) {
    throw new RangeError('Catalog range maximum must be at least the minimum.');
  }
  const words = normalizeCatalogSearch(filters.query || '').split(' ').filter(Boolean);
  const favorites = filters.favorites ? new Set(filters.favorites) : null;
  return products.filter(product => {
    if (filters.brand && product.brand !== filters.brand) return false;
    if (filters.category && product.category !== filters.category) return false;
    if (filters.kind && product.kind !== filters.kind) return false;
    if (filters.photosOnly && !product.photo) return false;
    if (favorites && !favorites.has(product.id)) return false;
    if (filters.knownWeight && !known(product.weightGrams)) return false;
    if (filters.knownPrice && !known(product.priceUSD)) return false;
    const tags = product.tags.map(normalizeCatalogSearch);
    if (filters.activity && !tags.some(tag => activityAliases[filters.activity!].includes(tag))) return false;
    if (filters.vehicle && !tags.some(tag => vehicleAliases[filters.vehicle!].includes(tag))) return false;
    if (filters.minPriceUSD !== undefined && (!known(product.priceUSD) || product.priceUSD < filters.minPriceUSD)) return false;
    if (filters.maxPriceUSD !== undefined && (!known(product.priceUSD) || product.priceUSD > filters.maxPriceUSD)) return false;
    if (filters.minWeightGrams !== undefined && (!known(product.weightGrams) || product.weightGrams < filters.minWeightGrams)) return false;
    if (filters.maxWeightGrams !== undefined && (!known(product.weightGrams) || product.weightGrams > filters.maxWeightGrams)) return false;
    const searchable = normalizeCatalogSearch([product.name, product.brand, product.model, product.variant, product.kind, product.category, ...product.tags].join(' '));
    return words.every(word => searchable.includes(word));
  }).sort((a, b) => {
    const nameOrder = a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    if (filters.sort === 'name-asc') return nameOrder;
    if (filters.sort === 'name-desc') return -nameOrder;
    if (filters.sort === 'price-asc' || filters.sort === 'price-desc') return numericOrder(a.priceUSD, b.priceUSD, filters.sort === 'price-desc') || nameOrder;
    if (filters.sort === 'weight-asc' || filters.sort === 'weight-desc') return numericOrder(a.weightGrams, b.weightGrams, filters.sort === 'weight-desc') || nameOrder;
    return Number(!!b.photo) - Number(!!a.photo) || nameOrder;
  });
}
