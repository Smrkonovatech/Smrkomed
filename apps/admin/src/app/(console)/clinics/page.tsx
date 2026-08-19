"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/page-state";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchClinics } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function ClinicsPage() {
  const [q, setQ] = useState("");
  const params = useMemo(() => new URLSearchParams({ page: "1", pageSize: "25", q }).toString(), [q]);
  const { data, error, loading } = useAsync(() => fetchClinics(params), [params]);

  return (
    <div>
      <PageHeader title="Clinics" description="Inspect clinics without changing tenant ownership." />
      <Input className="mb-4 max-w-sm" placeholder="Search name or city…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} /> : null}
      {data && data.items.length === 0 ? <EmptyState label="No clinics yet." /> : null}
      {data && data.items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clinic</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Branches</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Patients</TableHead>
              <TableHead>Leads</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((clinic) => {
              const org = clinic["organization"] as { name: string };
              return (
                <TableRow key={String(clinic["id"])}>
                  <TableCell>
                    <Link className="font-medium text-primary hover:underline" href={`/clinics/${String(clinic["id"])}`}>
                      {String(clinic["name"])}
                    </Link>
                  </TableCell>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{String(clinic["city"] ?? "—")}</TableCell>
                  <TableCell>{String(clinic["branchCount"])}</TableCell>
                  <TableCell>{String(clinic["userCount"])}</TableCell>
                  <TableCell>{String(clinic["patientCount"])}</TableCell>
                  <TableCell>{String(clinic["leadCount"])}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
