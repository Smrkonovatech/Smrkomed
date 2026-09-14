"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const CHECKLIST = [
  {
    category: "CLINICAL",
    items: [
      { id: "c1", label: "Clinical summary completed", checked: true },
      { id: "c2", label: "Diagnosis confirmed", checked: true },
      { id: "c3", label: "Procedure/treatment recorded", checked: true },
      { id: "c4", label: "Investigations reviewed", checked: true },
    ]
  },
  {
    category: "MEDICATION",
    items: [
      { id: "m1", label: "Current medications reviewed", checked: true },
      { id: "m2", label: "Discharge medications prepared", checked: true },
      { id: "m3", label: "Medication reconciliation completed", checked: true },
    ]
  },
  {
    category: "ADMINISTRATION",
    items: [
      { id: "a1", label: "Billing cleared", checked: false },
      { id: "a2", label: "Insurance cleared", checked: true },
      { id: "a3", label: "Pharmacy cleared", checked: true },
      { id: "a4", label: "Required documents completed", checked: true },
    ]
  },
  {
    category: "FOLLOW-UP",
    items: [
      { id: "f1", label: "Follow-up plan created", checked: true },
      { id: "f2", label: "Follow-up appointment scheduled", checked: true },
      { id: "f3", label: "Patient instructions prepared", checked: true },
    ]
  }
];

export function DischargeChecklist() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Discharge Checklist</CardTitle>
        <CardDescription>Step-by-step required actions</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {CHECKLIST.map((group, i) => (
          <div key={group.category}>
            {i > 0 && <Separator className="mb-4" />}
            <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-3">{group.category}</h4>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox id={item.id} defaultChecked={item.checked} />
                  <label 
                    htmlFor={item.id} 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
