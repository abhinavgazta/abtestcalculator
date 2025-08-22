import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { BarChart3, TrendingUp, Target, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface PowerAnalysisResult {
  power: number;
  sampleSize: number;
  effectSize: number;
  alpha: number;
  beta: number;
  powerCurve: Array<{ effectSize: number; power: number }>;
  sampleSizeCurve: Array<{ sampleSize: number; power: number }>;
}

export function PowerAnalysisCalculator() {
  const [analysisType, setAnalysisType] = useState<string>('power');
  const [baselineRate, setBaselineRate] = useState<number>(5);
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [effectSize, setEffectSize] = useState<number>(20);
  const [power, setPower] = useState<number>(80);
  const [significance, setSignificance] = useState<number>(95);
  const [testType, setTestType] = useState<string>('two-tailed');
  
  const [results, setResults] = useState<PowerAnalysisResult | null>(null);

  // Statistical functions
  const normalInverse = (p: number): number => {
    // Approximation of inverse normal distribution
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q, r, x;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      x = (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q / (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    }

    return x;
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

  const calculatePower = (n: number, effect: number, alpha: number): number => {
    const p1 = baselineRate / 100;
    const p2 = p1 * (1 + effect / 100);
    
    const pooledP = (p1 + p2) / 2;
    const se = Math.sqrt(pooledP * (1 - pooledP) * (2 / n));
    
    const z_alpha = normalInverse(1 - alpha / (testType === 'two-tailed' ? 2 : 1));
    const z_beta = (Math.abs(p2 - p1) - z_alpha * se) / Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / n);
    
    return normalCDF(z_beta) * 100;
  };

  const calculateSampleSize = (targetPower: number, effect: number, alpha: number): number => {
    const p1 = baselineRate / 100;
    const p2 = p1 * (1 + effect / 100);
    
    const z_alpha = normalInverse(1 - alpha / (testType === 'two-tailed' ? 2 : 1));
    const z_beta = normalInverse(targetPower / 100);
    
    const numerator = Math.pow(z_alpha * Math.sqrt(2 * p1 * (1 - p1)) + z_beta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
    const denominator = Math.pow(p2 - p1, 2);
    
    return Math.ceil(numerator / denominator);
  };

  const calculateMinimumEffect = (n: number, targetPower: number, alpha: number): number => {
    // Iterative approach to find minimum detectable effect
    let minEffect = 1;
    let maxEffect = 100;
    let iterations = 0;
    const maxIterations = 50;
    
    while (maxEffect - minEffect > 0.1 && iterations < maxIterations) {
      const midEffect = (minEffect + maxEffect) / 2;
      const calculatedPower = calculatePower(n, midEffect, alpha);
      
      if (calculatedPower < targetPower) {
        minEffect = midEffect;
      } else {
        maxEffect = midEffect;
      }
      iterations++;
    }
    
    return (minEffect + maxEffect) / 2;
  };

  const generatePowerCurve = (): Array<{ effectSize: number; power: number }> => {
    const curve = [];
    for (let effect = 1; effect <= 50; effect += 2) {
      const power = calculatePower(sampleSize, effect, (100 - significance) / 100);
      curve.push({ effectSize: effect, power });
    }
    return curve;
  };

  const generateSampleSizeCurve = (): Array<{ sampleSize: number; power: number }> => {
    const curve = [];
    for (let n = 100; n <= 5000; n += 100) {
      const power = calculatePower(n, effectSize, (100 - significance) / 100);
      curve.push({ sampleSize: n, power });
    }
    return curve;
  };

  const performAnalysis = (): PowerAnalysisResult => {
    const alpha = (100 - significance) / 100;
    const beta = (100 - power) / 100;
    
    let calculatedPower = power;
    let calculatedSampleSize = sampleSize;
    let calculatedEffectSize = effectSize;
    
    switch (analysisType) {
      case 'power':
        calculatedPower = calculatePower(sampleSize, effectSize, alpha);
        break;
      case 'sample-size':
        calculatedSampleSize = calculateSampleSize(power, effectSize, alpha);
        break;
      case 'effect-size':
        calculatedEffectSize = calculateMinimumEffect(sampleSize, power, alpha);
        break;
    }
    
    return {
      power: calculatedPower,
      sampleSize: calculatedSampleSize,
      effectSize: calculatedEffectSize,
      alpha,
      beta: (100 - calculatedPower) / 100,
      powerCurve: generatePowerCurve(),
      sampleSizeCurve: generateSampleSizeCurve()
    };
  };

  useEffect(() => {
    if (baselineRate && (sampleSize || power || effectSize)) {
      const result = performAnalysis();
      setResults(result);
    }
  }, [analysisType, baselineRate, sampleSize, effectSize, power, significance, testType]);

  const getPowerColor = (power: number): string => {
    if (power >= 80) return "text-green-600";
    if (power >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getPowerBadgeVariant = (power: number) => {
    if (power >= 80) return "default";
    if (power >= 70) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Power Analysis Configuration
          </CardTitle>
          <CardDescription>
            Analyze the relationship between sample size, effect size, and statistical power
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Analysis Type */}
            <div className="space-y-4">
              <h4>Analysis Type</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Calculate</Label>
                  <Select value={analysisType} onValueChange={setAnalysisType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="power">Statistical Power</SelectItem>
                      <SelectItem value="sample-size">Sample Size</SelectItem>
                      <SelectItem value="effect-size">Minimum Effect Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Test Type</Label>
                  <Select value={testType} onValueChange={setTestType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two-tailed">Two-tailed</SelectItem>
                      <SelectItem value="one-tailed">One-tailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Test Parameters */}
            <div className="space-y-4">
              <h4>Test Parameters</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Baseline Rate (%)</Label>
                  <Input
                    type="number"
                    value={baselineRate}
                    onChange={(e) => setBaselineRate(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Significance Level (%)</Label>
                  <Select value={significance.toString()} onValueChange={(value) => setSignificance(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90%</SelectItem>
                      <SelectItem value="95">95%</SelectItem>
                      <SelectItem value="99">99%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {analysisType !== 'sample-size' && (
                  <div className="space-y-2">
                    <Label>Sample Size per Variant</Label>
                    <Input
                      type="number"
                      value={sampleSize}
                      onChange={(e) => setSampleSize(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Variable Parameters */}
            <div className="space-y-4">
              <h4>Target Values</h4>
              <div className="space-y-3">
                {analysisType !== 'power' && (
                  <div className="space-y-2">
                    <Label>Target Power (%)</Label>
                    <Select value={power.toString()} onValueChange={(value) => setPower(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="70">70%</SelectItem>
                        <SelectItem value="80">80%</SelectItem>
                        <SelectItem value="90">90%</SelectItem>
                        <SelectItem value="95">95%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {analysisType !== 'effect-size' && (
                  <div className="space-y-2">
                    <Label>Effect Size (%)</Label>
                    <Input
                      type="number"
                      value={effectSize}
                      onChange={(e) => setEffectSize(Number(e.target.value))}
                    />
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
          {/* Key Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Power Analysis Results
              </CardTitle>
              <CardDescription>
                Statistical analysis based on your parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="result-card">
                  <div className={`value ${getPowerColor(results.power)}`}>
                    {results.power.toFixed(1)}%
                  </div>
                  <div className="label">Statistical Power</div>
                </div>
                <div className="result-card">
                  <div className="value">{results.sampleSize.toLocaleString()}</div>
                  <div className="label">Sample Size</div>
                </div>
                <div className="result-card">
                  <div className="value">{results.effectSize.toFixed(1)}%</div>
                  <div className="label">Effect Size</div>
                </div>
                <div className="result-card">
                  <div className="value">{(results.alpha * 100).toFixed(1)}%</div>
                  <div className="label">Alpha (Type I Error)</div>
                </div>
              </div>

              {/* Power Assessment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4>Power Assessment</h4>
                  <Badge variant={getPowerBadgeVariant(results.power)}>
                    {results.power >= 80 ? "Excellent" : results.power >= 70 ? "Adequate" : "Poor"}
                  </Badge>
                </div>
                
                {results.power >= 80 ? (
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      Excellent statistical power ({results.power.toFixed(1)}%). Your test has a high probability of detecting the specified effect if it exists.
                    </AlertDescription>
                  </Alert>
                ) : results.power >= 70 ? (
                  <Alert>
                    <AlertDescription>
                      Adequate statistical power ({results.power.toFixed(1)}%). Consider increasing sample size for more reliable results.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Low statistical power ({results.power.toFixed(1)}%). High risk of missing a real effect. Increase sample size or accept larger effect size.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm">
                      <strong>Type I Error (α):</strong> {(results.alpha * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Probability of false positive (rejecting true null hypothesis)
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm">
                      <strong>Type II Error (β):</strong> {(results.beta * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Probability of false negative (accepting false null hypothesis)
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Power vs Effect Size */}
            <Card>
              <CardHeader>
                <CardTitle>Power vs Effect Size</CardTitle>
                <CardDescription>How power changes with different effect sizes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.powerCurve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="effectSize" 
                        label={{ value: 'Effect Size (%)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Power (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value.toFixed(1)}%`, 'Power']}
                        labelFormatter={(label) => `Effect Size: ${label}%`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="power" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                      />
                      <Line 
                        type="monotone" 
                        dataKey={() => 80} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Power vs Sample Size */}
            <Card>
              <CardHeader>
                <CardTitle>Power vs Sample Size</CardTitle>
                <CardDescription>How power changes with different sample sizes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.sampleSizeCurve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="sampleSize" 
                        label={{ value: 'Sample Size', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Power (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${value.toFixed(1)}%`, 'Power']}
                        labelFormatter={(label) => `Sample Size: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="power" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}