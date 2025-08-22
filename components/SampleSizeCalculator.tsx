import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface SampleSizeResult {
  sampleSizePerVariant: number;
  totalSampleSize: number;
  expectedDuration: number;
  minimumDetectableEffect: number;
  actualPower: number;
  confidenceInterval: [number, number];
}

export function SampleSizeCalculator() {
  const [baselineRate, setBaselineRate] = useState<number>(5);
  const [minimumDetectableEffect, setMinimumDetectableEffect] = useState<number>(20);
  const [power, setPower] = useState<number>(80);
  const [significance, setSignificance] = useState<number>(95);
  const [trafficAllocation, setTrafficAllocation] = useState<number>(50);
  const [dailyTraffic, setDailyTraffic] = useState<number>(1000);
  const [testType, setTestType] = useState<string>('conversion');
  const [variants, setVariants] = useState<number>(2);
  
  const [results, setResults] = useState<SampleSizeResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

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

  const calculateSampleSize = (): SampleSizeResult => {
    const alpha = (100 - significance) / 100;
    const beta = (100 - power) / 100;
    
    const z_alpha = normalInverse(1 - alpha / 2);
    const z_beta = normalInverse(1 - beta);
    
    const p1 = baselineRate / 100;
    const effectSize = minimumDetectableEffect / 100;
    const p2 = testType === 'conversion' ? p1 * (1 + effectSize) : p1 + effectSize;
    
    const pooledP = (p1 + p2) / 2;
    const pooledVariance = pooledP * (1 - pooledP);
    
    // Sample size calculation for proportions
    const n = (Math.pow(z_alpha * Math.sqrt(2 * pooledVariance) + z_beta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2)) / Math.pow(p2 - p1, 2);
    
    const sampleSizePerVariant = Math.ceil(n);
    const totalSampleSize = sampleSizePerVariant * variants;
    
    // Adjust for traffic allocation
    const adjustedSampleSize = Math.ceil(sampleSizePerVariant / (trafficAllocation / 100));
    const expectedDuration = Math.ceil(adjustedSampleSize / dailyTraffic);
    
    // Calculate actual power with the calculated sample size
    const actualZ = Math.abs(p2 - p1) / Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / sampleSizePerVariant);
    const actualPower = (1 - normalCDF(z_alpha - actualZ)) * 100;
    
    // Confidence interval for effect size
    const se = Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / sampleSizePerVariant);
    const margin = z_alpha * se;
    const confidenceInterval: [number, number] = [
      ((p2 - p1) - margin) * 100,
      ((p2 - p1) + margin) * 100
    ];
    
    return {
      sampleSizePerVariant: adjustedSampleSize,
      totalSampleSize: adjustedSampleSize * variants,
      expectedDuration,
      minimumDetectableEffect: Math.abs(p2 - p1) * 100,
      actualPower,
      confidenceInterval
    };
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

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const result = calculateSampleSize();
      setResults(result);
      setIsCalculating(false);
    }, 500);
  };

  useEffect(() => {
    if (baselineRate && minimumDetectableEffect && power && significance) {
      handleCalculate();
    }
  }, [baselineRate, minimumDetectableEffect, power, significance, trafficAllocation, dailyTraffic, testType, variants]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Input Parameters */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Test Parameters</CardTitle>
            <CardDescription>Configure your A/B test settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversion">Conversion Rate</SelectItem>
                  <SelectItem value="revenue">Revenue per User</SelectItem>
                  <SelectItem value="retention">Retention Rate</SelectItem>
                  <SelectItem value="engagement">Engagement Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baselineRate">Baseline Rate (%)</Label>
              <Input
                id="baselineRate"
                type="number"
                value={baselineRate}
                onChange={(e) => setBaselineRate(Number(e.target.value))}
                placeholder="e.g., 5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mde">Minimum Detectable Effect (%)</Label>
              <Input
                id="mde"
                type="number"
                value={minimumDetectableEffect}
                onChange={(e) => setMinimumDetectableEffect(Number(e.target.value))}
                placeholder="e.g., 20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="power">Power (%)</Label>
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

              <div className="space-y-2">
                <Label htmlFor="significance">Significance (%)</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="variants">Number of Variants</Label>
              <Select value={variants.toString()} onValueChange={(value) => setVariants(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 (A/B)</SelectItem>
                  <SelectItem value="3">3 (A/B/C)</SelectItem>
                  <SelectItem value="4">4 (A/B/C/D)</SelectItem>
                  <SelectItem value="5">5 variants</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="trafficAllocation">Traffic Allocation (%)</Label>
              <Input
                id="trafficAllocation"
                type="number"
                value={trafficAllocation}
                onChange={(e) => setTrafficAllocation(Number(e.target.value))}
                placeholder="e.g., 50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyTraffic">Daily Traffic</Label>
              <Input
                id="dailyTraffic"
                type="number"
                value={dailyTraffic}
                onChange={(e) => setDailyTraffic(Number(e.target.value))}
                placeholder="e.g., 1000"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="lg:col-span-2">
        <div className="space-y-6">
          {/* Main Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sample Size Results
              </CardTitle>
              <CardDescription>Statistical calculations for your A/B test</CardDescription>
            </CardHeader>
            <CardContent>
              {results ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="result-card">
                    <div className="value">{results.sampleSizePerVariant.toLocaleString()}</div>
                    <div className="label">Per Variant</div>
                  </div>
                  <div className="result-card">
                    <div className="value">{results.totalSampleSize.toLocaleString()}</div>
                    <div className="label">Total Sample</div>
                  </div>
                  <div className="result-card">
                    <div className="value">{results.expectedDuration}</div>
                    <div className="label">Days to Complete</div>
                  </div>
                  <div className="result-card">
                    <div className="value">{results.actualPower.toFixed(1)}%</div>
                    <div className="label">Actual Power</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {isCalculating ? "Calculating..." : "Enter parameters to see results"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistical Insights */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Statistical Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4>Effect Size Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Minimum detectable effect: <Badge variant="outline">{results.minimumDetectableEffect.toFixed(2)}%</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {results.minimumDetectableEffect < 5 ? "Small effect - requires large sample" : 
                       results.minimumDetectableEffect < 15 ? "Medium effect - moderate sample needed" : 
                       "Large effect - smaller sample sufficient"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4>Confidence Interval</h4>
                    <p className="text-sm text-muted-foreground">
                      Expected range: <Badge variant="outline">
                        {results.confidenceInterval[0].toFixed(2)}% to {results.confidenceInterval[1].toFixed(2)}%
                      </Badge>
                    </p>
                  </div>
                </div>

                {results.expectedDuration > 30 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Long test duration detected ({results.expectedDuration} days). Consider increasing traffic allocation or accepting a larger minimum detectable effect.
                    </AlertDescription>
                  </Alert>
                )}

                {results.actualPower < 80 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Statistical power is below recommended 80%. Consider increasing sample size or effect size.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}