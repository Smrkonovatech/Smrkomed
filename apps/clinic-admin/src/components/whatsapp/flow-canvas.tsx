"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  Clock,
  Clock3,
  Copy,
  GitBranch,
  Headphones,
  Hourglass,
  LayoutTemplate,
  List,
  MessageSquare,
  Sparkles,
  SquareCheck,
  StopCircle,
  Trash2,
  Type,
  User,
  UserCheck,
  Users,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  CheckSquare,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Sliders,
  Brain,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FlowNodeData = {
  type: string;
  label: string;
  description?: string;
  config: Record<string, unknown>;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export type FlowDefinition = {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    description?: string;
    config: Record<string, unknown>;
    position?: { x: number; y: number };
  }>;
  edges: Array<{ id: string; source: string; target: string; branch?: string }>;
};

const NODE_COLORS: Record<string, { border: string; bg: string; badge: string }> = {
  TRIGGER: { border: "border-teal-600 dark:border-teal-500", bg: "bg-teal-50/70 dark:bg-teal-950/30", badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200" },
  CONDITION: { border: "border-amber-600 dark:border-amber-500", bg: "bg-amber-50/70 dark:bg-amber-950/30", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200" },
  WAIT: { border: "border-sky-600 dark:border-sky-500", bg: "bg-sky-50/70 dark:bg-sky-950/30", badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200" },
  WAIT_FOR_REPLY: { border: "border-sky-700 dark:border-sky-600", bg: "bg-sky-50/80 dark:bg-sky-950/40", badge: "bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100" },
  SEND_TEMPLATE: { border: "border-emerald-700 dark:border-emerald-600", bg: "bg-emerald-50/70 dark:bg-emerald-950/30", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  SEND_TEXT: { border: "border-emerald-600 dark:border-emerald-500", bg: "bg-emerald-50/60 dark:bg-emerald-950/20", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  SEND_MEDIA: { border: "border-teal-700 dark:border-teal-600", bg: "bg-teal-50/70 dark:bg-teal-950/30", badge: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
  SEND_BUTTONS: { border: "border-emerald-600 dark:border-emerald-500", bg: "bg-emerald-50/80 dark:bg-emerald-950/30", badge: "bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100" },
  SEND_LIST: { border: "border-teal-600 dark:border-teal-500", bg: "bg-teal-50/80 dark:bg-teal-950/30", badge: "bg-teal-200 text-teal-900 dark:bg-teal-800 dark:text-teal-100" },
  SEND_DOCTOR_CARD: { border: "border-purple-600 dark:border-purple-500", bg: "bg-purple-50/80 dark:bg-purple-950/30", badge: "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-200" },
  GET_DOCTORS: { border: "border-purple-600 dark:border-purple-500", bg: "bg-purple-50/70 dark:bg-purple-950/20", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  GET_DOCTOR_DETAILS: { border: "border-purple-500 dark:border-purple-400", bg: "bg-purple-50/60 dark:bg-purple-950/20", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  GET_AVAILABLE_DATES: { border: "border-blue-600 dark:border-blue-500", bg: "bg-blue-50/70 dark:bg-blue-950/30", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  GET_AVAILABLE_SLOTS: { border: "border-blue-500 dark:border-blue-400", bg: "bg-blue-50/60 dark:bg-blue-950/20", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  BOOKING_SUMMARY: { border: "border-indigo-600 dark:border-indigo-500", bg: "bg-indigo-50/70 dark:bg-indigo-950/30", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  BOOK_APPOINTMENT: { border: "border-emerald-700 dark:border-emerald-600", bg: "bg-emerald-100/90 dark:bg-emerald-950/50", badge: "bg-emerald-200 text-emerald-950 font-bold dark:bg-emerald-800 dark:text-emerald-100" },
  DETECT_INTENT: { border: "border-violet-700 dark:border-violet-600", bg: "bg-violet-50/70 dark:bg-violet-950/30", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
  EXTRACT_PREFERENCES: { border: "border-violet-600 dark:border-violet-500", bg: "bg-violet-50/60 dark:bg-violet-950/20", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
  CREATE_TASK: { border: "border-violet-600 dark:border-violet-500", bg: "bg-violet-50/70 dark:bg-violet-950/30", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
  ASSIGN_TASK: { border: "border-violet-600 dark:border-violet-500", bg: "bg-violet-50/70 dark:bg-violet-950/30", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
  ASSIGN_STAFF: { border: "border-violet-500 dark:border-violet-400", bg: "bg-violet-50/60 dark:bg-violet-950/20", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
  ESCALATE: { border: "border-rose-600 dark:border-rose-500", bg: "bg-rose-50/70 dark:bg-rose-950/30", badge: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200" },
  NOTIFY_STAFF: { border: "border-orange-600 dark:border-orange-500", bg: "bg-orange-50/70 dark:bg-orange-950/30", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  HUMAN_HANDOFF: { border: "border-rose-600 dark:border-rose-500", bg: "bg-rose-50/70 dark:bg-rose-950/30", badge: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200" },
  END: { border: "border-slate-500 dark:border-slate-600", bg: "bg-muted/70", badge: "bg-muted-foreground/20 text-foreground" },
};

function FlowCardNode({ id, data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data;
  const theme = NODE_COLORS[d.type] ?? {
    border: "border-border",
    bg: "bg-card",
    badge: "bg-muted text-muted-foreground",
  };

  const isTrigger = d.type === "TRIGGER";
  const isEnd = d.type === "END";

  return (
    <div
      className={cn(
        "group relative min-w-[200px] max-w-[250px] rounded-xl border-2 p-3 shadow-xs transition-all select-none",
        theme.border,
        theme.bg,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md",
      )}
    >
      {/* Top Target Handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!size-2.5 !bg-primary !border-2 !border-background"
        />
      )}

      {/* Floating Action Menu on Selected/Hover */}
      <div className="absolute -top-3 right-2 hidden items-center gap-1 rounded-md border bg-background/95 px-1 py-0.5 shadow-sm backdrop-blur-xs group-hover:flex">
        {!isTrigger && !isEnd && d.onDuplicate && (
          <button
            type="button"
            title="Duplicate node"
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              d.onDuplicate?.(id);
            }}
          >
            <Copy className="size-3" />
          </button>
        )}
        {!isTrigger && !isEnd && d.onDelete && (
          <button
            type="button"
            title="Delete node"
            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              d.onDelete?.(id);
            }}
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 mb-1">
        <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider", theme.badge)}>
          {d.type.replaceAll("_", " ")}
        </span>
      </div>

      <p className="text-sm font-semibold leading-tight text-foreground">{d.label}</p>

      {/* Dynamic Content Preview */}
      {d.type === "SEND_TEMPLATE" && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground font-mono">
          {String(d.config["templateName"] || d.config["templateId"] || "Select template")}
        </p>
      )}
      {d.type === "SEND_TEXT" && (
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
          {String(d.config["body"] || d.config["text"] || "Session copy")}
        </p>
      )}
      {d.type === "SEND_BUTTONS" && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {Array.isArray(d.config["buttons"])
            ? (d.config["buttons"] as any[]).map((b, i) => (
                <span key={i} className="rounded border bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  {b.title || b.id}
                </span>
              ))
            : <span className="text-[10px] text-muted-foreground">Interactive buttons</span>}
        </div>
      )}
      {d.type === "SEND_LIST" && (
        <p className="mt-1 text-[11px] text-muted-foreground font-medium">
          List · {String(d.config["buttonText"] ?? "Select")} ({String(d.config["dataSource"] ?? "custom")})
        </p>
      )}
      {d.type === "SEND_DOCTOR_CARD" && (
        <p className="mt-1 text-[11px] text-purple-800 dark:text-purple-300 font-medium">
          Photo + Bio + [See Slots] CTA
        </p>
      )}
      {d.type === "GET_DOCTORS" && (
        <p className="mt-1 text-[11px] text-muted-foreground">Authoritative clinic doctors</p>
      )}
      {d.type === "GET_AVAILABLE_DATES" && (
        <p className="mt-1 text-[11px] text-muted-foreground">Next {String(d.config["daysAhead"] ?? 7)} schedule days</p>
      )}
      {d.type === "GET_AVAILABLE_SLOTS" && (
        <p className="mt-1 text-[11px] text-muted-foreground">Segmented morning/afternoon</p>
      )}
      {d.type === "BOOK_APPOINTMENT" && (
        <p className="mt-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
          Revalidates & books slot
        </p>
      )}
      {d.type === "DETECT_INTENT" && (
        <p className="mt-1 text-[11px] text-muted-foreground">Intent parser (book / cancel)</p>
      )}
      {d.type === "HUMAN_HANDOFF" && (
        <p className="mt-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
          Escalate to care inbox
        </p>
      )}

      {/* Bottom Source Handle */}
      {!isEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-2.5 !bg-primary !border-2 !border-background"
        />
      )}

      {/* Condition Branch Handles */}
      {d.type === "CONDITION" && (
        <>
          <Handle
            type="source"
            id="yes"
            position={Position.Right}
            className="!size-2.5 !bg-emerald-600 !border-2 !border-background"
            style={{ top: "45%" }}
          />
          <Handle
            type="source"
            id="no"
            position={Position.Left}
            className="!size-2.5 !bg-rose-600 !border-2 !border-background"
            style={{ top: "45%" }}
          />
        </>
      )}
    </div>
  );
}

const nodeTypes = { flowCard: FlowCardNode };

function toRf(
  def: FlowDefinition,
  onDuplicate?: (id: string) => void,
  onDelete?: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = def.nodes.map((n, i) => ({
    id: n.id,
    type: "flowCard",
    position: n.position ?? { x: 120 + (i % 3) * 260, y: 40 + Math.floor(i / 3) * 160 },
    data: {
      type: n.type,
      label: n.label,
      description: n.description,
      config: n.config ?? {},
      onDuplicate,
      onDelete,
    },
  }));
  const edges: Edge[] = def.edges.map((e) => {
    const edge: Edge = {
      id: e.id,
      source: e.source,
      target: e.target,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 1.8 },
    };
    if (e.branch === "yes" || e.branch === "no") {
      edge.sourceHandle = e.branch;
      edge.label = e.branch.toUpperCase();
    } else if (e.branch) {
      edge.label = e.branch.replaceAll("_", " ");
    }
    return edge;
  });
  return { nodes, edges };
}

function fromRf(nodes: Node[], edges: Edge[]): FlowDefinition {
  return {
    nodes: nodes.map((n) => {
      const d = n.data as FlowNodeData;
      return {
        id: n.id,
        type: d.type,
        label: d.label,
        ...(d.description ? { description: d.description } : {}),
        config: d.config ?? {},
        position: n.position,
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle === "yes" || e.sourceHandle === "no"
        ? { branch: e.sourceHandle }
        : e.label
          ? { branch: String(e.label).toLowerCase().replaceAll(" ", "_") }
          : {}),
    })),
  };
}

function FlowCanvasInner({
  definition,
  readOnly,
  selectedId,
  onSelect,
  onChange,
  onDuplicateNode,
  onDeleteNode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  definition: FlowDefinition;
  readOnly?: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: FlowDefinition) => void;
  onDuplicateNode?: (id: string) => void;
  onDeleteNode?: (id: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}) {
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();

  const initial = useMemo(
    () => toRf(definition, onDuplicateNode, onDeleteNode),
    [definition, onDuplicateNode, onDeleteNode],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    const next = toRf(definition, onDuplicateNode, onDeleteNode);
    setNodes(next.nodes);
    setEdges(next.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, onDuplicateNode, onDeleteNode]);

  const persist = useCallback(
    (n: Node[], e: Edge[]) => {
      onChange(fromRf(n, e));
    },
    [onChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            id: `e_${connection.source}_${connection.target}_${Date.now()}`,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 1.8 },
          },
          eds,
        );
        onChange(fromRf(nodes, next));
        return next;
      });
    },
    [nodes, onChange, readOnly, setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (readOnly) return;

      const type = event.dataTransfer.getData("application/reactflow/type");
      const label = event.dataTransfer.getData("application/reactflow/label");
      const defaultsRaw = event.dataTransfer.getData("application/reactflow/defaults");
      if (!type) return;

      let defaults: Record<string, unknown> = {};
      try {
        defaults = defaultsRaw ? JSON.parse(defaultsRaw) : {};
      } catch {
        defaults = {};
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `n_${Math.random().toString(36).slice(2, 9)}`;
      const newNode: Node = {
        id: newNodeId,
        type: "flowCard",
        position,
        data: {
          type,
          label: label || type,
          config: defaults,
          onDuplicate: onDuplicateNode,
          onDelete: onDeleteNode,
        },
      };

      setNodes((nds) => {
        const updated = nds.concat(newNode);
        persist(updated, edges);
        return updated;
      });
      onSelect(newNodeId);
    },
    [edges, onDeleteNode, onDuplicateNode, onSelect, persist, readOnly, screenToFlowPosition, setNodes],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (readOnly) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        onDeleteNode?.(selectedId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          onRedo?.();
        } else {
          e.preventDefault();
          onUndo?.();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, readOnly, onDeleteNode, onUndo, onRedo]);

  return (
    <div
      className="relative h-full min-h-[560px] w-full overflow-hidden rounded-xl border bg-muted/15"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Floating Canvas Controls Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur-xs">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 p-0"
          title="Zoom in"
          onClick={() => void zoomIn()}
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 p-0"
          title="Zoom out"
          onClick={() => void zoomOut()}
        >
          <ZoomOut className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 p-0"
          title="Fit view"
          onClick={() => void fitView({ padding: 0.2 })}
        >
          <Maximize2 className="size-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 p-0"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 p-0"
          title="Redo (Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 className="size-4" />
        </Button>
        {selectedId && !readOnly && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="size-8 p-0 text-destructive hover:bg-destructive/10"
              title="Delete node (Del)"
              onClick={() => onDeleteNode?.(selectedId)}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </div>

      <ReactFlow
        nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedId }))}
        edges={edges}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          if (!readOnly) {
            queueMicrotask(() => {
              setNodes((curr) => {
                persist(curr, edges);
                return curr;
              });
            });
          }
        }}
        onEdgesChange={(changes) => {
          onEdgesChange(changes);
          if (!readOnly) {
            queueMicrotask(() => {
              setEdges((curr) => {
                persist(nodes, curr);
                return curr;
              });
            });
          }
        }}
        onConnect={onConnect}
        onNodeClick={(_, n) => onSelect(n.id)}
        onPaneClick={() => onSelect(null)}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={!readOnly} position="bottom-left" />
        <MiniMap pannable zoomable className="!bg-card !border !rounded-lg" position="bottom-right" />
      </ReactFlow>

      {readOnly && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          System template — view only. Duplicate to edit.
        </div>
      )}
    </div>
  );
}

export function WhatsAppFlowCanvas(props: {
  definition: FlowDefinition;
  readOnly?: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: FlowDefinition) => void;
  onDuplicateNode?: (id: string) => void;
  onDeleteNode?: (id: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

/* ====================================================================
 * CATEGORIZED NODE PALETTE (Drag & Drop + Click to Add)
 * ==================================================================== */

export type PaletteCategory = {
  id: string;
  name: string;
  badgeColor: string;
  items: Array<{
    type: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    defaults: Record<string, unknown>;
  }>;
};

export const CATEGORIZED_PALETTE: PaletteCategory[] = [
  {
    id: "TRIGGERS",
    name: "Triggers",
    badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
    items: [
      { type: "TRIGGER", label: "Patient Message", description: "Inbound WhatsApp reply from patient", icon: MessageSquare, defaults: { triggerType: "INCOMING_WHATSAPP" } },
      { type: "TRIGGER", label: "Appointment Request", description: "Patient requests new appointment", icon: Calendar, defaults: { triggerType: "APPOINTMENT_REQUEST" } },
    ],
  },
  {
    id: "MESSAGES",
    name: "Messages & UI",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    items: [
      { type: "SEND_TEXT", label: "Send Text", description: "Dynamic message with {{variables}}", icon: Type, defaults: { body: "Hello! How can we assist you today?" } },
      { type: "SEND_BUTTONS", label: "Send Buttons", description: "Interactive quick-reply buttons (up to 3)", icon: SquareCheck, defaults: { body: "Please select an option:", buttons: [{ id: "btn_1", title: "Option 1" }, { id: "btn_2", title: "Option 2" }], waitForReply: true } },
      { type: "SEND_LIST", label: "Send List", description: "Interactive bottom-sheet list (up to 10 rows)", icon: List, defaults: { body: "Please choose from the options below:", buttonText: "Select Option", dataSource: "custom", waitForReply: true } },
      { type: "SEND_DOCTOR_CARD", label: "Doctor Card", description: "Doctor image, bio, experience & CTA buttons", icon: UserCheck, defaults: { doctorId: "", waitForReply: true } },
      { type: "BOOKING_SUMMARY", label: "Booking Summary", description: "Formatted summary card with confirm/change buttons", icon: FileText, defaults: {} },
      { type: "SEND_MEDIA", label: "Send Media", description: "Send image, document, or audio", icon: ImageIcon, defaults: { caption: "", mediaType: "image" } },
      { type: "SEND_TEMPLATE", label: "Meta Template", description: "Approved outbound Meta template", icon: LayoutTemplate, defaults: { templateName: "", variableKeys: [] } },
    ],
  },
  {
    id: "APPOINTMENTS",
    name: "Appointments",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    items: [
      { type: "GET_DOCTORS", label: "Get Doctors", description: "Fetch real active clinic doctors", icon: Users, defaults: {} },
      { type: "GET_DOCTOR_DETAILS", label: "Doctor Details", description: "Fetch profile, specialty, bio & languages", icon: User, defaults: {} },
      { type: "GET_AVAILABLE_DATES", label: "Get Dates", description: "Query calendar dates with open slots", icon: CalendarDays, defaults: { daysAhead: 7 } },
      { type: "GET_AVAILABLE_SLOTS", label: "Get Slots", description: "Query authoritative real-time slots", icon: Clock, defaults: {} },
      { type: "BOOK_APPOINTMENT", label: "Book Appointment", description: "Revalidates slot & transactionally books", icon: CalendarCheck, defaults: {} },
    ],
  },
  {
    id: "LOGIC",
    name: "Logic & AI",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    items: [
      { type: "CONDITION", label: "Condition", description: "Branch yes/no on patient reply or variable", icon: GitBranch, defaults: { field: "communication.patient_replied", operator: "truthy" } },
      { type: "WAIT", label: "Wait", description: "Delay next step by minutes, hours, or days", icon: Hourglass, defaults: { amount: 1, unit: "hours" } },
      { type: "WAIT_FOR_REPLY", label: "Wait for Reply", description: "Pause execution until patient responds", icon: Clock3, defaults: { timeoutHours: 24 } },
      { type: "DETECT_INTENT", label: "Detect Intent", description: "AI intent classifier (booking, reschedule, cancel)", icon: Brain, defaults: {} },
      { type: "EXTRACT_PREFERENCES", label: "Extract Preferences", description: "Parse date/time preferences from natural language", icon: Sliders, defaults: {} },
    ],
  },
  {
    id: "CARE_LOOP",
    name: "Care Loop",
    badgeColor: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    items: [
      { type: "CREATE_TASK", label: "Create Care Task", description: "Generate staff care loop task", icon: CheckSquare, defaults: { title: "Follow-up", priority: "NORMAL" } },
      { type: "ESCALATE", label: "Escalate", description: "Escalate urgent issue to clinical inbox", icon: AlertTriangle, defaults: { reason: "Needs human" } },
    ],
  },
  {
    id: "CONTROL",
    name: "Control",
    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    items: [
      { type: "HUMAN_HANDOFF", label: "Human Handoff", description: "Transfer conversation to clinic staff", icon: Headphones, defaults: { reason: "Patient requested assistance" } },
      { type: "END", label: "End Flow", description: "Terminate flow execution", icon: StopCircle, defaults: {} },
    ],
  },
];

export const FLOW_PALETTE = CATEGORIZED_PALETTE.flatMap((cat) => cat.items);

export function addPaletteNode(def: FlowDefinition, type: string, defaults: Record<string, unknown>): FlowDefinition {
  const id = `n_${Math.random().toString(36).slice(2, 9)}`;
  const item = FLOW_PALETTE.find((p) => p.type === type);
  const label = item?.label ?? type;
  const y = 40 + def.nodes.length * 120;
  const node = {
    id,
    type,
    label,
    config: { ...defaults },
    position: { x: 250, y },
  };
  const end = def.nodes.find((n) => n.type === "END");
  const withoutEnd = end ? def.nodes.filter((n) => n.id !== end.id) : [...def.nodes];
  const nodes = end ? [...withoutEnd, node, end] : [...withoutEnd, node];
  const lastBefore = withoutEnd[withoutEnd.length - 1];
  const edges = [...def.edges];
  if (lastBefore && end) {
    const filtered = edges.filter((e) => !(e.source === lastBefore.id && e.target === end.id));
    filtered.push(
      { id: `e_${lastBefore.id}_${id}`, source: lastBefore.id, target: id },
      { id: `e_${id}_${end.id}`, source: id, target: end.id },
    );
    return { nodes, edges: filtered };
  }
  if (lastBefore) {
    edges.push({ id: `e_${lastBefore.id}_${id}`, source: lastBefore.id, target: id });
  }
  return { nodes, edges };
}

export function NodePaletteSidebar({
  onAddNode,
  readOnly,
}: {
  onAddNode: (type: string, defaults: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    TRIGGERS: true,
    MESSAGES: true,
    APPOINTMENTS: true,
    LOGIC: true,
    CARE_LOOP: false,
    CONTROL: false,
  });

  function toggleCategory(catId: string) {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }

  function handleDragStart(event: React.DragEvent, type: string, label: string, defaults: Record<string, unknown>) {
    if (readOnly) return;
    event.dataTransfer.setData("application/reactflow/type", type);
    event.dataTransfer.setData("application/reactflow/label", label);
    event.dataTransfer.setData("application/reactflow/defaults", JSON.stringify(defaults));
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto pr-1 space-y-2">
      <div className="px-1 py-1 text-xs text-muted-foreground">
        Drag nodes onto the canvas or click <span className="font-semibold text-foreground">+</span> to append.
      </div>
      {CATEGORIZED_PALETTE.map((cat) => {
        const isOpen = openCategories[cat.id] ?? true;
        return (
          <div key={cat.id} className="rounded-lg border bg-card shadow-2xs overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors"
              onClick={() => toggleCategory(cat.id)}
            >
              <span className="flex items-center gap-1.5">
                {isOpen ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
                <span>{cat.name}</span>
              </span>
              <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", cat.badgeColor)}>
                {cat.items.length}
              </span>
            </button>
            {isOpen && (
              <div className="grid gap-1 p-2 pt-0">
                {cat.items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      draggable={!readOnly}
                      onDragStart={(e) => handleDragStart(e, item.type, item.label, item.defaults)}
                      className={cn(
                        "group flex items-center justify-between rounded-md border border-transparent bg-muted/40 p-2 text-left text-xs transition-all",
                        !readOnly && "cursor-grab active:cursor-grabbing hover:border-border hover:bg-muted hover:shadow-2xs",
                      )}
                    >
                      <div className="flex items-start gap-2 overflow-hidden">
                        <GripVertical className="size-3.5 text-muted-foreground/40 mt-0.5 shrink-0 group-hover:text-muted-foreground" />
                        <Icon className="size-4 text-primary mt-0.5 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="font-medium text-foreground truncate leading-tight">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title={`Add ${item.label}`}
                        disabled={readOnly}
                        onClick={() => onAddNode(item.type, item.defaults)}
                      >
                        +
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MobileNodeList({
  definition,
  selectedId,
  onSelect,
}: {
  definition: FlowDefinition;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-2 lg:hidden">
      {definition.nodes.map((n) => (
        <li key={n.id}>
          <Button
            type="button"
            variant={selectedId === n.id ? "default" : "outline"}
            className="h-auto w-full justify-start py-3 text-left"
            onClick={() => onSelect(n.id)}
          >
            <span className="block">
              <span className="text-[10px] uppercase opacity-70">{n.type}</span>
              <span className="block text-sm font-medium">{n.label}</span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
