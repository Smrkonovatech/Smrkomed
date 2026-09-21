"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { User, Calendar, Activity, HeartPulse, MessageSquare, PlusCircle, Stethoscope } from "lucide-react";

export function MainOverview() {
    const { data: session } = useSession();
    const firstName = session?.user?.name?.split(" ")[0] || "Rohan";
    const [hoveredNode, setHoveredNode] = useState<number | null>(null);

    const orbitNodes = [
        { 
            id: 1, label: "Staff", value: "318 Total", icon: User, angle: 180,
            popupPosition: "left-[115%] top-1/2 -translate-y-1/2",
            popupData: {
                title: "Staff Overview", subtitle: "318 total active",
                stats: [
                    { label: "Doctors", value: 45, color: "bg-[#3B82F6]" },
                    { label: "Nurses", value: 120, color: "bg-[#10B981]" },
                    { label: "Admin/Support", value: 141, color: "bg-[#FBBF24]" },
                    { label: "On Leave", value: 12, color: "bg-[#EF4444]" }
                ],
                progress: { percent: 92, color: "#10B981", label: "Attendance", subLabel: "290 staff present today", trend: "↑ 2%" },
                buttonText: "View Staff Directory"
            }
        },
        { 
            id: 2, label: "Insurance Claims", value: "8 Today", icon: Calendar, angle: 150,
            popupPosition: "left-[115%] top-1/2 -translate-y-1/2",
            popupData: {
                title: "Insurance Claims", subtitle: "Monthly snapshot",
                stats: [
                    { label: "Approved", value: 142, color: "bg-[#10B981]" },
                    { label: "Pending", value: 28, color: "bg-[#FBBF24]" },
                    { label: "Rejected", value: 5, color: "bg-[#EF4444]" },
                    { label: "Queries Raised", value: 12, color: "bg-[#866BE3]" }
                ],
                progress: { percent: 85, color: "#10B981", label: "Approval Rate", subLabel: "Average this month", trend: "↑ 5%" },
                buttonText: "Go to Claims"
            }
        },
        { 
            id: 3, label: "Active Journeys", value: "86 Active", icon: Activity, angle: 120,
            popupPosition: "left-[115%] top-0",
            popupData: {
                title: "Active Journeys", subtitle: "86 ongoing treatments",
                stats: [
                    { label: "IVF Cycles", value: 42, color: "bg-[#866BE3]" },
                    { label: "IUI Cycles", value: 24, color: "bg-[#3B82F6]" },
                    { label: "Consultation Phase", value: 15, color: "bg-[#10B981]" },
                    { label: "Paused/On Hold", value: 5, color: "bg-[#FBBF24]" }
                ],
                progress: { percent: 78, color: "#866BE3", label: "Success Rate", subLabel: "Overall tracking", trend: "↑ 4%" },
                buttonText: "View All Journeys"
            }
        },
        { 
            id: 4, label: "Care Loop", value: "124 Active Tasks", icon: HeartPulse, angle: 90,
            popupPosition: "left-[115%] -top-1/2",
            popupData: {
                title: "Care Loop", subtitle: "124 active tasks",
                stats: [
                    { label: "Due today", value: 42, color: "bg-[#FBBF24]" },
                    { label: "Awaiting patient", value: 18, color: "bg-[#3B82F6]" },
                    { label: "Overdue", value: 9, color: "bg-[#FB7185]" },
                    { label: "Escalated", value: 4, color: "bg-[#EF4444]" }
                ],
                progress: { percent: 72, color: "#059669", label: "On track", subLabel: "51 tasks completed today", trend: "↑ 12%" },
                buttonText: "Open Care Loop",
                href: "/care-loop"
            }
        },
        { 
            id: 5, label: "Communication", value: "124 WhatsApp", icon: MessageSquare, angle: 60,
            popupPosition: "right-[115%] top-0",
            popupData: {
                title: "Communications", subtitle: "WhatsApp & SMS",
                stats: [
                    { label: "Unread Messages", value: 42, color: "bg-[#EF4444]" },
                    { label: "Follow-ups Needed", value: 35, color: "bg-[#FBBF24]" },
                    { label: "Resolved Today", value: 145, color: "bg-[#10B981]" },
                    { label: "Broadcasts Sent", value: 4, color: "bg-[#866BE3]" }
                ],
                progress: { percent: 95, color: "#10B981", label: "Response Rate", subLabel: "Avg 5 min reply time", trend: "↑ 1%" },
                buttonText: "Open Inbox"
            }
        },
        { 
            id: 6, label: "Pharmacy", value: "4 Low stock", icon: PlusCircle, angle: 30,
            popupPosition: "right-[115%] top-1/2 -translate-y-1/2",
            popupData: {
                title: "Pharmacy", subtitle: "Inventory status",
                stats: [
                    { label: "In Stock", value: 1240, color: "bg-[#10B981]" },
                    { label: "Low Stock", value: 14, color: "bg-[#FBBF24]" },
                    { label: "Out of Stock", value: 4, color: "bg-[#EF4444]" },
                    { label: "Expiring Soon", value: 8, color: "bg-[#866BE3]" }
                ],
                progress: { percent: 98, color: "#10B981", label: "Availability", subLabel: "Essential medications", trend: "↑ 2%" },
                buttonText: "Manage Inventory"
            }
        },
        { 
            id: 7, label: "Diagnostics", value: "318 Total", icon: Stethoscope, angle: 0,
            popupPosition: "right-[115%] top-1/2 -translate-y-1/2",
            popupData: {
                title: "Diagnostics", subtitle: "Lab processing",
                stats: [
                    { label: "Completed", value: 156, color: "bg-[#10B981]" },
                    { label: "Pending Results", value: 42, color: "bg-[#FBBF24]" },
                    { label: "Critical Findings", value: 5, color: "bg-[#EF4444]" },
                    { label: "Dispatched", value: 89, color: "bg-[#3B82F6]" }
                ],
                progress: { percent: 88, color: "#3B82F6", label: "SLA Met", subLabel: "Reports delivered on time", trend: "↑ 6%" },
                buttonText: "View Dashboard"
            }
        },
    ];

    return (
        <div className="flex flex-col h-full bg-[#f8f9fc] rounded-3xl p-6 relative overflow-hidden">
            {/* Header */}
            <div className="mb-8 z-10">
                <h1 className="text-2xl lg:text-3xl font-bold text-[#1a1c29] tracking-tight" suppressHydrationWarning>
                    Welcome back {firstName},
                </h1>
                <p className="text-gray-500 mt-1 text-sm lg:text-base font-medium">
                    Here's the real-time view of your clinic operations
                </p>
            </div>

            {/* Main Graphic Area */}
            <div className="flex-1 relative mt-4 min-h-[400px] flex items-end justify-center w-full">

                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[80%] max-w-[700px] aspect-[2/1]">

                    {/* The Dome Graphic */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Image 
                            src="/images/dashboard/ring.png"
                            alt="Dashboard Ring"
                            fill
                            className="object-contain object-bottom"
                            priority
                        />
                    </div>

                    {/* Orbiting Nodes */}
                    {orbitNodes.map((node) => {
                        const radius = 60; // percentage of container width/2
                        const rad = (node.angle * Math.PI) / 180;
                        const x = Math.cos(rad) * radius;
                        const y = Math.sin(rad) * radius;

                        const isHovered = hoveredNode === node.id;
                        const pData = node.popupData;

                        return (
                            <div
                                key={node.id}
                                className={`absolute flex flex-col items-center justify-center transform -translate-x-1/2 translate-y-1/2 cursor-default ${isHovered ? 'z-50' : 'z-30'}`}
                                style={{
                                    left: `${50 + x}%`,
                                    bottom: `${y * 2}%`,
                                    width: '120px'
                                }}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 mb-2 transition-transform hover:scale-110">
                                        <node.icon className="w-5 h-5 lg:w-6 lg:h-6 text-[#866BE3]" />
                                    </div>
                                    
                                    {/* Generic Hover Popup */}
                                    {isHovered && (
                                        <div className={`absolute ${node.popupPosition} bg-white rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100 p-5 w-[260px] z-50 animate-in fade-in zoom-in-95 duration-200`}>
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-[14px] bg-[#F4F0FC] flex items-center justify-center shrink-0">
                                                        <node.icon className="w-5 h-5 text-[#866BE3]" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[#1a1c29] font-bold text-[15px] leading-tight">{pData.title}</h3>
                                                        <p className="text-gray-400 text-[11px] mt-0.5">{pData.subtitle}</p>
                                                    </div>
                                                </div>
                                                <button className="text-gray-400 hover:text-gray-600 mt-1">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>

                                            {/* List */}
                                            <div className="flex flex-col gap-3 mb-4">
                                                {pData.stats.map((stat, i) => (
                                                    <div key={i} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`w-2 h-2 rounded-full ${stat.color}`}></div>
                                                            <span className="text-[12px] font-medium text-[#475569]">{stat.label}</span>
                                                        </div>
                                                        <span className="text-[13px] font-bold text-[#1a1c29]">{stat.value}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Progress Card */}
                                            <div className="bg-[#F8FAFC] rounded-2xl p-3 flex items-center gap-3 mb-3 border border-gray-50">
                                                <div className="relative w-10 h-10 shrink-0">
                                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                                        <circle cx="50" cy="50" r="40" fill="none" stroke="#E2E8F0" strokeWidth="12" />
                                                        <circle cx="50" cy="50" r="40" fill="none" stroke={pData.progress.color} strokeWidth="12" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - pData.progress.percent/100)} strokeLinecap="round" />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-[10px] font-bold text-[#1a1c29]">{pData.progress.percent}%</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-bold text-[#1a1c29]">{pData.progress.label}</span>
                                                    <span className="text-[10px] text-gray-500 leading-tight mt-0.5">{pData.progress.subLabel}</span>
                                                    <span className="text-[9px] font-bold text-[#059669] mt-1 flex items-center gap-0.5">{pData.progress.trend}</span>
                                                </div>
                                            </div>

                                            {/* Button */}
                                            <Link href={(pData as any).href || "/care-loop"} className="w-full py-2.5 border border-[#E2E8F0] rounded-xl text-[12px] font-bold text-[#866BE3] hover:bg-[#F4F0FC]/50 transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                                {pData.buttonText} <span className="text-[14px] leading-none">→</span>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] lg:text-[13px] font-bold text-[#1a1c29] text-center leading-tight whitespace-nowrap">{node.label}</span>
                                <span className="text-[10px] lg:text-[11px] font-medium text-gray-500 mt-0.5 whitespace-nowrap">{node.value}</span>
                            </div>
                        );
                    })}

                    {/* Center Content */}
                    <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 flex flex-col items-center text-center z-30">
                        <User className="w-6 h-6 lg:w-8 lg:h-8 text-[#866BE3] mb-1 opacity-70" />
                        <h2 className="text-5xl lg:text-7xl font-bold text-[#342766] leading-none tracking-tight">318</h2>
                        <p className="text-[#1a1c29] font-medium text-lg lg:text-xl mt-1">Total Patients</p>
                    </div>

                    {/* Live Activity Button */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40">
                        <Link href="/care-loop" className="bg-white px-5 py-2.5 lg:px-6 lg:py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 flex items-center gap-2 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-shadow cursor-pointer">
                            <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-[#00A89D]" />
                            <span className="text-sm lg:text-base font-semibold text-[#1a1c29]">Live clinic activity</span>
                        </Link>
                    </div>
                </div>

            </div>

            {/* Footer Text */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full text-center z-10">
                <p className="text-gray-500 font-medium text-sm lg:text-base">Everything connected for better care</p>
            </div>
        </div>
    );
}
