import React from "react";
import { Card, Button } from "react-typescript-ui";
import { useNavigate, useParams } from "react-router-dom";

const FollowUp: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <Card className="shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">{id ? "Edit Follow-Up" : "New Follow-Up"}</h3>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate("/followups")}>
            Cancel
          </Button>
          <Button>
            <span className="mr-2">✓</span> Save Follow-Up
          </Button>
        </div>
      </div>
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Follow-up form coming soon</p>
        </div>
      </div>
    </Card>
  );
};

export default FollowUp;
