import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface PositionScalingControlProps {
  accountName: string;
  defaultValue?: number;
  onSave?: (value: number) => void;
}

export function PositionScalingControl({
  accountName,
  defaultValue = 100,
  onSave,
}: PositionScalingControlProps) {
  const [scaling, setScaling] = useState(defaultValue);
  const presets = [25, 50, 100, 200];

  const handleSave = () => {
    console.log(`Saving scaling for ${accountName}:`, scaling);
    onSave?.(scaling);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold">{accountName}</h3>
          <p className="text-sm text-muted-foreground">
            Adjust position size scaling for this follower account
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Position Scaling</Label>
              <span className="text-2xl font-bold tabular-nums" data-testid="text-scaling-value">
                {scaling}%
              </span>
            </div>
            <Slider
              value={[scaling]}
              onValueChange={(value) => setScaling(value[0])}
              min={10}
              max={200}
              step={5}
              data-testid="slider-position-scaling"
            />
          </div>

          <div className="flex gap-2">
            {presets.map((preset) => (
              <Button
                key={preset}
                variant={scaling === preset ? "default" : "outline"}
                size="sm"
                onClick={() => setScaling(preset)}
                data-testid={`button-preset-${preset}`}
              >
                {preset}%
              </Button>
            ))}
          </div>

          <div className="rounded-md bg-muted p-3">
            <p className="text-xs font-medium text-muted-foreground">Live Preview</p>
            <p className="mt-1 text-sm">
              Master: <span className="font-semibold">10 contracts</span> → Follower:{" "}
              <span className="font-semibold tabular-nums">{Math.round((10 * scaling) / 100)} contracts</span>
            </p>
          </div>
        </div>

        <Button className="w-full" onClick={handleSave} data-testid="button-save-scaling">
          Save Changes
        </Button>
      </div>
    </Card>
  );
}
