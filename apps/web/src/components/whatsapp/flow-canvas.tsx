"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
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

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FlowNodeData = {
  type: string;
  label: string;
  description?: string;
  config: Record<string, unknown>;
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

const NODE_GROUP: Record<string, "trigger" | "condition" | "action" | "wait" | "end"> = {
  TRIGGER: "trigger",
  CONDITION: "condition",
  WAIT: "wait",
  SEND_TEMPLATE: "action",
  CREATE_TASK: "action",
  ASSIGN_TASK: "action",
  ESCALATE: "action",
  NOTIFY_STAFF: "action",
  ADD_TAG: "action",
  REMOVE_TAG: "action",
  AI_DRAFT: "action",
  MEDICATION_LOOKUP: "action",
  PATIENT_LOOKUP: "action",
  APPOINTMENT_LOOKUP: "action",
  END: "end",
};

const GROUP_STYLES: Record<string, string> = {
  trigger: "border-primary/40 bg-primary-soft/60",
  condition: "border-orange-300 bg-orange-50/80",
  wait: "border-slate-300 bg-slate-50",
  action: "border-violet-300 bg-violet-50/70",
  end: "border-border bg-muted/60",
};

const TYPE_LABEL: Record<string, string> = {
  TRIGGER: "When",
  CONDITION: "Only continue if",
  WAIT: "Wait",
  SEND_TEMPLATE: "Send WhatsApp",
  CREATE_TASK: "Create task",
  ASSIGN_TASK: "Assign task",
  ESCALATE: "Escalate",
  NOTIFY_STAFF: "Notify staff",
  ADD_TAG: "Add tag",
  REMOVE_TAG: "Remove tag",
  AI_DRAFT: "AI draft",
  MEDICATION_LOOKUP: "Look up medication",
  PATIENT_LOOKUP: "Look up patient",
  APPOINTMENT_LOOKUP: "Look up appointment",
  END: "End",
};

function FlowCardNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data;
  const group = NODE_GROUP[d.type] ?? "action";
  return (
    <div
      className={cn(
        "min-w-[190px] max-w-[240px] rounded-2xl border px-3.5 py-2.5 shadow-sm transition-shadow",
        GROUP_STYLES[group],
        selected && "ring-2 ring-primary/50 shadow-md",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-primary" />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {TYPE_LABEL[d.type] ?? d.type}
      </p>
      <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{d.label}</p>
      {d.description ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{d.description}</p>
      ) : null}
      {d.type === "SEND_TEMPLATE" ? (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {String(d.config["templateName"] || "Choose approved template")}
        </p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-primary" />
      {d.type === "CONDITION" ? (
        <>
          <Handle
            type="source"
            id="yes"
            position={Position.Right}
            className="!h-2.5 !w-2.5 !border-2 !border-white !bg-emerald-600"
            style={{ top: "45%" }}
          />
          <Handle
            type="source"
            id="no"
            position={Position.Left}
            className="!h-2.5 !w-2.5 !border-2 !border-white !bg-rose-500"
            style={{ top: "45%" }}
          />
        </>
      ) : null}
    </div>
  );
}

const nodeTypes = { flowCard: FlowCardNode };

function toRf(def: FlowDefinition): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = def.nodes.map((n, i) => ({
    id: n.id,
    type: "flowCard",
    position: n.position ?? { x: 140 + (i % 3) * 260, y: 48 + Math.floor(i / 3) * 150 },
    data: {
      type: n.type,
      label: n.label,
      description: n.description,
      config: n.config ?? {},
    },
  }));
  const edges: Edge[] = def.edges.map((e) => {
    const edge: Edge = {
      id: e.id,
      source: e.source,
      target: e.target,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#94a3b8" },
      style: { strokeWidth: 1.5, stroke: "#94a3b8" },
      labelStyle: { fontSize: 10, fill: "#64748b", fontWeight: 600 },
    };
    if (e.branch === "yes" || e.branch === "no") {
      edge.sourceHandle = e.branch;
      edge.label = e.branch === "yes" ? "YES" : "NO";
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
          ? { branch: String(e.label).toLowerCase() }
          : {}),
    })),
  };
}

