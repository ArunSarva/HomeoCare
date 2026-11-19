import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Card } from 'react-typescript-ui';
import { inventoryService } from '../services/inventoryService';
import { Inventory } from '../../../types';
import InventoryAlerts from '../components/InventoryAlerts';

export function InventoryList() {
  const navigate = useNavigate();
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlert, setFilterAlert] = useState<string>('');
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const fetchInventoryItems = async () => {
    try {
      let data = await inventoryService.getAllInventoryItems();
      
      // Apply filters
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        data = data.filter(item => 
          item.medicineName.toLowerCase().includes(term) ||
          item.batch.toLowerCase().includes(term) ||
          item.vendor.toLowerCase().includes(term)
        );
      }
      
      if (filterAlert) {
        const alerts = await inventoryService.getAlerts();
        switch (filterAlert) {
          case 'lowStock':
            data = alerts.lowStock;
            break;
          case 'nearExpiry':
            data = alerts.nearExpiry;
            break;
          case 'expired':
            data = alerts.expired;
            break;
        }
      }
      
      setInventoryItems(data);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewItem = () => {
    navigate('/inventory/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/inventory/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await inventoryService.deleteInventoryItem(id);
        fetchInventoryItems();
      } catch (error) {
        console.error('Error deleting inventory item:', error);
      }
    }
  };



  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <span className="text-red-600 font-medium">
          Expired {Math.abs(diffDays)} days ago
        </span>
      );
    } else if (diffDays <= 30) {
      return (
        <span className="text-orange-600 font-medium">
          Expires in {diffDays} days
        </span>
      );
    } else {
      return <span className="text-gray-600">{date.toLocaleDateString()}</span>;
    }
  };

  const getAlertColor = (item: Inventory) => {
    const expiryDate = new Date(item.expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    if (expiryDate < now) return 'text-red-600 bg-red-50 border-red-200';
    if (expiryDate <= thirtyDaysFromNow) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (item.quantity < 10) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return '';
  };

  const getAlertLabel = (item: Inventory) => {
    const expiryDate = new Date(item.expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    if (expiryDate < now) return 'Expired';
    if (expiryDate <= thirtyDaysFromNow) return 'Near Expiry';
    if (item.quantity < 10) return 'Low Stock';
    return 'Normal';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalItems = inventoryItems.length;
  const totalValue = inventoryItems.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockCount = inventoryItems.filter(item => item.quantity < 10).length;
  const nearExpiryCount = inventoryItems.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= now;
  }).length;
  const expiredCount = inventoryItems.filter(item => {
    const expiryDate = new Date(item.expiryDate);
    return expiryDate < new Date();
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
        <div className="flex space-x-2">
          <Button onClick={() => setShowAlerts(!showAlerts)} variant="outline">
            {showAlerts ? 'Hide Alerts' : 'Show Alerts'}
          </Button>
          <Button onClick={handleNewItem} color="primary">
            + New Item
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {showAlerts && <InventoryAlerts />}

      {/* Inventory KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
        </Card>
        <Card className="p-4 bg-yellow-50">
          <p className="text-sm text-yellow-600">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-700">{lowStockCount}</p>
        </Card>
        <Card className="p-4 bg-orange-50">
          <p className="text-sm text-orange-600">Near Expiry</p>
          <p className="text-2xl font-bold text-orange-700">{nearExpiryCount}</p>
        </Card>
        <Card className="p-4 bg-red-50">
          <p className="text-sm text-red-600">Expired</p>
          <p className="text-2xl font-bold text-red-700">{expiredCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Search by medicine name, batch, or vendor..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Select
              value={filterAlert}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterAlert(e.target.value)}
              placeholder="Filter by alert status"
              options={[
                { value: '', label: 'All Items' },
                { value: 'lowStock', label: 'Low Stock' },
                { value: 'nearExpiry', label: 'Near Expiry' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Inventory List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Medicine Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Batch</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Expiry</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Qty</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Unit Price</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Total</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Alert</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inventoryItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No inventory items found
                </td>
              </tr>
            ) : (
              inventoryItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{item.medicineName}</td>
                  <td className="px-4 py-3 text-gray-600">{item.batch}</td>
                  <td className="px-4 py-3">{formatExpiryDate(item.expiryDate)}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3">{formatCurrency(item.totalValue)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getAlertColor(item)}`}>
                      {getAlertLabel(item)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(item.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
                        color="danger"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stock Adjustment Actions */}
      <Card className="p-4 bg-blue-50">
        <h4 className="font-semibold text-blue-900 mb-3">Stock Adjustment Actions</h4>
        <p className="text-sm text-blue-700 mb-3">
          Select an item to add stock, reduce stock, or write off inventory.
        </p>
        <div className="flex flex-wrap gap-2">
          {inventoryItems.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center space-x-2 bg-white px-3 py-2 rounded border">
              <span className="text-sm font-medium">{item.medicineName}</span>
              <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default InventoryList;
