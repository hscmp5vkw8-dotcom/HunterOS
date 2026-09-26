import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Switch, Text, View, useWindowDimensions } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalog } from '@/use-catalog';
import { CATEGORIES } from '@/domain';
import {
  ACTIVITY_OPTIONS, VEHICLE_OPTIONS, SORT_OPTIONS, catalogActivity, catalogVehicle,
  emptyCatalogRanges, filterCatalog, normalizeCatalogSearch, parseCatalogRanges,
  type CatalogFilters, type RangeKey,
} from '@/product-filters';
import { useStore } from '@/store';
import { Button, C, Chips, ErrorText, Field, Label, ProductCard, s } from '@/ui';

export default function Catalog() {
  const { products: catalog, loading, error, refresh } = useCatalog();
  const router = useRouter();
  const { tripId, loadoutId, activity, vehicle, category } = useLocalSearchParams<{
    tripId?: string; loadoutId?: string; activity?: string; vehicle?: string; category?: string;
  }>();
  const { state } = useStore();
  const [filters, setFilters] = useState<CatalogFilters>(() => ({ query: '', sort: 'featured', activity: catalogActivity(activity), vehicle: catalogVehicle(vehicle), category }));
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [ranges, setRanges] = useState(emptyCatalogRanges);
  const [showFilters, setShowFilters] = useState(false);
  const [section, setSection] = useState('activity');
  const [optionQuery, setOptionQuery] = useState('');
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cols = width >= 720 ? 2 : 1;

  // A scoped browse link starts a new search. Merely switching tabs leaves
  // these route parameters unchanged and preserves the user's current filters.
  useEffect(() => {
    setFilters(current => ({ query: '', sort: current.sort, activity: catalogActivity(activity), vehicle: catalogVehicle(vehicle), category }));
    setFavoritesOnly(false);
    setRanges(emptyCatalogRanges());
    setOptionQuery('');
  }, [activity, vehicle, category, tripId, loadoutId]);

  const targetLoadout = loadoutId ? state.loadouts.find(item => item.id === loadoutId) : undefined;
  const targetTrip = !loadoutId && tripId ? state.trips.find(item => item.id === tripId) : undefined;

  const brands = useMemo(() => [...new Set(catalog.map(product => product.brand).filter(Boolean))].sort(), [catalog]);
  const kinds = useMemo(() => [...new Set(catalog.map(product => product.kind).filter(Boolean))].sort(), [catalog]);
  const parsedRanges = useMemo(() => parseCatalogRanges(ranges), [ranges]);
  const products = useMemo(() => parsedRanges.valid ? filterCatalog(catalog, {
    ...filters, ...parsedRanges.values, favorites: favoritesOnly ? state.favorites : null,
  }) : [], [catalog, filters, parsedRanges, favoritesOnly, state.favorites]);

  function update<K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) {
    setFilters(current => ({ ...current, [key]: value }));
  }
  function reset() {
    setFilters({ query: '', sort: 'featured' });
    setFavoritesOnly(false);
    setRanges(emptyCatalogRanges());
    setOptionQuery('');
  }
  const active: { key: string; label: string; remove: () => void }[] = [];
  if (filters.query?.trim()) active.push({ key: 'query', label: `Search: ${filters.query.trim()}`, remove: () => update('query', '') });
  for (const key of ['category', 'brand', 'kind'] as const) {
    if (filters[key]) active.push({ key, label: filters[key]!, remove: () => update(key, undefined) });
  }
  if (filters.activity) active.push({ key: 'activity', label: ACTIVITY_OPTIONS.find(option => option.value === filters.activity)!.label, remove: () => update('activity', undefined) });
  if (filters.vehicle) active.push({ key: 'vehicle', label: VEHICLE_OPTIONS.find(option => option.value === filters.vehicle)!.label, remove: () => update('vehicle', undefined) });
  if (favoritesOnly) active.push({ key: 'favorites', label: 'Favorites', remove: () => setFavoritesOnly(false) });
  for (const [key, label] of [['photosOnly', 'With photos'], ['knownWeight', 'Known weight'], ['knownPrice', 'Known price']] as const) {
    if (filters[key]) active.push({ key, label, remove: () => update(key, false) });
  }
  for (const [min, max, label, unit] of [
    ['minPriceUSD', 'maxPriceUSD', 'Price', 'USD'], ['minWeightGrams', 'maxWeightGrams', 'Weight', 'g'],
  ] as const) {
    if (ranges[min].trim() || ranges[max].trim()) active.push({
      key: min, label: `${label}: ${ranges[min].trim() || '0'}–${ranges[max].trim() || 'any'} ${unit}`,
      remove: () => setRanges(current => ({ ...current, [min]: '', [max]: '' })),
    });
  }
  const sections = [
    { key: 'activity', label: 'Activity & vehicle', summary: [ACTIVITY_OPTIONS.find(option => option.value === filters.activity)?.label, VEHICLE_OPTIONS.find(option => option.value === filters.vehicle)?.label].filter(Boolean).join(' · ') || 'Any activity' },
    { key: 'category', label: 'Category', summary: filters.category || 'All categories' },
    { key: 'brand', label: 'Brand', summary: filters.brand || 'All brands' },
    { key: 'kind', label: 'Product type', summary: filters.kind || 'All types' },
    { key: 'details', label: 'Photos & saved gear', summary: [favoritesOnly && 'Favorites', filters.photosOnly && 'Photos', filters.knownWeight && 'Weight', filters.knownPrice && 'Price'].filter(Boolean).join(' · ') || 'Any product' },
    { key: 'ranges', label: 'Price & weight', summary: !parsedRanges.valid ? 'Check range values' : active.filter(item => item.key === 'minPriceUSD' || item.key === 'minWeightGrams').map(item => item.label).join(' · ') || 'No limits' },
  ];
  const optionKey = section === 'category' || section === 'brand' || section === 'kind' ? section : undefined;
  const options = optionKey === 'category' ? CATEGORIES : optionKey === 'brand' ? brands : optionKey === 'kind' ? kinds : [];
  const visibleOptions = options.filter(option => normalizeCatalogSearch(option).includes(normalizeCatalogSearch(optionQuery)));

  return <FlatList
    key={cols} style={{ flex: 1, backgroundColor: C.bg }} contentInsetAdjustmentBehavior="automatic"
    data={products} numColumns={cols} keyExtractor={product => product.id}
    keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5}
    contentContainerStyle={{ padding: 16, paddingBottom: inset.bottom + 24, maxWidth: 1120, width: '100%', alignSelf: 'center' }}
    columnWrapperStyle={cols > 1 ? { gap: 14 } : undefined}
    renderItem={({ item }) => <View style={{ flex: 1, maxWidth: cols > 1 ? '50%' : '100%', marginBottom: 14 }}>
      <ProductCard product={item} tripId={targetTrip?.id} loadoutId={targetLoadout?.id} />
    </View>}
    ListHeaderComponent={<View style={{ gap: 12, paddingBottom: 16 }}>
      <Label>REAL GEAR. YOUR SYSTEM.</Label>
      <Text style={s.title}>Find your next piece.</Text>
      <Text selectable style={s.body}>{catalog.length} catalog configurations · {catalog.filter(product => product.photo).length} photo references · {catalog.filter(product => product.reviewStatus === 'community').length} shared products</Text>
      {tripId || loadoutId ? <View style={[s.card, { padding: 14 }]}>
        <Label>{loadoutId ? 'SHOPPING FOR YOUR LOADOUT' : 'SHOPPING FOR YOUR TRIP'}</Label>
        <Text selectable style={s.h2}>{targetLoadout?.name || targetTrip?.name || 'This trip or loadout is no longer available.'}</Text>
        {targetLoadout || targetTrip ? <Text style={s.small}>Select a product to add it to this setup.</Text> : null}
        <View style={s.row}>
          {targetLoadout ? <Link href={{ pathname: '/loadout/[id]', params: { id: targetLoadout.id } }} style={{ color: C.lime, padding: 12, minHeight: 44 }}>Return to loadout →</Link> : null}
          {targetTrip ? <Link href={{ pathname: '/trip/[id]', params: { id: targetTrip.id } }} style={{ color: C.lime, padding: 12, minHeight: 44 }}>Return to trip →</Link> : null}
          <Button secondary title="Browse without a trip or loadout" onPress={() => router.setParams({ tripId: undefined, loadoutId: undefined })} />
        </View>
      </View> : null}
      <Field label="Search gear" value={filters.query || ''} onChangeText={value => update('query', value)} placeholder="Brand, model, size or gear type…" autoCapitalize="none" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Pressable testID="catalog-filters-toggle" accessibilityRole="button" accessibilityLabel={`${showFilters ? 'Hide' : 'Show'} filters, ${active.length} active`} accessibilityState={{ expanded: showFilters }} onPress={() => setShowFilters(current => !current)} style={[s.button, { backgroundColor: C.panel, borderWidth: 1, borderColor: showFilters ? C.lime : C.line, flexGrow: 1 }]}>
          <Text style={{ color: C.ink, fontWeight: '700' }}>{showFilters ? 'Hide filters' : 'Filters'}{active.length ? ` · ${active.length}` : ''} {showFilters ? '−' : '+'}</Text>
        </Pressable>
        {active.length > 0 || filters.sort !== 'featured' ? <Button secondary title="Reset filters" onPress={reset} /> : null}
      </View>
      {active.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {active.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Remove ${item.label} filter`} onPress={item.remove} style={[s.chip, { borderColor: '#52653c', backgroundColor: '#26351e' }]}>
          <Text numberOfLines={1} style={{ color: C.lime, maxWidth: 240, fontSize: 12 }}>{item.label} ×</Text>
        </Pressable>)}
      </ScrollView> : null}
      {showFilters ? <View style={[s.card, { padding: 12, gap: 0 }]}>
        {sections.map(item => <View key={item.key} style={{ borderBottomWidth: item.key === 'ranges' ? 0 : 1, borderBottomColor: C.line }}>
          <Pressable testID={`filter-section-${item.key}`} accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.summary}`} accessibilityState={{ expanded: section === item.key }} onPress={() => { setSection(current => current === item.key ? '' : item.key); setOptionQuery(''); }} style={[s.row, { flexWrap: 'nowrap', justifyContent: 'space-between', minHeight: 58, paddingVertical: 10 }]}>
            <View style={{ gap: 3, flex: 1 }}><Text style={{ color: C.ink, fontWeight: '700' }}>{item.label}</Text><Text numberOfLines={1} style={s.small}>{item.summary}</Text></View>
            <Text style={{ color: C.lime, fontSize: 22 }}>{section === item.key ? '−' : '+'}</Text>
          </Pressable>
          {section === item.key ? <View style={{ gap: 12, paddingBottom: 14 }}>
            {item.key === 'activity' ? <>
              <Text style={s.small}>Activity</Text>
              <Chips values={['Any activity', ...ACTIVITY_OPTIONS.map(option => option.label)]} value={ACTIVITY_OPTIONS.find(option => option.value === filters.activity)?.label || 'Any activity'} onChange={label => update('activity', ACTIVITY_OPTIONS.find(option => option.label === label)?.value)} />
              <Text style={s.small}>Vehicle</Text>
              <Chips values={['Any vehicle', ...VEHICLE_OPTIONS.map(option => option.label)]} value={VEHICLE_OPTIONS.find(option => option.value === filters.vehicle)?.label || 'Any vehicle'} onChange={label => update('vehicle', VEHICLE_OPTIONS.find(option => option.label === label)?.value)} />
              <Text style={s.small}>Matches activity and vehicle tags. Confirm vehicle fit on the manufacturer’s page.</Text>
            </> : null}
            {optionKey && item.key === optionKey ? <>
              {options.length > 8 ? <Field label={`Find a ${optionKey === 'kind' ? 'product type' : optionKey}`} value={optionQuery} onChangeText={setOptionQuery} placeholder="Type to narrow choices" autoCapitalize="none" autoCorrect={false} /> : null}
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 210 }} contentContainerStyle={{ gap: 8 }}>
                <Pressable accessibilityRole="button" accessibilityState={{ selected: !filters[optionKey] }} onPress={() => update(optionKey, undefined)} style={[s.chip, !filters[optionKey] && { borderColor: C.lime }]}>
                  <Text style={{ color: !filters[optionKey] ? C.lime : C.muted }}>All {optionKey === 'category' ? 'categories' : optionKey === 'brand' ? 'brands' : 'types'}</Text>
                </Pressable>
                {visibleOptions.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: filters[optionKey] === option }} onPress={() => update(optionKey, option)} style={[s.chip, filters[optionKey] === option && { borderColor: C.lime, backgroundColor: '#26351e' }]}>
                  <Text style={{ color: filters[optionKey] === option ? C.lime : C.muted }}>{option}</Text>
                </Pressable>)}
                {!visibleOptions.length ? <Text style={s.small}>No choices match. Try a shorter search.</Text> : null}
              </ScrollView>
            </> : null}
            {item.key === 'details' ? <>
              {[
                { key: 'photosOnly', label: 'With photos', value: !!filters.photosOnly, change: (value: boolean) => update('photosOnly', value) },
                { key: 'favorites', label: 'Favorites only', value: favoritesOnly, change: setFavoritesOnly },
                { key: 'knownWeight', label: 'Known weight', value: !!filters.knownWeight, change: (value: boolean) => update('knownWeight', value) },
                { key: 'knownPrice', label: 'Known price', value: !!filters.knownPrice, change: (value: boolean) => update('knownPrice', value) },
              ].map(toggle => <View key={toggle.key} style={[s.row, { minHeight: 44, justifyContent: 'space-between' }]}>
                <Text style={{ color: C.ink }}>{toggle.label}</Text>
                <Switch testID={`filter-${toggle.key}`} accessibilityLabel={toggle.label} value={toggle.value} onValueChange={toggle.change} trackColor={{ false: C.line, true: '#6d853e' }} thumbColor={toggle.value ? C.lime : '#d0d7cb'} />
              </View>)}
              <Text style={s.small}>Combine any of these. Known weights and prices are reference data.</Text>
            </> : null}
            {item.key === 'ranges' ? <>
              <Text style={s.small}>Leave a limit blank for no limit. Ranges exclude products with unknown values.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {([
                  ['minPriceUSD', 'Minimum price (USD)'], ['maxPriceUSD', 'Maximum price (USD)'],
                  ['minWeightGrams', 'Minimum weight (g)'], ['maxWeightGrams', 'Maximum weight (g)'],
                ] as [RangeKey, string][]).map(([key, label]) => <View key={key} style={{ flexGrow: 1, flexBasis: '44%', minWidth: 120, gap: 5 }}>
                  <Field testID={`catalog-${key}`} label={label} value={ranges[key]} onChangeText={value => setRanges(current => ({ ...current, [key]: value }))} placeholder="No limit" keyboardType="decimal-pad" inputMode="decimal" maxLength={16} />
                  <ErrorText message={parsedRanges.errors[key] || ''} />
                </View>)}
              </View>
            </> : null}
          </View> : null}
        </View>)}
        <Button secondary title="Show results" onPress={() => setShowFilters(false)} disabled={!parsedRanges.valid} />
      </View> : null}
      {!parsedRanges.valid ? <ErrorText message="Check your price or weight limits. Results will appear when all ranges are valid." /> : null}
      <View style={{ gap: 3 }}><Text style={s.small}>Sort results</Text>
        <Chips values={SORT_OPTIONS.map(option => option.label)} value={SORT_OPTIONS.find(option => option.value === filters.sort)?.label || 'Featured'} onChange={label => update('sort', SORT_OPTIONS.find(option => option.label === label)?.value || 'featured')} />
      </View>
      <Text selectable accessibilityLiveRegion="polite" style={s.small}>{parsedRanges.valid ? `${products.length} ${products.length === 1 ? 'match' : 'matches'} of ${catalog.length}` : 'Results paused until ranges are valid'} · prices are not live</Text>
      <View style={s.row}>
        <Button secondary title="Add a product for everyone" onPress={() => router.push('/gear/edit')} />
        <Button secondary title={loading ? 'Refreshing shared products…' : 'Refresh shared products'} disabled={loading} onPress={() => void refresh()} />
      </View>
      {error ? <Text selectable style={s.small}>{error}</Text> : null}
    </View>}
    ListEmptyComponent={<View style={s.card}>
      <Text style={s.h2}>{!parsedRanges.valid ? 'Check your ranges.' : favoritesOnly && !state.favorites.length ? 'Your favorites start here.' : 'No gear matches yet.'}</Text>
      <Text style={s.body}>{!parsedRanges.valid ? 'Use nonnegative numbers, with the maximum at least as large as the minimum.' : favoritesOnly && !state.favorites.length ? 'Open a product and save it to your favorites, then return to this filter.' : 'Remove an active filter, broaden the price or weight range, or search by just a brand or gear type.'}</Text>
      {!parsedRanges.valid ? <Button title="Edit ranges" onPress={() => { setShowFilters(true); setSection('ranges'); }} /> : <Button title="Clear filters and explore gear" onPress={reset} />}
    </View>}
  />;
}
