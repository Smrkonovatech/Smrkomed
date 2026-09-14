"use client";

import { Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ClinicalSummary() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Clinical Summary</CardTitle>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="size-4" />
          Edit Summary
        </Button>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        <div>
          <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-2">REASON FOR VISIT</h4>
          <p className="text-sm">Patient presented for planned IVF stimulation cycle and subsequent OPU.</p>
        </div>
        
        <div>
          <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-2">DIAGNOSIS</h4>
          <p className="text-sm">Primary Infertility, PCOS</p>
        </div>
        
        <div>
          <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-2">PROCEDURES / TREATMENT</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Controlled Ovarian Hyperstimulation (Antagonist protocol)</li>
            <li>Oocyte Pick Up (OPU) performed on 16 Sep 2026 under general anesthesia. 12 oocytes retrieved.</li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-2">CLINICAL COURSE</h4>
          <p className="text-sm text-muted-foreground">
            The patient tolerated the procedure well. No immediate postoperative complications. Vital signs remained stable throughout observation. Mild abdominal discomfort noted, managed with oral analgesics.
          </p>
        </div>
        
        <div>
          <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-2">CONDITION AT DISCHARGE</h4>
          <p className="text-sm">Stable, conscious, vitals normal. Discharged in the company of her husband.</p>
        </div>
      </CardContent>
    </Card>
  );
}
