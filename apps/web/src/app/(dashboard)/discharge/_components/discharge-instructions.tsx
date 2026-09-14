"use client";

import { Edit, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DischargeInstructions() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <FileText className="size-5" />
          Discharge Instructions
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="size-4" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        <div>
          <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-2">GENERAL INSTRUCTIONS</h4>
          <p className="text-sm">Rest for 24-48 hours. Drink plenty of fluids (2-3 liters/day).</p>
        </div>
        
        <div>
          <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-2">DIET / LIFESTYLE</h4>
          <p className="text-sm">Normal diet as tolerated. Avoid spicy or heavy meals for the first 24 hours.</p>
        </div>
        
        <div>
          <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-2">ACTIVITY</h4>
          <p className="text-sm">Avoid strenuous activities, heavy lifting, or vigorous exercise for the next 7 days.</p>
        </div>
        
        <div className="bg-rose-50 p-4 rounded-md border border-rose-100">
          <h4 className="text-xs font-bold text-rose-700 tracking-wider mb-2">WARNING SIGNS (CONTACT CLINIC IMMEDIATELY)</h4>
          <ul className="list-disc list-inside text-sm text-rose-900 space-y-1">
            <li>Severe abdominal pain not relieved by medication</li>
            <li>Heavy vaginal bleeding</li>
            <li>Fever &gt; 100.4°F (38°C)</li>
            <li>Difficulty breathing or severe nausea/vomiting</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
