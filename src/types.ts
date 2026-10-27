// Firebase contains several legacy record shapes. Keep their flexible fields at
// the ingestion boundary; normalized data uses the interfaces below.
export type FirebaseRecord = Record<string, any>;
export type ProductionData = Record<string, FirebaseRecord | null>;
export interface ProductRow {
  product_code?: string;
  product_name?: string;
  code?: string;
  count?: number;
  latestTimestamp?: string;
}
export interface ProductDetail { code: string; count: number; timestamps: string[] }
export interface UnknownEntry { time?: string; arrivedTime?: string; image: string; vehicleNumber?: string }
export interface VehicleRow {
  id: string;
  plate: string;
  driver: string;
  products: string;
  productDetails: ProductDetail[];
  unknownCount: number;
  unknownEntries: UnknownEntry[];
  quantity: number;
  loadingTime: string;
  departure: string;
}
export interface CatalogItem { name: string; category: string }
export type ProductCatalog = Record<string, CatalogItem>;
export interface ErpEntry { docData: FirebaseRecord | null; error?: string }
export type ErpEntries = Record<string, ErpEntry>;
export interface MonitorProps {
  vehicle: VehicleRow | null;
  product: ProductRow | null;
  rows: ProductRow[];
  allocation: {
    allocation: import('./utils/erpAlerts').ErpRow | null;
    allocatedCount: number;
    hasAllocation: boolean;
    isLoading: boolean;
    error: string;
  };
  loaded: number;
  target: number;
  unknownCount: number;
  warning?: { image?: string } | null;
  date: string;
  displayName: (row: ProductRow | null) => string;
  streamUrl: string;
  isHistorical?: boolean;
}
