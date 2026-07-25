import React from 'react';
import { 
  LayoutDashboard, Copy, Briefcase, Users, FileText, Bell, Settings, 
  HelpCircle, ChevronLeft, ChevronDown, RefreshCw, User,
  BarChart2, ArrowRightLeft, Layers, CheckCircle, XCircle,
  Activity, Filter, Download, Info, Check, X
} from 'lucide-react';

export function Dashboard() {
  return (
    <div className="flex h-screen w-full bg-[#0d0f14] text-[#f1f5f9] font-sans overflow-hidden text-sm">
      <Sidebar />
      <MainContent />
      <FloatingSuccessCard />
    </div>
  );
}

const Sidebar = () => (
  <div className="w-[220px] shrink-0 bg-[#0a0c10] border-r border-[#1e2130] flex flex-col h-full z-20">
    <div className="p-6 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#1a1d27] border border-[#1e2130] flex items-center justify-center text-[#22c55e]">
        <Layers size={18} />
      </div>
      <span className="font-semibold text-[15px] tracking-wide text-white">Trade Copier</span>
    </div>

    <nav className="flex-1 px-4 space-y-1 mt-2">
      <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active />
      <NavItem icon={<Copy size={18} />} label="Copiers" />
      <NavItem icon={<Briefcase size={18} />} label="Positions" />
      <NavItem icon={<Users size={18} />} label="Accounts" />
      <NavItem icon={<FileText size={18} />} label="Logs" />
      <NavItem icon={<Bell size={18} />} label="Alerts" />
      <NavItem icon={<Settings size={18} />} label="Settings" />
    </nav>

    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <NavItem icon={<HelpCircle size={18} />} label="Help" />
        <NavItem icon={<ChevronLeft size={18} />} label="Collapse" />
      </div>

      <div className="bg-[#131620] border border-[#1e2130] rounded-xl p-4">
        <h4 className="font-medium text-sm mb-1 text-white">Pro Plan</h4>
        <p className="text-[#64748b] text-xs mb-3 leading-relaxed">Unlock unlimited accounts and premium support.</p>
        <button className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-[#0d0f14] font-semibold text-xs py-2 rounded-lg transition-colors">
          Upgrade Plan
        </button>
      </div>
    </div>
  </div>
);

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <a href="#" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active ? 'bg-[#131620] text-[#22c55e]' : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#131620]'}`}>
    {icon}
    <span className="font-medium text-[13px]">{label}</span>
  </a>
);

