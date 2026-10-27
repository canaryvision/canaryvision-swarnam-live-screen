import type { ProductionData, VehicleRow, UnknownEntry } from '../../../types';
interface PlateData { driver: string; products: Record<string, { numericCount: number; timestamps: string[] }>; unknownProducts: { numericCount: number; entries: UnknownEntry[] }; isCurrentPlate: boolean }
import {
  addDaysToDateString,
  formatIndianDateTime,
  getVehicleEntriesFromDateData,
  isInProductionWindow,
} from '../../../utils/productionDay.ts';
import { isCountedProductCode } from '../../../utils/productFilters.ts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Confirmed assignment for this production day only; preserve the raw camera records.
const VEHICLE_ASSIGNMENTS: Record<string, Record<string, string>> = {
  '2026-10-21': { ONECUPMAGIC: 'KL41X5372' },
};

export const getTimestampValues = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean) as string[];
  return [];
};

export const getTimedValueCount = (value: unknown) => {
  if (Array.isArray(value)) return value.filter(Boolean).length;
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).length;
  return Number(value) || 0;
};

const getTimestampNumber = (timestamp: string | undefined) => {
  const value = Date.parse(timestamp || '');
  return Number.isNaN(value) ? 0 : value;
};

const formatVehicleTime = (timestamp: string | undefined) => {
  const value = getTimestampNumber(timestamp);
  return value ? formatIndianDateTime(new Date(value)) : '-';
};

const isVehiclePlate = (plate: unknown) => {
  const normalizedPlate = String(plate || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  return normalizedPlate.length > 0 && normalizedPlate !== 'unassigned';
};

const getTimedVehicleValues = (value: unknown, productionDate: string, fallbackDate: string) => {
  if (typeof value === 'number') {
    return {
      numericCount: fallbackDate === productionDate ? value : 0,
      timestamps: [],
    };
  }

  return {
    numericCount: 0,
    timestamps: getTimestampValues(value)
      .filter((timestamp: string | undefined) => isInProductionWindow(timestamp, productionDate, fallbackDate)),
  };
};

const getVehicleUnknownEntryTime = (entry: any) => {
  if (!entry || typeof entry !== 'object') return entry;
  return entry.time || entry.timestamp || entry.arrivedTime || entry.arrived_time || entry.createdAt || entry.created_at || '';
};

const getVehicleUnknownEntryImage = (entry: any) => {
  if (!entry || typeof entry !== 'object') return '';
  return entry.image || entry.imageUrl || entry.image_url || entry.photo || entry.photoUrl || entry.url || '';
};

const getVehicleUnknownEntryPlate = (entry: any) => {
  if (!entry || typeof entry !== 'object') return '';
  return (
    entry.vehicleNumber ||
    entry.vehicle_number ||
    entry.vehicleNo ||
    entry.vehicle_no ||
    entry.plate ||
    entry.vehicle ||
    entry.truckNumber ||
    entry.truck_number ||
    ''
  );
};

const isLikelyTimestampKey = (key: string) => (
  typeof key === 'string' && key.trim() !== '' && !/^\d+$/.test(key.trim())
);

const getVehicleUnknownRecordEntries = (value: unknown): [string, any][] => {
  if (Array.isArray(value)) {
    return value.map((entry, index) => [String(index), entry]);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value);
  }

  return [];
};

const getTimedVehicleUnknownValues = (value: unknown, productionDate: string, fallbackDate: string) => {
  if (typeof value === 'number') {
    return {
      numericCount: fallbackDate === productionDate ? value : 0,
      entries: [],
    };
  }

  const entries = getVehicleUnknownRecordEntries(value)
    .map(([key, entry]) => {
      const timeFromEntry = getVehicleUnknownEntryTime(entry);
      const imageFromEntry = typeof entry === 'object'
        ? getVehicleUnknownEntryImage(entry)
        : (typeof entry === 'string' && (entry.startsWith('data:') || entry.startsWith('http') || entry.startsWith('blob:')) ? entry : '');

      return {
        time: timeFromEntry || (isLikelyTimestampKey(key) ? key : ''),
        image: imageFromEntry,
      };
    })
    .filter((entry) => (
      entry.time
        ? isInProductionWindow(entry.time, productionDate, fallbackDate)
        : fallbackDate === productionDate
    ));

  return {
    numericCount: 0,
    entries,
  };
};

