"use client";

import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function MedicationReconciliation() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Medication Reconciliation</CardTitle>
          <CardDescription>Review and prepare discharge medications</CardDescription>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✓ Reconciled</Badge>
      </CardHeader>
      <CardContent className="pt-4 space-y-8">
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-muted-foreground">CURRENT MEDICATIONS</h4>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Folic Acid</TableCell>
                  <TableCell>5mg</TableCell>
                  <TableCell>OD</TableCell>
                  <TableCell><Badge variant="outline" className="bg-muted">Continue</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground line-through">Letrozole</TableCell>
                  <TableCell className="text-muted-foreground">2.5mg</TableCell>
                  <TableCell className="text-muted-foreground">OD</TableCell>
                  <TableCell><Badge variant="outline" className="bg-rose-500/10 text-rose-600">Stop</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-primary">DISCHARGE MEDICATIONS</h4>
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <Plus className="size-3.5" />
              Add Medication
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-primary">Folic Acid</TableCell>
                  <TableCell>5mg</TableCell>
                  <TableCell>OD (Morning)</TableCell>
                  <TableCell>30 days</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">Edit</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-primary">Doxycycline</TableCell>
                  <TableCell>100mg</TableCell>
                  <TableCell>BD (After meals)</TableCell>
                  <TableCell>5 days</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">Edit</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-primary">Paracetamol</TableCell>
                  <TableCell>500mg</TableCell>
                  <TableCell>SOS (For pain)</TableCell>
                  <TableCell>3 days</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">Edit</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
