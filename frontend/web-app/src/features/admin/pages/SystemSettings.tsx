import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock data for audit logs
const auditLogs = [
  { id: '1', timestamp: '2023-10-15T14:30:45Z', user: 'admin', action: 'Updated queue configuration', details: 'Changed priority weights' },
  { id: '2', timestamp: '2023-10-15T13:22:10Z', user: 'doctor1', action: 'Patient status update', details: 'Marked patient #1234 as seen' },
  { id: '3', timestamp: '2023-10-15T12:15:30Z', user: 'receptionist2', action: 'Patient registration', details: 'Registered new patient #5678' },
  { id: '4', timestamp: '2023-10-15T11:05:22Z', user: 'admin', action: 'User management', details: 'Added new doctor account' },
  { id: '5', timestamp: '2023-10-15T10:45:18Z', user: 'system', action: 'Backup created', details: 'Automatic daily backup' },
  { id: '6', timestamp: '2023-10-14T16:30:45Z', user: 'admin', action: 'System settings', details: 'Updated notification settings' },
  { id: '7', timestamp: '2023-10-14T14:22:10Z', user: 'doctor2', action: 'Patient status update', details: 'Marked patient #2345 as seen' },
  { id: '8', timestamp: '2023-10-14T12:15:30Z', user: 'receptionist1', action: 'Queue management', details: 'Manually adjusted queue order' },
];

