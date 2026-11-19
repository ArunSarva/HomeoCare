import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardHeader, CardBody, Heading, Table, TableBody, TableRow, TableCell, TableHeaderCell } from 'react-typescript-ui';
import { inventoryService } from '../services/inventoryService';
import { Inventory } from '../../../types';

export function InventoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['inventoryItem', id],
    queryFn: async () => {
      if (id) {
        const item = await inventoryService.getInventoryItemById(id);
        return item;
      }
      return null;
    },
  });

  const handleEdit = () => {
    navigate(`/inventory/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await inventoryService.deleteInventoryItem(id || '');
        navigate('/inventory');
      } catch (error) {
        console.error('Error deleting inventory item:', error);
      }
    }
  };

  const handleBack = () => {
    navigate('/inventory');
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Heading>Inventory Item Details</Heading>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error || !item) {
    return (
      <Card>
        <CardHeader>
          <Heading>Inventory Item Details</Heading>
        </CardHeader>
        <CardBody>
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
            Inventory item not found
          </div>
          <Button onClick={handleBack} className="mt-4">
            Back to List
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <Heading>Inventory Item Details</Heading>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleBack}>
              Back to List
            </Button>
            <Button onClick={handleEdit}>
              Edit Item
            </Button>
            <Button onClick={handleDelete} color="danger">
              Delete
            </Button>
          </div>
        </CardHeader>
        
        <CardBody className="space-y-6">
          <div>
            <Heading className="mb-4 text-primary">Item Information</Heading>
            <Table>
              <TableBody>
                <TableRow>
                  <TableHeaderCell>Medicine Name</TableHeaderCell>
                  <TableCell>{item.medicineName}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Batch Number</TableHeaderCell>
                  <TableCell>{item.batch}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Expiry Date</TableHeaderCell>
                  <TableCell>{formatExpiryDate(item.expiryDate)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Quantity</TableHeaderCell>
                  <TableCell>{item.quantity} units</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Unit Price</TableHeaderCell>
                  <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Total Value</TableHeaderCell>
                  <TableCell>{formatCurrency(item.totalValue)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Vendor</TableHeaderCell>
                  <TableCell>{item.vendor || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableHeaderCell>Alert Status</TableHeaderCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded text-sm font-medium border ${getAlertColor(item)}`}>
                      {getAlertLabel(item)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Heading className="mb-4 text-primary">Timestamps</Heading>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableHeaderCell>Created</TableHeaderCell>
                    <TableCell>{new Date(item.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableHeaderCell>Updated</TableHeaderCell>
                    <TableCell>{new Date(item.updatedAt).toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default InventoryDetail;
