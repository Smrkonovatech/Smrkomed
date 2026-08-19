"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/page-state";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchUsers } from "@/lib/api/admin";
import { useAsync } from "@/lib/use-async";

export default function UsersPage() {
  const [q, setQ] = useState("");
  const params = useMemo(() => new URLSearchParams({ page: "1", pageSize: "25", q }).toString(), [q]);
  const { data, error, loading } = useAsync(() => fetchUsers(params), [params]);

  return (
    <div>
      <PageHeader title="Users" description="Staff accounts across organizations. Passwords are never shown." />
      <Input className="mb-4 max-w-sm" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} /> : null}
      {data && data.items.length === 0 ? <EmptyState label="No users found." /> : null}
      {data && data.items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((user) => {
              const org = user["organization"] as { name: string } | null;
              const clinic = user["clinic"] as { name: string } | null;
              return (
                <TableRow key={String(user["id"])}>
                  <TableCell>
                    <Link className="font-medium text-primary hover:underline" href={`/users/${String(user["id"])}`}>
                      {String(user["name"])}
                    </Link>
                  </TableCell>
                  <TableCell>{String(user["email"])}</TableCell>
                  <TableCell>{String(user["role"] ?? "—")}</TableCell>
                  <TableCell>{org?.name ?? "—"}</TableCell>
                  <TableCell>{clinic?.name ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge value={user["isActive"] ? "ACTIVE" : "DISABLED"} />
                  </TableCell>
                  <TableCell>{new Date(String(user["createdAt"])).toLocaleDateString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
