import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const MetricsOverview: React.FC = () => {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>
          System performance and metrics for the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
          <p className="mb-2">Charts will be implemented with Recharts in the next phase</p>
          <div className="w-full flex gap-4">
            <div className="flex-1 h-[200px] border rounded-md p-4 flex items-center justify-center">
              Patient Volume Chart
            </div>
            <div className="flex-1 h-[200px] border rounded-md p-4 flex items-center justify-center">
              Wait Time Trends
            </div>
            <div className="flex-1 h-[200px] border rounded-md p-4 flex items-center justify-center">
              Doctor Availability
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsOverview; 