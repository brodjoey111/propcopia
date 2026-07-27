import { Wifi, WifiOff, Server } from "lucide-react";

interface BrokerStatusCardProps {
  connected: boolean;
  brokerName: string;
  accounts: number;
  lastUpdated?: string;
}

export default function BrokerStatusCard({
  connected,
  brokerName,
  accounts,
  lastUpdated,
}: BrokerStatusCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">

      <div className="flex items-center justify-between mb-6">

        <div className="flex items-center gap-3">

          {connected ? (
            <Wifi className="h-7 w-7 text-green-500" />
          ) : (
            <WifiOff className="h-7 w-7 text-red-500" />
          )}

          <div>
            <h2 className="text-xl font-bold text-white">
              {brokerName}
            </h2>

            <p
              className={
                connected
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {connected ? "Connected" : "Disconnected"}
            </p>
          </div>

        </div>

        <Server className="text-zinc-500 h-8 w-8" />

      </div>

      <div className="space-y-4">

        <div className="flex justify-between">
          <span className="text-zinc-400">
            Connected Accounts
          </span>

          <span className="text-white font-semibold">
            {accounts}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-400">
            Last Updated
          </span>

          <span className="text-white">
            {lastUpdated ?? "Just now"}
          </span>
        </div>

      </div>
    </div>
  );
}