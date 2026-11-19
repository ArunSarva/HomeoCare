import { Card } from 'react-typescript-ui';

interface ReportChartProps {
  title: string;
  data: any[];
  dataKey: string;
  labelKey: string;
  formatLabel?: (value: number) => string;
}

export function ReportChart({ title, data, dataKey, labelKey, formatLabel }: ReportChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-4">No data available</p>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map(item => item[dataKey]));
  const chartHeight = 200;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-64 flex items-end space-x-2">
        {data.map((item, index) => {
          const height = (item[dataKey] / maxValue) * chartHeight;
          return (
            <div key={index} className="flex-1 flex flex-col items-center group relative">
              <div
                className="bg-blue-500 rounded-t hover:bg-blue-600 transition-all duration-200"
                style={{ height: `${height}px` }}
                title={formatLabel ? formatLabel(item[dataKey]) : item[dataKey]}
              />
              <div className="text-xs text-center mt-2 truncate w-full text-gray-600">
                {item[labelKey]}
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                {formatLabel ? formatLabel(item[dataKey]) : item[dataKey]}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-center text-sm text-gray-600">
        Total: {formatCurrency(data.reduce((sum, item) => sum + item[dataKey], 0))}
      </div>
    </Card>
  );
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export default ReportChart;