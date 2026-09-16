"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw } from "lucide-react";
import { WhatsAppThread, type ChatMessage } from "@/components/whatsapp-thread";

interface WhatsAppConversationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  patientName: string;
}

export function WhatsAppConversationModal({
  isOpen,
  onOpenChange,
  messages,
  patientName,
}: WhatsAppConversationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl flex flex-col">
        <DialogHeader className="p-4 pb-3 border-b border-gray-100 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                WhatsApp Care Loop Conversation
              </DialogTitle>
              <p className="text-xs text-gray-500">
                Live communication channel with {patientName}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-4 bg-muted/20">
          <WhatsAppThread messages={messages} patientName={patientName} />
        </div>

        <DialogFooter className="p-3 bg-gray-50 border-t border-gray-100 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
