import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SmartWasteProvider } from './hooks/useSmartWasteSystem';
import { About } from './pages/About';
import { Alerts } from './pages/Alerts';
import { Collection } from './pages/Collection';
import { Dashboard } from './pages/Dashboard';
import { DustbinDetails } from './pages/DustbinDetails';
import { Dustbins } from './pages/Dustbins';
import { MachineLearningLab } from './pages/MachineLearningLab';
import { Predictions } from './pages/Predictions';
import { Reports } from './pages/Reports';
import { SensorSimulator } from './pages/SensorSimulator';
import { Settings } from './pages/Settings';
import { Simulator } from './pages/Simulator';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unexpected rendering error.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0B111E] p-6 text-slate-100">
          <div className="max-w-md rounded-xl border border-red-500/40 bg-[#0F172A] p-6">
            <h1 className="text-base font-bold text-red-400">Application Recovery</h1>
            <p className="mt-2 text-xs text-slate-300">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950"
            >
              Reload Control Centre
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <SmartWasteProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/dustbins" element={<Dustbins />} />
              <Route path="/dustbins/:id" element={<DustbinDetails />} />
              <Route path="/sensor" element={<SensorSimulator />} />
              <Route path="/ml-lab" element={<MachineLearningLab />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </SmartWasteProvider>
    </AppErrorBoundary>
  );
}
