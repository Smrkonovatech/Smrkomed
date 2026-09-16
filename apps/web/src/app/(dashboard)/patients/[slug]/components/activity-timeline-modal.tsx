"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, Clock, CheckCircle2 } from "lucide-react";

interface ActivityTimelineModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  p360?: any;
}

export function ActivityTimelineModal({
  isOpen,
  onOpenChange,
  p360,
}: ActivityTimelineModalProps) {
  const activities = p360?.timeline?.items || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#866BE3]/10 text-[#866BE3] flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Patient Unified Activity Timeline
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Chronological log of appointments, tasks, diagnostics, and communication
            </p>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {activities.length > 0 ? (
            <div className="relative pl-6 space-y-4 border-l-2 border-purple-100 ml-2">
              {activities.map((item: any, idx: number) => {
                const dateStr = item.date
                  ? new Date(item.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Recent activity";

                return (
                  <div key={item.id || idx} className="relative group">
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#866BE3] group-hover:scale-125 transition-transform" />
                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900">{item.title}</span>
                        <span className="text-[10px] text-gray-400">{dateStr}</span>
                      </div>
                      {item.content && (
                        <p className="text-gray-600 text-[11px] leading-relaxed mt-1">
                          {item.content}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-gray-500">
                          {item.type || item.sourceModule || "Activity"}
                        </Badge>
                        {item.actor && (
                          <span className="text-[10px] text-gray-400">• By {item.actor}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed rounded-xl border-gray-200">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-600">No activities recorded yet</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
