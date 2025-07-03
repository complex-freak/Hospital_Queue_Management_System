import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '../components/AdminLayout';

const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  
  const [timeframe, setTimeframe] = useState('30d');
  
  // Handler for preset timeframes
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    const now = new Date();
    
    switch (value) {
      case '7d':
        setDateRange({
          from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          to: now,
        });
        break;
      case '30d':
        setDateRange({
          from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          to: now,
        });
        break;
      case '90d':
        setDateRange({
          from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          to: now,
        });
        break;
      case '1y':
        setDateRange({
          from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          to: now,
        });
        break;
      default:
        break;
    }
  };

  return (
    <AdminLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          
          <div className="flex items-center space-x-2">
            <Select
              value={timeframe}
              onValueChange={handleTimeframeChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal w-[240px]",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange({
                      from: range?.from,
                      to: range?.to || range?.from
                    });
                    setTimeframe('custom');
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <Tabs defaultValue="patient" className="space-y-4">
          <TabsList>
            <TabsTrigger value="patient">Patient Analytics</TabsTrigger>
            <TabsTrigger value="doctor">Doctor Performance</TabsTrigger>
            <TabsTrigger value="wait">Wait Times</TabsTrigger>
            <TabsTrigger value="system">System Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="patient" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Patients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,248</div>
                  <p className="text-xs text-muted-foreground">
                    +15% from previous period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    New Patients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">342</div>
                  <p className="text-xs text-muted-foreground">
                    +5% from previous period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Visit Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">18 min</div>
                  <p className="text-xs text-muted-foreground">
                    -2 min from previous period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Patient Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.8/5</div>
                  <p className="text-xs text-muted-foreground">
                    +0.2 from previous period
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Patient Volume Trends</CardTitle>
                <CardDescription>
                  Daily patient visits over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-md">
                  Patient volume chart will be implemented with Recharts
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="doctor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Doctor Performance</CardTitle>
                <CardDescription>
                  Efficiency and patient satisfaction metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-md">
                  Doctor performance charts will be implemented with Recharts
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="wait" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Wait Time Analysis</CardTitle>
                <CardDescription>
                  Patient wait times by day and hour
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-md">
                  Wait time heatmap will be implemented with Recharts
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>
                  Server health and application metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-md">
                  System performance charts will be implemented with Recharts
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Analytics; 