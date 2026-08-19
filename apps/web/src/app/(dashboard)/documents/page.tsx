"use client";

import { Download, Eye, Search, Share2, Stethoscope, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useGlobalActions } from "@/components/actions/global-action-provider";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/app-state";
import {
  type DocumentItem,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const categories = ["All", "Scan", "Lab", "Prescriptions", "Consent", "Treatment", "Invoices", "Other"];

function categoryLabel(category: string) {
  if (category.startsWith("Scan")) return "Scan";
  if (category.startsWith("Lab")) return "Lab";
  if (category.startsWith("Treatment")) return "Treatment";
  return categories.includes(category) ? category : "Other";
}

function coupleName(
  coupleById: Map<string, { primary: { name: string }; partner?: { name: string } }>,
  coupleId: string,
) {
  const couple = coupleById.get(coupleId);
  if (!couple) return "Unknown couple";
  return couple.partner
    ? `${couple.primary.name.split(" ")[0]!} + ${couple.partner.name.split(" ")[0]!}`
    : couple.primary.name;
}

function downloadDocument(document: DocumentItem, couple: string) {
  const content = [
    "SmrkoMed document metadata",
    `File: ${document.name}`,
    `Couple: ${couple}`,
    `Category: ${categoryLabel(document.category)}`,
    `Uploaded by: ${document.uploadedBy}`,
    `Date: ${document.uploaded}`,
    `Status: ${document.status}`,
  ].join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${document.name.replace(/\.[^.]+$/, "")}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DocumentsPage() {
  const { openAction } = useGlobalActions();
  const appState = useAppState() as ReturnType<typeof useAppState> & {
    documents?: DocumentItem[];
  };
  const documents = appState.documents;
  const { loadState, loadError, reload } = appState;
  const coupleById = useMemo(
    () => new Map(appState.couples.map((couple) => [couple.id, couple])),
    [appState.couples],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<DocumentItem | null>(null);
  const [shareTarget, setShareTarget] = useState<DocumentItem | null>(null);
  const [reviewAssignments, setReviewAssignments] = useState<Record<string, boolean>>({});

  const rows = useMemo(
    () =>
      documents.filter((document) => {
        const matchesCategory =
          category === "All" || categoryLabel(document.category) === category;
        const haystack = [
          document.name,
          coupleName(coupleById, document.coupleId),
          document.uploadedBy,
          document.status,
        ]
          .join(" ")
          .toLowerCase();
        return matchesCategory && haystack.includes(query.trim().toLowerCase());
      }),
    [category, coupleById, documents, query],
  );

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Documents"
        subtitle="Handle clinical files, consent records, invoices, and doctor review queues."
        actions={
          <Button className="rounded-lg" onClick={() => openAction("upload-document")}>
            <Upload className="size-4" /> Upload
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="grid gap-3 border-b p-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search file, couple, uploader, or status"
              className="rounded-lg pl-9 shadow-none"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  category === item
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loadState === "loading" ? (
          <p className="p-6 text-sm text-muted-foreground">Loading documents...</p>
        ) : loadState === "error" ? (
          <EmptyState
            title="Unable to load documents"
            description={loadError ?? "Try again."}
            icon={Upload}
            action={
              <Button variant="outline" className="rounded-lg" onClick={() => void reload()}>
                Try again
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={documents.length === 0 ? "No documents yet" : "No matching documents"}
            description={
              documents.length === 0
                ? "Upload metadata to attach a clinic file record."
                : "Try another search term or category."
            }
            action={
              documents.length === 0 ? (
                <Button className="rounded-lg" onClick={() => openAction("upload-document")}>
                  <Upload className="size-4" /> Upload
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <tr className="border-b">
                  {[
                    "File",
                    "Couple",
                    "Category",
                    "Uploaded by",
                    "Date",
                    "Status",
                    "Doctor review",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-2.5 font-medium first:pl-4">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((document) => {
                  const assigned =
                    reviewAssignments[document.id] ?? document.status === "Doctor Review";
                  return (
                    <tr key={document.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="max-w-[220px] px-4 py-2.5 font-medium">
                        <span className="block truncate">{document.name}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {coupleName(coupleById, document.coupleId)}
                      </td>
                      <td className="px-3 py-2.5">{categoryLabel(document.category)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {document.uploadedBy}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{document.uploaded}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={document.status}
                          tone={
                            document.status === "Reviewed"
                              ? "success"
                              : document.status === "Doctor Review"
                                ? "warning"
                                : "danger"
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={assigned ? "Assigned" : "Not assigned"}
                          tone={assigned ? "info" : "muted"}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(document)}>
                            <Eye className="size-3.5" /> View
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Download"
                            onClick={() => downloadDocument(document, coupleName(coupleById, document.coupleId))}
                          >
                            <Download className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Share"
                            onClick={() => setShareTarget(document)}
                          >
                            <Share2 className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Assign doctor review"
                            disabled={assigned}
                            onClick={() => {
                              setReviewAssignments((current) => ({
                                ...current,
                                [document.id]: true,
                              }));
                              toast.success(`${document.name} assigned for doctor review`);
                            }}
                          >
                            <Stethoscope className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          Showing {rows.length} of {documents.length} files
        </div>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>Document record details</DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Couple</dt>
              <dd className="font-medium">{coupleName(coupleById, selected.coupleId)}</dd>
              <dt className="text-muted-foreground">Category</dt>
              <dd>{categoryLabel(selected.category)}</dd>
              <dt className="text-muted-foreground">Uploaded by</dt>
              <dd>{selected.uploadedBy}</dd>
              <dt className="text-muted-foreground">Date</dt>
              <dd>{selected.uploaded}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge label={selected.status} tone="muted" />
              </dd>
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => selected && downloadDocument(selected, coupleName(coupleById, selected.coupleId))}>
              <Download className="size-4" /> Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(shareTarget)}
        onOpenChange={(open) => !open && setShareTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share document</DialogTitle>
            <DialogDescription>
              Confirm secure sharing of {shareTarget?.name} with the associated couple.
            </DialogDescription>
          </DialogHeader>
          {shareTarget && (
            <div className="rounded-lg border bg-muted/25 p-3 text-sm">
              <p className="font-medium">{coupleName(coupleById, shareTarget.coupleId)}</p>
              <p className="text-muted-foreground">Secure patient portal · link expires in 7 days</p>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                toast.success("Secure document link shared");
                setShareTarget(null);
              }}
            >
              <Share2 className="size-4" /> Confirm share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
