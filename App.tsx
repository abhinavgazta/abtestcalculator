import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Calculator, TrendingUp, Users, BarChart3, Settings, Zap } from 'lucide-react';
import { SampleSizeCalculator } from './components/SampleSizeCalculator';
import { SignificanceTestCalculator } from './components/SignificanceTestCalculator';
import { VirtualUserSimulator } from './components/VirtualUserSimulator';
import { PowerAnalysisCalculator } from './components/PowerAnalysisCalculator';
import { SequentialTestingCalculator } from './components/SequentialTestingCalculator';
import { ExperimentDesigner } from './components/ExperimentDesigner';

export default function App() {
  const [activeTab, setActiveTab] = useState('sample-size');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl mb-4 text-center">Advanced A/B Testing Calculator</h1>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto">
            Comprehensive statistical analysis tools for A/B testing with virtual user simulations, 
            power analysis, and enterprise-grade insights.
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="sample-size" className="flex items-center gap-2 tab-trigger">
              <Calculator className="h-4 w-4" />
              Sample Size
            </TabsTrigger>
            <TabsTrigger value="significance" className="flex items-center gap-2 tab-trigger">
              <TrendingUp className="h-4 w-4" />
              Significance
            </TabsTrigger>
            <TabsTrigger value="power-analysis" className="flex items-center gap-2 tab-trigger">
              <BarChart3 className="h-4 w-4" />
              Power Analysis
            </TabsTrigger>
            <TabsTrigger value="simulation" className="flex items-center gap-2 tab-trigger">
              <Users className="h-4 w-4" />
              Simulation
            </TabsTrigger>
            <TabsTrigger value="sequential" className="flex items-center gap-2 tab-trigger">
              <Zap className="h-4 w-4" />
              Sequential
            </TabsTrigger>
            <TabsTrigger value="designer" className="flex items-center gap-2 tab-trigger">
              <Settings className="h-4 w-4" />
              Designer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sample-size">
            <SampleSizeCalculator />
          </TabsContent>

          <TabsContent value="significance">
            <SignificanceTestCalculator />
          </TabsContent>

          <TabsContent value="power-analysis">
            <PowerAnalysisCalculator />
          </TabsContent>

          <TabsContent value="simulation">
            <VirtualUserSimulator />
          </TabsContent>

          <TabsContent value="sequential">
            <SequentialTestingCalculator />
          </TabsContent>

          <TabsContent value="designer">
            <ExperimentDesigner />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>Built with advanced statistical methods for reliable A/B testing insights</p>
        </div>
      </div>
    </div>
  );
}