const MainContent = () => (
  <div className="flex-1 flex flex-col h-screen overflow-y-auto relative [&::-webkit-scrollbar]:hidden">
    <header className="px-8 py-5 border-b border-[#1e2130] bg-[#0d0f14]/90 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-[#64748b] text-sm mt-0.5">Overview of your trade copier activity</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-[#94a3b8] font-medium text-sm">Auto-sync</span>
          <div className="w-10 h-5 bg-[#16a34a] rounded-full p-0.5 flex cursor-pointer">
            <div className="w-4 h-4 bg-white rounded-full translate-x-5 shadow-sm"></div>
          </div>
          <span className="text-[#22c55e] font-semibold text-sm">On</span>
        </div>
        
        <div className="w-px h-6 bg-[#1e2130]"></div>
        
        <button className="text-[#64748b] hover:text-white transition-colors">
          <RefreshCw size={18} />
        </button>
        
        <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] flex items-center justify-center font-bold text-xs">
          JD
        </div>
      </div>
    </header>

    <div className="p-8 space-y-8 max-w-[1440px] mx-auto w-full">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard 
          title="Total Copiers" 
          value="5" 
          badge="Active" 
          badgeColor="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" 
          icon={<Layers className="text-[#22c55e]" size={20} />} 
        />
        <StatCard 
          title="Total Accounts" 
          value="12" 
          badge="Connected" 
          badgeColor="bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20" 
          icon={<Users className="text-[#3b82f6]" size={20} />} 
        />
        <StatCard 
          title="Copied Trades" 
          value="248" 
          badge="Today" 
          badgeColor="bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20" 
          icon={<ArrowRightLeft className="text-[#8b5cf6]" size={20} />} 
        />
        <StatCard 
          title="Success Rate" 
          value="98.6%" 
          badge="Excellent" 
          badgeColor="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" 
          icon={<BarChart2 className="text-[#22c55e]" size={20} />} 
        />
      </div>

      {/* Equity Chart */}
      <div className="bg-[#131620] border border-[#1e2130] rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-semibold text-lg text-white flex items-baseline gap-2">
              Equity Growth <span className="text-[#64748b] font-normal text-sm">(All Accounts)</span>
            </h3>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d27] border border-[#1e2130] rounded-lg text-sm text-[#94a3b8] hover:text-white transition-colors">
            7 Days <ChevronDown size={14} />
          </button>
        </div>
        <div className="h-[240px] w-full">
          <svg width="100%" height="100%" viewBox="0 0 1000 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Grid lines */}
            <line x1="0" y1="20" x2="940" y2="20" stroke="#1e2130" strokeDasharray="4 4" />
            <line x1="0" y1="80" x2="940" y2="80" stroke="#1e2130" strokeDasharray="4 4" />
            <line x1="0" y1="140" x2="940" y2="140" stroke="#1e2130" strokeDasharray="4 4" />
            <line x1="0" y1="200" x2="940" y2="200" stroke="#1e2130" strokeDasharray="4 4" />

            {/* Area fill */}
            <path d="M0,200 L0,180 C50,175 100,190 150,160 C200,130 250,150 300,120 C350,90 400,110 450,100 C500,90 550,60 600,70 C650,80 700,50 750,40 C800,30 850,50 940,20 L940,200 Z" fill="url(#chart-gradient)" />
            
            {/* Line */}
            <path d="M0,180 C50,175 100,190 150,160 C200,130 250,150 300,120 C350,90 400,110 450,100 C500,90 550,60 600,70 C650,80 700,50 750,40 C800,30 850,50 940,20" fill="none" stroke="#22c55e" strokeWidth="2.5" />
            
            {/* X-axis labels */}
            <text x="0" y="230" fill="#64748b" fontSize="12">May 11</text>
            <text x="235" y="230" fill="#64748b" fontSize="12" textAnchor="middle">May 13</text>
            <text x="470" y="230" fill="#64748b" fontSize="12" textAnchor="middle">May 15</text>
            <text x="705" y="230" fill="#64748b" fontSize="12" textAnchor="middle">May 17</text>
            <text x="940" y="230" fill="#64748b" fontSize="12" textAnchor="end">May 19</text>
            
            {/* Y-axis labels */}
            <text x="960" y="24" fill="#64748b" fontSize="12" textAnchor="start">$160k</text>
            <text x="960" y="84" fill="#64748b" fontSize="12" textAnchor="start">$150k</text>
            <text x="960" y="144" fill="#64748b" fontSize="12" textAnchor="start">$140k</text>
            <text x="960" y="204" fill="#64748b" fontSize="12" textAnchor="start">$130k</text>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <CopiersStatusPanel />
        <RecentActivityPanel />
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-5">
          <PositionsPanel />
        </div>
        <div className="col-span-3">
          <SettingsPanel />
        </div>
        <div className="col-span-4">
          <WizardPanel />
        </div>
      </div>

      <ActivityLogsTable />

    </div>
  </div>
);

