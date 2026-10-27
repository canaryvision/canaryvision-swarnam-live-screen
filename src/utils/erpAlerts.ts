import type { FirebaseRecord, VehicleRow } from '../types';
interface ErpItem { name: string; quantity: number }
interface ErpCustomer { id: number; name: string; items: ErpItem[]; unmapped: ErpItem[]; total: number }
export interface ErpRow {
  key: string;
  title: string;
  destination: string;
  status: string;
  date: string;
  time: string;
  driver: string;
  vehicle: string;
  vehicleId: string;
  boxAllocated: number;
  lotId: string | string[];
  items: ErpItem[];
  unmapped: ErpItem[];
  customers: ErpCustomer[];
  itemSearchText: string;
  updatedAt: unknown;
}
export const normalizePlateKey = (str: unknown) => String(str || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const matchesErpVehicleOrLot = (row: Pick<ErpRow, 'vehicleId' | 'vehicle' | 'lotId'>, query: string) => {
  const search = normalizePlateKey(query);
  if (!search) return true;
  return [row.vehicleId, row.vehicle, row.lotId].some((value) => (
    normalizePlateKey(value).includes(search)
  ));
};

export const isPlainObject = (value: unknown): value is FirebaseRecord => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

export const getNumberTotal = (items: FirebaseRecord = {}) => (
  Object.values(isPlainObject(items) ? items : {}).reduce<number>((sum, value) => {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? sum + nextValue : sum;
  }, 0)
);

export const getRecordStatus = (record: FirebaseRecord) => {
  const explicitStatus = String(record.status || record.erp_status || '').trim();
  if (explicitStatus) return explicitStatus;
  return getNumberTotal(record.items) + getNumberTotal(record.unmapped) > 0 ? 'Completed' : 'Pending';
};

export const getSearchText = (value: unknown) => (
  isPlainObject(value)
    ? Object.keys(value).join(' ')
    : ''
);

export const normalizeItemEntries = (items: FirebaseRecord = {}) => (
  Object.entries(isPlainObject(items) ? items : {})
    .filter(([, quantity]) => quantity !== undefined && quantity !== null && quantity !== '')
    .map(([name, quantity]) => ({
      name,
      quantity: Number(quantity) || 0,
    }))
);

export const normalizeCustomerEntries = (customers: FirebaseRecord[] = []): ErpCustomer[] => {
  if (!Array.isArray(customers)) return [];

  return customers.map((customer, index) => {
    if (!isPlainObject(customer)) return null;

    const items = normalizeItemEntries(customer.items);
    const unmapped = normalizeItemEntries(customer.unmapped);
    const itemsTotal = getNumberTotal(customer.items);
    const unmappedTotal = getNumberTotal(customer.unmapped);
    const computedTotal = itemsTotal + unmappedTotal;
    const total = Number(customer.total ?? computedTotal) || 0;

    return {
      id: index,
      name: customer.name || `Customer ${index + 1}`,
      items,
      unmapped,
      total,
    };
  }).filter((customer) => customer !== null);
};

export const normalizeErpRows = (docData: FirebaseRecord | null | undefined, selectedDate: string): ErpRow[] => {
  if (!docData || !isPlainObject(docData)) return [];

  return Object.entries(docData)
    .filter(([, value]) => isPlainObject(value))
    .map(([key, value]) => {
      const itemsTotal = getNumberTotal(value.items);
      const unmappedTotal = getNumberTotal(value.unmapped);
      const computedQuantity = itemsTotal + unmappedTotal;
      const totalQuantity = Number(value.total ?? computedQuantity) || computedQuantity;
      const updatedAt = value.updatedAt || value.updated_at || value.time || value.createdAt || value.created_at || '';
      const items = normalizeItemEntries(value.items);
      const unmapped = normalizeItemEntries(value.unmapped);
      const customers = normalizeCustomerEntries(value.customers);
      const customerSearchText = customers.map((c) => c.name).join(' ');

      return {
        key,
        title: value.destination || value.title || value.route || key,
        destination: value.destination || '-',
        status: getRecordStatus(value),
        date: value.posting_date || value.date || selectedDate,
        time: value.time || '-',
        driver: value.driver || '-',
        vehicle: value.erp_vehicle || value.vehicle || key,
        vehicleId: key,
        boxAllocated: Number(value.total ?? value.box_allocated ?? value.boxAllocated ?? totalQuantity) || 0,
        lotId: value.lot_ids || value.lot_id || value.id || '-',
        items,
        unmapped,
        customers,
        itemSearchText: `${getSearchText(value.items)} ${getSearchText(value.unmapped)} ${customerSearchText}`.toLowerCase(),
        updatedAt,
      };
    })
    .sort((a, b) => {
      const statusOrder = a.status === b.status ? 0 : a.status === 'Pending' ? -1 : 1;
      if (statusOrder !== 0) return statusOrder;
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
};

export const buildErpComparisonRows = (erpRows: ErpRow[], vehiclesForDate: VehicleRow[] = []) => {
  const vehicleRecordsMap = new Map<string, VehicleRow>();

  vehiclesForDate.forEach((vehicle) => {
    const cleanPlate = normalizePlateKey(vehicle.plate);
    if (cleanPlate) {
      vehicleRecordsMap.set(cleanPlate, vehicle);
    }
  });

  return erpRows.map((row) => {
    const cleanVehiclePlate = normalizePlateKey(row.vehicle);
    const cleanVehicleId = normalizePlateKey(row.vehicleId);
    const matchedVehicle = vehicleRecordsMap.get(cleanVehiclePlate) || vehicleRecordsMap.get(cleanVehicleId) || null;

    if (!matchedVehicle) {
      return {
        ...row,
        matchedVehicle: null,
        vehicleActualCount: null,
        discrepancyType: 'no_record',
        diffCount: 0,
      };
    }

    const vehicleActualCount = Number(matchedVehicle.quantity || 0);
    const diffCount = row.boxAllocated - vehicleActualCount;
    const discrepancyType = diffCount > 0 ? 'more' : diffCount < 0 ? 'less' : 'matched';

    return {
      ...row,
      matchedVehicle,
      vehicleActualCount,
      discrepancyType,
      diffCount,
    };
  });
};

export const getErpAlertSummary = (rows: ReturnType<typeof buildErpComparisonRows> = []) => {
  const mismatchRows = rows.filter((row) => row.discrepancyType === 'more' || row.discrepancyType === 'less');

  return {
    mismatchRows,
    mismatchCount: mismatchRows.length,
    moreCount: rows.filter((row) => row.discrepancyType === 'more').length,
    lessCount: rows.filter((row) => row.discrepancyType === 'less').length,
    noRecordCount: rows.filter((row) => row.discrepancyType === 'no_record').length,
    matchedCount: rows.filter((row) => row.discrepancyType === 'matched').length,
  };
};
