import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  Box,
  BrainCircuit,
  FileSpreadsheet,
  Info,
  LayoutDashboard,
  Menu,
  Play,
  Pause,
  Radio,
  Settings,
  Trash2,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';

interface NavGroup {
  title: string;
  items: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }[];
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { state, updateSettings, trainModel, trainingProgress } = useSmartWasteSystem();

  const unresolvedAlertsCount = state.alerts.filter((a) => !a.resolved).length;
  const isSimRunning =
    state.settings.globalRunning && state.settings.simulationMode === 'AUTO';

  const navGroups: NavGroup[] = [
    {
      title: 'Operations',
      items: [
        { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
        { to: '/simulator', label: 'Live Dustbin Simulator', icon: Box },
        { to: '/dustbins', label: 'All Dustbins', icon: Trash2 },
        { to: '/collection', label: 'Waste Collection', icon: Truck },
      ],
    },
    {
      title: 'Sensors & Intelligence',
      items: [
        { to: '/sensor', label: 'Ultrasonic Sensor', icon: Radio },
        { to: '/ml-lab', label: 'Machine Learning Lab', icon: BrainCircuit },
        { to: '/predictions', label: 'Fill-Level Prediction', icon: TrendingUp },
      ],
    },
    {
      title: 'Monitoring & System',
      items: [
        {
          to: '/alerts',
          label: 'Alerts & Notifications',
          icon: Bell,
          badgeCount: unresolvedAlertsCount,
        },
        { to: '/reports', label: 'History & Reports', icon: FileSpreadsheet },
        { to: '/settings', label: 'Settings', icon: Settings },
        { to: '/about', label: 'About Project', icon: Info },
      ],
    },
  ];

  const pageTitleMap: Record<string, string> = {
    '/': 'Overview Dashboard',
    '/simulator': 'Live Smart Dustbin Simulator',
    '/dustbins': 'All Smart Dustbins',
    '/sensor': 'HC-SR04 Ultrasonic Sensor Simulator',
    '/ml-lab': 'Random Forest Machine Learning Lab',
    '/predictions': 'Linear Regression Fill-Level Prediction',
    '/alerts': 'Alerts & Notifications',
    '/collection': 'Waste Collection Management',
    '/reports': 'History & Reports',
    '/settings': 'Simulation & Storage Settings',
    '/about': 'About Project Architecture',
  };

  const currentTitle = location.pathname.startsWith('/dustbins/')
    ? 'Dustbin Telemetry Details'
    : pageTitleMap[location.pathname] || 'Control Centre';

  const toggleGlobalSimulation = () => {
    if (isSimRunning) {
      updateSettings({ globalRunning: false });
    } else {
      updateSettings({ simulationMode: 'AUTO', globalRunning: true });
    }
  };

  const renderNavLinks = (onNavigate?: () => void) => (
    <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.title}>
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500">
            {group.title}
          </div>
          <nav className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-cyan-500/12 text-cyan-300 border border-cyan-500/25'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 border border-transparent'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="font-mono text-xs font-semibold text-amber-400 tabular-nums">
                      {item.badgeCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B111E] text-slate-100 lg:flex">
      {/* Desktop Left Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-800 lg:bg-[#0E1525]">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
          <Activity className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            EcoPulse IoT
          </span>
        </div>

        {renderNavLinks()}

        {/* Quick Model Status Footer in Sidebar */}
        <div className="border-t border-slate-800 p-4 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>ML Classifier</span>
            <span
              className={`font-mono font-semibold ${
                state.trainedModel ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {state.trainedModel ? 'TRAINED' : 'NOT TRAINED'}
            </span>
          </div>
          {!state.trainedModel && (
            <button
              type="button"
              disabled={trainingProgress.isTraining}
              onClick={() => trainModel({ numTrees: 15, maxDepth: 8, minSamplesSplit: 2 })}
              className="mt-2.5 w-full rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/25 disabled:opacity-50 whitespace-nowrap"
            >
              {trainingProgress.isTraining
                ? `Training ${trainingProgress.completedTrees}/${trainingProgress.totalTrees}...`
                : 'Train Random Forest'}
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Slide-Out Sidebar */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-slate-800 bg-[#0E1525]">
            <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                <span className="text-base font-bold text-slate-100">EcoPulse IoT</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavLinks(() => setMobileMenuOpen(false))}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar (Clean 3-Zone Contract) */}
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-800 bg-[#0B111E]/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-100 sm:text-lg">
                {currentTitle}
              </h1>
              <p className="hidden text-xs text-slate-400 sm:block truncate">
                Software-Only IoT Simulation · {state.dustbins.length} Active Bins · LocalStorage Synced
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleGlobalSimulation}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isSimRunning
                  ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              }`}
            >
              {isSimRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isSimRunning ? 'Pause Auto-Fill' : 'Start Auto-Fill'}</span>
            </button>
            {location.pathname !== '/simulator' && (
              <button
                type="button"
                onClick={() => navigate('/simulator')}
                className="hidden sm:inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
              >
                Open Simulator
              </button>
            )}
          </div>
        </header>

        {/* Page Viewport */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
