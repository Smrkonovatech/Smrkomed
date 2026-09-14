"use client";

import { Download, Printer, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DischargeSummaryPreview() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Discharge Summary Document</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="size-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="size-4" />
            Download PDF
          </Button>
          <Button size="sm" className="gap-2">
            <Send className="size-4" />
            Send to Patient
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 bg-muted/30 flex justify-center">
        
        {/* Document Preview styling */}
        <div className="bg-white border shadow-sm w-full max-w-[600px] p-8 space-y-6 text-sm text-black">
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold tracking-[0.16em] text-primary">SMRKOMED</h2>
            <p className="text-muted-foreground mt-1 text-xs">A Smrkonova Technology Hospital</p>
            <h3 className="text-lg font-bold mt-4">DISCHARGE SUMMARY</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="font-bold">Patient Name:</span> Ananya Sharma</p>
              <p><span className="font-bold">Age/Sex:</span> 32 / Female</p>
              <p><span className="font-bold">MRN:</span> 10452</p>
            </div>
            <div>
              <p><span className="font-bold">Date of Admission:</span> 16 Sep 2026</p>
              <p><span className="font-bold">Date of Discharge:</span> 18 Sep 2026</p>
              <p><span className="font-bold">Consultant:</span> Dr. Shreya</p>
            </div>
          </div>
          
          <div className="space-y-6 pt-4 border-t border-dashed">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold underline">DIAGNOSIS</h4>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-sm">✨ AI PREPARED</span>
              </div>
              <p>Primary Infertility, PCOS</p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold underline">PROCEDURES</h4>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-sm">✨ AI PREPARED</span>
              </div>
              <p>Oocyte Pick Up (OPU) performed on 16 Sep 2026 under general anesthesia.</p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold underline">CLINICAL SUMMARY</h4>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-sm">✨ AI PREPARED</span>
              </div>
              <p>The patient presented for a planned IVF stimulation cycle. The procedure was completed without complications. Vital signs remained stable throughout observation.</p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold underline">DISCHARGE MEDICATIONS</h4>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-sm">✨ AI PREPARED</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Folic Acid 5mg - OD (Morning) x 30 days</li>
                <li>Doxycycline 100mg - BD (After meals) x 5 days</li>
                <li>Paracetamol 500mg - SOS (For pain) x 3 days</li>
              </ul>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold underline">FOLLOW-UP PLAN</h4>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-sm">✨ AI PREPARED</span>
              </div>
              <p>Review in OPD on 23 Sep 2026. Please contact the clinic immediately in case of severe pain, fever, or heavy bleeding.</p>
            </div>
          </div>
          
          <div className="pt-16 pb-4 flex justify-between items-end border-b border-dashed">
            <div>
              <p className="font-bold">Prepared by</p>
              <p className="text-muted-foreground mt-4 text-xs">Admin Team</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-emerald-700 italic text-lg mb-2">Approved by Dr. Shreya</p>
              <p className="font-bold">Consultant Signature</p>
            </div>
          </div>
          
          <div className="text-center text-xs text-muted-foreground pt-2">
            Generated by SmrkoMed
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
