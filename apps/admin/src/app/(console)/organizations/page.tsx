"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchOrganizations } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function OrganizationsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const params = useMemo(() => new URLSearchParams({ page: String(page), pageSize: "25", q }).toString(), [page, q]);
  const { data, error, loading } = useAsync(() => fetchOrganizations(params), [params]);

  return (
    <div>
      <PageHeader title="Organizations" description="Customer organizations. Deactivate instead of deleting." />
      <Input
        className="mb-4 max-w-sm"
        placeholder="Search name…"
        value={q}
        onChange={(e) => {
          setPage(1);
          setQ(e.target.value);
        }}
      />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} /> : null}
      {data && data.items.length === 0 ? <EmptyState label="No organizations yet." /> : null}
      {data && data.items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clinics</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((org) => (
              <TableRow key={String(org["id"])}>
                <TableCell>
                  <Link className="font-medium text-primary hover:underline" href={`/organizations/${String(org["id"])}`}>
                    {String(org["name"])}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge value={String(org["status"])} />
                </TableCell>
                <TableCell>{String(org["clinicCount"])}</TableCell>
                <TableCell>{String(org["userCount"])}</TableCell>
                <TableCell>{org["subscription"] ? String((org["subscription"] as { status: string }).status) : "—"}</TableCell>
                <TableCell>{new Date(String(org["createdAt"])).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      {data && data.totalPages > 1 ? (
        <button className="mt-4 text-sm text-primary" type="button" onClick={() => setPage((p) => p + 1)}>
          Next page
        </button>
      ) : null}
    </div>
  );
}
