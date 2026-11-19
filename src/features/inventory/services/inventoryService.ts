import { Inventory } from '../../../types';
import { getDB } from '../../../hooks/useIndexedDB';

/**
 * Generate inventory item ID
 */
export const generateInventoryId = async (): Promise<string> => {
  try {
    const db = await getDB();
    const tx = db.transaction('inventory', 'readonly');
    const store = tx.objectStore('inventory');
    const request = store.getAll();
    
    return new Promise<string>((resolve, reject) => {
      request.onsuccess = () => {
        const items: Inventory[] = request.result;
        
        // Get all items sorted by ID to find the highest
        const sortedItems = items.sort((a, b) => {
          const numA = parseInt(a.id.replace('INV', ''), 10) || 0;
          const numB = parseInt(b.id.replace('INV', ''), 10) || 0;
          return numB - numA;
        });
        
        if (sortedItems.length > 0) {
          const lastId = sortedItems[0].id;
          const num = parseInt(lastId.replace('INV', ''), 10) || 0;
          resolve(`INV${String(num + 1).padStart(6, '0')}`);
        } else {
          resolve('INV000001');
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error generating inventory ID:', error);
    return 'INV000001';
  }
};

/**
 * Inventory service for CRUD operations with offline-first support
 */
export class InventoryService {
  private async getDB() {
    return getDB();
  }

  async getAllInventoryItems(): Promise<Inventory[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('inventory', 'readonly');
      const store = tx.objectStore('inventory');
      const request = store.getAll();
      
      const items = await new Promise<Inventory[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Inventory[]);
        request.onerror = () => reject(request.error);
      });
      
      return items;
    } catch (error) {
      console.error('Error getting inventory items:', error);
      return [];
    }
  }

  async getInventoryItemById(id: string): Promise<Inventory | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('inventory', 'readonly');
      const store = tx.objectStore('inventory');
      const request = store.get(id);
      
      return new Promise<Inventory | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting inventory item:', error);
      return null;
    }
  }

  async createInventoryItem(itemData: Omit<Inventory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Inventory> {
    try {
      const db = await this.getDB();
      // Generate the ID first: awaiting it after opening the write
      // transaction let IndexedDB auto-commit it, so store.put() threw.
      const itemId = await generateInventoryId();

      const tx = db.transaction('inventory', 'readwrite');
      const store = tx.objectStore('inventory');
      
      const item: Inventory = {
        ...itemData,
        id: itemId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.put(item);
      
      // Add to sync queue
      await this.addToSyncQueue('inventory', 'create', item);

      return item;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  async updateInventoryItem(id: string, itemData: Partial<Inventory>): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('inventory', 'readwrite');
      const store = tx.objectStore('inventory');
      
      const existing = await new Promise<Inventory | undefined>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!existing) {
        throw new Error('Inventory item not found');
      }

      const updatedItem: Inventory = {
        ...existing,
        ...itemData,
        updatedAt: new Date().toISOString(),
      };

      store.put(updatedItem);
      await this.addToSyncQueue('inventory', 'update', updatedItem);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  }

  async deleteInventoryItem(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('inventory', 'readwrite');
      const store = tx.objectStore('inventory');
      store.delete(id);
      
      await this.addToSyncQueue('inventory', 'delete', { id });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  }

  async searchInventoryItems(searchTerm: string): Promise<Inventory[]> {
    try {
      const items = await this.getAllInventoryItems();
      
      const term = searchTerm.toLowerCase();
      return items.filter(item => 
        item.medicineName.toLowerCase().includes(term) ||
        item.batch.toLowerCase().includes(term) ||
        item.vendor.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching inventory items:', error);
      return [];
    }
  }

  async getAlerts(): Promise<{
    lowStock: Inventory[];
    nearExpiry: Inventory[];
    expired: Inventory[];
  }> {
    try {
      const items = await this.getAllInventoryItems();
      
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      const lowStock: Inventory[] = [];
      const nearExpiry: Inventory[] = [];
      const expired: Inventory[] = [];
      
      items.forEach(item => {
        const expiryDate = new Date(item.expiryDate);
        
        // Check for expired items
        if (expiryDate < now) {
          expired.push(item);
        } 
        // Check for near expiry (within 30 days)
        else if (expiryDate <= thirtyDaysFromNow) {
          nearExpiry.push(item);
        }
        
        // Check for low stock (quantity < 10)
        if (item.quantity < 10) {
          lowStock.push(item);
        }
      });
      
      return { lowStock, nearExpiry, expired };
    } catch (error) {
      console.error('Error getting inventory alerts:', error);
      return { lowStock: [], nearExpiry: [], expired: [] };
    }
  }

  async getItemsByAlertLevel(alertLevel: 'Low Stock' | 'Near Expiry' | 'Expired'): Promise<Inventory[]> {
    try {
      const alerts = await this.getAlerts();
      
      switch (alertLevel) {
        case 'Low Stock':
          return alerts.lowStock;
        case 'Near Expiry':
          return alerts.nearExpiry;
        case 'Expired':
          return alerts.expired;
        default:
          return [];
      }
    } catch (error) {
      console.error('Error getting items by alert level:', error);
      return [];
    }
  }

  async adjustStock(itemId: string, quantityChange: number, type: 'add' | 'reduce' | 'write-off'): Promise<void> {
    try {
      const item = await this.getInventoryItemById(itemId);
      if (!item) {
        throw new Error('Inventory item not found');
      }

      let newQuantity = item.quantity;
      
      switch (type) {
        case 'add':
          newQuantity += quantityChange;
          break;
        case 'reduce':
          newQuantity -= quantityChange;
          if (newQuantity < 0) {
            throw new Error('Cannot reduce stock below 0');
          }
          break;
        case 'write-off':
          newQuantity = 0;
          break;
      }

      await this.updateInventoryItem(itemId, { quantity: newQuantity });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  }

  private async addToSyncQueue(type: string, action: string, data: any): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const id = crypto.randomUUID();
      await store.put({
        id,
        type,
        action,
        data,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      });
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }
}

export const inventoryService = new InventoryService();
