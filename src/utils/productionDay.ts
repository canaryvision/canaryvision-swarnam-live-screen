import type { FirebaseRecord, ProductionData } from '../types';
interface TimedSource { value?: unknown; productionDate: string; fallbackDate: string }
interface ImageSource { images?: unknown; times?: any; productionDate: string; fallbackDate: string }
const PRODUCTION_DAY_START_HOUR = 12;
const LIVE_MONITORING_START_HOUR = 18;
const LIVE_MONITORING_END_HOUR = 10;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RESERVED_DATE_KEYS = new Set([
  'lastUpdatedTime',
  'rtspStatus',
  'rtspStatus',
  'rtspDisconnectedAt',
  'rtspDisconnectedAt',
  'rtspDisconnectedTime',
  'rtsp_disconnected_at',
  'rtsp_disconnected_time',
  'rtspReconnectedAt',
  'rtspReconnectedAt',
  'rtspReconnectedTime',
  'rtsp_reconnected_at',
  'rtsp_reconnected_time',
  'rtspEvents',
  'rtspEvents',
  'currentPlate',
  'currentPlateUpdatedAt',
  'products',
  'unknown_products',
  'unknown_product_images',
]);

export const getDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getIndianCalendarDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
};

export const formatIndianDateString = (dateStr: string) => {
  if (!DATE_PATTERN.test(dateStr || '')) return dateStr || '';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

export const formatIndianDateTime = (date: Date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date).replace(/\//g, '-').replace(',', '');
};

export const addDaysToDateString = (dateStr: string, days: number) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return getDateInputValue(date);
};

export const getProductionDateString = (date = new Date()) => {
  const productionDate = new Date(date);
  if (productionDate.getHours() < PRODUCTION_DAY_START_HOUR) {
    productionDate.setDate(productionDate.getDate() - 1);
  }
  return getDateInputValue(productionDate);
};

export const isLiveMonitoringWindow = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= LIVE_MONITORING_START_HOUR || hour < LIVE_MONITORING_END_HOUR;
};

const getProductionWindow = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day, PRODUCTION_DAY_START_HOUR, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const parseTimestamp = (value: unknown, fallbackDate: string) => {
  if (value instanceof Date) return value;
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  if (typeof value === 'string') {
    const dateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (dateTimeMatch) {
      const [, year, month, day, hour, minute, second = '0'] = dateTimeMatch;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        0
      );
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  if (typeof value !== 'string' || !fallbackDate) return null;

  const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!timeMatch) return null;

  const [year, month, day] = fallbackDate.split('-').map(Number);
  const [, hour, minute, second = '0'] = timeMatch;
  return new Date(year, month - 1, day, Number(hour), Number(minute), Number(second), 0);
};

export const isInProductionWindow = (value: unknown, productionDate: string, fallbackDate: string) => {
  const timestamp = parseTimestamp(value, fallbackDate);
  if (!timestamp) return false;

  const { start, end } = getProductionWindow(productionDate);
  return timestamp >= start && timestamp < end;
};

const getEntries = (value: unknown): [string, any][] => {
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item]);
  if (value && typeof value === 'object') return Object.entries(value);
  return [];
};

const getFirstField = (value: FirebaseRecord, fieldNames: string[]) => {
  if (!value || typeof value !== 'object') return '';

  for (const fieldName of fieldNames) {
    if (value[fieldName]) return value[fieldName];
  }

  return '';
};

const getImageValue = (value: any) => (
  value && typeof value === 'object'
    ? getFirstField(value, ['image', 'imageUrl', 'image_url', 'photo', 'photoUrl', 'src', 'url'])
    : value
);

const getImageTimestamp = (value: any) => (
  value && typeof value === 'object'
    ? getFirstField(value, ['arrivedTime', 'arrived_time', 'arrivalTime', 'arrival_time', 'timestamp', 'time', 'createdAt', 'created_at'])
    : ''
);

const hasVehicleProductionData = (value: FirebaseRecord) => (
  value &&
  typeof value === 'object' &&
  (
    !!value.products ||
    !!value.unknown_products ||
    !!value.unknown_product_images
  )
);

export const getVehicleEntriesFromDateData = (dateData: FirebaseRecord | null | undefined) => {
  if (!dateData || typeof dateData !== 'object') return [];

  return Object.entries(dateData)
    .filter(([key, value]) => !RESERVED_DATE_KEYS.has(key) && hasVehicleProductionData(value));
};

const getProductCodesFromDateData = (dateData: FirebaseRecord | null | undefined) => {
  const codes = new Set<string>();
  getVehicleEntriesFromDateData(dateData).forEach(([, vehicleData]) => {
    Object.keys(vehicleData.products || {}).forEach((code) => codes.add(code));
  });
  return codes;
};

