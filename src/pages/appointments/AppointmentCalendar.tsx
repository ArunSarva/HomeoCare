import React from "react";
import { Card, Button } from "react-typescript-ui";

const AppointmentCalendar: React.FC = () => {
  return (
    <Card className="shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-gray-200">
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline">Day</Button>
          <Button variant="outline">Week</Button>
          <Button variant="solid">Month</Button>
        </div>
        <Button>
          <span className="mr-2">+</span> New Appointment
        </Button>
      </div>
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Appointment calendar coming soon</p>
        </div>
      </div>
    </Card>
  );
};

export default AppointmentCalendar;
