import type { ProductionData, ErpEntries, ProductCatalog } from '../types';
import { useEffect, useMemo, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, rtdb } from '../services/firebase';
import { addDaysToDateString, getProductionDateString } from '../utils/productionDay';
import { buildProductCatalog } from '../features/products/model/catalog';
import { buildLiveSnapshot, selectAvailableProductionDate } from './liveSnapshot';

const requestedDate = new URLSearchParams(window.location.search).get('date');
const fixedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate || '') ? requestedDate : '';
export default function useLiveData() {
  const [date, setDate] = useState(() => fixedDate || getProductionDateString());
  const [rtd, setRtd] = useState<ProductionData>({});
  const [archive, setArchive] = useState<ProductionData>({});
  const [erp, setErp] = useState<ErpEntries>({});
  const [catalog, setCatalog] = useState<ProductCatalog>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const fallbackDates = useMemo(() => fixedDate ? [] : Array.from({ length: 7 }, (_, index) => addDaysToDateString(date, -index - 1)), [date]);
  const watchedDates = useMemo(() => [addDaysToDateString(date, 1), date, ...fallbackDates], [date, fallbackDates]);
  useEffect(() => {
    if (fixedDate) return undefined;
    const timer = setInterval(() => setDate(getProductionDateString()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    const failure = (source: string, error: Error) => setErrors((previous) => ({ ...previous, [source]: error.message }));
    const clearError = (source: string) => setErrors((previous) => ({ ...previous, [source]: '' }));
    for (const nodeDate of watchedDates) {
      unsubscribes.push(onValue(ref(rtdb, nodeDate), (snapshot) => {
        setRtd((previous) => ({ ...previous, [nodeDate]: snapshot.val() }));
        setLoaded((previous) => ({ ...previous, [nodeDate]: true }));
        clearError(`production-${nodeDate}`);
      }, (error) => { failure(`production-${nodeDate}`, error); setLoaded((previous) => ({ ...previous, [nodeDate]: true })); }));
      unsubscribes.push(onSnapshot(doc(db, 'realtime', nodeDate), (snapshot) => {
        setArchive((previous) => ({ ...previous, [nodeDate]: snapshot.exists() ? snapshot.data() : null }));
        clearError(`archive-${nodeDate}`);
      }, (error) => failure(`archive-${nodeDate}`, error)));
    }
    unsubscribes.push(onSnapshot(collection(db, 'products'), (snapshot) => {
      setCatalog(buildProductCatalog(snapshot.docs.map((entry) => ({ id: entry.id, data: entry.data() }))).catalog);
      clearError('catalog');
    }, (error) => failure('catalog', error)));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [watchedDates]);
  const production = { ...archive };
  for (const [key, value] of Object.entries(rtd)) if (value) production[key] = value;
  const displayDate = selectAvailableProductionDate(production, date, fallbackDates);
  useEffect(() => {
    const unsubscribes = [displayDate, addDaysToDateString(displayDate, 1)].map((erpDate) => onSnapshot(doc(db, 'erp', erpDate), (snapshot) => {
      setErp((previous) => ({ ...previous, [erpDate]: { docData: snapshot.exists() ? snapshot.data() : null, error: '' } }));
    }, (error) => setErp((previous) => ({ ...previous, [erpDate]: { docData: null, error: error.message } }))));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [displayDate]);
  const data = buildLiveSnapshot(production, erp, displayDate, catalog);
  return { ...data, preferredDate: date, isHistorical: displayDate !== date,
    loading: watchedDates.some((value) => !loaded[value]) && !data.vehicle,
    errors: Object.entries(errors).filter(([source, message]) => message && (source === 'catalog' || watchedDates.some((value) => source.endsWith(value)))).map(([, message]) => message) };
}
