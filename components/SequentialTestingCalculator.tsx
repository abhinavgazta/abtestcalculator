import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Zap, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface SequentialBounds {
  upper: number;
  lower: number;
  futility: number;
}

interface SequentialResult {
  currentZ: number;
  currentP: number;
  bounds: SequentialBounds;
  recommendation: 'continue' | 'stop_success' | 'stop_futility' | 'stop_harm';
  probabilityOfSuccess: number;
  expectedSampleSize: number;
  boundaryHistory: Array<{
    n: number;
    upperBound: number;
    lowerBound: number;
    futilityBound: number;
    zScore?: number;
  }>;
}

export function SequentialTestingCalculator() {
  const [currentSampleSize, setCurrentSampleSize] = useState<number>(500);
  const [maxSampleSize, setMaxSampleSize] = useState<number>(2000);
  const [controlConversions, setControlConversions] = useState<number>(25);
  const [treatmentConversions, setTreatmentConversions] = useState<number>(35);
  const [alpha, setAlpha] = useState<number>(0.05);
  const [beta, setBeta] = useState<number>(0.2);
  const [minimumEffect, setMinimumEffect] = useState<number>(20);
  const [enableFutility, setEnableFutility] = useState<boolean>(true);
  const [enableHarm, setEnableHarm] = useState<boolean>(true);
  const [boundaryType, setBoundaryType] = useState<string>('obrien-fleming');
  
  const [results, setResults] = useState<SequentialResult | null>(null);

  // O'Brien-Fleming boundary function
  const getOBrienFlemingBound = (t: number, alpha: number): number => {
    // t is the information fraction (current/max sample size)
    return Math.sqrt(-2 * Math.log(alpha / 2)) / Math.sqrt(t);
  };

  // Pocock boundary function
  const getPocockBound = (alpha: number, maxAnalyses: number): number => {
    // Approximation for Pocock boundaries
    const c = 2.024; // For alpha = 0.05 and 5 analyses
    return c;
  };

  // Wang-Tsiatis boundary function
  const getWangTsiatiBound = (t: number, alpha: number, delta: number = 0.25): number => {
    const phi = normalInverse(1 - alpha / 2);
    return phi * Math.pow(t, delta - 0.5);
  };

  const normalInverse = (p: number): number => {
    // Approximation of inverse normal distribution
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    
    const sign = p < 0.5 ? -1 : 1;
    const r = p < 0.5 ? p : 1 - p;
    
    const t = Math.sqrt(-2 * Math.log(r));
    let x = t - ((a[2] + a[1] * t) / (1 + b[1] * t + b[2] * t * t));
    
    return sign * x;
  };

  const normalCDF = (x: number): number => {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
  };

  const erf = (x: number): number => {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  };

  const calculateSequentialBounds = (n: number, nMax: number): SequentialBounds => {
    const t = n / nMax; // Information fraction
    let upperBound: number;
    let lowerBound: number;
    
    switch (boundaryType) {
      case 'obrien-fleming':
        upperBound = getOBrienFlemingBound(t, alpha);
        lowerBound = -upperBound;
        break;
      case 'pocock':
        upperBound = getPocockBound(alpha, 5);
        lowerBound = -upperBound;
        break;
      case 'wang-tsiatis':
        upperBound = getWangTsiatiBound(t, alpha);
        lowerBound = -upperBound;
        break;
      default:
        upperBound = normalInverse(1 - alpha / 2);
        lowerBound = -upperBound;
    }
    
    // Futility bound (conditional power approach)
    const futilityBound = enableFutility ? normalInverse(beta) : -Infinity;
    
    return { upper: upperBound, lower: lowerBound, futility: futilityBound };
  };

  const calculateCurrentZScore = (): number => {
    const n = currentSampleSize / 2; // per variant
    const pControl = controlConversions / n;
    const pTreatment = treatmentConversions / n;
    
    const pooledP = (controlConversions + treatmentConversions) / currentSampleSize;
    const se = Math.sqrt(pooledP * (1 - pooledP) * (2 / n));
    
    if (se === 0) return 0;
    return (pTreatment - pControl) / se;
  };

  const calculateProbabilityOfSuccess = (currentZ: number, bounds: SequentialBounds): number => {
    // Approximate probability of eventually crossing upper boundary
    // This is a simplified calculation
    const remainingInformation = 1 - (currentSampleSize / maxSampleSize);
    const drift = currentZ * Math.sqrt(currentSampleSize / maxSampleSize);
    
    if (remainingInformation <= 0) {
      return currentZ > bounds.upper ? 1 : 0;
    }
    
    // Use normal approximation
    const adjustedUpperBound = bounds.upper * Math.sqrt(1 - remainingInformation);
    const adjustedZ = currentZ + drift * Math.sqrt(remainingInformation);
    
    return 1 - normalCDF(adjustedUpperBound - adjustedZ);
  };

  const generateBoundaryHistory = (): Array<{
    n: number;
    upperBound: number;
    lowerBound: number;
    futilityBound: number;
    zScore?: number;
  }> => {
    const history = [];
    const steps = 20;
    
    for (let i = 1; i <= steps; i++) {
      const n = (maxSampleSize * i) / steps;
      const bounds = calculateSequentialBounds(n, maxSampleSize);
      
      const point: any = {
        n,
        upperBound: bounds.upper,
        lowerBound: bounds.lower,
        futilityBound: bounds.futility
      };
      
      // Add current z-score at current sample size
      if (Math.abs(n - currentSampleSize) < maxSampleSize / steps) {
        point.zScore = calculateCurrentZScore();
      }
      
      history.push(point);
    }
    
    return history;
  };

  const performSequentialAnalysis = (): SequentialResult => {
    const currentZ = calculateCurrentZScore();
    const bounds = calculateSequentialBounds(currentSampleSize, maxSampleSize);
    const currentP = 2 * (1 - normalCDF(Math.abs(currentZ)));
    
    let recommendation: SequentialResult['recommendation'] = 'continue';
    
    if (currentZ >= bounds.upper) {
      recommendation = 'stop_success';
    } else if (currentZ <= bounds.lower) {
      recommendation = enableHarm ? 'stop_harm' : 'continue';
    } else if (enableFutility && currentZ <= bounds.futility) {
      recommendation = 'stop_futility';
    }
    
    const probabilityOfSuccess = calculateProbabilityOfSuccess(currentZ, bounds);
    
    // Estimate expected sample size (simplified)
    const expectedSampleSize = currentSampleSize + (maxSampleSize - currentSampleSize) * (1 - probabilityOfSuccess);
    
    return {
      currentZ,
      currentP,
      bounds,
      recommendation,
      probabilityOfSuccess,
      expectedSampleSize,
      boundaryHistory: generateBoundaryHistory()
    };
  };

  useEffect(() => {
    if (currentSampleSize && controlConversions >= 0 && treatmentConversions >= 0) {
      const result = performSequentialAnalysis();
      setResults(result);
    }
  }, [currentSampleSize, maxSampleSize, controlConversions, treatmentConversions, alpha, beta, minimumEffect, enableFutility, enableHarm, boundaryType]);

  const getRecommendationColor = (recommendation: string): string => {
    switch (recommendation) {
      case 'stop_success': return 'text-green-600';
      case 'stop_harm': return 'text-red-600';
      case 'stop_futility': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'stop_success': return <CheckCircle className="h-4 w-4" />;
      case 'stop_harm': return <AlertTriangle className="h-4 w-4" />;
      case 'stop_futility': return <AlertTriangle className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getRecommendationText = (recommendation: string): string => {
    switch (recommendation) {
      case 'stop_success': return 'Stop for Success';
      case 'stop_harm': return 'Stop for Harm';
      case 'stop_futility': return 'Stop for Futility';
      default: return 'Continue Testing';
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sequential Testing Configuration
          </CardTitle>
          <CardDescription>
            Monitor your test continuously with adaptive stopping boundaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Data */}
            <div className="space-y-4">
              <h4>Current Test Data</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Current Sample Size</Label>
                  <Input
                    type="number"
                    value={currentSampleSize}
                    onChange={(e) => setCurrentSampleSize(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Control Conversions</Label>
                  <Input
                    type="number"
                    value={controlConversions}
                    onChange={(e) => setControlConversions(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Treatment Conversions</Label>
                  <Input
                    type="number"
                    value={treatmentConversions}
                    onChange={(e) => setTreatmentConversions(Number(e.target.value))}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Current rates: Control {((controlConversions / (currentSampleSize / 2)) * 100).toFixed(2)}%, 
                  Treatment {((treatmentConversions / (currentSampleSize / 2)) * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Design Parameters */}
            <div className="space-y-4">
              <h4>Design Parameters</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Maximum Sample Size</Label>
                  <Input
                    type="number"
                    value={maxSampleSize}
                    onChange={(e) => setMaxSampleSize(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type I Error (α)</Label>
                  <Select value={alpha.toString()} onValueChange={(value) => setAlpha(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">0.01 (1%)</SelectItem>
                      <SelectItem value="0.05">0.05 (5%)</SelectItem>
                      <SelectItem value="0.10">0.10 (10%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type II Error (β)</Label>
                  <Select value={beta.toString()} onValueChange={(value) => setBeta(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.1">0.10 (10%)</SelectItem>
                      <SelectItem value="0.2">0.20 (20%)</SelectItem>
                      <SelectItem value="0.3">0.30 (30%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Minimum Effect (%)</Label>
                  <Input
                    type="number"
                    value={minimumEffect}
                    onChange={(e) => setMinimumEffect(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4">
              <h4>Boundary Type & Options</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Boundary Type</Label>
                  <Select value={boundaryType} onValueChange={setBoundaryType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="obrien-fleming">O'Brien-Fleming</SelectItem>
                      <SelectItem value="pocock">Pocock</SelectItem>
                      <SelectItem value="wang-tsiatis">Wang-Tsiatis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="futility">Enable Futility Monitoring</Label>
                    <Switch
                      id="futility"
                      checked={enableFutility}
                      onCheckedChange={setEnableFutility}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="harm">Enable Harm Monitoring</Label>
                    <Switch
                      id="harm"
                      checked={enableHarm}
                      onCheckedChange={setEnableHarm}
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>O'Brien-Fleming:</strong> Conservative early, liberal late</p>
                  <p><strong>Pocock:</strong> Constant boundary</p>
                  <p><strong>Wang-Tsiatis:</strong> Flexible spending</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getRecommendationIcon(results.recommendation)}
                Test Status & Recommendation
              </CardTitle>
              <CardDescription>
                Current analysis based on {currentSampleSize.toLocaleString()} observations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="result-card">
                  <div className={`value ${getRecommendationColor(results.recommendation)}`}>
                    {getRecommendationText(results.recommendation)}
                  </div>
                  <div className="label">Recommendation</div>
                </div>
                <div className="result-card">
                  <div className="value">{results.currentZ.toFixed(2)}</div>
                  <div className="label">Current Z-Score</div>
                </div>
                <div className="result-card">
                  <div className="value">{results.currentP.toFixed(4)}</div>
                  <div className="label">Current P-Value</div>
                </div>
                <div className="result-card">
                  <div className="value">{(results.probabilityOfSuccess * 100).toFixed(1)}%</div>
                  <div className="label">Success Probability</div>
                </div>
              </div>

              {/* Boundary Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm mb-1">
                    <strong>Efficacy Boundary:</strong> {results.bounds.upper.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {results.currentZ >= results.bounds.upper ? "✓ Crossed" : "Not crossed"}
                  </div>
                </div>
                
                {enableFutility && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm mb-1">
                      <strong>Futility Boundary:</strong> {results.bounds.futility.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {results.currentZ <= results.bounds.futility ? "✓ Crossed" : "Not crossed"}
                    </div>
                  </div>
                )}
                
                {enableHarm && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-sm mb-1">
                      <strong>Harm Boundary:</strong> {results.bounds.lower.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {results.currentZ <= results.bounds.lower ? "✓ Crossed" : "Not crossed"}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendation Details */}
              <div className="mt-6">
                {results.recommendation === 'continue' ? (
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      Continue testing. Expected total sample size: {Math.round(results.expectedSampleSize).toLocaleString()}. 
                      Probability of eventual success: {(results.probabilityOfSuccess * 100).toFixed(1)}%.
                    </AlertDescription>
                  </Alert>
                ) : results.recommendation === 'stop_success' ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Stop for efficacy! The treatment shows statistically significant improvement. 
                      You can confidently implement the treatment.
                    </AlertDescription>
                  </Alert>
                ) : results.recommendation === 'stop_futility' ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Stop for futility. The probability of finding a significant effect is very low. 
                      Consider trying a different approach.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Stop for harm. The treatment may have a negative effect. 
                      Do not implement and investigate potential issues.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Boundary Plot */}
          <Card>
            <CardHeader>
              <CardTitle>Sequential Boundaries</CardTitle>
              <CardDescription>Test boundaries and current position</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.boundaryHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="n" 
                      label={{ value: 'Sample Size', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Z-Score', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        value.toFixed(2), 
                        name === 'upperBound' ? 'Efficacy Boundary' :
                        name === 'lowerBound' ? 'Harm Boundary' :
                        name === 'futilityBound' ? 'Futility Boundary' : 
                        name === 'zScore' ? 'Current Z-Score' : name
                      ]}
                    />
                    
                    {/* Boundaries */}
                    <Line 
                      type="monotone" 
                      dataKey="upperBound" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                      name="Efficacy Boundary"
                    />
                    {enableHarm && (
                      <Line 
                        type="monotone" 
                        dataKey="lowerBound" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={false}
                        name="Harm Boundary"
                      />
                    )}
                    {enableFutility && (
                      <Line 
                        type="monotone" 
                        dataKey="futilityBound" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Futility Boundary"
                      />
                    )}
                    
                    {/* Current position */}
                    <Line 
                      type="monotone" 
                      dataKey="zScore" 
                      stroke="#3b82f6" 
                      strokeWidth={4}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                      connectNulls={false}
                      name="Current Z-Score"
                    />
                    
                    {/* Reference lines */}
                    <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
                    <ReferenceLine x={currentSampleSize} stroke="#6b7280" strokeDasharray="2 2" />
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