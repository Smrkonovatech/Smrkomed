"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function InvestigationSummary() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Investigation Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investigation</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reviewed By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Complete Blood Count</TableCell>
              <TableCell>18 Sep 2026</TableCell>
              <TableCell>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Reviewed</Badge>
              </TableCell>
              <TableCell>Dr. Shreya</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Ultrasound Pelvis</TableCell>
              <TableCell>18 Sep 2026</TableCell>
              <TableCell>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Reviewed</Badge>
              </TableCell>
              <TableCell>Dr. Shreya</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