export function WhatsAppFlowCanvas({
  definition,
  readOnly,
  selectedId,
  onSelect,
  onChange,
}: {
  definition: FlowDefinition;
  readOnly?: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: FlowDefinition) => void;
}) {
  const initial = useMemo(() => toRf(definition), [definition]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    const next = toRf(definition);
    setNodes(next.nodes);
    setEdges(next.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when parent definition identity changes
  }, [definition]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            id: `e_${connection.source}_${connection.target}_${Date.now()}`,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#94a3b8" },
            style: { strokeWidth: 1.5, stroke: "#94a3b8" },
          },
          eds,
        );
        onChange(fromRf(nodes, next));
        return next;
      });
    },
    [nodes, onChange, readOnly, setEdges],
  );

  const persist = useCallback(
    (n: Node[], e: Edge[]) => {
      onChange(fromRf(n, e));
    },
    [onChange],
  );

  return (
    <div className="h-[min(72vh,680px)] w-full overflow-hidden rounded-2xl border border-border/70 bg-[#faf9fc]">
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
      >
        <Background gap={18} size={1} color="#ddd6fe" />
        <Controls showInteractive={!readOnly} className="!rounded-xl !border-border/70 !shadow-sm" />
        <MiniMap pannable zoomable className="!rounded-xl !border-border/70 !bg-card" />
      </ReactFlow>
      {readOnly ? (
        <p className="border-t border-border/60 bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
          System template — view only. Duplicate to edit for your clinic.
        </p>
      ) : null}
    </div>
  );
}

export type FlowPaletteItem = {
  type: string;
  label: string;
  defaults: Record<string, unknown>;
};

export const FLOW_PALETTE_GROUPS: Array<{ title: string; items: FlowPaletteItem[] }> = [
  {
    title: "Wait",
    items: [{ type: "WAIT", label: "Wait", defaults: { mode: "duration", amount: 1, unit: "hours" } }],
  },
  {
    title: "Only continue if…",
    items: [
      {
        type: "CONDITION",
        label: "Patient confirmed?",
        defaults: { field: "communication.patient_replied", operator: "truthy" },
      },
    ],
  },
  {
    title: "What should SmrkoMed do?",
    items: [
      {
        type: "SEND_TEMPLATE",
        label: "Send WhatsApp",
        defaults: { templateName: "", variableKeys: [] as string[] },
      },
      { type: "CREATE_TASK", label: "Create Care Task", defaults: { title: "Follow-up", priority: "NORMAL" } },
      { type: "ASSIGN_TASK", label: "Assign task", defaults: { title: "Assigned follow-up", priority: "NORMAL" } },
      { type: "NOTIFY_STAFF", label: "Notify staff", defaults: { title: "Staff attention", body: "" } },
      { type: "ESCALATE", label: "Escalate to coordinator", defaults: { reason: "Needs human" } },
      { type: "ADD_TAG", label: "Add tag", defaults: { tag: "" } },
      { type: "REMOVE_TAG", label: "Remove tag", defaults: { tag: "" } },
      { type: "END", label: "End workflow", defaults: {} },
    ],
  },
];

/** Flat list for backward compatibility with flow builder page */
export const FLOW_PALETTE: FlowPaletteItem[] = FLOW_PALETTE_GROUPS.flatMap((g) => g.items);

export function addPaletteNode(
  def: FlowDefinition,
  type: string,
  defaults: Record<string, unknown>,
): FlowDefinition {
  const id = `n_${Math.random().toString(36).slice(2, 9)}`;
  const label = FLOW_PALETTE.find((p) => p.type === type)?.label ?? TYPE_LABEL[type] ?? type;
  const y = 40 + def.nodes.length * 120;
  const node = {
    id,
    type,
    label,
    config: { ...defaults },
    position: { x: 180, y },
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
            className="h-auto w-full justify-start rounded-xl py-3 text-left"
            onClick={() => onSelect(n.id)}
          >
            <span className="block">
              <span className="text-[10px] uppercase opacity-70">{TYPE_LABEL[n.type] ?? n.type}</span>
              <span className="block text-sm font-medium">{n.label}</span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