// Mock data for system settings
const initialSettings = {
  general: {
    systemName: 'Hospital Queue System',
    hospitalName: 'City General Hospital',
    language: 'en',
    timezone: 'UTC+3',
  },
  notifications: {
    enableSMS: true,
    enablePush: true,
    enableEmail: false,
    notifyQueueChanges: true,
    notifySystemEvents: true,
  },
  security: {
    sessionTimeout: 30, // minutes
    passwordExpiry: 90, // days
    failedLoginLimit: 5,
    requireTwoFactor: false,
  },
  backup: {
    automaticBackups: true,
    backupFrequency: 'daily', // daily, weekly, monthly
    backupTime: '02:00', // 2 AM
    retentionPeriod: 30, // days
  }
};

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState({ ...initialSettings });
  const [activeTab, setActiveTab] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [hasChanges, setHasChanges] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category as keyof typeof settings],
        [setting]: value
      }
    });
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    toast({
      title: 'Settings Saved',
      description: 'System settings have been updated successfully.',
    });
    setHasChanges(false);
  };

  const handleCreateBackup = () => {
    // In a real app, this would trigger a backup API call
    toast({
      title: 'Backup Created',
      description: 'System backup has been created successfully.',
    });
    
    // Mock download (in a real app, this would be a real file)
    const mockBackupData = JSON.stringify(settings);
    const blob = new Blob([mockBackupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital-queue-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBackupFile(e.target.files[0]);
    }
  };

  const handleRestore = () => {
    if (!backupFile) {
      toast({
        title: 'Error',
        description: 'Please select a backup file to restore.',
        variant: 'destructive',
      });
      return;
    }

    setIsRestoring(true);

    // In a real app, this would upload the file to the server
    // Here we mock reading the file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (event.target?.result) {
          // Mock successful restore
          setTimeout(() => {
            toast({
              title: 'Restore Completed',
              description: 'System has been restored from backup successfully.',
            });
            setIsRestoring(false);
            setBackupFile(null);
          }, 2000);
        }
      } catch (error) {
        toast({
          title: 'Restore Failed',
          description: 'Invalid backup file or data format.',
          variant: 'destructive',
        });
        setIsRestoring(false);
      }
    };
    reader.readAsText(backupFile);
  };

  // Filter audit logs based on search query, filter type, and date range
  const filteredLogs = auditLogs.filter(log => {
    // Search query filter
    if (searchQuery && !log.action.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !log.details.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.user.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Action type filter
    if (filterType !== 'all' && !log.action.toLowerCase().includes(filterType.toLowerCase())) {
      return false;
    }
    
    // Date range filter (simplified for demo)
    if (dateRange.start && new Date(log.timestamp) < new Date(dateRange.start)) {
      return false;
    }
    if (dateRange.end && new Date(log.timestamp) > new Date(dateRange.end)) {
      return false;
    }
    
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">System Settings</h1>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          </TabsList>
          
          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure basic system settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="systemName">System Name</Label>
                    <Input 
                      id="systemName" 
                      value={settings.general.systemName} 
                      onChange={(e) => handleSettingChange('general', 'systemName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospitalName">Hospital Name</Label>
                    <Input 
                      id="hospitalName" 
                      value={settings.general.hospitalName} 
                      onChange={(e) => handleSettingChange('general', 'hospitalName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Default Language</Label>
                    <Select 
                      value={settings.general.language}
                      onValueChange={(value) => handleSettingChange('general', 'language', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sw">Swahili</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={settings.general.timezone}
                      onValueChange={(value) => handleSettingChange('general', 'timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC+0">UTC+0 (London)</SelectItem>
                        <SelectItem value="UTC+1">UTC+1 (Paris)</SelectItem>
                        <SelectItem value="UTC+2">UTC+2 (Cairo)</SelectItem>
                        <SelectItem value="UTC+3">UTC+3 (Nairobi)</SelectItem>
                        <SelectItem value="UTC-5">UTC-5 (New York)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={!hasChanges}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure how the system sends notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enableSMS" className="text-base">Enable SMS Notifications</Label>
                      <p className="text-sm text-gray-500">Send queue updates via SMS</p>
                    </div>
                    <Switch 
                      id="enableSMS" 
                      checked={settings.notifications.enableSMS}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'enableSMS', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enablePush" className="text-base">Enable Push Notifications</Label>
                      <p className="text-sm text-gray-500">Send updates to mobile app</p>
                    </div>
                    <Switch 
                      id="enablePush" 
                      checked={settings.notifications.enablePush}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'enablePush', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enableEmail" className="text-base">Enable Email Notifications</Label>
                      <p className="text-sm text-gray-500">Send updates via email</p>
                    </div>
                    <Switch 
                      id="enableEmail" 
                      checked={settings.notifications.enableEmail}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'enableEmail', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifyQueueChanges" className="text-base">Queue Change Notifications</Label>
                      <p className="text-sm text-gray-500">Notify patients of queue position changes</p>
                    </div>
                    <Switch 
                      id="notifyQueueChanges" 
                      checked={settings.notifications.notifyQueueChanges}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'notifyQueueChanges', checked)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifySystemEvents" className="text-base">System Event Notifications</Label>
                      <p className="text-sm text-gray-500">Notify administrators of system events</p>
                    </div>
                    <Switch 
                      id="notifySystemEvents" 
                      checked={settings.notifications.notifySystemEvents}
                      onCheckedChange={(checked) => handleSettingChange('notifications', 'notifySystemEvents', checked)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={!hasChanges}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure system security parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input 
                      id="sessionTimeout" 
                      type="number" 
                      min="5" 
                      max="120"
                      value={settings.security.sessionTimeout} 
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                    <Input 
                      id="passwordExpiry" 
                      type="number" 
                      min="30" 
                      max="365"
                      value={settings.security.passwordExpiry} 
                      onChange={(e) => handleSettingChange('security', 'passwordExpiry', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="failedLoginLimit">Failed Login Limit</Label>
                    <Input 
                      id="failedLoginLimit" 
                      type="number" 
                      min="3" 
                      max="10"
                      value={settings.security.failedLoginLimit} 
                      onChange={(e) => handleSettingChange('security', 'failedLoginLimit', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-6">
                    <div>
                      <Label htmlFor="requireTwoFactor" className="text-base">Require Two-Factor Auth</Label>
                      <p className="text-sm text-gray-500">For staff accounts</p>
                    </div>
                    <Switch 
                      id="requireTwoFactor" 
                      checked={settings.security.requireTwoFactor}
                      onCheckedChange={(checked) => handleSettingChange('security', 'requireTwoFactor', checked)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={!hasChanges}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Backup & Restore */}
          <TabsContent value="backup" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Backup Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Backup Settings</CardTitle>
                  <CardDescription>Configure automatic backup settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="automaticBackups" className="text-base">Automatic Backups</Label>
                        <p className="text-sm text-gray-500">Enable scheduled backups</p>
                      </div>
                      <Switch 
                        id="automaticBackups" 
                        checked={settings.backup.automaticBackups}
                        onCheckedChange={(checked) => handleSettingChange('backup', 'automaticBackups', checked)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="backupFrequency">Backup Frequency</Label>
                      <Select 
                        value={settings.backup.backupFrequency}
                        onValueChange={(value) => handleSettingChange('backup', 'backupFrequency', value)}
                        disabled={!settings.backup.automaticBackups}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="backupTime">Backup Time</Label>
                      <Input 
                        id="backupTime" 
                        type="time"
                        value={settings.backup.backupTime} 
                        onChange={(e) => handleSettingChange('backup', 'backupTime', e.target.value)}
                        disabled={!settings.backup.automaticBackups}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="retentionPeriod">Retention Period (days)</Label>
                      <Input 
                        id="retentionPeriod" 
                        type="number"
                        min="7"
                        max="365"
                        value={settings.backup.retentionPeriod} 
                        onChange={(e) => handleSettingChange('backup', 'retentionPeriod', parseInt(e.target.value))}
                        disabled={!settings.backup.automaticBackups}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={!hasChanges}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </Button>
                  <Button 
                    onClick={handleCreateBackup}
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Create Backup Now
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Restore */}
              <Card>
                <CardHeader>
                  <CardTitle>Restore System</CardTitle>
                  <CardDescription>Restore the system from a backup file</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Restoring from a backup will replace all current data. This action cannot be undone.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4 pt-2">
                    <Label htmlFor="backupFile">Select Backup File</Label>
                    <Input 
                      id="backupFile" 
                      type="file" 
                      accept=".json"
                      onChange={handleFileChange}
                    />
                    {backupFile && (
                      <p className="text-sm text-gray-500">
                        Selected file: {backupFile.name} ({(backupFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleRestore}
                    disabled={!backupFile || isRestoring}
                    variant="destructive"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Restore System
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Audit Log */}
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>View system activity and events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and filters */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search logs..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={filterType}
                        onValueChange={setFilterType}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Actions</SelectItem>
                          <SelectItem value="update">Updates</SelectItem>
                          <SelectItem value="patient">Patient Actions</SelectItem>
                          <SelectItem value="user">User Management</SelectItem>
                          <SelectItem value="backup">Backup Actions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Date range filter */}
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      />
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => setDateRange({ start: '', end: '' })}
                    >
                      Clear Dates
                    </Button>
                  </div>
                  
                  {/* Audit log table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Timestamp</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="hidden md:table-cell">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.length > 0 ? (
                          filteredLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono">{formatDate(log.timestamp)}</TableCell>
                              <TableCell>{log.user}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{log.action}</Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{log.details}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                              No logs found matching your filters
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default SystemSettings;