import React from "react";
import { Card } from "react-typescript-ui";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const stats = [
    { label: "Total Patients", value: "1,234", icon: "users", color: "primary" },
    { label: "Today's Appointments", value: "24", icon: "calendar", color: "secondary" },
    { label: "Pending Follow-Ups", value: "45", icon: "activity", color: "warning" },
    { label: "Active Cases", value: "89", icon: "file-text", color: "primary" },
    { label: "Monthly Revenue", value: "₹2,34,500", icon: "dollar-sign", color: "success" },
    { label: "Stock Alerts", value: "3", icon: "bell", color: "danger" },
  ];

  const handleQuickAction = (action: string) => {
    showToast("info", `Quick action: ${action}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user?.name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                <span className="text-xl">{stat.icon === "users" ? "👥" : stat.icon === "calendar" ? "📅" : stat.icon === "activity" ? "📊" : stat.icon === "file-text" ? "📄" : stat.icon === "dollar-sign" ? "💰" : "⚠️"}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => handleQuickAction("New Patient")} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            <span className="mr-2">➕</span> New Patient
          </button>
          <button onClick={() => handleQuickAction("New Appointment")} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            <span className="mr-2">📅</span> Appointment
          </button>
          <button onClick={() => handleQuickAction("New Case")} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            <span className="mr-2">📝</span> New Case
          </button>
          <button onClick={() => handleQuickAction("New Prescription")} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            <span className="mr-2">💊</span> Prescription
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex items-center space-x-4 pb-4 border-b border-gray-100 last:border-0">
              <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                <span className="font-bold">{item}</span>
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">Patient consultation completed</p>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
              <span className="px-3 py-1 text-xs bg-success bg-opacity-10 text-success rounded-full">
                Completed
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
