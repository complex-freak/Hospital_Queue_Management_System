import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  Save, 
  Download, 
  Upload, 
  Search, 
  RefreshCw, 
  Filter, 
  Calendar, 
  User, 
  Activity, 
  Settings, 
  Clock,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AdminLayout from '../components/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Mock data for reports
const initialReports = [
  { id: '1', name: 'Daily Queue Report', description: 'Summary of daily queue activities', schedule: 'daily', lastGenerated: '2023-10-15T14:30:45Z' },
  { id: '2', name: 'Weekly Performance Report', description: 'Weekly performance metrics', schedule: 'weekly', lastGenerated: '2023-10-14T14:30:45Z' },
  { id: '3', name: 'Monthly Audit Log', description: 'Detailed audit log for the month', schedule: 'monthly', lastGenerated: '2023-10-01T14:30:45Z' },
];

const ReportingTools: React.FC = () => {
  const [reports, setReports] = useState([...initialReports]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const handleReportSelect = (id: string) => {
    const report = reports.find((r) => r.id === id);
    if (report) {
      setSelectedReport(id);
      setEditingReport({ ...report });
    }
  };

  const handleReportChange = (field: string, value: string) => {
    if (editingReport) {
      setEditingReport({ ...editingReport, [field]: value });
      setHasChanges(true);
    }
  };

  const handleSaveReport = () => {
    if (editingReport) {
      setReports(
        reports.map((report) => (report.id === editingReport.id ? { ...editingReport } : report))
      );
      toast({
        title: 'Report Saved',
        description: 'Report configuration has been updated successfully.',
      });
      setHasChanges(false);
    }
  };

  const handleGenerateReport = (id: string) => {
    // In a real app, this would trigger a report generation API call
    toast({
      title: 'Report Generated',
      description: `Report ${id} has been generated successfully.`,
    });
  };

  const handleExportReport = (id: string) => {
    // In a real app, this would trigger a report export API call
    toast({
      title: 'Report Exported',
      description: `Report ${id} has been exported successfully.`,
    });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Reporting Tools</h1>
        
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
          
          {/* Reports */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Reports</CardTitle>
                <CardDescription>Select a report to view or edit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Report Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Last Generated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>{report.name}</TableCell>
                          <TableCell>{report.description}</TableCell>
                          <TableCell>{report.schedule}</TableCell>
                          <TableCell>{new Date(report.lastGenerated).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleGenerateReport(report.id)}
                            >
                              Generate
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExportReport(report.id)}
                            >
                              Export
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Schedule */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Reports</CardTitle>
                <CardDescription>Configure report generation schedules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedReport && editingReport ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reportName">Report Name</Label>
                      <Input 
                        id="reportName" 
                        value={editingReport.name} 
                        onChange={(e) => handleReportChange('name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reportDescription">Description</Label>
                      <Input 
                        id="reportDescription" 
                        value={editingReport.description} 
                        onChange={(e) => handleReportChange('description', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reportSchedule">Schedule</Label>
                      <Select 
                        value={editingReport.schedule}
                        onValueChange={(value) => handleReportChange('schedule', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleSaveReport} 
                      disabled={!hasChanges}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">Select a report to edit its schedule.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Export */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Export Reports</CardTitle>
                <CardDescription>Export reports in various formats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-500">Select a report from the list to export it in the desired format.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default ReportingTools;
