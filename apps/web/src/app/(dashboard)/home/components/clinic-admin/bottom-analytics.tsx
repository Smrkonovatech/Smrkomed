"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, User, Calendar, Banknote, FileText } from "lucide-react";

// Simple custom dropdown component
function Dropdown({ options, value, onChange, align = "right" }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-gray-500 text-[12px] font-medium border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors"
      >
        {value} <ChevronDown className="w-3.5 h-3.5 ml-1" />
      </button>
      
      {isOpen && (
        <div className={`absolute top-full mt-1 ${align === "right" ? "right-0" : "left-0"} bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl py-1 z-50 min-w-[120px] overflow-hidden`}>
          {options.map((opt: string) => (
            <button
              key={opt}
              className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 transition-colors ${value === opt ? 'text-[#866BE3] font-semibold bg-indigo-50/30' : 'text-gray-600 font-medium'}`}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BottomAnalytics() {
  const [patientFilter, setPatientFilter] = useState("Last 6 months");
  const [apptFilter, setApptFilter] = useState("This week");
  const [revenueFilter, setRevenueFilter] = useState("This month");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full min-h-[280px]">
      
      {/* Patient Growth */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#F4F0FC] flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-[#866BE3]" />
            </div>
            <h3 className="text-[#1a1c29] font-bold text-[14px]">Patient Growth</h3>
          </div>
          <Dropdown 
            value={patientFilter} 
            onChange={setPatientFilter} 
            options={["Last 6 months", "This year", "Last year"]} 
          />
        </div>

        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-200"></div>
            <span className="text-[12px] text-gray-500 font-medium">New patients</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#866BE3]"></div>
            <span className="text-[12px] text-gray-500 font-medium">Returning Patients</span>
          </div>
        </div>

        <div className="flex-1 relative flex flex-col justify-end pt-2 mt-auto">
          {/* Horizontal grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 z-0">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-full border-t border-gray-100/60"></div>
            ))}
          </div>

          <div className="flex justify-between items-end px-1 gap-1 relative z-10">
            {[
              { month: 'Jan', new: 45, returning: 80 },
              { month: 'Mar', new: 75, returning: 55 },
              { month: 'May', new: 25, returning: 70 },
              { month: 'Jul', new: 60, returning: 60 },
              { month: 'Sep', new: 50, returning: 75 },
              { month: 'Nov', new: 85, returning: 55 },
              { month: 'Dec', new: 45, returning: 65 },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
                <div className="flex items-end gap-0.5 w-full h-[100px] justify-center">
                  <div 
                    className="w-[8px] bg-[#E2E8F0] rounded-t-[2px] transition-all group-hover:bg-[#CBD5E1]" 
                    style={{ height: `${item.new}%` }}
                  ></div>
                  <div 
                    className="w-[8px] bg-[#866BE3] rounded-t-[2px] transition-all group-hover:bg-[#7254d1]" 
                    style={{ height: `${item.returning}%` }}
                  ></div>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointment Overview */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#F4F0FC] flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-[#866BE3]" />
            </div>
            <h3 className="text-[#1a1c29] font-bold text-[14px]">Appointment overview</h3>
          </div>
          <Dropdown 
            value={apptFilter} 
            onChange={setApptFilter} 
            options={["This week", "Last week", "This month"]} 
          />
        </div>

        <div className="flex-1 flex items-center justify-between mt-2 pl-2">
          {/* Donut Chart */}
          <div className="relative w-[120px] h-[120px] shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {/* Green (25%) */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="63 200.9" strokeLinecap="round" />
              {/* Purple (25%) */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="#866BE3" strokeWidth="12" strokeDasharray="63 200.9" strokeDashoffset="-66" strokeLinecap="round" />
              {/* Orange (25%) */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="63 200.9" strokeDashoffset="-132" strokeLinecap="round" />
              {/* Blue (25%) */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="63 200.9" strokeDashoffset="-198" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[24px] font-bold text-[#1a1c29] leading-none">142</span>
              <span className="text-[10px] text-gray-500 font-medium mt-1">Total Claims</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2.5 ml-3">
            {[
              { label: 'Consultation', val: '18', color: 'bg-[#866BE3]' },
              { label: 'Scab', val: '18', color: 'bg-[#F59E0B]' },
              { label: 'Follow-up', val: '18', color: 'bg-[#3B82F6]' },
              { label: 'Procedure', val: '18', color: 'bg-[#10B981]' },
              { label: 'Teleconsultation', val: '18', color: 'bg-[#10B981]' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
                <span className="text-[11px] text-gray-500 font-medium min-w-[85px]">{item.label}</span>
                <span className="text-[12px] font-bold text-[#1a1c29]">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue & Collection */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#F4F0FC] flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5 text-[#866BE3]" />
            </div>
            <h3 className="text-[#1a1c29] font-bold text-[14px]">Revenue & Collection</h3>
          </div>
          <Dropdown 
            value={revenueFilter} 
            onChange={setRevenueFilter} 
            options={["This month", "Last month", "This quarter"]} 
          />
        </div>

        <div className="flex items-end justify-between mt-2 z-10 relative">
          <div>
            <p className="text-[11px] text-[#A0ABC0] font-medium tracking-wide">Total Revenue</p>
            <h2 className="text-[24px] font-bold text-[#1a1c29] mt-0.5">₹12,40,000</h2>
          </div>
          <div className="flex items-center gap-1 text-[#10B981] font-bold text-[13px] mb-1">
            ↑ 15% <span className="text-gray-500 font-medium text-[11px] ml-0.5">last month</span>
          </div>
        </div>

        {/* Line Chart */}
        <div className="flex-1 mt-2 relative w-full h-[90px]">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full overflow-visible absolute inset-0 -top-4">
            <defs>
              <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path 
              d="M 0 35 L 5 32 L 15 34 L 20 28 L 28 32 L 35 22 L 45 25 L 50 32 L 60 32 L 65 24 L 70 18 L 78 20 L 85 25 L 90 28 L 95 24 L 100 8 L 100 40 L 0 40 Z" 
              fill="url(#revenue-grad)" 
            />
            <path 
              d="M 0 35 L 5 32 L 15 34 L 20 28 L 28 32 L 35 22 L 45 25 L 50 32 L 60 32 L 65 24 L 70 18 L 78 20 L 85 25 L 90 28 L 95 24 L 100 8" 
              fill="none" 
              stroke="#10B981" 
              strokeWidth="1.5" 
              strokeLinejoin="round" 
              strokeLinecap="round" 
            />
          </svg>
          
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 bg-white pt-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day} className="text-[10px] text-gray-400 font-medium">{day}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Insurance & Claims */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#F4F0FC] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-[#866BE3]" />
            </div>
            <h3 className="text-[#1a1c29] font-bold text-[14px]">Insurance & Claims</h3>
          </div>
          <Link href="/insurance" className="text-[#866BE3] font-semibold text-[13px] hover:underline">View all</Link>
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1 mt-1">
          {/* Pre-auth Pending */}
          <div className="bg-[#FFFDF0] rounded-2xl border border-[#FEF3C7] flex flex-col items-center justify-center p-3 transition-transform hover:-translate-y-0.5">
            <span className="text-[24px] font-bold text-[#D97706] leading-none mb-1.5">8</span>
            <span className="text-[11px] text-gray-500 font-medium text-center leading-tight">Pre-auth<br/>Pending</span>
          </div>
          
          {/* Claims Processing */}
          <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex flex-col items-center justify-center p-3 transition-transform hover:-translate-y-0.5">
            <span className="text-[24px] font-bold text-[#2563EB] leading-none mb-1.5">12</span>
            <span className="text-[11px] text-gray-500 font-medium text-center leading-tight">Claims<br/>Processing</span>
          </div>
          
          {/* Queries */}
          <div className="bg-[#FFF5F5] rounded-2xl border border-[#FEE2E2] flex flex-col items-center justify-center p-3 transition-transform hover:-translate-y-0.5">
            <span className="text-[24px] font-bold text-[#E11D48] leading-none mb-1.5">3</span>
            <span className="text-[11px] text-gray-500 font-medium text-center">Queries</span>
          </div>
          
          {/* Approved */}
          <div className="bg-[#F0FDF4] rounded-2xl border border-[#DCFCE7] flex flex-col items-center justify-center p-3 transition-transform hover:-translate-y-0.5 relative">
            <span className="text-[24px] font-bold text-[#059669] leading-none mb-1.5">26</span>
            <span className="text-[11px] text-gray-500 font-medium text-center">Approved</span>
            <span className="text-[9px] text-[#A0ABC0] font-medium absolute bottom-1.5">(This Month)</span>
          </div>
        </div>
      </div>

    </div>
  );
}
