"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useAppState } from "@/lib/app-state";

export function LeftSidebar() {
  const { appointments, kpis, exceptions } = useAppState();

  console.log("check", appointments)

  const cards = [
    {
      title: "Today's",
      subtitle: "Appointments",
      icon: "/images/dashboard/calender.svg",
      value: String(appointments.length).padStart(2, '0'),
      color: "indigo",
      bgClass: "bg-indigo-100/50 hover:bg-indigo-100",
      textClass: "text-indigo-800",
      valueClass: "text-indigo-500",
      btnClass: "bg-indigo-500 hover:bg-indigo-600",
    },
    {
      title: "Patients",
      subtitle: "under care",
      icon: "/images/dashboard/heart.svg",
      value: String(kpis.active).padStart(2, '0'),
      color: "purple",
      bgClass: "bg-purple-100/50 hover:bg-purple-100",
      textClass: "text-purple-800",
      valueClass: "text-purple-400",
      btnClass: "bg-purple-400 hover:bg-purple-500",
    },
    {
      title: "Needs",
      subtitle: "Attention",
      icon: "/images/dashboard/info.svg",
      value: String(exceptions.length).padStart(2, '0'),
      color: "blue",
      bgClass: "bg-blue-100/50 hover:bg-blue-100",
      textClass: "text-blue-800",
      valueClass: "text-blue-500",
      btnClass: "bg-blue-500 hover:bg-blue-600",
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 h-full">
      {cards.map((card, index) => (
        <div key={index} className="relative group flex-1">
          {/* Card background */}
          <div
            className={`rounded-3xl transition-colors ${card.bgClass} h-full p-[clamp(0.75rem,1.5vw,1.25rem)] min-h-[clamp(7rem,12vh,10rem)]`}
          >
            <div className="flex justify-between items-start">
              <span className={`${card.textClass} font-medium leading-snug text-[clamp(0.7rem,1.1vw,0.9rem)]`}>
                {card.title}<br />{card.subtitle}
              </span>
              <div className="relative opacity-70 mt-0.5 shrink-0 w-[clamp(1rem,1.5vw,1.4rem)] h-[clamp(1rem,1.5vw,1.4rem)]">
                <Image src={card.icon} alt={card.title} fill className="object-contain" />
              </div>
            </div>
            <div className={`font-medium tracking-tight ${card.valueClass} leading-none text-[clamp(2rem,4vw,3.5rem)] mt-[clamp(0.5rem,1vh,1rem)]`}>
              {card.value}
            </div>
          </div>

          {/* Floating Action Button */}
          <button
            className={`absolute bottom-0 right-0 ${card.btnClass} text-white flex items-center justify-center rounded-full transition-transform group-hover:scale-105 shadow-sm w-[clamp(2.5rem,4vw,3.5rem)] h-[clamp(2.5rem,4vw,3.5rem)]`}
          >
            <ArrowUpRight className="w-[clamp(1rem,1.5vw,1.5rem)] h-[clamp(1rem,1.5vw,1.5rem)]" />
          </button>
        </div>
      ))}
    </div>
  );
}