const getTimedVehicleUnknownImages = (images: unknown, times: any, productionDate: string, fallbackDate: string) => {
  const timeMap = times && typeof times === 'object' && !Array.isArray(times) ? times : {};
  const timeList = Array.isArray(times) ? times : [];

  return getVehicleUnknownRecordEntries(images)
    .map(([key, image]) => {
      const imageValue = typeof image === 'object' ? getVehicleUnknownEntryImage(image) : image;
      const timeFromImage = typeof image === 'object' ? getVehicleUnknownEntryTime(image) : '';
      const timeFromMap = getVehicleUnknownEntryTime(timeMap[key]);
      const timeFromList = typeof timeList[Number(key)] === 'string' || typeof timeList[Number(key)] === 'number'
        ? timeList[Number(key)]
        : getVehicleUnknownEntryTime(timeList[Number(key)]);

      return {
        time: timeFromImage || timeFromMap || timeFromList || (isLikelyTimestampKey(key) ? key : ''),
        image: typeof imageValue === 'string' ? imageValue : '',
      };
    })
    .filter((entry) => {
      if (!entry.image) return false;
      if (entry.time) return isInProductionWindow(entry.time, productionDate, fallbackDate);
      return fallbackDate === productionDate;
    });
};

const mergeVehicleUnknownEntries = (entries: UnknownEntry[], imageEntries: UnknownEntry[]) => {
  const merged = entries.map((entry) => ({ ...entry }));

  imageEntries.forEach((imageEntry) => {
    const match = merged.find((entry) => !entry.image && entry.time && entry.time === imageEntry.time);
    if (match) {
      match.image = imageEntry.image;
      return;
    }

    merged.push(imageEntry);
  });

  return merged;
};

export const getUnknownDetectionEntries = (unknownProducts: unknown, unknownImages: unknown, productionDate: string) => {
  const timeEntries = getVehicleUnknownRecordEntries(unknownProducts)
    .map(([key, entry]) => {
      const time = getVehicleUnknownEntryTime(entry) || (isLikelyTimestampKey(key) ? key : '');
      const image = typeof entry === 'object'
        ? getVehicleUnknownEntryImage(entry)
        : (typeof entry === 'string' && (entry.startsWith('data:') || entry.startsWith('http') || entry.startsWith('blob:')) ? entry : '');

      return {
        arrivedTime: time,
        image,
        vehicleNumber: String(getVehicleUnknownEntryPlate(entry) || '').trim(),
      };
    })
    .filter((entry) => (
      (entry.arrivedTime || entry.image) &&
      (
        entry.arrivedTime
          ? isInProductionWindow(entry.arrivedTime, productionDate, productionDate)
          : true
      )
    ));

  const imageEntries = getVehicleUnknownRecordEntries(unknownImages)
    .map(([key, entry]) => {
      const time = getVehicleUnknownEntryTime(entry) || (isLikelyTimestampKey(key) ? key : '');
      const image = typeof entry === 'object' ? getVehicleUnknownEntryImage(entry) : entry;

      return {
        arrivedTime: time,
        image: typeof image === 'string' ? image : '',
        vehicleNumber: String(getVehicleUnknownEntryPlate(entry) || '').trim(),
      };
    })
    .filter((entry) => (
      (entry.arrivedTime || entry.image) &&
      (
        entry.arrivedTime
          ? isInProductionWindow(entry.arrivedTime, productionDate, productionDate)
          : true
      )
    ));

  return mergeVehicleUnknownEntries(timeEntries, imageEntries)
    .map((entry) => ({
      arrivedTime: entry.arrivedTime || entry.time || '',
      image: entry.image || '',
      vehicleNumber: entry.vehicleNumber || '',
    }));
};

