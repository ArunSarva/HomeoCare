import { useState, useEffect } from 'react';
import { Card } from 'react-typescript-ui';
import { inventoryService } from '../services/inventoryService';
import { Inventory } from '../../../types';

export function InventoryAlerts() {
  const [alerts, setAlerts] = useState({
    lowStock: [] as Inventory[],
    nearExpiry: [] as Inventory[],
    expired: [] as Inventory[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const data = await inventoryService.getAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };



  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <span className="text-red-600">
          Expired {Math.abs(diffDays)} days ago
        </span>
      );
    } else if (diffDays <= 30) {
      return (
        <span className="text-orange-600">
          Expires in {diffDays} days
        </span>
      );
    } else {
      return <span className="text-gray-600">{date.toLocaleDateString()}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">Inventory Alerts</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Low Stock */}
        <Card className="p-4 bg-yellow-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-yellow-900">Low Stock</h4>
            <span className="bg-yellow-200 text-yellow-800 text-sm font-bold px-2 py-1 rounded">
              {alerts.lowStock.length}
            </span>
          </div>
          {alerts.lowStock.length === 0 ? (
            <p className="text-sm text-gray-600">No items with low stock</p>
          ) : (
            <div className="space-y-2">
              {alerts.lowStock.slice(0, 5).map(item => (
                <div key={item.id} className="text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>{item.medicineName}</span>
                    <span className="font-semibold">Qty: {item.quantity}</span>
                  </div>
                  <div className="text-xs text-gray-500">Batch: {item.batch}</div>
                </div>
              ))}
              {alerts.lowStock.length > 5 && (
                <p className="text-xs text-gray-500 mt-2">
                  +{alerts.lowStock.length - 5} more items
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Near Expiry */}
        <Card className="p-4 bg-orange-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-orange-900">Near Expiry</h4>
            <span className="bg-orange-200 text-orange-800 text-sm font-bold px-2 py-1 rounded">
              {alerts.nearExpiry.length}
            </span>
          </div>
          {alerts.nearExpiry.length === 0 ? (
            <p className="text-sm text-gray-600">No items expiring soon</p>
          ) : (
            <div className="space-y-2">
              {alerts.nearExpiry.slice(0, 5).map(item => (
                <div key={item.id} className="text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>{item.medicineName}</span>
                    <span className="font-semibold">{formatExpiryDate(item.expiryDate)}</span>
                  </div>
                  <div className="text-xs text-gray-500">Batch: {item.batch}</div>
                </div>
              ))}
              {alerts.nearExpiry.length > 5 && (
                <p className="text-xs text-gray-500 mt-2">
                  +{alerts.nearExpiry.length - 5} more items
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Expired */}
        <Card className="p-4 bg-red-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-red-900">Expired</h4>
            <span className="bg-red-200 text-red-800 text-sm font-bold px-2 py-1 rounded">
              {alerts.expired.length}
            </span>
          </div>
          {alerts.expired.length === 0 ? (
            <p className="text-sm text-gray-600">No expired items</p>
          ) : (
            <div className="space-y-2">
              {alerts.expired.slice(0, 5).map(item => (
                <div key={item.id} className="text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>{item.medicineName}</span>
                    <span className="font-semibold">{formatExpiryDate(item.expiryDate)}</span>
                  </div>
                  <div className="text-xs text-gray-500">Batch: {item.batch}</div>
                </div>
              ))}
              {alerts.expired.length > 5 && (
                <p className="text-xs text-gray-500 mt-2">
                  +{alerts.expired.length - 5} more items
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default InventoryAlerts;
