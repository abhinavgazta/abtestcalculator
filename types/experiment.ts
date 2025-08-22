export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  trafficAllocation: number;
  expectedConversionRate: number;
  isControl: boolean;
}

export interface ExperimentConfig {
  name: string;
  description: string;
  hypothesis: string;
  primaryMetric: string;
  secondaryMetrics: string[];
  variants: ExperimentVariant[];
  totalTrafficAllocation: number;
  minimumDetectableEffect: number;
  power: number;
  significance: number;
  estimatedDuration: number;
  segmentation: {
    enabled: boolean;
    segments: string[];
  };
  successCriteria: string;
}

export interface DesignAnalysis {
  totalSampleSize: number;
  sampleSizePerVariant: { [key: string]: number };
  expectedDuration: number;
  powerAnalysis: { [key: string]: number };
  multipleComparisonsAdjustment: number;
  estimatedCost: number;
}