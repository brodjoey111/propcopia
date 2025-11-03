import { PositionScalingControl } from '../position-scaling-control';

export default function PositionScalingControlExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <PositionScalingControl
        accountName="Follower Account 1"
        defaultValue={50}
        onSave={(value) => console.log('Saved scaling:', value)}
      />
      <PositionScalingControl
        accountName="Follower Account 2"
        defaultValue={100}
        onSave={(value) => console.log('Saved scaling:', value)}
      />
    </div>
  );
}
