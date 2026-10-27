import type { ProductionData, ErpEntries, ProductCatalog } from '../types';
import { getVehicleRowsForDate } from '../features/vehicles/model/vehicleData.ts';
import { findLiveAllocation, getLiveErpDates, productAllocationKey } from '../features/products/model/liveAllocation.ts';

const stamp = (value: string | undefined) => Date.parse(value || '') || 0;
export function buildLiveSnapshot(production: ProductionData, erp: ErpEntries, date: string, catalog: ProductCatalog = {}) {
  const vehicles = getVehicleRowsForDate(production, date, { includeLegacyFallback: false });
  const candidates = vehicles.flatMap((vehicle) => vehicle.productDetails.map((detail) => {
    const latestTimestamp = [...detail.timestamps].sort((a, b) => stamp(b) - stamp(a))[0];
    const code = detail.code;
    return { vehicle, product: { product_code: code, product_name: catalog[code.toUpperCase()]?.name || catalog[productAllocationKey(code)]?.name || code, count: detail.count, latestTimestamp }, timestamp: stamp(latestTimestamp) };
  })).sort((a, b) => b.timestamp - a.timestamp);
  const latest = candidates[0];
  const vehicle = latest?.vehicle || vehicles[0] || null;
  const product = latest?.product || null;
  const dates = getLiveErpDates(date, vehicle);
  const match = findLiveAllocation(erp, dates, vehicle?.plate);
  const matchingItems = (match?.allocation.items || []).filter((item) => productAllocationKey(item.name) === productAllocationKey(product?.product_code));
  const target = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
  const error = !match && dates.map((value) => erp[value]?.error).find(Boolean) || '';
  const rows = (vehicle?.productDetails || []).map((detail) => ({ product_code: detail.code, product_name: catalog[detail.code.toUpperCase()]?.name || catalog[productAllocationKey(detail.code)]?.name || detail.code, count: detail.count }));
  return { date, vehicle, product, rows, loaded: product?.count || 0, target, unknownCount: vehicle?.unknownCount || 0,
    allocation: { allocation: match?.allocation || null, allocatedCount: target, hasAllocation: matchingItems.length > 0, isLoading: !match && dates.some((value) => !erp[value]), error } };
}

export function selectAvailableProductionDate(production: ProductionData, preferredDate: string, fallbackDates: string[] = []) {
  return [preferredDate, ...fallbackDates].find((date) => getVehicleRowsForDate(production, date, { includeLegacyFallback: false }).length > 0) || preferredDate;
}
