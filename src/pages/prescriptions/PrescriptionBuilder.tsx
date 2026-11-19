import React from "react";
import { Card, Button } from "react-typescript-ui";
import { useNavigate } from "react-router-dom";

const PrescriptionBuilder: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Prescription Builder</h3>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate("/prescriptions")}>
            Cancel
          </Button>
          <Button>
            <span className="mr-2">✓</span> Save Prescription
          </Button>
        </div>
      </div>
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Prescription builder coming soon</p>
        </div>
      </div>
    </Card>
  );
};

export default PrescriptionBuilder;
