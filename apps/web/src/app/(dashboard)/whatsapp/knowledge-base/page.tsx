"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

type Article = {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string | null;
  specialty: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedByName: string | null;
  updatedAt: string;
};

const CATEGORIES = [
  "Clinic Information",
  "Treatments",
  "Procedures",
  "Preparation Instructions",
  "Post-treatment Instructions",
  "Medicines",
  "Appointment Information",
  "Payment Information",
  "Insurance",
  "FAQs",
  "Fertility / IVF",
  "Dental",
  "Dermatology",
  "Maternity",
  "Aesthetics",
  "Custom",
];

const SPECIALTIES = ["GENERAL", "FERTILITY", "DENTAL", "DERMATOLOGY", "MATERNITY", "AESTHETICS", "CUSTOM"];

export default function WhatsAppKnowledgeBasePage() {
  const [rows, setRows] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [specialty, setSpecialty] = useState("GENERAL");
  const [status, setStatus] = useState<Article["status"]>("DRAFT");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const next = await apiGet<Article[]>(`/api/v1/whatsapp-automation/knowledge?${params}`);
      setRows(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load knowledge base.");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setTitle("");
    setCategory(CATEGORIES[0]!);
    setContent("");
    setKeywords("");
    setSpecialty("GENERAL");
    setStatus("DRAFT");
  }

  function openEdit(a: Article) {
    setCreating(false);
    setEditing(a);
    setTitle(a.title);
    setCategory(a.category);
    setContent(a.content);
    setKeywords(a.keywords ?? "");
    setSpecialty(a.specialty ?? "GENERAL");
    setStatus(a.status);
  }

  async function save() {
    try {
      const payload = {
        title,
        category,
        content,
        keywords: keywords.trim() || null,
        specialty,
        status,
      };
      if (editing) {
        await apiPatch(`/api/v1/whatsapp-automation/knowledge/${editing.id}`, payload);
        toast.success("Article updated");
      } else {
        await apiPost("/api/v1/whatsapp-automation/knowledge", payload);
        toast.success("Article created");
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  async function setPublish(a: Article, next: Article["status"]) {
    try {
      await apiPatch(`/api/v1/whatsapp-automation/knowledge/${a.id}`, { status: next });
      toast.success(next === "PUBLISHED" ? "Published — available to Smrko AI" : "Unpublished");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function remove(id: string) {
    try {
      await apiDelete(`/api/v1/whatsapp-automation/knowledge/${id}`);
      toast.success("Article deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  const preview = rows.find((r) => r.id === previewId) ?? null;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <PageHeader
        title="Knowledge Base"
        subtitle="Published clinic knowledge only is available to Smrko AI and automation. Drafts stay internal."
        actions={
          <Button size="sm" onClick={openCreate}>
            Create article
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search title, content, keywords" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        <select
          className="flex h-9 rounded-md border bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          className="flex h-9 max-w-xs rounded-md border bg-background px-3 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {creating || editing ? (
        <div className="surface-card space-y-3 p-4">
          <h2 className="text-sm font-semibold">{editing ? "Edit article" : "New article"}</h2>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Specialty</Label>
              <select
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Keywords</Label>
            <Input
              placeholder="e.g. IVF prep, scan fasting, payment policy"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="flex h-9 w-full max-w-xs rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as Article["status"])}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void save()}>Save</Button>
            <Button
              variant="outline"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="surface-card space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Preview — {preview.title}</h2>
            <Button size="sm" variant="ghost" onClick={() => setPreviewId(null)}>
              Close
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {preview.category} · {preview.specialty ?? "GENERAL"} · {preview.status}
            {preview.keywords ? ` · ${preview.keywords}` : ""}
          </p>
          <p className="whitespace-pre-wrap text-sm">{preview.content}</p>
          {preview.status !== "PUBLISHED" ? (
            <p className="text-xs text-amber-700">Draft/archived — not sent to patients or Smrko AI.</p>
          ) : null}
        </div>
      ) : null}

      {loading ? <LoadingRows rows={4} /> : null}
      {error ? <EmptyState title="Unable to load" description={error} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No articles yet" description="Publish clinic policies and FAQs for Smrko AI drafts." />
      ) : null}

      <ul className="space-y-2">
        {rows.map((a) => (
          <li key={a.id} className="surface-card flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{a.title}</p>
                <StatusBadge
                  label={a.status}
                  tone={a.status === "PUBLISHED" ? "success" : a.status === "DRAFT" ? "warning" : "muted"}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {a.category}
                {a.specialty ? ` · ${a.specialty}` : ""} · Updated {new Date(a.updatedAt).toLocaleString()}
                {a.updatedByName ? ` by ${a.updatedByName}` : ""}
              </p>
              {a.keywords ? <p className="mt-1 text-xs text-muted-foreground">Keywords: {a.keywords}</p> : null}
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.content}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setPreviewId(a.id)}>
                Preview
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                Edit
              </Button>
              {a.status === "PUBLISHED" ? (
                <Button size="sm" variant="outline" onClick={() => void setPublish(a, "DRAFT")}>
                  Unpublish
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => void setPublish(a, "PUBLISHED")}>
                  Publish
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => void remove(a.id)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
