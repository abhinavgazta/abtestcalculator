import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Settings, Download, Copy } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { VariantConfig } from './VariantConfig';
import { ExperimentConfig, DesignAnalysis } from '../types/experiment';
import { DEFAULT_EXPERIMENT_CONFIG, PRIMARY_METRICS, POWER_OPTIONS, SIGNIFICANCE_OPTIONS } from '../constants/experimentDefaults';
import { calculateSampleSize, calculateBonferroniAdjustment } from '../utils/statisticalCalculations';

export function ExperimentDesigner() {
  const [config, setConfig] = useState<ExperimentConfig>(DEFAULT_EXPERIMENT_CONFIG);
  const [analysis, setAnalysis] = useState<DesignAnalysis | null>(null);
  const [dailyTraffic, setDailyTraffic] = useState<number>(1000);
  const [costPerVisitor, setCostPerVisitor] = useState<number>(0.50);

  const performDesignAnalysis = (): DesignAnalysis => {
    const controlVariant = config.variants.find(v => v.isControl);
    const treatmentVariants = config.variants.filter(v => !v.isControl);
    
    if (!controlVariant) {
      return {
        totalSampleSize: 0,
        sampleSizePerVariant: {},
        expectedDuration: 0,
        powerAnalysis: {},
        multipleComparisonsAdjustment: 0,
        estimatedCost: 0
      };
    }

    const alpha = (100 - config.significance) / 100;
    const numComparisons = treatmentVariants.length;
    const adjustedAlpha = calculateBonferroniAdjustment(numComparisons, alpha);
    
    const sampleSizePerVariant: { [key: string]: number } = {};
    const powerAnalysis: { [key: string]: number } = {};
    let maxSampleSize = 0;
    
    treatmentVariants.forEach(variant => {
      const effectSize = ((variant.expectedConversionRate - controlVariant.expectedConversionRate) / controlVariant.expectedConversionRate) * 100;
      const sampleSize = calculateSampleSize(controlVariant.expectedConversionRate, Math.abs(effectSize), config.power, adjustedAlpha);
      
      sampleSizePerVariant[variant.id] = sampleSize;
      sampleSizePerVariant[controlVariant.id] = sampleSize;
      powerAnalysis[variant.id] = config.power;
      
      maxSampleSize = Math.max(maxSampleSize, sampleSize);
    });

    const totalSampleSize = maxSampleSize * config.variants.length;
    const adjustedTotalSample = totalSampleSize / (config.totalTrafficAllocation / 100);
    const expectedDuration = Math.ceil(adjustedTotalSample / dailyTraffic);
    const estimatedCost = adjustedTotalSample * costPerVisitor;

    return {
      totalSampleSize: adjustedTotalSample,
      sampleSizePerVariant,
      expectedDuration,
      powerAnalysis,
      multipleComparisonsAdjustment: adjustedAlpha,
      estimatedCost
    };
  };

  const exportConfig = () => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment_config_${config.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  };

  useEffect(() => {
    const totalAllocation = config.variants.reduce((sum, v) => sum + v.trafficAllocation, 0);
    setConfig(prev => ({ ...prev, totalTrafficAllocation: totalAllocation }));
  }, [config.variants]);

  useEffect(() => {
    if (config.variants.length >= 2) {
      const analysisResult = performDesignAnalysis();
      setAnalysis(analysisResult);
    }
  }, [config, dailyTraffic, costPerVisitor]);

  return (
    <div className="space-y-6">
      {/* Experiment Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Experiment Designer
          </CardTitle>
          <CardDescription>
            Design and configure your A/B test experiment with multiple variants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Experiment Name</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Homepage CTA Button Test"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the experiment..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hypothesis">Hypothesis</Label>
                <Textarea
                  id="hypothesis"
                  value={config.hypothesis}
                  onChange={(e) => setConfig(prev => ({ ...prev, hypothesis: e.target.value }))}
                  placeholder="We believe that changing X will result in Y because..."
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryMetric">Primary Metric</Label>
                <Select 
                  value={config.primaryMetric} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, primaryMetric: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIMARY_METRICS.map(metric => (
                      <SelectItem key={metric.value} value={metric.value}>
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min. Detectable Effect (%)</Label>
                  <Input
                    type="number"
                    value={config.minimumDetectableEffect}
                    onChange={(e) => setConfig(prev => ({ ...prev, minimumDetectableEffect: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Power (%)</Label>
                  <Select 
                    value={config.power.toString()} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, power: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POWER_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Significance Level (%)</Label>
                <Select 
                  value={config.significance.toString()} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, significance: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNIFICANCE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="successCriteria">Success Criteria</Label>
                <Textarea
                  id="successCriteria"
                  value={config.successCriteria}
                  onChange={(e) => setConfig(prev => ({ ...prev, successCriteria: e.target.value }))}
                  placeholder="Define what constitutes a successful outcome..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variants Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Experiment Variants</CardTitle>
          <CardDescription>Configure your test variants and traffic allocation</CardDescription>
        </CardHeader>
        <CardContent>
          <VariantConfig config={config} onUpdateConfig={setConfig} />
        </CardContent>
      </Card>

      {/* Settings and Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Traffic & Cost Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dailyTraffic">Daily Traffic</Label>
              <Input
                id="dailyTraffic"
                type="number"
                value={dailyTraffic}
                onChange={(e) => setDailyTraffic(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPerVisitor">Cost per Visitor ($)</Label>
              <Input
                id="costPerVisitor"
                type="number"
                step="0.01"
                value={costPerVisitor}
                onChange={(e) => setCostPerVisitor(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions & Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={exportConfig} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Configuration
            </Button>
            <Button onClick={copyToClipboard} variant="outline" className="w-full">
              <Copy className="h-4 w-4 mr-2" />
              Copy Configuration
            </Button>
            
            {analysis && (
              <div className="space-y-3 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Sample Size</div>
                    <div>{analysis.totalSampleSize.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Duration (days)</div>
                    <div>{analysis.expectedDuration}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Estimated Cost</div>
                    <div>${analysis.estimatedCost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Adjusted α</div>
                    <div>{analysis.multipleComparisonsAdjustment.toFixed(4)}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Traffic Allocation Visualization */}
      {config.variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Traffic Allocation</CardTitle>
            <CardDescription>Visual breakdown of variant traffic distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={config.variants.map(v => ({ 
                      name: v.name, 
                      value: v.trafficAllocation,
                      color: v.isControl ? '#3b82f6' : `hsl(${Math.random() * 360}, 70%, 50%)`
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {config.variants.map((variant, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={variant.isControl ? '#3b82f6' : `hsl(${index * 137.5}, 70%, 50%)`} 
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}