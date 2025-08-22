import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { ExperimentVariant, ExperimentConfig } from '../types/experiment';

interface VariantConfigProps {
  config: ExperimentConfig;
  onUpdateConfig: (config: ExperimentConfig) => void;
}

export function VariantConfig({ config, onUpdateConfig }: VariantConfigProps) {
  const addVariant = () => {
    const newVariant: ExperimentVariant = {
      id: `variant_${Date.now()}`,
      name: `Variant ${String.fromCharCode(65 + config.variants.length)}`,
      description: '',
      trafficAllocation: 0,
      expectedConversionRate: 5,
      isControl: false
    };
    
    onUpdateConfig({
      ...config,
      variants: [...config.variants, newVariant]
    });
  };

  const removeVariant = (id: string) => {
    onUpdateConfig({
      ...config,
      variants: config.variants.filter(v => v.id !== id)
    });
  };

  const updateVariant = (id: string, updates: Partial<ExperimentVariant>) => {
    onUpdateConfig({
      ...config,
      variants: config.variants.map(v => v.id === id ? { ...v, ...updates } : v)
    });
  };

  const balanceTrafficAllocation = () => {
    const equalAllocation = Math.floor(100 / config.variants.length);
    const remainder = 100 - (equalAllocation * config.variants.length);
    
    onUpdateConfig({
      ...config,
      variants: config.variants.map((v, index) => ({
        ...v,
        trafficAllocation: equalAllocation + (index < remainder ? 1 : 0)
      }))
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3>Experiment Variants</h3>
        <div className="flex gap-2">
          <Button onClick={balanceTrafficAllocation} variant="outline" size="sm">
            Balance Traffic
          </Button>
          <Button onClick={addVariant} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
        </div>
      </div>

      {config.variants.map((variant) => (
        <div key={variant.id} className="p-4 border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={variant.name}
                onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={variant.description}
                onChange={(e) => updateVariant(variant.id, { description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Traffic (%)</Label>
              <Input
                type="number"
                value={variant.trafficAllocation}
                onChange={(e) => updateVariant(variant.id, { trafficAllocation: Number(e.target.value) })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Expected Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={variant.expectedConversionRate}
                onChange={(e) => updateVariant(variant.id, { expectedConversionRate: Number(e.target.value) })}
              />
            </div>
            
            <div className="flex items-end gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={variant.isControl}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onUpdateConfig({
                        ...config,
                        variants: config.variants.map(v => ({
                          ...v,
                          isControl: v.id === variant.id
                        }))
                      });
                    }
                  }}
                />
                <Label className="text-xs">Control</Label>
              </div>
              {config.variants.length > 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeVariant(variant.id)}
                  disabled={variant.isControl}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
        <span>Total Traffic Allocation:</span>
        <Badge variant={config.totalTrafficAllocation === 100 ? "default" : "destructive"}>
          {config.totalTrafficAllocation}%
        </Badge>
      </div>
    </div>
  );
}