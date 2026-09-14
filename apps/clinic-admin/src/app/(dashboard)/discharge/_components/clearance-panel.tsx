"use client";

import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ClearancePanel() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Clearance Status</CardTitle>
        <CardDescription>Departmental sign-offs required for discharge</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        
        <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Clinical</p>
              <p className="text-xs text-muted-foreground">Doctor review complete</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600">CLEARED</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium">Billing</p>
              <p className="text-xs text-muted-foreground">₹4,500 pending payment</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs border-orange-500/50 text-orange-600 hover:bg-orange-500/10">
            Resolve
          </Button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Insurance</p>
              <p className="text-xs text-muted-foreground">Claim authorized</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600">CLEARED</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Pharmacy</p>
              <p className="text-xs text-muted-foreground">Medications dispensed</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600">CLEARED</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Documents</p>
              <p className="text-xs text-muted-foreground">All required forms signed</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600">CLEARED</span>
        </div>

      </CardContent>
    </Card>
  );
}