const getEntryKey = (entry: any) => {
  if (!entry) return '';
  if (typeof entry === 'string' || typeof entry === 'number') return String(entry);
  const time = entry.time || entry.timestamp || entry.arrivedTime || entry.arrived_time || '';
  const img = entry.image || entry.imageUrl || entry.image_url || entry.src || entry.url || '';
  return `${time}_${img}`;
};

const mergeTimedValueSources = (sources: TimedSource[]) => {
  const values: any[] = [];
  const seenKeys = new Set();
  let numericCount = 0;

  sources.forEach(({ value, productionDate, fallbackDate }) => {
    if (typeof value === 'number') {
      numericCount += value;
      return;
    }

    getEntries(value).forEach(([, entryValue]) => {
      const timestamp = getImageTimestamp(entryValue) || entryValue;
      if (entryValue && isInProductionWindow(timestamp, productionDate, fallbackDate)) {
        const key = getEntryKey(entryValue);
        if (key) {
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            values.push(entryValue);
          }
        } else {
          values.push(entryValue);
        }
      }
    });
  });

  if (values.length > 0) return values;
  return numericCount > 0 ? numericCount : [];
};

const mergeImageValueSources = (sources: ImageSource[]) => {
  const images: string[] = [];
  const seenImages = new Set();

  sources.forEach(({ images: sourceImages, times, productionDate, fallbackDate }) => {
    getEntries(sourceImages).forEach(([key, image]) => {
      const imageValue = getImageValue(image);
      const timestamp = getImageTimestamp(image) || (Array.isArray(times) ? times[Number(key)] : times?.[key]);
      const isCurrentDateFallback = fallbackDate === productionDate;

      if (
        imageValue &&
        (
          (timestamp && isInProductionWindow(timestamp, productionDate, fallbackDate)) ||
          (!timestamp && isCurrentDateFallback)
        )
      ) {
        if (!seenImages.has(imageValue)) {
          seenImages.add(imageValue);
          images.push(imageValue);
        }
      }
    });
  });

  return images;
};

export const getProductionDateData = (allFirebaseData: ProductionData, productionDate: string) => {
  const currentData = allFirebaseData?.[productionDate] || {};
  const nextDate = addDaysToDateString(productionDate, 1);
  const nextData = allFirebaseData?.[nextDate] || {};
  const data: FirebaseRecord = {};

  const productCodes = new Set([
    ...getProductCodesFromDateData(currentData),
    ...getProductCodesFromDateData(nextData),
  ]);

  if (productCodes.size > 0) {
    data.products = {};
    productCodes.forEach((code) => {
      const sources: TimedSource[] = [];

      getVehicleEntriesFromDateData(currentData).forEach(([, vehicleData]) => {
        sources.push({ value: vehicleData.products?.[code], productionDate, fallbackDate: productionDate });
      });
      getVehicleEntriesFromDateData(nextData).forEach(([, vehicleData]) => {
        sources.push({ value: vehicleData.products?.[code], productionDate, fallbackDate: nextDate });
      });

      const mergedValue = mergeTimedValueSources(sources);
      if ((Array.isArray(mergedValue) && mergedValue.length > 0) || (typeof mergedValue === 'number' && mergedValue > 0)) {
        data.products[code] = mergedValue;
      }
    });
  }

  const unknownProductSources = [];
  unknownProductSources.push({ value: currentData.unknown_products, productionDate, fallbackDate: productionDate });
  unknownProductSources.push({ value: nextData.unknown_products, productionDate, fallbackDate: nextDate });
  // vehicle-level unknown products excluded (only date level currentData/nextData)



  const unknownProducts = mergeTimedValueSources(unknownProductSources);

  if ((Array.isArray(unknownProducts) && unknownProducts.length > 0) || (typeof unknownProducts === 'number' && unknownProducts > 0)) {
    data.unknown_products = unknownProducts;
  }

  const unknownImageSources = [];
  unknownImageSources.push({
    images: currentData.unknown_product_images,
    times: currentData.unknown_products,
    productionDate,
    fallbackDate: productionDate,
  });
  unknownImageSources.push({
    images: nextData.unknown_product_images,
    times: nextData.unknown_products,
    productionDate,
    fallbackDate: nextDate,
  });
  // vehicle-level unknown images excluded
  // vehicle push 1

  const unknownImages = mergeImageValueSources(unknownImageSources);

  if (unknownImages.length > 0) {
    data.unknown_product_images = unknownImages;
  }

  return data;
};

export const getAvailableProductionDates = (allFirebaseData: ProductionData) => {
  const dates = new Set<string>();
  Object.keys(allFirebaseData || {}).forEach((key) => {
    if (!DATE_PATTERN.test(key)) return;
    dates.add(key);
    dates.add(addDaysToDateString(key, -1));
  });

  return Array.from(dates).sort();
};
