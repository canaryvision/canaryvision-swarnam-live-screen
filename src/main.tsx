import { useState } from 'react';
import Login from './features/auth/pages/Login';
import { createRoot } from 'react-dom/client';
import ProductLiveMonitor from './features/products/components/ProductLiveMonitor';
import useLiveData from './data/useLiveData';
import './styles.css';
import { formatIndianDateString } from './utils/productionDay';

function LiveScreen() {
  const data = useLiveData();
  return <>
    <ProductLiveMonitor {...data}
      product={data.product || { product_code: data.loading ? 'Connecting to production data...' : 'Waiting for product' }}
      displayName={(row) => row?.product_name || row?.product_code || row?.code || ''}
      streamUrl={import.meta.env.VITE_LIVE_CAMERA_STREAM_URL || ''}
    />
    {data.isHistorical && <div className="live-data-notice" role="status">No vehicle counts yet for {formatIndianDateString(data.preferredDate)}. Showing latest available production day: {formatIndianDateString(data.date)}.</div>}
    {data.errors.length > 0 && <div className="live-data-error" role="alert">Live data connection: {data.errors.join(' ? ')}</div>}
  </>;
}
const accessPin = String(import.meta.env.VITE_PRODUCT_LIVE_PIN || '').trim();
const sessionKey = 'swarnam_product_live_authenticated';
function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    try { return sessionStorage.getItem(sessionKey) === 'true'; } catch { return false; }
  });
  if (!/^\d{4}$/.test(accessPin)) return <div className="live-pin-config" role="alert">Set a four-digit VITE_PRODUCT_LIVE_PIN in .env.local and restart the app.</div>;
  if (!authenticated) return <Login accessPin={accessPin} title="Product Live Entry" subtitle="Enter the Product Live Entry PIN to continue" onLogin={() => {
    try { sessionStorage.setItem(sessionKey, 'true'); } catch { /* Keep this tab usable if storage is unavailable. */ }
    setAuthenticated(true);
  }} />;
  return <LiveScreen />;
}
const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<App />);
