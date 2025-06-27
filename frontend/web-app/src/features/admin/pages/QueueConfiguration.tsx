import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Save, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AdminLayout from '../components/AdminLayout';
import { adminService, QueueSettings } from '@/services/api';

const QueueConfiguration: React.FC = () => {
  const [settings, setSettings] = useState<QueueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    condition: '',
    action: '',
    enabled: true
  });
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  
  // Load queue configuration from API
  useEffect(() => {
    const fetchQueueConfig = async () => {
      try {
        const response = await adminService.getQueueConfiguration();
        if (response.success && response.data) {
          setSettings(response.data);
        } else {
          toast({
            title: "Error",
            description: response.error || "Failed to load queue configuration",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error fetching queue configuration:', error);
        toast({
          title: "Error",
          description: "Failed to load queue configuration",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchQueueConfig();
  }, []);
  
  const handleSaveConfiguration = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const response = await adminService.updateQueueConfiguration(settings);
      
      if (response.success) {
        toast({
          title: "Configuration Saved",
          description: "Queue configuration has been updated successfully."
        });
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to save configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddRule = () => {
    if (!settings) return;
    
    // Validate form
    if (!newRule.name || !newRule.condition || !newRule.action) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields for the new rule.",
        variant: "destructive"
      });
      return;
    }
    
    // Create new rule with unique ID
    const ruleToAdd = {
      ...newRule,
      id: `${Date.now()}`
    };
    
    // Add to settings
    setSettings({
      ...settings,
      rules: [...settings.rules, ruleToAdd]
    });
    
    // Reset form
    setNewRule({
      name: '',
      description: '',
      condition: '',
      action: '',
      enabled: true
    });
    
    setShowNewRuleForm(false);
    
    toast({
      title: "Rule Added",
      description: `${newRule.name} has been added to the queue rules.`
    });
  };
  
  const handleDeleteRule = (ruleId: string) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      rules: settings.rules.filter(rule => rule.id !== ruleId)
    });
    
    toast({
      title: "Rule Deleted",
      description: "The rule has been removed from the queue rules."
    });
  };
  
  const handleToggleRule = (ruleId: string) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      rules: settings.rules.map(rule => 
        rule.id === ruleId 
          ? { ...rule, enabled: !rule.enabled } 
          : rule
      )
    });
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
              Failed to load queue configuration. Please try refreshing the page.
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
          <h2 className="text-3xl font-bold tracking-tight">Queue Configuration</h2>
          <Button onClick={handleSaveConfiguration} disabled={saving}>
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
        
        <Tabs defaultValue="weights">
          <TabsList>
            <TabsTrigger value="weights">Priority Weights</TabsTrigger>
            <TabsTrigger value="rules">Queue Rules</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Priority Weights</CardTitle>
                <CardDescription>
                  Configure how different factors affect patient priority in the queue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="highPriority">High Priority Weight</Label>
                      <span className="text-sm">{settings.priorityWeights.high}</span>
                    </div>
                    <Slider 
                      id="highPriority"
                      min={1}
                      max={20}
                      step={1}
                      value={[settings.priorityWeights.high]}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        priorityWeights: {
                          ...settings.priorityWeights,
                          high: value[0]
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mediumPriority">Medium Priority Weight</Label>
                      <span className="text-sm">{settings.priorityWeights.medium}</span>
                    </div>
                    <Slider 
                      id="mediumPriority"
                      min={1}
                      max={10}
                      step={1}
                      value={[settings.priorityWeights.medium]}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        priorityWeights: {
                          ...settings.priorityWeights,
                          medium: value[0]
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lowPriority">Low Priority Weight</Label>
                      <span className="text-sm">{settings.priorityWeights.low}</span>
                    </div>
                    <Slider 
                      id="lowPriority"
                      min={1}
                      max={5}
                      step={1}
                      value={[settings.priorityWeights.low]}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        priorityWeights: {
                          ...settings.priorityWeights,
                          low: value[0]
                        }
                      })}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="elderlyBonus">Elderly Patient Bonus</Label>
                      <span className="text-sm">{settings.priorityWeights.elderly}</span>
                    </div>
                    <Slider 
                      id="elderlyBonus"
                      min={0}
                      max={10}
                      step={1}
                      value={[settings.priorityWeights.elderly]}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        priorityWeights: {
                          ...settings.priorityWeights,
                          elderly: value[0]
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="childBonus">Child Patient Bonus</Label>
                      <span className="text-sm">{settings.priorityWeights.child}</span>
                    </div>
                    <Slider 
                      id="childBonus"
                      min={0}
                      max={10}
                      step={1}
                      value={[settings.priorityWeights.child]}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        priorityWeights: {
                          ...settings.priorityWeights,
                          child: value[0]
                        }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pregnantBonus">Pregnant Patient Bonus</Label>
                      <span className="text-sm">{settings.priorityWeights.pregnant}</span>
                    </div>
                    <Slider 
                      id="pregnantBonus"
                      min={0}
                      max={10}
                      step={1}
                      value={[settings.priorityWeights.pregnant]}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        priorityWeights: {
                          ...settings.priorityWeights,
                          pregnant: value[0]
                        }
                      })}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="waitTimeWeight">Wait Time Weight (per 10 minutes)</Label>
                    <span className="text-sm">{settings.priorityWeights.waitTime}</span>
                  </div>
                  <Slider 
                    id="waitTimeWeight"
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.priorityWeights.waitTime]}
                    onValueChange={(value) => setSettings({
                      ...settings,
                      priorityWeights: {
                        ...settings.priorityWeights,
                        waitTime: value[0]
                      }
                    })}
                  />
                  <p className="text-sm text-muted-foreground">
                    This determines how much priority increases based on wait time
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Queue Rules</CardTitle>
                <CardDescription>
                  Configure rules that automatically adjust patient priority
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.rules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant={rule.enabled ? "default" : "outline"}>
                            {rule.enabled ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleRule(rule.id)}
                        >
                          {rule.enabled ? "Disable" : "Enable"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-xs">Condition</Label>
                        <div className="mt-1 rounded-md bg-secondary p-2">
                          <code className="text-xs">{rule.condition}</code>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Action</Label>
                        <div className="mt-1 rounded-md bg-secondary p-2">
                          <code className="text-xs">{rule.action}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {showNewRuleForm ? (
                  <div className="rounded-lg border border-dashed p-4">
                    <h4 className="font-medium mb-4">Add New Rule</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="ruleName">Rule Name</Label>
                          <Input 
                            id="ruleName" 
                            value={newRule.name}
                            onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="ruleEnabled">Status</Label>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="ruleEnabled" 
                              checked={newRule.enabled}
                              onCheckedChange={(checked) => setNewRule({...newRule, enabled: checked})}
                            />
                            <Label htmlFor="ruleEnabled">Enabled</Label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="ruleDescription">Description</Label>
                        <Input 
                          id="ruleDescription" 
                          value={newRule.description}
                          onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="ruleCondition">Condition</Label>
                        <Input 
                          id="ruleCondition" 
                          value={newRule.condition}
                          onChange={(e) => setNewRule({...newRule, condition: e.target.value})}
                          placeholder="e.g., age >= 65"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="ruleAction">Action</Label>
                        <Input 
                          id="ruleAction" 
                          value={newRule.action}
                          onChange={(e) => setNewRule({...newRule, action: e.target.value})}
                          placeholder="e.g., addPriorityBonus('elderly')"
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowNewRuleForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleAddRule}>
                          Add Rule
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full py-6"
                    onClick={() => setShowNewRuleForm(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Rule
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default QueueConfiguration; 