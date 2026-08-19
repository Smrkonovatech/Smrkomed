"use client";

import { CheckCircle2, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useCreateTask } from "@/components/create-task-drawer";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/lib/app-state";
import { coupleLabel, type CareTask, type TaskStatus } from "@/lib/demo-data";
import { taskStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

const filters = ["All", "Waiting", "In progress", "Overdue", "Escalated", "Completed"] as const;
const statusOptions = Object.keys(taskStatusMeta) as TaskStatus[];

function taskOwner(task: CareTask, couple?: { doctor: string; coordinator: string }) {
  if (!couple) return task.assignedTo;
  if (task.status === "escalated" || task.category === "Medication") {
    return couple.doctor;
  }
  return couple.coordinator;
}

function priorityFor(task: CareTask) {
  if (task.status === "escalated") return { label: "Urgent", tone: "danger" as const };
  if (task.status === "overdue") return { label: "High", tone: "warning" as const };
  return { label: "Normal", tone: "muted" as const };
}

export default function TasksPage() {
  const { tasks, setTaskStatus, couples, loadState, loadError, reload } = useAppState();
  const coupleById = useMemo(() => new Map(couples.map((couple) => [couple.id, couple])), [couples]);
  const { open } = useCreateTask();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const statusMatches =
        filter === "All" ||
        taskStatusMeta[task.status].label.toLowerCase() === filter.toLowerCase();
      const couple = coupleById.get(task.coupleId);
      return (
        statusMatches &&
        (!search ||
          [task.title, couple ? coupleLabel(couple) : "", taskOwner(task, couple), task.category, task.note]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(search))
      );
    });
  }, [coupleById, filter, query, tasks]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <PageHeader
        title="Tasks"
        subtitle="Staff work queue. Patient follow-through stays in Care Loop."
        actions={
          <Button onClick={() => open()}>
            <Plus className="size-4" /> Create Task
          </Button>
        }
      />

      <section className="border bg-background">
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {filters.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setFilter(item)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === item
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item}
                <span className="ml-1.5 opacity-60">
                  {item === "All"
                    ? tasks.length
                    : tasks.filter(
                        (task) =>
                          taskStatusMeta[task.status].label.toLowerCase() === item.toLowerCase(),
                      ).length}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search staff tasks"
              className="h-9 pl-9"
            />
          </div>
        </div>

        {loadState === "loading" ? (
          <p className="p-6 text-sm text-muted-foreground">Loading tasks...</p>
        ) : loadState === "error" ? (
          <EmptyState
            title="Unable to load tasks"
            description={loadError ?? "Try again."}
            icon={CheckCircle2}
            action={
              <Button variant="outline" onClick={() => void reload()}>
                Try again
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No staff tasks"
            description={tasks.length === 0 ? "No tasks yet." : "No tasks match the selected status and search."}
            icon={CheckCircle2}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                {["Task", "Couple", "Owner", "Due", "Priority", "Category", "Status"].map(
                  (heading) => (
                    <TableHead
                      key={heading}
                      className="text-xs font-semibold uppercase tracking-wide"
                    >
                      {heading}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((task) => {
                const priority = priorityFor(task);
                return (
                  <TableRow key={task.id}>
                    <TableCell className="min-w-72">
                      <p className="font-semibold">{task.title}</p>
                      {task.note && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{task.note}</p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-36 font-medium">
                      {coupleById.get(task.coupleId)
                        ? coupleLabel(coupleById.get(task.coupleId)!)
                        : "Unknown couple"}
                    </TableCell>
                    <TableCell className="min-w-44">{taskOwner(task, coupleById.get(task.coupleId))}</TableCell>
                    <TableCell className="min-w-40 whitespace-nowrap tabular-nums">
                      {task.due}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={priority.label} tone={priority.tone} />
                    </TableCell>
                    <TableCell>{task.category}</TableCell>
                    <TableCell className="min-w-44">
                      <Select
                        value={task.status}
                        onValueChange={(value: TaskStatus) => {
                          void setTaskStatus(task.id, value)
                            .then(() =>
                              toast.success(`${task.title} moved to ${taskStatusMeta[value].label}`),
                            )
                            .catch((error: unknown) =>
                              toast.error(error instanceof Error ? error.message : "Unable to update task."),
                            );
                        }}
                      >
                        <SelectTrigger className="h-8 border-0 bg-muted/60 shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {taskStatusMeta[status].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