const StatCard = ({ title, value, badge, badgeColor, icon }: any) => (
  <div className="bg-[#131620] border border-[#1e2130] rounded-xl p-5 flex flex-col justify-between hover:bg-[#1a1d27] transition-colors">
    <div className="flex justify-between items-start mb-4">
      <span className="text-[#94a3b8] font-medium text-sm">{title}</span>
      <div className="p-2 bg-[#1a1d27] rounded-lg border border-[#1e2130]">
        {icon}
      </div>
    </div>
    <div className="flex items-baseline gap-3">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeColor}`}>
        {badge}
      </span>
    </div>
  </div>
);

const CopiersStatusPanel = () => (
  <div className="bg-[#131620] border border-[#1e2130] rounded-xl p-6">
    <h3 className="font-semibold text-lg text-white mb-6">Copiers Status</h3>
    <div className="flex items-center justify-around px-4">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
           {/* Background ring */}
           <path
             className="text-[#1a1d27]"
             stroke="currentColor"
             strokeWidth="3.5"
             fill="none"
             d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
           />
           {/* 80% Green */}
           <path
             className="text-[#22c55e]"
             stroke="currentColor"
             strokeWidth="3.5"
             strokeDasharray="80, 100"
             fill="none"
             d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
             strokeLinecap="round"
           />
           {/* 20% Yellow */}
           <path
             className="text-[#eab308]"
             stroke="currentColor"
             strokeWidth="3.5"
             strokeDasharray="20, 100"
             strokeDashoffset="-80"
             fill="none"
             d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
             strokeLinecap="round"
           />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white leading-none">5</span>
          <span className="text-[11px] text-[#64748b] font-medium uppercase tracking-wider mt-1">Total</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
          <span className="text-[#94a3b8] text-sm w-16">Active</span>
          <span className="text-white font-medium text-sm">4 (80%)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></div>
          <span className="text-[#94a3b8] text-sm w-16">Paused</span>
          <span className="text-white font-medium text-sm">1 (20%)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
          <span className="text-[#94a3b8] text-sm w-16">Error</span>
          <span className="text-white font-medium text-sm">0 (0%)</span>
        </div>
      </div>
    </div>
  </div>
);

const RecentActivityPanel = () => (
  <div className="bg-[#131620] border border-[#1e2130] rounded-xl p-6">
    <div className="flex justify-between items-center mb-6">
      <h3 className="font-semibold text-lg text-white">Recent Activity</h3>
      <a href="#" className="text-[#22c55e] text-sm hover:underline font-medium">View all</a>
    </div>
    <div className="space-y-5">
      <ActivityItem icon={<CheckCircle size={16} className="text-[#22c55e]" />} text="EURUSD copied to 3 accounts" time="2m ago" />
      <ActivityItem icon={<CheckCircle size={16} className="text-[#22c55e]" />} text="XAUUSD copied to 2 accounts" time="5m ago" />
      <ActivityItem icon={<CheckCircle size={16} className="text-[#22c55e]" />} text="GBPUSD copied to 3 accounts" time="8m ago" />
      <ActivityItem icon={<XCircle size={16} className="text-[#ef4444]" />} text="Failed to copy trade on Account #7" time="12m ago" error />
      <ActivityItem icon={<CheckCircle size={16} className="text-[#22c55e]" />} text="USDJPY copied to 1 account" time="15m ago" />
    </div>
  </div>
);

const ActivityItem = ({ icon, text, time, error = false }: any) => (
  <div className="flex items-start justify-between">
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <p className={`text-sm ${error ? 'text-[#ef4444]' : 'text-[#f1f5f9]'}`}>{text}</p>
    </div>
    <span className="text-[#64748b] text-xs whitespace-nowrap ml-4">{time}</span>
  </div>
);

const PositionsPanel = () => (
  <div className="bg-[#131620] border border-[#1e2130] rounded-xl flex flex-col h-full">
    <div className="p-5 border-b border-[#1e2130]">
      <h3 className="font-semibold text-lg text-white">Positions</h3>
    </div>
    <div className="p-0 overflow-x-auto flex-1">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-[#1a1d27]/50 text-[#64748b] text-xs uppercase tracking-wider">
          <tr>
            <th className="px-5 py-3 font-medium">Symbol</th>
            <th className="px-5 py-3 font-medium">From Account</th>
            <th className="px-5 py-3 font-medium">Copied To</th>
            <th className="px-5 py-3 font-medium">Volume</th>
            <th className="px-5 py-3 font-medium">P/L (USD)</th>
            <th className="px-5 py-3 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e2130]">
          <PositionRow symbol="EURUSD" from="Master #1" to="3 accounts" vol="1.50" pl="+$10.58" plColor="text-[#22c55e]" status="Open" />
          <PositionRow symbol="XAUUSD" from="Master #1" to="2 accounts" vol="0.50" pl="+$50.43" plColor="text-[#22c55e]" status="Open" />
          <PositionRow symbol="GBPUSD" from="Master #2" to="3 accounts" vol="2.00" pl="-$8.00" plColor="text-[#ef4444]" status="Open" />
          <PositionRow symbol="USDJPY" from="Master #1" to="1 account" vol="1.00" pl="+$32.10" plColor="text-[#22c55e]" status="Open" />
          <PositionRow symbol="AUDUSD" from="Master #2" to="4 accounts" vol="1.00" pl="+$18.00" plColor="text-[#22c55e]" status="Open" />
        </tbody>
      </table>
    </div>
  </div>
);

const PositionRow = ({ symbol, from, to, vol, pl, plColor, status }: any) => (
  <tr className="hover:bg-[#1a1d27]/50 transition-colors">
    <td className="px-5 py-3.5 font-medium text-white">{symbol}</td>
    <td className="px-5 py-3.5 text-[#94a3b8]">{from}</td>
    <td className="px-5 py-3.5 text-[#94a3b8]">{to}</td>
    <td className="px-5 py-3.5 text-[#f1f5f9]">{vol}</td>
    <td className={`px-5 py-3.5 font-medium ${plColor}`}>{pl}</td>
    <td className="px-5 py-3.5 text-right">
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
        {status}
      </span>
    </td>
  </tr>
);

const SettingsPanel = () => (
  <div className="bg-[#131620] border border-[#1e2130] rounded-xl flex flex-col h-full">
    <div className="p-5 border-b border-[#1e2130] flex gap-6 text-sm">
      <span className="font-medium text-[#22c55e] border-b-2 border-[#22c55e] pb-4 -mb-5 cursor-pointer">General</span>
      <span className="font-medium text-[#64748b] hover:text-[#94a3b8] pb-4 -mb-5 cursor-pointer">Alerts</span>
      <span className="font-medium text-[#64748b] hover:text-[#94a3b8] pb-4 -mb-5 cursor-pointer">Security</span>
    </div>
    <div className="p-5 space-y-6 flex-1 flex flex-col">
      
      <div className="flex justify-between items-center">
        <div>
          <p className="text-[#f1f5f9] font-medium text-sm">Auto Sync</p>
          <p className="text-[#64748b] text-xs mt-0.5">Sync trades immediately</p>
        </div>
        <div className="w-9 h-5 bg-[#16a34a] rounded-full p-0.5 flex cursor-pointer">
          <div className="w-4 h-4 bg-white rounded-full translate-x-4 shadow-sm"></div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-[#f1f5f9] font-medium text-sm">Start on Launch</p>
          <p className="text-[#64748b] text-xs mt-0.5">Resume copiers on start</p>
        </div>
        <div className="w-9 h-5 bg-[#16a34a] rounded-full p-0.5 flex cursor-pointer">
          <div className="w-4 h-4 bg-white rounded-full translate-x-4 shadow-sm"></div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <label className="text-[#94a3b8] text-xs mb-1.5 block">Timezone</label>
          <div className="w-full bg-[#1a1d27] border border-[#1e2130] rounded-lg px-3 py-2 flex justify-between items-center text-sm cursor-pointer hover:border-[#334155] transition-colors">
            <span>UTC (GMT+0)</span>
            <ChevronDown size={14} className="text-[#64748b]" />
          </div>
        </div>
        <div>
          <label className="text-[#94a3b8] text-xs mb-1.5 block">Language</label>
          <div className="w-full bg-[#1a1d27] border border-[#1e2130] rounded-lg px-3 py-2 flex justify-between items-center text-sm cursor-pointer hover:border-[#334155] transition-colors">
            <span>English (US)</span>
            <ChevronDown size={14} className="text-[#64748b]" />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-[#0d0f14] font-semibold text-sm py-2 rounded-lg transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  </div>
);

const WizardPanel = () => (
  <div className="bg-[#1a1d27] border border-[#22c55e]/30 shadow-[0_8px_32px_-8px_rgba(34,197,94,0.1)] rounded-xl flex flex-col h-full relative overflow-hidden">
    {/* Glow effect */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-[#22c55e]/10 blur-3xl rounded-full pointer-events-none"></div>
    
    <div className="p-5 border-b border-[#1e2130]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg text-white">Add New Copier</h3>
        <span className="text-[#22c55e] text-xs font-medium bg-[#22c55e]/10 px-2.5 py-1 rounded-full">Step 1 of 4</span>
      </div>
      
      <div className="flex items-center justify-between relative px-2">
         <div className="absolute top-1/2 left-4 right-4 h-px bg-[#1e2130] -z-10"></div>
         {/* Step 1 */}
         <div className="flex flex-col items-center gap-1.5 bg-[#1a1d27] px-2">
           <div className="w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center text-[#0d0f14]">
             <span className="text-xs font-bold">1</span>
           </div>
           <span className="text-xs text-[#22c55e] font-medium">Source</span>
         </div>
         {/* Step 2 */}
         <div className="flex flex-col items-center gap-1.5 bg-[#1a1d27] px-2">
           <div className="w-6 h-6 rounded-full bg-[#131620] border border-[#334155] flex items-center justify-center text-[#64748b]">
             <span className="text-xs font-medium">2</span>
           </div>
           <span className="text-xs text-[#64748b]">Destinations</span>
         </div>
         {/* Step 3 */}
         <div className="flex flex-col items-center gap-1.5 bg-[#1a1d27] px-2">
           <div className="w-6 h-6 rounded-full bg-[#131620] border border-[#334155] flex items-center justify-center text-[#64748b]">
             <span className="text-xs font-medium">3</span>
           </div>
           <span className="text-xs text-[#64748b]">Settings</span>
         </div>
         {/* Step 4 */}
         <div className="flex flex-col items-center gap-1.5 bg-[#1a1d27] px-2">
           <div className="w-6 h-6 rounded-full bg-[#131620] border border-[#334155] flex items-center justify-center text-[#64748b]">
             <span className="text-xs font-medium">4</span>
           </div>
           <span className="text-xs text-[#64748b]">Review</span>
         </div>
      </div>
    </div>

    <div className="p-5 space-y-6 flex-1 flex flex-col justify-between">
      <div>
        <label className="text-[#94a3b8] text-xs font-medium mb-2 block">Source Account</label>
        <div className="w-full bg-[#131620] border border-[#334155] rounded-lg p-3 flex justify-between items-center cursor-pointer hover:border-[#22c55e]/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6]">
              <User size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Master Account #123456</p>
              <p className="text-xs text-[#64748b]">Broker 1</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
              Connected
            </span>
            <ChevronDown size={16} className="text-[#64748b]" />
          </div>
        </div>
      </div>

      <div>
        <label className="text-[#94a3b8] text-xs font-medium mb-2 block">Copy Settings</label>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#22c55e]/5 border border-[#22c55e] rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer relative">
            <div className="absolute top-1.5 right-1.5">
              <CheckCircle size={14} className="text-[#22c55e]" />
            </div>
            <Layers size={20} className="text-[#22c55e]" />
            <span className="text-xs font-medium text-white text-center">All Trades</span>
          </div>
          <div className="bg-[#131620] border border-[#1e2130] rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer hover:border-[#334155] transition-colors">
            <Activity size={20} className="text-[#64748b]" />
            <span className="text-xs font-medium text-[#94a3b8] text-center leading-tight">New Trades<br/>Only</span>
          </div>
          <div className="bg-[#131620] border border-[#1e2130] rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer hover:border-[#334155] transition-colors">
            <Settings size={20} className="text-[#64748b]" />
            <span className="text-xs font-medium text-[#94a3b8] text-center">Custom</span>
          </div>
        </div>
        <p className="text-xs text-[#64748b] mt-4 flex items-start gap-1.5">
          <Info size={14} className="shrink-0 mt-0.5 text-[#94a3b8]" />
          All trades, including pending orders and market positions, will be copied in real-time.
        </p>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button className="text-[#94a3b8] text-sm hover:text-white transition-colors w-20 text-left">Cancel</button>
        <button className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-[#0d0f14] font-semibold text-sm py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          Next: Destinations
        </button>
      </div>
    </div>
  </div>
);

const ActivityLogsTable = () => (
  <div className="bg-[#131620] border border-[#1e2130] rounded-xl overflow-hidden mb-12">
    <div className="p-5 border-b border-[#1e2130] flex justify-between items-center">
      <h3 className="font-semibold text-lg text-white">Activity Logs</h3>
      <div className="flex gap-3">
         <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d27] border border-[#1e2130] rounded-lg text-sm text-[#94a3b8] hover:text-white transition-colors">
            <Filter size={14} /> Filter
         </button>
         <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d27] border border-[#1e2130] rounded-lg text-sm text-[#94a3b8] hover:text-white transition-colors">
            <Download size={14} /> Export
         </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-[#1a1d27]/50 text-[#64748b] text-xs uppercase tracking-wider">
          <tr>
            <th className="px-5 py-3 font-medium">Time</th>
            <th className="px-5 py-3 font-medium">Type</th>
            <th className="px-5 py-3 font-medium">Copier</th>
            <th className="px-5 py-3 font-medium">Details</th>
            <th className="px-5 py-3 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e2130]">
          <LogRow time="10:42:05 AM" type="Trade Copy" copier="Master to Slaves A" details="Copied BUY EURUSD 1.50 lots" status="Success" />
          <LogRow time="10:35:12 AM" type="Copier Started" copier="Master to Slaves A" details="User initiated copier start" status="Success" />
          <LogRow time="09:15:44 AM" type="Trade Copy" copier="Master to Slaves B" details="Copied SELL XAUUSD 0.50 lots" status="Success" />
          <LogRow time="08:50:21 AM" type="Connection Error" copier="Broker 2 Account" details="Failed to connect to broker server" status="Error" />
        </tbody>
      </table>
    </div>
  </div>
);

const LogRow = ({ time, type, copier, details, status }: any) => {
  const isSuccess = status === 'Success';
  return (
    <tr className="hover:bg-[#1a1d27]/50 transition-colors">
      <td className="px-5 py-3.5 text-[#94a3b8] font-mono text-xs">{time}</td>
      <td className="px-5 py-3.5 font-medium text-[#f1f5f9]">{type}</td>
      <td className="px-5 py-3.5 text-[#94a3b8]">{copier}</td>
      <td className="px-5 py-3.5 text-[#f1f5f9]">{details}</td>
      <td className="px-5 py-3.5 text-right">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border
          ${isSuccess ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20' : 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}></span>
          {status}
        </span>
      </td>
    </tr>
  );
};

const FloatingSuccessCard = () => (
  <div className="fixed bottom-8 right-8 bg-[#1a1d27] border border-[#22c55e]/30 shadow-[0_10px_40px_-10px_rgba(34,197,94,0.2)] rounded-xl p-5 flex items-start gap-4 z-50 w-[360px] transition-all duration-500 transform translate-y-0 opacity-100">
     <div className="relative shrink-0">
       <div className="absolute inset-0 bg-[#22c55e] rounded-full animate-ping opacity-20"></div>
       <div className="w-10 h-10 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-full flex items-center justify-center text-[#22c55e] relative z-10">
         <Check size={20} strokeWidth={3} />
       </div>
     </div>
     <div className="flex-1">
       <div className="flex justify-between items-start">
         <h4 className="font-semibold text-white text-sm">Trade Copied Successfully</h4>
         <button className="text-[#64748b] hover:text-white transition-colors">
           <X size={16} />
         </button>
       </div>
       <p className="text-xs text-[#94a3b8] mt-1 mb-3">Your trade has been copied to 3 accounts.</p>
       <div className="flex items-center gap-3">
         <button className="bg-[#22c55e] hover:bg-[#16a34a] text-[#0d0f14] font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors">
           Back to Dashboard
         </button>
         <button className="text-[#22c55e] text-xs font-medium hover:underline">
           View Details
         </button>
       </div>
     </div>
  </div>
);
