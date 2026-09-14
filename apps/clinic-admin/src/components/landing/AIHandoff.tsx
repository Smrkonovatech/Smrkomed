"use client";

import { Bot, UserCheck, Stethoscope, ArrowDown } from "lucide-react";

export function AIHandoff() {
  return (
    <section className="py-12 sm:py-16 bg-slate-50 border-y border-slate-200/80">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          AI knows when to hand over.
        </h3>
        
        <p className="mt-2 text-sm sm:text-base text-slate-600 font-medium">
          Automation where it helps. People where it matters.
        </p>

        {/* 3 Connected Tiers */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          
          {/* Tier 1: AI */}
          <div className="flex-1 w-full max-w-xs rounded-2xl border border-purple-200 bg-white p-5 shadow-sm">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Bot className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-bold text-slate-900">AI</div>
            <div className="text-xs text-slate-500 mt-1">Resolves routine questions</div>
          </div>

          <div className="hidden sm:block text-slate-300 font-bold text-xl">→</div>
          <div className="sm:hidden text-slate-300"><ArrowDown className="h-4 w-4 mx-auto" /></div>

          {/* Tier 2: Care Team */}
          <div className="flex-1 w-full max-w-xs rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-bold text-slate-900">CARE TEAM</div>
            <div className="text-xs text-slate-500 mt-1">Handles operational requests</div>
          </div>

          <div className="hidden sm:block text-slate-300 font-bold text-xl">→</div>
          <div className="sm:hidden text-slate-300"><ArrowDown className="h-4 w-4 mx-auto" /></div>

          {/* Tier 3: Doctor */}
          <div className="flex-1 w-full max-w-xs rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-bold text-slate-900">DOCTOR</div>
            <div className="text-xs text-slate-500 mt-1">Clinical decisions</div>
          </div>

        </div>

      </div>
    </section>
  );
}
