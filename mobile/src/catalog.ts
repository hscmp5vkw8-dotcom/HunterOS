import rows from '../data/catalog.json';
import type { Product } from './types';
// Generated at install/build time from the preserved HTML catalog plus reviewed overrides.
export const catalog = rows as Product[];
export const brands = [...new Set(catalog.map(p=>p.brand))].sort();
