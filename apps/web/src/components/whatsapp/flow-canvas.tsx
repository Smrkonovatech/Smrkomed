"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const NODE_COLORS: Record<string, string> = {
  TRIGGER: "border-teal-600 bg-teal-50",
  CONDITION: "border-amber-600 bg-amber-50",
  WAIT: "border-sky-600 bg-sky-50",
  SEND_TEMPLATE: "border-emerald-700 bg-emerald-50",
  CREATE_TASK: "border-violet-600 bg-violet-50",
  ASSIGN_TASK: "border-violet-600 bg-violet-50",
  ESCALATE: "border-rose-600 bg-rose-50",
  NOTIFY_STAFF: "border-orange-600 bg-orange-50",
  ADD_TAG: "border-slate-500 bg-slate-50",
  REMOVE_TAG: "border-slate-500 bg-slate-50",
  END: "border-foreground/40 bg-muted",
  AI_DRAFT: "border-indigo-500 bg-indigo-50",
  MEDICATION_LOOKUP: "border-teal-700 bg-teal-50/80",
  PATIENT_LOOKUP: "border-cyan-700 bg-cyan-50",
  APPOINTMENT_LOOKUP: "border-blue-700 bg-blue-50",
};

function FlowCardNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data;
  return (
    <div
      className={cn(
        "min-w-[180px] max-w-[220px] rounded-xl border-2 px-3 py-2 shadow-sm",
        NODE_COLORS[d.type] ?? "border-border bg-card",
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{d.type}</p>
      <p className="text-sm font-medium leading-tight">{d.label}</p>
      {d.type === "SEND_TEMPLATE" ? (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {String(d.config["templateName"] || "template not set")}
        </p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
      {d.type === "CONDITION" ? (
        <>
          <Handle
            type="source"
            id="yes"
            position={Position.Right}
            className="!bg-emerald-600"
            style={{ top: "40%" }}
          />
          <Handle
            type="source"
            id="no"
            position={Position.Left}
            className="!bg-rose-600"
            style={{ top: "40%" }}
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
    position: n.position ?? { x: 120 + (i % 3) * 240, y: 40 + Math.floor(i / 3) * 140 },
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
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 1.5 },
    };
    if (e.branch === "yes" || e.branch === "no") {
      edge.sourceHandle = e.branch;
      edge.label = e.branch.toUpperCase();
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
            markerEnd: { type: MarkerType.ArrowClosed },
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
    <div className="h-[min(70vh,640px)] w-full overflow-hidden rounded-xl border bg-muted/20">
      <ReactFlow
        nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedId }))}
        edges={edges}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          if (!readOnly) {
            // defer persist of positions
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
        <Controls showInteractive={!readOnly} />
        <MiniMap pannable zoomable className="!bg-card" />
      </ReactFlow>
      {readOnly ? (
        <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          System template — view only. Duplicate to edit.
        </p>
      ) : null}
    </div>
  );
}

export const FLOW_PALETTE = [
  { type: "WAIT", label: "Wait", defaults: { mode: "duration", amount: 1, unit: "hours" } },
  {
    type: "CONDITION",
    label: "Condition",
    defaults: { field: "communication.patient_replied", operator: "truthy" },
  },
  { type: "SEND_TEMPLATE", label: "Send template", defaults: { templateName: "", variableKeys: [] as string[] } },
  { type: "CREATE_TASK", label: "Create Care Task", defaults: { title: "Follow-up", priority: "NORMAL" } },
  { type: "ASSIGN_TASK", label: "Assign task", defaults: { title: "Assigned follow-up", priority: "NORMAL" } },
  { type: "NOTIFY_STAFF", label: "Notify staff", defaults: { title: "Staff attention", body: "" } },
  { type: "ESCALATE", label: "Escalate", defaults: { reason: "Needs human" } },
  { type: "ADD_TAG", label: "Add tag", defaults: { tag: "" } },
  { type: "REMOVE_TAG", label: "Remove tag", defaults: { tag: "" } },
  { type: "MEDICATION_LOOKUP", label: "Medication lookup", defaults: {} },
  { type: "PATIENT_LOOKUP", label: "Patient lookup", defaults: {} },
  { type: "APPOINTMENT_LOOKUP", label: "Appointment lookup", defaults: {} },
  { type: "END", label: "End", defaults: {} },
] as const;

export function addPaletteNode(def: FlowDefinition, type: string, defaults: Record<string, unknown>): FlowDefinition {
  const id = `n_${Math.random().toString(36).slice(2, 9)}`;
  const label = FLOW_PALETTE.find((p) => p.type === type)?.label ?? type;
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
    // remove direct last→end, insert last→new→end
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
