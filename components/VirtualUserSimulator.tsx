import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Play, Pause, RotateCcw, Users, Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SimulationParameters {
  baselineRate: number;
  treatmentEffect: number;
  sampleSizePerVariant: number;
  numberOfSimulations: number;
  userBehaviorPattern: string;
  seasonality: boolean;
  weekendEffect: number;
}

interface SimulationResult {
  day: number;
  controlConversions: number;
  treatmentConversions: number;
  controlRate: number;
  treatmentRate: number;
  pValue: number;
  isSignificant: boolean;
  cumulativeControlConversions: number;
  cumulativeTreatmentConversions: number;
}

interface SimulationSummary {
  significantResults: number;
  averagePValue: number;
  powerAchieved: number;
  falsePositiveRate: number;
  averageEffectSize: number;
  results: SimulationResult[];
}

export function VirtualUserSimulator() {
  const [parameters, setParameters] = useState<SimulationParameters>({
    baselineRate: 5,
    treatmentEffect: 20,
    sampleSizePerVariant: 1000,
    numberOfSimulations: 100,
    userBehaviorPattern: 'uniform',
    seasonality: false,
    weekendEffect: 10
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SimulationSummary | null>(null);
  const [currentSimulation, setCurrentSimulation] = useState(0);

  // Generate random user behavior based on pattern
  const generateUserBehavior = (day: number, pattern: string): number => {
    let baseMultiplier = 1;
    
    switch (pattern) {
      case 'increasing':
        baseMultiplier = 0.5 + (day * 0.5) / 30; // Increases over 30 days
        break;
      case 'decreasing':
        baseMultiplier = 1.5 - (day * 0.5) / 30; // Decreases over 30 days
        break;
      case 'seasonal':
        baseMultiplier = 1 + 0.3 * Math.sin((day * 2 * Math.PI) / 7); // Weekly pattern
        break;
      case 'weekend_effect':
        const dayOfWeek = day % 7;
        baseMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1 + parameters.weekendEffect / 100 : 1;
        break;
      default:
        baseMultiplier = 1;
    }

    return Math.max(0.1, baseMultiplier);
  };

  // Binomial random generator
  const binomialRandom = (n: number, p: number): number => {
    let successes = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) successes++;
    }
    return successes;
  };

  // Calculate p-value using normal approximation
  const calculatePValue = (conversionsA: number, visitorsA: number, conversionsB: number, visitorsB: number): number => {
    const pA = conversionsA / visitorsA;
    const pB = conversionsB / visitorsB;
    
    const pooledP = (conversionsA + conversionsB) / (visitorsA + visitorsB);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/visitorsA + 1/visitorsB));
    
    if (se === 0) return 1;
    
    const zScore = Math.abs(pB - pA) / se;
    
    // Normal CDF approximation
    const erfcApprox = (x: number) => {
      const a = 0.3275911;
      const p = 0.2316419;
      const b1 = 0.254829592;
      const b2 = -0.284496736;
      const b3 = 1.421413741;
      const b4 = -1.453152027;
      const b5 = 1.061405429;
      
      const t = 1 / (1 + a * Math.abs(x));
      const erf = 1 - (b1*t + b2*t*t + b3*t*t*t + b4*t*t*t*t + b5*t*t*t*t*t) * Math.exp(-x*x);
      
      return x >= 0 ? 1 - erf : erf - 1;
    };
    
    return erfcApprox(zScore / Math.sqrt(2));
  };

  // Run simulation
  const runSimulation = async () => {
    setIsRunning(true);
    setResults(null);
    setProgress(0);
    
    const allSimulations: SimulationResult[][] = [];
    
    for (let sim = 0; sim < parameters.numberOfSimulations; sim++) {
      setCurrentSimulation(sim + 1);
      setProgress((sim / parameters.numberOfSimulations) * 100);
      
      const simulationResults: SimulationResult[] = [];
      let cumulativeControlConversions = 0;
      let cumulativeTreatmentConversions = 0;
      let cumulativeControlVisitors = 0;
      let cumulativeTreatmentVisitors = 0;
      
      const dailyVisitors = Math.floor(parameters.sampleSizePerVariant / 30); // Spread over 30 days
      
      for (let day = 1; day <= 30; day++) {
        const behaviorMultiplier = generateUserBehavior(day, parameters.userBehaviorPattern);
        const adjustedVisitors = Math.floor(dailyVisitors * behaviorMultiplier);
        
        // Control group
        const controlRate = parameters.baselineRate / 100;
        const controlConversions = binomialRandom(adjustedVisitors, controlRate);
        cumulativeControlConversions += controlConversions;
        cumulativeControlVisitors += adjustedVisitors;
        
        // Treatment group (with effect)
        const treatmentRate = controlRate * (1 + parameters.treatmentEffect / 100);
        const treatmentConversions = binomialRandom(adjustedVisitors, treatmentRate);
        cumulativeTreatmentConversions += treatmentConversions;
        cumulativeTreatmentVisitors += adjustedVisitors;
        
        // Calculate daily statistics
        const dailyControlRate = cumulativeControlVisitors > 0 ? (cumulativeControlConversions / cumulativeControlVisitors) * 100 : 0;
        const dailyTreatmentRate = cumulativeTreatmentVisitors > 0 ? (cumulativeTreatmentConversions / cumulativeTreatmentVisitors) * 100 : 0;
        
        const pValue = calculatePValue(
          cumulativeControlConversions, 
          cumulativeControlVisitors,
          cumulativeTreatmentConversions, 
          cumulativeTreatmentVisitors
        );
        
        simulationResults.push({
          day,
          controlConversions,
          treatmentConversions,
          controlRate: dailyControlRate,
          treatmentRate: dailyTreatmentRate,
          pValue,
          isSignificant: pValue < 0.05,
          cumulativeControlConversions,
          cumulativeTreatmentConversions
        });
      }
      
      allSimulations.push(simulationResults);
      
      // Allow UI to update
      if (sim % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // Calculate summary statistics
    const finalResults = allSimulations.map(sim => sim[sim.length - 1]);
    const significantResults = finalResults.filter(result => result.isSignificant).length;
    const averagePValue = finalResults.reduce((sum, result) => sum + result.pValue, 0) / finalResults.length;
    const powerAchieved = (significantResults / parameters.numberOfSimulations) * 100;
    
    // Calculate false positive rate (assuming no real effect for control)
    const falsePositiveRate = parameters.treatmentEffect === 0 ? powerAchieved : 0;
    
    // Calculate average effect size
    const averageEffectSize = finalResults.reduce((sum, result) => {
      const effectSize = result.treatmentRate - result.controlRate;
      return sum + effectSize;
    }, 0) / finalResults.length;
    
    // Use results from first simulation for visualization
    const visualizationResults = allSimulations[0] || [];
    
    setResults({
      significantResults,
      averagePValue,
      powerAchieved,
      falsePositiveRate,
      averageEffectSize,
      results: visualizationResults
    });
    
    setProgress(100);
    setIsRunning(false);
  };

  const resetSimulation = () => {
    setResults(null);
    setProgress(0);
    setCurrentSimulation(0);
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Virtual User Simulation
          </CardTitle>
          <CardDescription>
            Run Monte Carlo simulations to understand test behavior under different conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Parameters */}
            <div className="space-y-4">
              <h4>Test Parameters</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Baseline Rate (%)</Label>
                  <Input
                    type="number"
                    value={parameters.baselineRate}
                    onChange={(e) => setParameters(prev => ({...prev, baselineRate: Number(e.target.value)}))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Treatment Effect (%)</Label>
                  <Input
                    type="number"
                    value={parameters.treatmentEffect}
                    onChange={(e) => setParameters(prev => ({...prev, treatmentEffect: Number(e.target.value)}))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sample Size per Variant</Label>
                  <Input
                    type="number"
                    value={parameters.sampleSizePerVariant}
                    onChange={(e) => setParameters(prev => ({...prev, sampleSizePerVariant: Number(e.target.value)}))}
                  />
                </div>
              </div>
            </div>

            {/* Simulation Settings */}
            <div className="space-y-4">
              <h4>Simulation Settings</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Number of Simulations</Label>
                  <Select 
                    value={parameters.numberOfSimulations.toString()} 
                    onValueChange={(value) => setParameters(prev => ({...prev, numberOfSimulations: Number(value)}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>User Behavior Pattern</Label>
                  <Select 
                    value={parameters.userBehaviorPattern} 
                    onValueChange={(value) => setParameters(prev => ({...prev, userBehaviorPattern: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uniform">Uniform</SelectItem>
                      <SelectItem value="increasing">Increasing Trend</SelectItem>
                      <SelectItem value="decreasing">Decreasing Trend</SelectItem>
                      <SelectItem value="seasonal">Seasonal Pattern</SelectItem>
                      <SelectItem value="weekend_effect">Weekend Effect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {parameters.userBehaviorPattern === 'weekend_effect' && (
                  <div className="space-y-2">
                    <Label>Weekend Effect (%)</Label>
                    <Input
                      type="number"
                      value={parameters.weekendEffect}
                      onChange={(e) => setParameters(prev => ({...prev, weekendEffect: Number(e.target.value)}))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <h4>Controls</h4>
              <div className="space-y-3">
                <Button 
                  onClick={runSimulation} 
                  disabled={isRunning}
                  className="w-full"
                >
                  {isRunning ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Simulation
                    </>
                  )}
                </Button>
                <Button 
                  onClick={resetSimulation}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                
                {isRunning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{currentSimulation}/{parameters.numberOfSimulations}</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Simulation Results
              </CardTitle>
              <CardDescription>
                Summary of {parameters.numberOfSimulations} simulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="result-card">
                  <div className="value">{results.powerAchieved.toFixed(1)}%</div>
                  <div className="label">Power Achieved</div>
                </div>
                <div className="result-card">
                  <div className="value">{results.significantResults}</div>
                  <div className="label">Significant Results</div>
                </div>
                <div className="result-card">
                  <div className="value">{results.averagePValue.toFixed(4)}</div>
                  <div className="label">Avg P-Value</div>
                </div>
                <div className="result-card">
                  <div className="value">{results.averageEffectSize.toFixed(2)}%</div>
                  <div className="label">Avg Effect Size</div>
                </div>
                <div className="result-card">
                  <div className="value">{results.falsePositiveRate.toFixed(1)}%</div>
                  <div className="label">False Positive Rate</div>
                </div>
              </div>

              {/* Performance Assessment */}
              <div className="space-y-3">
                <h4>Performance Assessment</h4>
                {results.powerAchieved >= 80 ? (
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      Excellent power achieved ({results.powerAchieved.toFixed(1)}%). Your test design is well-powered to detect the specified effect.
                    </AlertDescription>
                  </Alert>
                ) : results.powerAchieved >= 70 ? (
                  <Alert>
                    <AlertDescription>
                      Moderate power achieved ({results.powerAchieved.toFixed(1)}%). Consider increasing sample size for more reliable results.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Low power achieved ({results.powerAchieved.toFixed(1)}%). Increase sample size or effect size for reliable testing.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Test Evolution Over Time</CardTitle>
              <CardDescription>Sample simulation showing how results develop daily</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.results}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        typeof value === 'number' ? value.toFixed(3) : value, 
                        name === 'controlRate' ? 'Control Rate (%)' : 
                        name === 'treatmentRate' ? 'Treatment Rate (%)' : 
                        name === 'pValue' ? 'P-Value' : name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="controlRate" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Control Rate"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="treatmentRate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Treatment Rate"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pValue" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="P-Value"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}