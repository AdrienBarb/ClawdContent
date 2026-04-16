"use client";

import { useState } from "react";

const plans = [
  { name: "Starter", price: 17 },
  { name: "Pro", price: 37 },
  { name: "Business", price: 79 },
];

const COMMISSION_RATE = 0.4;

export default function RevenueSimulator() {
  const [referrals, setReferrals] = useState(10);
  const [planIndex, setPlanIndex] = useState(1); // Default to Pro

  const plan = plans[planIndex];
  const monthlyPerReferral = plan.price * COMMISSION_RATE;
  const monthlyTotal = monthlyPerReferral * referrals;
  const yearlyTotal = monthlyTotal * 12;

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8">
      {/* Plan selector */}
      <div className="mb-8">
        <label className="mb-3 block text-sm font-medium text-muted-foreground">
          Average plan your referrals subscribe to
        </label>
        <div className="grid grid-cols-3 gap-3">
          {plans.map((p, i) => (
            <button
              key={p.name}
              onClick={() => setPlanIndex(i)}
              className={`rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors ${
                i === planIndex
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-[#2e3350] hover:text-foreground"
              }`}
            >
              <span className="block">{p.name}</span>
              <span className="block text-xs mt-0.5 opacity-70">
                ${p.price}/mo
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Referral slider */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">
            Active referrals
          </label>
          <span className="text-lg font-bold text-foreground">{referrals}</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={referrals}
          onChange={(e) => setReferrals(Number(e.target.value))}
          className="w-full accent-primary h-2 rounded-lg appearance-none bg-border cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground/50">
          <span>1</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-background border border-border p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Monthly earnings
          </p>
          <p className="text-3xl font-bold text-foreground">
            ${monthlyTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {referrals} &times; ${monthlyPerReferral.toFixed(2)}/mo
          </p>
        </div>
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary mb-1">
            Yearly earnings
          </p>
          <p className="text-3xl font-bold text-primary">
            ${yearlyTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ${monthlyTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo &times; 12
          </p>
        </div>
      </div>
    </div>
  );
}
