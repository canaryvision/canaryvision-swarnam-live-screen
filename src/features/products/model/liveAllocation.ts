import type { ErpEntries, VehicleRow } from '../../../types';
import { addDaysToDateString, getIndianCalendarDateString } from '../../../utils/productionDay.ts';
import { normalizeErpRows, normalizePlateKey } from '../../../utils/erpAlerts.ts';

export const productAllocationKey = (value: unknown) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const getLiveErpDates = (date: string, vehicle: VehicleRow | null) => {
  if (!date) return [];
  const dates = [date, addDaysToDateString(date, 1)];
  const timestamps = (vehicle?.productDetails || []).flatMap((row) => row.timestamps || [])
    .filter((value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  const first = timestamps[0];
  // Camera timestamps without an offset are local Indian wall-clock times.
  const loadingDate = first && (/^\d{4}-\d{2}-\d{2}[ T]/.test(first) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(first)
    ? first.slice(0, 10) : getIndianCalendarDateString(new Date(first)));
  return loadingDate && dates.includes(loadingDate) ? [loadingDate, ...dates.filter((value) => value !== loadingDate)] : dates;
};

export const findLiveAllocation = (entries: ErpEntries, dates: string[], plate: string | undefined) => {
  const plateKey = normalizePlateKey(plate);
  if (!plateKey) return null;
  for (const date of dates) {
    const entry = entries[date];
    if (!entry || entry.error) continue;
    const allocation = normalizeErpRows(entry.docData, date).find((row) => [row.vehicle, row.vehicleId].some((value) => normalizePlateKey(value) === plateKey));
    if (allocation) return { allocation, date, cached: entry };
  }
  return null;
};
