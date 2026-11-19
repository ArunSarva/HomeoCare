import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from 'react-typescript-ui';
import { inventoryService } from '../services/inventoryService';
import { Inventory } from '../../../types';

export function InventoryForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [medicineName, setMedicineName] = useState('');
  const [batch, setBatch] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState<string>('0');
  const [vendor, setVendor] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('0');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!medicineName) {
      setError('Medicine name is required');
      return;
    }

    if (!batch) {
      setError('Batch number is required');
      return;
    }

    if (!expiryDate) {
      setError('Expiry date is required');
      return;
    }

    if (parseInt(quantity) < 0) {
      setError('Quantity cannot be negative');
      return;
    }

    if (parseFloat(unitPrice) < 0) {
      setError('Unit price cannot be negative');
      return;
    }

    setLoading(true);

    try {
      const expiryDateObj = new Date(expiryDate);
      const now = new Date();
      if (expiryDateObj < now) {
        setError('Expiry date cannot be in the past');
        return;
      }

      const itemData: Omit<Inventory, 'id' | 'createdAt' | 'updatedAt'> = {
        medicineName,
        batch,
        expiryDate,
        quantity: parseInt(quantity),
        vendor,
        unitPrice: parseFloat(unitPrice),
        totalValue: parseFloat(unitPrice) * parseInt(quantity),
        alertLevel: 'Normal',
      };

      await inventoryService.createInventoryItem(itemData);

      navigate('/inventory');
    } catch (err: any) {
      setError(err.message || 'Failed to save inventory item');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/inventory');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">New Inventory Item</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Medicine Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medicine Name *
            </label>
            <Input
              type="text"
              value={medicineName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMedicineName(e.target.value)}
              placeholder="Enter medicine name..."
              className="w-full"
            />
          </div>

          {/* Batch and Expiry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Number *
              </label>
              <Input
                type="text"
                value={batch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBatch(e.target.value)}
                placeholder="Enter batch number..."
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date *
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiryDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Quantity and Unit Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
                min="0"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price (₹) *
              </label>
              <Input
                type="number"
                value={unitPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnitPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full"
              />
            </div>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor
            </label>
            <Input
              type="text"
              value={vendor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVendor(e.target.value)}
              placeholder="Enter vendor name..."
              className="w-full"
            />
          </div>

          {/* Total Value Display */}
          {quantity && unitPrice && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Total Value: ₹
                {(parseFloat(unitPrice) * parseInt(quantity || '0')).toFixed(2)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button type="submit" color="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Create Item'}
            </Button>
            <Button type="button" onClick={handleCancel} variant="outline" disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default InventoryForm;
