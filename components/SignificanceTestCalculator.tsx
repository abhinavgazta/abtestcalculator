import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface SignificanceResult {
  isSignificant: boolean;
  pValue: number;
  zScore: number;
  confidenceInterval: [number, number];
  effectSize: number;
  relativeImprovement: number;
  conversionRateA: number;
  conversionRateB: number;
  standardError: number;
  powerAchieved: number;
}

export function SignificanceTestCalculator() {
  const [visitorsA, setVisitorsA] = useState<number>(1000);
  const [conversionsA, setConversionsA] = useState<number>(50);
  const [visitorsB, setVisitorsB] = useState<number>(1000);
  const [conversionsB, setConversionsB] = useState<number>(60);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(95);
  
  const [results, setResults] = useState<SignificanceResult | null>(null);

  // Statistical functions
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

  const calculateSignificance = (): SignificanceResult => {
    const pA = conversionsA / visitorsA;
    const pB = conversionsB / visitorsB;
    
    // Pooled proportion for standard error calculation
    const pooledP = (conversionsA + conversionsB) / (visitorsA + visitorsB);
    const pooledSE = Math.sqrt(pooledP * (1 - pooledP) * (1/visitorsA + 1/visitorsB));
    
    // Z-score calculation
    const zScore = (pB - pA) / pooledSE;
    
    // P-value (two-tailed test)
    const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
    
    // Significance threshold
    const alpha = (100 - confidenceLevel) / 100;
    const isSignificant = pValue < alpha;
    
    // Confidence interval for difference in proportions
    const seForCI = Math.sqrt((pA * (1 - pA) / visitorsA) + (pB * (1 - pB) / visitorsB));
    const zCrit = 1.96; // 95% confidence
    const margin = zCrit * seForCI;
    const confidenceInterval: [number, number] = [
      (pB - pA - margin) * 100,
      (pB - pA + margin) * 100
    ];
    
    // Effect size (Cohen's h)
    const effectSize = 2 * (Math.asin(Math.sqrt(pB)) - Math.asin(Math.sqrt(pA)));
    
    // Relative improvement
    const relativeImprovement = pA > 0 ? ((pB - pA) / pA) * 100 : 0;
    
    // Achieved power calculation
    const powerZ = Math.abs(zScore) - 1.96;
    const powerAchieved = normalCDF(powerZ) * 100;
    
    return {
      isSignificant,
      pValue,
      zScore,
      confidenceInterval,
      effectSize,
      relativeImprovement,
      conversionRateA: pA * 100,
      conversionRateB: pB * 100,
      standardError: pooledSE,
      powerAchieved: Math.max(0, Math.min(100, powerAchieved))
    };
  };

  useEffect(() => {
    if (visitorsA && conversionsA >= 0 && visitorsB && conversionsB >= 0) {
      const result = calculateSignificance();
      setResults(result);
    }
  }, [visitorsA, conversionsA, visitorsB, conversionsB, confidenceLevel]);

  const getSignificanceColor = (isSignificant: boolean, pValue: number) => {
    if (isSignificant) return "text-green-600";
    if (pValue < 0.1) return "text-yellow-600";
    return "text-red-600";
  };

  const getEffectSizeInterpretation = (effectSize: number) => {
    const absEffect = Math.abs(effectSize);
    if (absEffect < 0.2) return "Small effect";
    if (absEffect < 0.5) return "Medium effect";
    return "Large effect";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Input Data */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Test Data</CardTitle>
            <CardDescription>Enter your A/B test results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                Variant A (Control)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visitorsA">Visitors</Label>
                  <Input
                    id="visitorsA"
                    type="number"
                    value={visitorsA}
                    onChange={(e) => setVisitorsA(Number(e.target.value))}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conversionsA">Conversions</Label>
                  <Input
                    id="conversionsA"
                    type="number"
                    value={conversionsA}
                    onChange={(e) => setConversionsA(Number(e.target.value))}
                    placeholder="50"
                  />
                </div>
              </div>
              {results && (
                <div className="text-sm text-muted-foreground">
                  Conversion Rate: <Badge variant="outline">{results.conversionRateA.toFixed(2)}%</Badge>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Variant B (Treatment)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visitorsB">Visitors</Label>
                  <Input
                    id="visitorsB"
                    type="number"
                    value={visitorsB}
                    onChange={(e) => setVisitorsB(Number(e.target.value))}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conversionsB">Conversions</Label>
                  <Input
                    id="conversionsB"
                    type="number"
                    value={conversionsB}
                    onChange={(e) => setConversionsB(Number(e.target.value))}
                    placeholder="60"
                  />
                </div>
              </div>
              {results && (
                <div className="text-sm text-muted-foreground">
                  Conversion Rate: <Badge variant="outline">{results.conversionRateB.toFixed(2)}%</Badge>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="confidenceLevel">Confidence Level (%)</Label>
              <select 
                className="w-full p-2 border rounded-md"
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(Number(e.target.value))}
              >
                <option value={90}>90%</option>
                <option value={95}>95%</option>
                <option value={99}>99%</option>
              </select>
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
                {results?.isSignificant ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Statistical Significance Results
              </CardTitle>
              <CardDescription>
                Analysis of your A/B test data at {confidenceLevel}% confidence level
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results ? (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="result-card">
                      <div className={`value ${getSignificanceColor(results.isSignificant, results.pValue)}`}>
                        {results.isSignificant ? "YES" : "NO"}
                      </div>
                      <div className="label">Significant</div>
                    </div>
                    <div className="result-card">
                      <div className="value">{results.pValue.toFixed(4)}</div>
                      <div className="label">P-Value</div>
                    </div>
                    <div className="result-card">
                      <div className="value">{results.relativeImprovement > 0 ? '+' : ''}{results.relativeImprovement.toFixed(1)}%</div>
                      <div className="label">Relative Change</div>
                    </div>
                    <div className="result-card">
                      <div className="value">{results.zScore.toFixed(2)}</div>
                      <div className="label">Z-Score</div>
                    </div>
                  </div>

                  {/* Confidence Interval */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="mb-2">Confidence Interval ({confidenceLevel}%)</h4>
                    <div className="text-sm text-muted-foreground mb-2">
                      The true difference is likely between:
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {results.confidenceInterval[0].toFixed(2)}% to {results.confidenceInterval[1].toFixed(2)}%
                    </Badge>
                  </div>

                  {/* Power Analysis */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Statistical Power Achieved</span>
                      <span>{results.powerAchieved.toFixed(1)}%</span>
                    </div>
                    <Progress value={results.powerAchieved} className="h-2" />
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Enter test data to see results
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Detailed Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4>Effect Size Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Cohen's h:</span>
                        <Badge variant="outline">{results.effectSize.toFixed(3)}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getEffectSizeInterpretation(results.effectSize)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4>Conversion Rates</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Control (A):</span>
                        <Badge variant="outline">{results.conversionRateA.toFixed(2)}%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Treatment (B):</span>
                        <Badge variant="outline">{results.conversionRateB.toFixed(2)}%</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <Separator />
                <div className="space-y-3">
                  <h4>Recommendations</h4>
                  {results.isSignificant ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        The test shows a statistically significant result. You can confidently implement variant B.
                      </AlertDescription>
                    </Alert>
                  ) : results.pValue < 0.1 ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        The result is marginally significant (p &lt; 0.1). Consider running the test longer or increasing sample size.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        No significant difference detected. Continue testing or try a different variation.
                      </AlertDescription>
                    </Alert>
                  )}

                  {results.powerAchieved < 80 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Statistical power is below 80%. Consider increasing sample size for more reliable results.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}