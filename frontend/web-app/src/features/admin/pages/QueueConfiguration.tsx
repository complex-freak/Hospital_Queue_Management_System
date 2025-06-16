import React, { useState } from 'react';
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
import { AlertCircle, Save, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AdminLayout from '../components/AdminLayout';

// Mock data for queue rules and weights
const initialPriorityWeights = {
  high: 10,
  medium: 5,
  low: 1,
  elderly: 3,
  child: 2,
  pregnant: 3,
  waitTime: 0.5, // per 10 minutes
};

const initialQueueRules = [
  {
    id: '1',
    name: 'Elderly Priority',
    description: 'Patients over 65 years old get elderly priority bonus',
    condition: 'age >= 65',
    action: 'addPriorityBonus("elderly")',
    enabled: true,
  },
  {
    id: '2',
    name: 'Child Priority',
    description: 'Children under 12 years old get child priority bonus',
    condition: 'age < 12',
    action: 'addPriorityBonus("child")',
    enabled: true,
  },
  {
    id: '3',
    name: 'Pregnant Priority',
    description: 'Pregnant patients get pregnancy priority bonus',
    condition: 'isPregnant === true',
    action: 'addPriorityBonus("pregnant")',
    enabled: true,
  },
  {
    id: '4',
    name: 'Long Wait Adjustment',
    description: 'Increase priority based on wait time',
    condition: 'waitTime > 30',
    action: 'addPriorityValue(waitTime / 10 * priorityWeights.waitTime)',
    enabled: true,
  },
];

const QueueConfiguration: React.FC = () => {
  const [priorityWeights, setPriorityWeights] = useState({ ...initialPriorityWeights });
  const [queueRules, setQueueRules] = useState([...initialQueueRules]);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleWeightChange = (key: string, value: number) => {
    setPriorityWeights({ ...priorityWeights, [key]: value });
    setHasChanges(true);
  };

  const handleRuleToggle = (id: string, enabled: boolean) => {
    setQueueRules(
      queueRules.map((rule) => (rule.id === id ? { ...rule, enabled } : rule))
    );
    setHasChanges(true);
  };

  const handleRuleSelect = (id: string) => {
    const rule = queueRules.find((r) => r.id === id);
    if (rule) {
      setSelectedRule(id);
      setEditingRule({ ...rule });
    }
  };

  const handleRuleChange = (field: string, value: string | boolean) => {
    if (editingRule) {
      setEditingRule({ ...editingRule, [field]: value });
      setHasChanges(true);
    }
  };

  const handleSaveRule = () => {
    if (editingRule) {
      setQueueRules(
        queueRules.map((rule) => (rule.id === editingRule.id ? { ...editingRule } : rule))
      );
      toast({
        title: 'Rule Saved',
        description: 'Queue rule has been updated successfully.',
      });
    }
  };

  const handleAddRule = () => {
    const newRule = {
      id: `${Date.now()}`,
      name: 'New Rule',
      description: 'Description of the new rule',
      condition: '',
      action: '',
      enabled: true,
    };
    setQueueRules([...queueRules, newRule]);
    setSelectedRule(newRule.id);
    setEditingRule(newRule);
    setHasChanges(true);
  };

  const handleDeleteRule = (id: string) => {
    setQueueRules(queueRules.filter((rule) => rule.id !== id));
    if (selectedRule === id) {
      setSelectedRule(null);
      setEditingRule(null);
    }
    setHasChanges(true);
    toast({
      title: 'Rule Deleted',
      description: 'Queue rule has been removed.',
    });
  };

  const handleSaveConfiguration = () => {
    // In a real app, this would save to the backend
    toast({
      title: 'Configuration Saved',
      description: 'Queue configuration has been updated successfully.',
    });
    setHasChanges(false);
  };

  const handleResetConfiguration = () => {
    setPriorityWeights({ ...initialPriorityWeights });
    setQueueRules([...initialQueueRules]);
    setSelectedRule(null);
    setEditingRule(null);
    setHasChanges(false);
    toast({
      title: 'Configuration Reset',
      description: 'Queue configuration has been reset to default values.',
    });
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  // Mock patient data for preview
  const previewPatients = [
    {
      id: 'p1',
      name: 'John Smith',
      age: 72,
      priority: 'medium',
      waitTime: 25,
      isPregnant: false,
      calculatedScore: 0,
    },
    {
      id: 'p2',
      name: 'Sarah Johnson',
      age: 34,
      priority: 'high',
      waitTime: 15,
      isPregnant: true,
      calculatedScore: 0,
    },
    {
      id: 'p3',
      name: 'Michael Brown',
      age: 8,
      priority: 'low',
      waitTime: 45,
      isPregnant: false,
      calculatedScore: 0,
    },
    {
      id: 'p4',
      name: 'Emily Davis',
      age: 29,
      priority: 'medium',
      waitTime: 60,
      isPregnant: false,
      calculatedScore: 0,
    },
  ];

  // Calculate priority scores for preview
  const calculatePriorityScores = () => {
    return previewPatients.map((patient) => {
      let score = priorityWeights[patient.priority as keyof typeof priorityWeights];
      
      // Apply rules
      queueRules.forEach((rule) => {
        if (rule.enabled) {
          // This is a simplified version of rule evaluation
          // In a real app, you would use a proper rule engine or parser
          if (
            (rule.condition.includes('age') && 
              ((rule.condition.includes('>=') && patient.age >= 65) ||
               (rule.condition.includes('<') && patient.age < 12))) ||
            (rule.condition.includes('isPregnant') && patient.isPregnant) ||
            (rule.condition.includes('waitTime') && patient.waitTime > 30)
          ) {
            if (rule.action.includes('elderly') && patient.age >= 65) {
              score += priorityWeights.elderly;
            } else if (rule.action.includes('child') && patient.age < 12) {
              score += priorityWeights.child;
            } else if (rule.action.includes('pregnant') && patient.isPregnant) {
              score += priorityWeights.pregnant;
            } else if (rule.action.includes('waitTime')) {
              score += (patient.waitTime / 10) * priorityWeights.waitTime;
            }
          }
        }
      });
      
      return { ...patient, calculatedScore: score };
    }).sort((a, b) => b.calculatedScore - a.calculatedScore);
  };

  const previewPatientsWithScores = calculatePriorityScores();

  return (
    <AdminLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Queue Configuration</h2>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handleResetConfiguration}
              disabled={!hasChanges}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button 
              onClick={handleSaveConfiguration}
              disabled={!hasChanges}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unsaved Changes</AlertTitle>
            <AlertDescription>
              You have unsaved changes to the queue configuration.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="weights" className="space-y-4">
          <TabsList>
            <TabsTrigger value="weights">Priority Weights</TabsTrigger>
            <TabsTrigger value="rules">Queue Rules</TabsTrigger>
            <TabsTrigger value="preview">Preview Changes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Priority Weights</CardTitle>
                <CardDescription>
                  Configure the weight of each priority level and factor in the queue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="high-priority">High Priority</Label>
                        <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                          {priorityWeights.high}
                        </span>
                      </div>
                      <Slider
                        id="high-priority"
                        min={1}
                        max={20}
                        step={1}
                        value={[priorityWeights.high]}
                        onValueChange={(value) => handleWeightChange('high', value[0])}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="medium-priority">Medium Priority</Label>
                        <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                          {priorityWeights.medium}
                        </span>
                      </div>
                      <Slider
                        id="medium-priority"
                        min={1}
                        max={20}
                        step={1}
                        value={[priorityWeights.medium]}
                        onValueChange={(value) => handleWeightChange('medium', value[0])}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="low-priority">Low Priority</Label>
                        <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                          {priorityWeights.low}
                        </span>
                      </div>
                      <Slider
                        id="low-priority"
                        min={1}
                        max={20}
                        step={1}
                        value={[priorityWeights.low]}
                        onValueChange={(value) => handleWeightChange('low', value[0])}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-4">
                    <h3 className="text-lg font-medium">Special Factors</h3>
                    
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="elderly-bonus">Elderly Bonus</Label>
                        <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                          {priorityWeights.elderly}
                        </span>
                      </div>
                      <Slider
                        id="elderly-bonus"
                        min={0}
                        max={10}
                        step={0.5}
                        value={[priorityWeights.elderly]}
                        onValueChange={(value) => handleWeightChange('elderly', value[0])}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="child-bonus">Child Bonus</Label>
                        <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                          {priorityWeights.child}
                        </span>
                      </div>
                      <Slider
                        id="child-bonus"
                        min={0}
                        max={10}
                        step={0.5}
                        value={[priorityWeights.child]}
                        onValueChange={(value) => handleWeightChange('child', value[0])}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pregnant-bonus">Pregnancy Bonus</Label>
                        <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                          {priorityWeights.pregnant}
                        </span>
                      </div>
                      <Slider
                        id="pregnant-bonus"
                        min={0}
                        max={10}
                        step={0.5}
                        value={[priorityWeights.pregnant]}
                        onValueChange={(value) => handleWeightChange('pregnant', value[0])}
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="wait-time-factor">Wait Time Factor (per 10 min)</Label>
                        <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                          {priorityWeights.waitTime}
                        </span>
                      </div>
                      <Slider
                        id="wait-time-factor"
                        min={0}
                        max={2}
                        step={0.1}
                        value={[priorityWeights.waitTime]}
                        onValueChange={(value) => handleWeightChange('waitTime', value[0])}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rules" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Queue Rules</CardTitle>
                  <CardDescription>
                    Rules that determine queue priority
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {queueRules.map((rule) => (
                      <div 
                        key={rule.id} 
                        className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                          selectedRule === rule.id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handleRuleSelect(rule.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{rule.name}</span>
                          <span className="text-sm text-muted-foreground">{rule.description}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={rule.enabled} 
                            onCheckedChange={(checked) => handleRuleToggle(rule.id, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRule(rule.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleAddRule} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Rule
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Rule Editor</CardTitle>
                  <CardDescription>
                    Edit the selected queue rule
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedRule && editingRule ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="rule-name">Rule Name</Label>
                        <Input
                          id="rule-name"
                          value={editingRule.name}
                          onChange={(e) => handleRuleChange('name', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="rule-description">Description</Label>
                        <Input
                          id="rule-description"
                          value={editingRule.description}
                          onChange={(e) => handleRuleChange('description', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="rule-condition">
                          Condition
                          <span className="ml-1 text-sm text-muted-foreground">(JavaScript expression)</span>
                        </Label>
                        <Input
                          id="rule-condition"
                          value={editingRule.condition}
                          onChange={(e) => handleRuleChange('condition', e.target.value)}
                          placeholder="e.g., age >= 65"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="rule-action">
                          Action
                          <span className="ml-1 text-sm text-muted-foreground">(JavaScript code)</span>
                        </Label>
                        <Input
                          id="rule-action"
                          value={editingRule.action}
                          onChange={(e) => handleRuleChange('action', e.target.value)}
                          placeholder="e.g., addPriorityBonus('elderly')"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="rule-enabled">Enabled</Label>
                        <Switch
                          id="rule-enabled"
                          checked={editingRule.enabled}
                          onCheckedChange={(checked) => handleRuleChange('enabled', checked)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      Select a rule to edit or create a new one
                    </div>
                  )}
                </CardContent>
                {selectedRule && editingRule && (
                  <CardFooter>
                    <Button onClick={handleSaveRule} className="ml-auto">
                      <Save className="mr-2 h-4 w-4" />
                      Save Rule
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Queue Preview</CardTitle>
                <CardDescription>
                  See how your configuration changes affect the queue order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-3 px-4 text-left">Position</th>
                        <th className="py-3 px-4 text-left">Patient</th>
                        <th className="py-3 px-4 text-left">Age</th>
                        <th className="py-3 px-4 text-left">Base Priority</th>
                        <th className="py-3 px-4 text-left">Wait Time</th>
                        <th className="py-3 px-4 text-left">Special Factors</th>
                        <th className="py-3 px-4 text-left">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewPatientsWithScores.map((patient, index) => (
                        <tr key={patient.id} className="border-b">
                          <td className="py-3 px-4">{index + 1}</td>
                          <td className="py-3 px-4">{patient.name}</td>
                          <td className="py-3 px-4">{patient.age}</td>
                          <td className="py-3 px-4">
                            {patient.priority === 'high' && (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High</Badge>
                            )}
                            {patient.priority === 'medium' && (
                              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>
                            )}
                            {patient.priority === 'low' && (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Low</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">{patient.waitTime} min</td>
                          <td className="py-3 px-4">
                            {patient.age >= 65 && (
                              <Badge className="mr-1 bg-blue-100 text-blue-800 hover:bg-blue-100">Elderly</Badge>
                            )}
                            {patient.age < 12 && (
                              <Badge className="mr-1 bg-purple-100 text-purple-800 hover:bg-purple-100">Child</Badge>
                            )}
                            {patient.isPregnant && (
                              <Badge className="mr-1 bg-pink-100 text-pink-800 hover:bg-pink-100">Pregnant</Badge>
                            )}
                            {patient.waitTime > 30 && (
                              <Badge className="mr-1 bg-orange-100 text-orange-800 hover:bg-orange-100">Long Wait</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium">{patient.calculatedScore.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                This preview shows how patients would be ordered based on your current configuration.
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default QueueConfiguration; 