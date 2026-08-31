"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus } from "lucide-react";

import { AiCoordinationPanel } from "@/components/whatsapp/center/ai-coordination";
import { PreviewBanner, WaSection, WaStatusPill } from "@/components/whatsapp/center/section";
import { EmptyState, LoadingRows } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_KB } from "@/lib/whatsapp/center-demo";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";

type Article = {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string | null;
  specialty: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "Under Review";
  updatedByName: string | null;
  updatedAt: string;
};

const CATEGORIES = [
  "Fertility",
  "IVF",
  "IUI",
  "FET",
  "Appointments",
  "Medications",
  "Procedures",
  "Payments",
  "Documents",
  "Clinic Policies",
  "FAQs",
];

const SPECIALTIES = ["GENERAL", "FERTILITY", "DENTAL", "DERMATOLOGY", "MATERNITY", "AESTHETICS", "CUSTOM"];

function demoRows(): Article[] {
  return DEMO_KB.map((k) => ({
    id: k.id,
    title: k.title,
    category: k.category,
    content:
      k.status === "Published"
        ? "Clinic-approved guidance for patient questions. Smrko AI may use this only while Published."
        : "Internal draft — not available to Smrko AI until published.",
    keywords: null,
    specialty: "FERTILITY",
    status: (k.status === "Published"
      ? "PUBLISHED"
      : k.status === "Draft"
        ? "DRAFT"
        : "DRAFT") as Article["status"],
    updatedByName: "Meera Iyer",
    updatedAt: new Date().toISOString(),
  }));
}

export default function WhatsAppKnowledgeBasePage() {
  const [rows, setRows] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);
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
  const [specialty, setSpecialty] = useState("FERTILITY");
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
      if (!next.length && !q.trim() && !statusFilter && !categoryFilter) {
        setRows(demoRows());
        setUsingDemo(true);
      } else {
        setRows(next);
        setUsingDemo(false);
      }
    } catch (err) {
      setRows(demoRows());
      setUsingDemo(true);
      setError(err instanceof ApiError ? err.message : null);
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!usingDemo) return rows;
    return rows.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (categoryFilter && a.category !== categoryFilter) return false;
      if (q.trim() && !`${a.title} ${a.content}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, usingDemo, statusFilter, categoryFilter, q]);

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setTitle("");
    setCategory(CATEGORIES[0]!);
    setContent("");
    setKeywords("");
    setSpecialty("FERTILITY");
    setStatus("DRAFT");
  }

  function openEdit(a: Article) {
    if (usingDemo) {
      toast.message("Connect knowledge API to edit live articles.");
      return;
    }
    setCreating(false);
    setEditing(a);
    setTitle(a.title);
    setCategory(a.category);
    setContent(a.content);
    setKeywords(a.keywords ?? "");
    setSpecialty(a.specialty ?? "GENERAL");
    setStatus(a.status === "Under Review" ? "DRAFT" : a.status);
  }

  async function save() {
    if (usingDemo) {
      toast.message("Connect knowledge API to save articles.");
      return;
    }
    try {
      const payload = {
        title,
        category,
        content,
        keywords: keywords.trim() || null,
        specialty,
        status: status === "Under Review" ? "DRAFT" : status,
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

  async function setPublish(a: Article, next: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    if (usingDemo) {
      toast.message("Connect knowledge API to publish.");
      return;
    }
    try {
      await apiPatch(`/api/v1/whatsapp-automation/knowledge/${a.id}`, { status: next });
      toast.success(next === "PUBLISHED" ? "Published — available to Smrko AI" : "Unpublished");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function remove(id: string) {
    if (usingDemo) return;
    try {
      await apiDelete(`/api/v1/whatsapp-automation/knowledge/${id}`);
      toast.success("Article deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  const preview = filtered.find((r) => r.id === previewId) ?? null;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Clinic Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">
            Approved information Smrko AI can use when answering patient questions. Only published articles are used.
          </p>
        </div>
        <Button size="sm" className="rounded-xl" onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          Create article
        </Button>
      </div>

      {usingDemo ? <PreviewBanner /> : null}

      <div className="rounded-2xl border border-primary/15 bg-primary-soft/40 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">AI uses published knowledge only</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Drafts and under-review articles stay internal. Smrko AI never diagnoses, prescribes, or changes doctor
          instructions — even with published FAQs.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search articles…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md rounded-xl"
        />
        <select
          className="flex h-9 rounded-xl border bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          className="flex h-9 max-w-xs rounded-xl border bg-background px-3 text-sm"
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
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">{editing ? "Edit article" : "New article"}</h2>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input className="rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm"
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
                className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm"
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
              className="rounded-xl"
              placeholder="e.g. IVF prep, scan fasting"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea className="rounded-xl" rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="flex h-9 w-full max-w-xs rounded-xl border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as Article["status"])}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-xl" onClick={() => void save()}>
              Save
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
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
        <WaSection
          title={preview.title}
          subtitle={`${preview.category} · ${preview.status}`}
          action={
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setPreviewId(null)}>
              Close
            </Button>
          }
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{preview.content}</p>
          {preview.status !== "PUBLISHED" ? (
            <p className="mt-3 text-xs text-orange-800">Not available to Smrko AI until Published.</p>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-800">
              <BookOpen className="size-3.5" /> Used by AI when answering approved FAQs
            </p>
          )}
        </WaSection>
      ) : null}

      {loading ? <LoadingRows rows={4} /> : null}
      {error && !usingDemo ? <EmptyState title="Unable to load" description={error} /> : null}

      <ul className="space-y-2">
        {filtered.map((a) => (
          <li
            key={a.id}
            className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{a.title}</p>
                <WaStatusPill
                  label={a.status === "PUBLISHED" ? "Published" : a.status === "ARCHIVED" ? "Archived" : "Draft"}
                  tone={a.status === "PUBLISHED" ? "success" : a.status === "DRAFT" ? "warning" : "muted"}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.category}
                {a.specialty ? ` · ${a.specialty}` : ""} · Updated {new Date(a.updatedAt).toLocaleDateString()}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.content}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setPreviewId(a.id)}>
                Preview
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openEdit(a)}>
                Edit
              </Button>
              {a.status === "PUBLISHED" ? (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => void setPublish(a, "DRAFT")}>
                  Unpublish
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void setPublish(a, "PUBLISHED")}
                >
                  Publish
                </Button>
              )}
              {!usingDemo ? (
                <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => void remove(a.id)}>
                  Delete
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <AiCoordinationPanel />
    </div>
  );
}
