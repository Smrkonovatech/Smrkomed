"use client";

import {
  Archive,
  Edit3,
  Eye,
  FileText,
  Image as ImageIcon,
  Mic,
  Plus,
  Send,
  Video,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { PageHeader, StatusBadge } from "@/components/ui-kit";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { careContent, coupleLabel, couples, type CareContentItem } from "@/lib/demo-data";
import { treatmentTone } from "@/lib/status";
import { cn } from "@/lib/utils";

const typeIcon = {
  Video: Video,
  Image: ImageIcon,
  PDF: FileText,
  "Voice Note": Mic,
} as const;

const types = ["All", "Video", "Image", "PDF", "Voice Note"] as const;

type LocalContent = Omit<CareContentItem, "status"> & {
  status: CareContentItem["status"] | "Archived";
};

const emptyForm = {
  title: "",
  type: "" as CareContentItem["type"] | "",
  treatment: "",
  language: "",
  meta: "",
};
type ContentErrors = {
  title?: string;
  type?: string;
  treatment?: string;
  language?: string;
  meta?: string;
};

export default function CareContentPage() {
  const [items, setItems] = useState<LocalContent[]>(careContent);
  const [type, setType] = useState<string>("All");
  const [category, setCategory] = useState("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<ContentErrors>({});
  const [preview, setPreview] = useState<LocalContent | null>(null);
  const [sendItem, setSendItem] = useState<LocalContent | null>(null);
  const [targetCouple, setTargetCouple] = useState("");
  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.treatment))).sort(),
    [items],
  );
  const list = items.filter(
    (item) =>
      item.status !== "Archived" &&
      (type === "All" || item.type === type) &&
      (category === "All" || item.treatment === category),
  );

  function openEditor(item?: LocalContent) {
    setEditingId(item?.id ?? null);
    setForm(
      item
        ? {
            title: item.title,
            type: item.type,
            treatment: item.treatment,
            language: item.language,
            meta: item.meta,
          }
        : emptyForm,
    );
    setErrors({});
    setEditorOpen(true);
  }

  function saveContent(event: FormEvent) {
    event.preventDefault();
    const nextErrors: ContentErrors = {};
    if (form.title.trim().length < 3) nextErrors.title = "Enter a content title";
    if (!form.type) nextErrors.type = "Select a type";
    if (form.treatment.trim().length < 2) nextErrors.treatment = "Enter a category";
    if (form.language.trim().length < 2) nextErrors.language = "Enter a language";
    if (!form.meta.trim()) nextErrors.meta = "Enter duration or page count";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !form.type) return;

    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId
            ? { ...item, ...form, type: form.type as CareContentItem["type"] }
            : item,
        ),
      );
      toast.success("Content updated");
    } else {
      setItems((current) => [
        {
          id: `cc-${Date.now()}`,
          ...form,
          type: form.type as CareContentItem["type"],
          status: "Draft",
        },
        ...current,
      ]);
      toast.success("Content added as draft");
    }
    setEditorOpen(false);
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Care Content"
        subtitle="Manage patient education separately from the clinical document record."
        actions={
          <Button className="rounded-lg" onClick={() => openEditor()}>
            <Plus className="size-4" /> Add Content
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3">
        <div className="flex flex-wrap gap-1">
          {types.map((item) => (
            <button
              key={item}
              onClick={() => setType(item)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                type === item
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="ml-auto w-full sm:w-56">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border bg-background">
        <MobileCards>
          {list.map((item) => {
            const Icon = typeIcon[item.type];
            return (
              <RecordCard key={item.id}>
                <div className="flex items-start gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-soft text-rose">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type} · {item.language}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <StatusBadge
                    label={item.status}
                    tone={item.status === "Active" ? "success" : "muted"}
                  />
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => setPreview(item)}>
                  <Eye className="size-3.5" /> Preview
                </Button>
              </RecordCard>
            );
          })}
        </MobileCards>
        <MdTableWrap>
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr className="border-b">
                {["Content", "Type", "Category", "Language", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-3 py-2.5 font-medium first:pl-4">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const Icon = typeIcon[item.type];
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-soft text-rose">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{item.title}</span>
                          <span className="text-xs text-muted-foreground">{item.meta}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{item.type}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        label={item.treatment}
                        tone={treatmentTone[item.treatment] ?? "muted"}
                        dot={false}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.language}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        label={item.status}
                        tone={item.status === "Active" ? "success" : "muted"}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setPreview(item)}>
                          <Eye className="size-3.5" /> Preview
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit"
                          onClick={() => openEditor(item)}
                        >
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Archive"
                          onClick={() => {
                            setItems((current) =>
                              current.map((entry) =>
                                entry.id === item.id ? { ...entry, status: "Archived" } : entry,
                              ),
                            );
                            toast.success("Content archived");
                          }}
                        >
                          <Archive className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSendItem(item);
                            setTargetCouple("");
                          }}
                        >
                          <Send className="size-3.5" /> Send through Care Loop
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </MdTableWrap>
        <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          {list.length} education items · Archived content is hidden
        </div>
      </section>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <form onSubmit={saveContent}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit content" : "Add content"}</DialogTitle>
              <DialogDescription>
                Add an education asset to the Care Content library.
              </DialogDescription>
            </DialogHeader>
            <div className="my-5 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="content-title">Title</Label>
                <Input
                  id="content-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
                {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        type: value as CareContentItem["type"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {types.slice(1).map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-xs text-danger">{errors.type}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="content-category">Category</Label>
                  <Input
                    id="content-category"
                    value={form.treatment}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, treatment: event.target.value }))
                    }
                    placeholder="IVF, IUI, General..."
                  />
                  {errors.treatment && (
                    <p className="text-xs text-danger">{errors.treatment}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="content-language">Language</Label>
                  <Input
                    id="content-language"
                    value={form.language}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, language: event.target.value }))
                    }
                  />
                  {errors.language && <p className="text-xs text-danger">{errors.language}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="content-meta">Duration / pages</Label>
                  <Input
                    id="content-meta"
                    value={form.meta}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, meta: event.target.value }))
                    }
                    placeholder="2:30 or 4 pages"
                  />
                  {errors.meta && <p className="text-xs text-danger">{errors.meta}</p>}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Save changes" : "Add content"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>Patient-facing content preview</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="grid min-h-52 place-items-center rounded-xl border bg-muted/25 p-8 text-center">
              {(() => {
                const Icon = typeIcon[preview.type];
                return <Icon className="mb-3 size-10 text-primary" />;
              })()}
              <div>
                <p className="font-semibold">{preview.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {preview.type} · {preview.meta} · {preview.language}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(sendItem)} onOpenChange={(open) => !open && setSendItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send through Care Loop</DialogTitle>
            <DialogDescription>
              Choose the couple who should receive “{sendItem?.title}”.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Target couple</Label>
            <Select value={targetCouple} onValueChange={setTargetCouple}>
              <SelectTrigger>
                <SelectValue placeholder="Select couple" />
              </SelectTrigger>
              <SelectContent>
                {couples.map((couple) => (
                  <SelectItem key={couple.id} value={couple.id}>
                    {coupleLabel(couple)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              disabled={!targetCouple}
              onClick={() => {
                const couple = couples.find((item) => item.id === targetCouple);
                toast.success(`Content sent to ${couple ? coupleLabel(couple) : "couple"}`);
                setSendItem(null);
              }}
            >
              <Send className="size-4" /> Confirm send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
