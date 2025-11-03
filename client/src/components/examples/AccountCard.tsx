import { AccountCard } from '../account-card';

export default function AccountCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      <AccountCard
        id="1"
        name="Main Trading"
        platform="NinjaTrader"
        accountType="master"
        isConnected={true}
        balance={52340}
        openPositions={3}
        pnl={1240}
        onConfigure={() => console.log('Configure clicked')}
        onDisconnect={() => console.log('Disconnect clicked')}
      />
      <AccountCard
        id="2"
        name="Follower Account 1"
        platform="Tradovate"
        accountType="follower"
        isConnected={true}
        balance={28900}
        openPositions={3}
        pnl={620}
        positionScaling={50}
        onConfigure={() => console.log('Configure clicked')}
        onDisconnect={() => console.log('Disconnect clicked')}
      />
      <AccountCard
        id="3"
        name="Backup Account"
        platform="NinjaTrader"
        accountType="follower"
        isConnected={false}
        balance={15000}
        openPositions={0}
        pnl={-230}
        positionScaling={100}
        onConfigure={() => console.log('Configure clicked')}
        onDisconnect={() => console.log('Disconnect clicked')}
      />
    </div>
  );
}
