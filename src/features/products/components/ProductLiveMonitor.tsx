import type { MonitorProps } from '../../../types';
import { useEffect, useState } from 'react';
import { Package, Truck, Video } from 'lucide-react';
import { formatIndianDateString } from '../../../utils/productionDay';
import './product-live-monitor.css';

const key = (value: string | undefined) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const timestamp = (value: string | undefined) => Date.parse(value || '') || 0;
const time = (value: string | undefined) => value && timestamp(value) ? new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }) : '—';

export default function ProductLiveMonitor({ vehicle, product, rows, allocation, loaded, target, unknownCount, warning, date, displayName, streamUrl, isHistorical = false }: MonitorProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const details = vehicle?.productDetails || [];
  const items = new Map<string, { code: string; count: number; timestamps: string[]; allocated: number }>();
  for (const detail of details) items.set(key(detail.code), { code: detail.code, count: Number(detail.count || 0), timestamps: detail.timestamps || [], allocated: 0 });
  for (const item of allocation?.allocation?.items || []) {
    const code = key(item.name);
    const row = items.get(code) || { code: item.name, count: 0, timestamps: [], allocated: 0 };
    row.allocated += Number(item.quantity || 0);
    items.set(code, row);
  }
  const products = [...items.values()];
  const activeCode = key(product?.product_code || product?.code);
  const activeIndex = products.findIndex((row) => key(row.code) === activeCode);
  const done = products.filter((row) => row.allocated > 0 && row.count >= row.allocated).length;
  const pending = products.filter((row) => row.count === 0).length;
  const allocationStatus = allocation?.isLoading ? 'Loading ERP allocation?' : allocation?.error ? 'Unable to load ERP allocation' : !allocation?.allocation ? 'Vehicle not found in ERP' : 'Product not allocated in ERP';
  const progress = target > 0 ? Math.round(loaded / target * 100) : 0;
  const scans = products.flatMap((row) => row.timestamps.map((at, index) => ({ at, code: row.code, label: `carton ${index + 1}`, unknown: false })))
    .concat((vehicle?.unknownEntries || []).map((entry) => ({ at: entry.time || entry.arrivedTime || '', code: 'Unknown carton', label: 'undefined', unknown: true })))
    .sort((a, b) => timestamp(b.at) - timestamp(a.at));
  const recentCount = scans.filter((scan) => timestamp(scan.at) >= now.getTime() - 600000 && timestamp(scan.at) <= now.getTime()).length;
  const knownScans = scans.filter((scan) => !scan.unknown && timestamp(scan.at));
  const interval = knownScans.length > 1 ? Math.round((timestamp(knownScans[0].at) - timestamp(knownScans[Math.min(knownScans.length - 1, 9)].at)) / Math.min(knownScans.length - 1, 9) / 1000) : null;
  const name = (code: string) => {
    const row = rows.find((entry) => key(entry.product_code || entry.code) === key(code));
    return row ? displayName(row) || code : code;
  };
  return <div className="plm-backdrop"><section className="plm-monitor" aria-label="Live loading monitor">
    <header className="plm-header">
      <div className="plm-brand"><Package size={19} /><strong>Swarnam</strong></div>
      <h1>Live loading</h1><span className="plm-live"><i />{isHistorical ? 'Last recorded' : 'Live'}</span>
      <div className="plm-vehicle"><Truck size={18} /><strong>{vehicle?.plate || 'Awaiting vehicle'}</strong></div>
      <div className="plm-meta">Vehicle total <b>{vehicle?.quantity ?? '—'}</b><span>Started {vehicle?.loadingTime || '—'}</span></div>
      <div className="plm-completion"><span>Products done <b>{done} / {products.length}</b></span><div><i style={{ width: `${products.length ? done / products.length * 100 : 0}%` }} /></div></div>
      <div className="plm-clock"><strong>{now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' })}</strong><span>{formatIndianDateString(date)}</span></div>
    </header>
    <main className="plm-grid">
      <section className="plm-camera"><div className="plm-feed"><span className="plm-camera-label"><i />{streamUrl ? 'Camera · Live' : 'Camera'}</span><time>{now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' })}</time>{streamUrl ? <video src={streamUrl} autoPlay muted playsInline /> : <div className="plm-no-feed"><Video size={36} /><span>Live camera stream is not configured</span></div>}</div></section>
      <section className="plm-current"><header><span><i />Now loading</span><span>{activeIndex >= 0 ? `Product ${activeIndex + 1} of ${products.length}` : 'Awaiting product'}</span></header><div className="plm-current-body"><div className="plm-count"><strong>{Number(loaded).toLocaleString()}</strong><span>cartons<br />loaded</span></div><div className="plm-allocation"><h2>{displayName(product) || product?.product_code || product?.code || '—'}</h2><div className="plm-allocation-label"><span>Allocation for this vehicle</span><span>{target > 0 ? `${progress}% loaded` : allocationStatus}</span></div><div className="plm-quantities"><div><strong>{target || '—'}</strong><span>allocated</span></div><div><strong>{target > 0 ? Math.abs(target - loaded) : '—'}</strong><span>{target > 0 && loaded > target ? 'over allocation' : 'remaining'}</span></div></div><div className="plm-progress"><i style={{ width: `${Math.min(100, progress)}%` }} /></div></div></div></section>
      <section className="plm-products"><header><span>This vehicle · {products.length} products</span><span className="plm-legend"><span><i className="loading" />Loading</span><span><i className="done" />Done {done}</span><span><i />Pending {pending}</span></span></header><div className="plm-product-grid">{products.map((row) => <div key={key(row.code)} className={`plm-product ${key(row.code) === activeCode ? 'current' : ''} ${row.allocated > 0 && row.count >= row.allocated ? 'complete' : ''}`}><i /><span title={name(row.code)}>{name(row.code)}</span><b>{row.count}/{row.allocated || '—'}</b></div>)}</div></section>
      <section className="plm-scans"><header><span>Recent scans</span><span>{interval !== null ? `${interval}s / carton · ` : ''}{recentCount} in last 10 min</span></header><div className="plm-scan-list" role="region" aria-label="Recent scan history" tabIndex={0}>{scans.map((scan, index) => <div className={`plm-scan ${scan.unknown ? 'unknown' : ''}`} key={`${scan.at}-${index}`}><time>{time(scan.at)}</time><span>{name(scan.code)}</span><span>{scan.label}</span></div>)}{!scans.length && <p>Waiting for scans</p>}</div></section>
      <section className="plm-unknown"><div><Package size={23} /><strong>{Number(unknownCount || 0).toLocaleString()}</strong></div><h2>undefined cartons</h2><p>{unknownCount > 0 ? 'Check with supervisor' : 'No undefined cartons'}</p>{warning?.image && <img src={warning.image} alt="Latest undefined carton" />}</section>
    </main>
  </section></div>;
}
