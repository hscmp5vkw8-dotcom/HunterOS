import type { Product, Workspace } from './types';

export const FEEDS = ['Recommended', 'Popular', 'Friends', 'New releases'] as const;
export type Feed = typeof FEEDS[number];
export interface ProductSignal { product_id: string; likes: number; uses: number }
export interface ProductRelease { product_id: string; released_on: string; source_url: string }

// Recommendations stay on-device. A catalog check date is NOT a product release date.
export function recommendedProducts(products: Product[], state: Workspace): Product[] {
  const saved = new Set(state.favorites);
  const categories = new Set([
    ...products.filter(p => saved.has(p.id)).map(p => p.category),
    ...state.gear.map(g => g.category),
    ...state.loadouts.flatMap(l => l.items.map(g => g.category)),
  ]);
  return [...products].sort((a, b) =>
    Number(categories.has(b.category)) - Number(categories.has(a.category)) ||
    Number(!!b.photo) - Number(!!a.photo) || a.name.localeCompare(b.name)
  ).slice(0, 6);
}

export function popularProducts(products: Product[], signals: ProductSignal[]) {
  return signals.flatMap(signal => {
    const product = products.find(p => p.id === signal.product_id);
    return product && signal.likes + signal.uses > 0 ? [{product, ...signal}] : [];
  }).sort((a, b) => (b.likes + b.uses) - (a.likes + a.uses) || a.product.name.localeCompare(b.product.name));
}

export function releasedProducts(products: Product[], releases: ProductRelease[], today = new Date().toISOString().slice(0, 10)) {
  return releases.flatMap(release => {
    const product = products.find(p => p.id === release.product_id);
    const date = new Date(release.released_on);
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(release.released_on) && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === release.released_on;
    return product && valid && release.released_on <= today && /^https:\/\//.test(release.source_url) ? [{product, ...release}] : [];
  }).sort((a, b) => b.released_on.localeCompare(a.released_on));
}
