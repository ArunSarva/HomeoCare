import { Inventory } from '../../../types';
import {
  createCloudRecord,
  deleteCloudRecord,
  getCloudRecord,
  getCloudRecords,
  nextCloudId,
  updateCloudRecord,
} from '../../../services/googleCloudStore';

export async function generateInventoryId(): Promise<string> {
  return nextCloudId('inventory', 'INV');
}

export class InventoryService {
  async getAllInventoryItems(): Promise<Inventory[]> {
    return getCloudRecords<Inventory>('inventory');
  }

  async getInventoryItemById(id: string): Promise<Inventory | null> {
    return getCloudRecord<Inventory>('inventory', id);
  }

  async createInventoryItem(itemData: Omit<Inventory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Inventory> {
    const id = await generateInventoryId();
    const now = new Date().toISOString();
    const item: Inventory = { ...itemData, id, createdAt: now, updatedAt: now };
    return createCloudRecord('inventory', item);
  }

  async updateInventoryItem(id: string, itemData: Partial<Inventory>): Promise<void> {
    const existing = await this.getInventoryItemById(id);
    if (!existing) throw new Error('Inventory item not found');
    await updateCloudRecord<Inventory>('inventory', id, {
      ...itemData,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await deleteCloudRecord('inventory', id);
  }

  async searchInventoryItems(searchTerm: string): Promise<Inventory[]> {
    const term = searchTerm.toLowerCase();
    return (await this.getAllInventoryItems()).filter((item) =>
      item.medicineName.toLowerCase().includes(term) ||
      item.batch.toLowerCase().includes(term) ||
      item.vendor.toLowerCase().includes(term)
    );
  }

  async getAlerts(): Promise<{ lowStock: Inventory[]; nearExpiry: Inventory[]; expired: Inventory[] }> {
    const items = await this.getAllInventoryItems();
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const lowStock: Inventory[] = [];
    const nearExpiry: Inventory[] = [];
    const expired: Inventory[] = [];

    for (const item of items) {
      const expiryDate = new Date(item.expiryDate);
      if (expiryDate < now) expired.push(item);
      else if (expiryDate <= thirtyDaysFromNow) nearExpiry.push(item);
      if (item.quantity < 10) lowStock.push(item);
    }
    return { lowStock, nearExpiry, expired };
  }

  async getItemsByAlertLevel(alertLevel: 'Low Stock' | 'Near Expiry' | 'Expired'): Promise<Inventory[]> {
    const alerts = await this.getAlerts();
    switch (alertLevel) {
      case 'Low Stock': return alerts.lowStock;
      case 'Near Expiry': return alerts.nearExpiry;
      case 'Expired': return alerts.expired;
    }
  }

  async adjustStock(itemId: string, quantityChange: number, type: 'add' | 'reduce' | 'write-off'): Promise<void> {
    const item = await this.getInventoryItemById(itemId);
    if (!item) throw new Error('Inventory item not found');
    let newQuantity = item.quantity;
    switch (type) {
      case 'add':
        newQuantity += quantityChange;
        break;
      case 'reduce':
        newQuantity -= quantityChange;
        if (newQuantity < 0) throw new Error('Cannot reduce stock below 0');
        break;
      case 'write-off':
        newQuantity = 0;
        break;
    }
    await this.updateInventoryItem(itemId, { quantity: newQuantity });
  }
}

export const inventoryService = new InventoryService();