export const getVehicleRowsForDate = (allFirebaseData: ProductionData, targetDate: string, options: { includeLegacyFallback?: boolean } = {}): VehicleRow[] => {
  const { includeLegacyFallback = true } = options;
  const sourceDates = [targetDate, addDaysToDateString(targetDate, 1)];
  const entriesByPlate = new Map<string, PlateData>();

  const getPlateRow = (plate: string): PlateData => {
    const plateKey = String(plate).toUpperCase().replace(/[^A-Z0-9]/g, '');
    plate = VEHICLE_ASSIGNMENTS[targetDate]?.[plateKey] || plate;
    if (!entriesByPlate.has(plate)) {
      entriesByPlate.set(plate, {
        driver: '-',
        products: {},
        unknownProducts: {
          numericCount: 0,
          entries: [],
        },
        isCurrentPlate: false,
      });
    }

    return entriesByPlate.get(plate)!;
  };

  sourceDates.forEach((sourceDate) => {
    const dateData = allFirebaseData?.[sourceDate] || {};
    const currentPlate = (dateData.currentPlate || '').trim();

    if (isVehiclePlate(currentPlate)) {
      getPlateRow(currentPlate).isCurrentPlate = true;
    }

    getVehicleEntriesFromDateData(dateData)
      .filter(([plate]) => isVehiclePlate(plate))
      .forEach(([plate, vehicleData]) => {
        const row = getPlateRow(plate);
        if (vehicleData.driver && vehicleData.driver !== '-') row.driver = vehicleData.driver;

        Object.entries(vehicleData.products || {}).forEach(([code, value]) => {
          if (!isCountedProductCode(code)) return;

          const { numericCount, timestamps } = getTimedVehicleValues(value, targetDate, sourceDate);
          if (numericCount <= 0 && timestamps.length === 0) return;

          row.products[code] = row.products[code] || {
            numericCount: 0,
            timestamps: [],
          };
          row.products[code].numericCount += numericCount;
          row.products[code].timestamps.push(...timestamps);
        });

        const { numericCount, entries } = getTimedVehicleUnknownValues(
          vehicleData.unknown_products,
          targetDate,
          sourceDate
        );
        const imageEntries = getTimedVehicleUnknownImages(
          vehicleData.unknown_product_images,
          vehicleData.unknown_products,
          targetDate,
          sourceDate
        );
        row.unknownProducts.numericCount += numericCount;
        row.unknownProducts.entries.push(...mergeVehicleUnknownEntries(entries, imageEntries));
      });
  });

  Array.from(entriesByPlate).forEach(([plate, vehicleData]) => {
    const hasProductsInWindow = Object.values(vehicleData.products || {})
      .some((productData) => productData.numericCount > 0 || productData.timestamps.length > 0);
    const hasUnknownProductsInWindow = (
      vehicleData.unknownProducts.numericCount > 0 ||
      vehicleData.unknownProducts.entries.length > 0
    );

    if (!hasProductsInWindow && !hasUnknownProductsInWindow) {
      entriesByPlate.delete(plate);
    }
  });

  if (entriesByPlate.size === 0 && includeLegacyFallback && allFirebaseData.vehicles) {
    return Object.entries(allFirebaseData.vehicles).map(([key, value]) => ({
      id: key,
      ...(typeof value === 'object' ? value : {})
    })) as VehicleRow[];
  }

  return Array.from(entriesByPlate).map(([plate, vehicleData]) => {
    const productCodes = Object.keys(vehicleData.products || {}).filter(isCountedProductCode);
    const productCount = productCodes.reduce((sum, code) => (
      sum + vehicleData.products[code].numericCount + vehicleData.products[code].timestamps.length
    ), 0);
    const productDetails = productCodes.map((code) => {
      const timestamps = vehicleData.products[code].timestamps.filter(Boolean);
      const count = vehicleData.products[code].numericCount + timestamps.length;

      return {
        code,
        count,
        timestamps: [...timestamps].sort((a, b) => getTimestampNumber(a) - getTimestampNumber(b)),
      };
    });
    const unknownEntries = [...vehicleData.unknownProducts.entries]
      .sort((a, b) => getTimestampNumber(a.time) - getTimestampNumber(b.time));
    const unknownCount = vehicleData.unknownProducts.numericCount + unknownEntries.length;
    const timestamps = productCodes
      .flatMap((code) => vehicleData.products[code].timestamps)
      .filter(Boolean);
    const sortedTimestamps = [
      ...timestamps,
      ...unknownEntries.map((entry) => entry.time).filter(Boolean)
    ]
      .filter((t) => isInProductionWindow(t, targetDate, targetDate))
      .sort((a, b) => getTimestampNumber(a) - getTimestampNumber(b));
    return {
      id: `${targetDate}-${plate}`,
      plate,
      driver: vehicleData.driver || '-',
      products: productCodes.length > 0 ? productCodes.join(', ') : '-',
      productDetails,
      unknownCount,
      unknownEntries,
      quantity: productCount,
      loadingTime: formatVehicleTime(sortedTimestamps[0]),
      departure: formatVehicleTime(sortedTimestamps[sortedTimestamps.length - 1]),
    };
  });
};

const hasVehicleRowsForDate = (allFirebaseData: ProductionData, targetDate: string) => (
  getVehicleRowsForDate(allFirebaseData, targetDate, { includeLegacyFallback: false }).length > 0
);

const getLatestVehicleDate = (allFirebaseData: ProductionData) => (
  Object.keys(allFirebaseData || {})
    .filter((key) => DATE_PATTERN.test(key) && hasVehicleRowsForDate(allFirebaseData, key))
    .sort()
    .pop() || ''
);

export const getDisplayVehicleRows = (allFirebaseData: ProductionData, selectedDate: string, currentProductionDate: string) => {
  const selectedRows = getVehicleRowsForDate(allFirebaseData, selectedDate, { includeLegacyFallback: false });
  if (selectedRows.length > 0) return selectedRows;

  const currentRows = getVehicleRowsForDate(allFirebaseData, currentProductionDate, { includeLegacyFallback: false });
  if (currentRows.length > 0) return currentRows;

  const latestVehicleDate = getLatestVehicleDate(allFirebaseData);
  if (latestVehicleDate) {
    return getVehicleRowsForDate(allFirebaseData, latestVehicleDate, { includeLegacyFallback: false });
  }

  return getVehicleRowsForDate(allFirebaseData, selectedDate);
};

