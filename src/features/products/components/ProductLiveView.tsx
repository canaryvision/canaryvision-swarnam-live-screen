import type { MonitorProps } from '../../../types';
interface ProductLiveViewProps {
 unknownProductWarning?: MonitorProps['warning']; selectedDashboardDate: string; latestProductVehicle: MonitorProps['vehicle'];
 latestVehicleUnknownCount: number; latestProduct: MonitorProps['product']; latestProductRows: MonitorProps['rows'];
 getProductDisplayName: MonitorProps['displayName']; displayBoxCount: number; liveProductAllocation: MonitorProps['allocation']; liveCameraStreamUrl: string;
}
import ProductLiveMonitor from './ProductLiveMonitor';
import './product-live.css';

export default function ProductLiveView({
  unknownProductWarning, selectedDashboardDate, latestProductVehicle,
  latestVehicleUnknownCount, latestProduct, latestProductRows,
  getProductDisplayName, displayBoxCount, liveProductAllocation, liveCameraStreamUrl,
}: ProductLiveViewProps) {
  const rows = latestProductRows || [];
  const product = latestProduct || rows[0];
  if (!product) return <div className="plv-root"><div className="plv-backdrop"><div className="plv-modal"><div className="plv-screen plv-empty"><div className="plv-loading-shell"><span className="plv-loading-spinner" />Fetching latest product entries...</div></div></div></div></div>;
  return <div className="plv-root"><ProductLiveMonitor
    vehicle={latestProductVehicle}
    product={product}
    rows={rows}
    allocation={liveProductAllocation}
    loaded={Number(displayBoxCount || 0)}
    target={liveProductAllocation?.allocatedCount || 0}
    unknownCount={latestVehicleUnknownCount}
    warning={unknownProductWarning}
    date={selectedDashboardDate}
    displayName={getProductDisplayName}
    streamUrl={liveCameraStreamUrl}
  /></div>;
}
