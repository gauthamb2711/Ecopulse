import React from 'react';
import { BrainCircuit, Cpu, Radio, TrendingUp } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-6">
        <h2 className="text-lg font-bold text-slate-100">
          AI-Based Smart Dustbin Fill-Level Detection, Prediction & Automatic Alert System
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-300">
          This application demonstrates an end-to-end Smart City Waste Management Control Centre running 100% inside the browser using TypeScript, React, Recharts, and LocalStorage. It simulates ultrasonic distance sensing, trains a genuine Random Forest classifier on synthetic telemetry, forecasts capacity exhaustion with Ordinary Least Squares Linear Regression, and orchestrates collection alerts without requiring physical ESP32, Arduino, or HC-SR04 hardware.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
          <div className="flex items-center gap-2 text-cyan-400">
            <Radio className="h-4 w-4" />
            <h3 className="text-sm font-semibold text-slate-100">
              1. Simulated HC-SR04 Ultrasonic Sensor
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            In a physical smart bin, an HC-SR04 transducer mounted under the lid emits 40 kHz acoustic pulses and measures echo return time. Our simulator computes exact waste height from the bin fill level (`Waste Height = Bin Height × Fill % / 100`) and air-gap distance (`Distance = Bin Height − Waste Height`), optionally adding bounded Gaussian sensor noise while preserving true fill state.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
          <div className="flex items-center gap-2 text-emerald-400">
            <BrainCircuit className="h-4 w-4" />
            <h3 className="text-sm font-semibold text-slate-100">
              2. Genuine Random Forest Classifier
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Implemented from scratch in TypeScript using CART decision trees with Gini impurity splitting, bootstrap sampling, and random feature subset selection across 6 sensor-derived features. Trained on a clearly labeled synthetic simulator dataset split 75/25 for held-out validation accuracy, confusion matrix, precision, recall, and F1-score.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
          <div className="flex items-center gap-2 text-amber-400">
            <TrendingUp className="h-4 w-4" />
            <h3 className="text-sm font-semibold text-slate-100">
              3. Linear Regression Full-Time Prediction
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Fits an Ordinary Least Squares line over recent timestamped fill readings to estimate filling velocity (%/hour) and project remaining hours to 100% capacity. Explicitly handles insufficient history, flat/non-filling trends, and already-full bins without fabricating estimates.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
          <div className="flex items-center gap-2 text-blue-400">
            <Cpu className="h-4 w-4" />
            <h3 className="text-sm font-semibold text-slate-100">
              4. Simulated vs. Physical Hardware Deployment
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Simulated in this web app: HC-SR04 echo timing, waste accumulation, local alert dispatch, and browser persistence. In a physical deployment, an ESP32/Arduino microcontroller would sample the real HC-SR04 GPIO pins and stream readings over MQTT/HTTP to replace the browser simulator source.
          </p>
        </div>
      </div>
    </div>
  );
};
