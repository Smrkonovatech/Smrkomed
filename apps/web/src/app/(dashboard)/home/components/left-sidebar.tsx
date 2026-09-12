import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

const cards = [
  {
    title: "Today's",
    subtitle: "Appointments",
    icon: "/images/dashboard/calender.svg",
    value: "08",
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
    value: "42",
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
    value: "18",
    color: "blue",
    bgClass: "bg-blue-100/50 hover:bg-blue-100",
    textClass: "text-blue-800",
    valueClass: "text-blue-500",
    btnClass: "bg-blue-500 hover:bg-blue-600",
  },
];

export function LeftSidebar() {
  return (
    <div className="flex flex-col gap-2.5 h-full">
      {cards.map((card, index) => (
        <div key={index} className="relative group flex-1">
          {/* Card background with polygon clip-path to create the bottom-right cutout */}
          <div
            className={`rounded-3xl p-3 xl:p-4 transition-colors ${card.bgClass} h-full min-h-[120px] xl:min-h-[140px]`}
          // style={{
          //   width: "222px",
          //   clipPath:
          //     "polygon(0 0, 100% 0, 100% calc(100% - 56px), calc(100% - 56px) 100%, 0 100%)",
          // }}
          >
            <div className="flex justify-between items-start">
              <span className={`${card.textClass} font-medium text-sm leading-snug`}>
                {card.title}<br />{card.subtitle}
              </span>
              <div className="w-5 h-5 relative opacity-70 mt-0.5">
                <Image src={card.icon} alt={card.title} fill className="object-contain" />
              </div>
            </div>
            <div className={`text-[48px] xl:text-[56px] font-medium tracking-tight ${card.valueClass} mt-2 mb-1 leading-none`}>
              {card.value}
            </div>
          </div>

          {/* Floating Action Button positioned in the cutout space */}
          <button
            className={`absolute bottom-0 right-0 ${card.btnClass} text-white 
    w-14 h-14 flex items-center justify-center rounded-full 
    transition-transform group-hover:scale-105 shadow-sm`}
          >
            <ArrowUpRight className="w-6 h-6" />
          </button>
        </div>
      ))}
    </div>
  );
}
