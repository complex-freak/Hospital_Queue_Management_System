import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AdminLayout from '../components/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminService, SystemSettings as SystemSettingsType } from '@/services/api';

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SystemSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  
  // Load settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await adminService.getSystemSettings();
        if (response.success && response.data) {
          setSettings(response.data);
        } else {
          toast({
            title: "Error",
            description: response.error || "Failed to load system settings",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: "Error",
          description: "Failed to load system settings",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Load audit logs from API
  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLogsLoading(true);
      try {
        const response = await adminService.getAuditLogs(0, 100);
        if (response.success) {
          setAuditLogs(response.data);
        } else {
          console.error('Failed to fetch audit logs:', response.error);
        }
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLogsLoading(false);
      }
    };
    
    fetchAuditLogs();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const response = await adminService.updateSystemSettings(settings);
      
      if (response.success) {
        toast({
          title: "Settings Saved",
          description: "System settings have been updated successfully."
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to save settings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = () => {
    // In a real app, this would call an API endpoint to create a backup
    // For now, we'll simulate a download
    
    const mockBackupData = JSON.stringify({
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      settings: settings
    }, null, 2);
    
    const blob = new Blob([mockBackupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital-queue-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Backup Created",
      description: "System backup has been created and downloaded."
    });
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
    
    // Date range filter
    if (dateRange.start && new Date(log.createdAt) < new Date(dateRange.start)) {
      return false;
    }
    if (dateRange.end && new Date(log.createdAt) > new Date(dateRange.end)) {
      return false;
    }
    
    return true;
  });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load system settings. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-[400px]">
            <TabsTrigger value="general">
              <Settings className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Activity className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <User className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Clock className="mr-2 h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure basic system settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="systemName">System Name</Label>
                    <Input 
                      id="systemName" 
                      value={settings.general.systemName}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          systemName: e.target.value
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hospitalName">Hospital Name</Label>
                    <Input 
                      id="hospitalName" 
                      value={settings.general.hospitalName}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          hospitalName: e.target.value
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={settings.general.language}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          language: value
                        }
                      })}
                    >
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={settings.general.timezone}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          timezone: value
                        }
                      })}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                        <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                        <SelectItem value="UTC+0">UTC</SelectItem>
                        <SelectItem value="UTC+1">Central European Time (UTC+1)</SelectItem>
                        <SelectItem value="UTC+2">Eastern European Time (UTC+2)</SelectItem>
                        <SelectItem value="UTC+3">Moscow Time (UTC+3)</SelectItem>
                        <SelectItem value="UTC+5:30">India Time (UTC+5:30)</SelectItem>
                        <SelectItem value="UTC+8">China Time (UTC+8)</SelectItem>
                        <SelectItem value="UTC+9">Japan Time (UTC+9)</SelectItem>
                        <SelectItem value="UTC+10">Australia Eastern Time (UTC+10)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how the system sends notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enableSMS" 
                    checked={settings.notifications.enableSMS}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        enableSMS: checked
                      }
                    })}
                  />
                  <Label htmlFor="enableSMS">Enable SMS Notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enablePush" 
                    checked={settings.notifications.enablePush}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        enablePush: checked
                      }
                    })}
                  />
                  <Label htmlFor="enablePush">Enable Push Notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enableEmail" 
                    checked={settings.notifications.enableEmail}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        enableEmail: checked
                      }
                    })}
                  />
                  <Label htmlFor="enableEmail">Enable Email Notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="notifyQueueChanges" 
                    checked={settings.notifications.notifyQueueChanges}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        notifyQueueChanges: checked
                      }
                    })}
                  />
                  <Label htmlFor="notifyQueueChanges">Notify Queue Changes</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="notifySystemEvents" 
                    checked={settings.notifications.notifySystemEvents}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        notifySystemEvents: checked
                      }
                    })}
                  />
                  <Label htmlFor="notifySystemEvents">Notify System Events</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security and access control settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input 
                      id="sessionTimeout" 
                      type="number"
                      min="5"
                      max="240"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          sessionTimeout: parseInt(e.target.value) || 30
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                    <Input 
                      id="passwordExpiry" 
                      type="number"
                      min="0"
                      max="365"
                      value={settings.security.passwordExpiry}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          passwordExpiry: parseInt(e.target.value) || 90
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="failedLoginLimit">Failed Login Attempt Limit</Label>
                    <Input 
                      id="failedLoginLimit" 
                      type="number"
                      min="1"
                      max="10"
                      value={settings.security.failedLoginLimit}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          failedLoginLimit: parseInt(e.target.value) || 5
                        }
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch 
                      id="requireTwoFactor" 
                      checked={settings.security.requireTwoFactor}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          requireTwoFactor: checked
                        }
                      })}
                    />
                    <Label htmlFor="requireTwoFactor">Require Two-Factor Authentication</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                  System audit trail and activity logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-4 md:grid-cols-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  <Select
                    value={filterType}
                    onValueChange={setFilterType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      className="flex-1"
                    />
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            <div className="flex justify-center items-center">
                              <Loader2 className="h-6 w-6 animate-spin mr-2" />
                              Loading audit logs...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No logs found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{formatDate(log.createdAt)}</TableCell>
                            <TableCell>{log.userType === 'system' ? 'System' : log.userId}</TableCell>
                            <TableCell>{log.action}</TableCell>
                            <TableCell>{log.details}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Backup & Restore</CardTitle>
                <CardDescription>
                  Manage system backups and restore points
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Select 
                      value={settings.backup.backupFrequency}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        backup: {
                          ...settings.backup,
                          backupFrequency: value
                        }
                      })}
                    >
                      <SelectTrigger id="backupFrequency">
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
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: {
                          ...settings.backup,
                          backupTime: e.target.value
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="retentionPeriod">Retention Period (days)</Label>
                    <Input 
                      id="retentionPeriod" 
                      type="number"
                      min="1"
                      max="365"
                      value={settings.backup.retentionPeriod}
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: {
                          ...settings.backup,
                          retentionPeriod: parseInt(e.target.value) || 30
                        }
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch 
                      id="automaticBackups" 
                      checked={settings.backup.automaticBackups}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        backup: {
                          ...settings.backup,
                          automaticBackups: checked
                        }
                      })}
                    />
                    <Label htmlFor="automaticBackups">Enable Automatic Backups</Label>
                  </div>
                </div>
                
                <div className="pt-4 space-y-4">
                  <div className="flex flex-col gap-2 md:flex-row md:gap-4">
                    <Button onClick={handleBackup} className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Create Backup Now
                    </Button>
                    
                    <div className="flex flex-1 gap-2">
                      <Input
                        type="file"
                        accept=".json"
                        onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleRestore} 
                        disabled={!backupFile || isRestoring}
                        variant="outline"
                      >
                        {isRestoring ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Restore
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Restoring from a backup will overwrite all current data. This action cannot be undone.
                    </AlertDescription>
                  </Alert>
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