import { ExperimentConfig } from '../types/experiment';

export const DEFAULT_EXPERIMENT_CONFIG: ExperimentConfig = {
  name: '',
  description: '',
  hypothesis: '',
  primaryMetric: 'conversion_rate',
  secondaryMetrics: [],
  variants: [
    {
      id: 'control',
      name: 'Control (A)',
      description: 'Current version',
      trafficAllocation: 50,
      expectedConversionRate: 5,
      isControl: true
    },
    {
      id: 'treatment',
      name: 'Treatment (B)',
      description: 'New version',
      trafficAllocation: 50,
      expectedConversionRate: 6,
      isControl: false
    }
  ],
  totalTrafficAllocation: 100,
  minimumDetectableEffect: 20,
  power: 80,
  significance: 95,
  estimatedDuration: 14,
  segmentation: {
    enabled: false,
    segments: []
  },
  successCriteria: ''
};

export const PRIMARY_METRICS = [
  { value: 'conversion_rate', label: 'Conversion Rate' },
  { value: 'revenue_per_user', label: 'Revenue per User' },
  { value: 'click_through_rate', label: 'Click-through Rate' },
  { value: 'engagement_rate', label: 'Engagement Rate' },
  { value: 'retention_rate', label: 'Retention Rate' }
];

export const POWER_OPTIONS = [
  { value: 70, label: '70%' },
  { value: 80, label: '80%' },
  { value: 90, label: '90%' }
];

export const SIGNIFICANCE_OPTIONS = [
  { value: 90, label: '90%' },
  { value: 95, label: '95%' },
  { value: 99, label: '99%' }
];