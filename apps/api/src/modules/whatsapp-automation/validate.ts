import type { FlowDefinition, FlowNode } from "./types";

export type ValidationIssue = { code: string; message: string; nodeId?: string };

const ALLOWED_TYPES = new Set([
  "TRIGGER",
  "WAIT",
  "CONDITION",
  "SEND_TEMPLATE",
  "SEND_TEXT",
  "CREATE_TASK",
  "ASSIGN_TASK",
  "ASSIGN_STAFF",
  "ESCALATE",
  "NOTIFY_STAFF",
  "ADD_TAG",
  "REMOVE_TAG",
  "END",
  "AI_DRAFT",
  "MEDICATION_LOOKUP",
  "PATIENT_LOOKUP",
  "APPOINTMENT_LOOKUP",
]);

export function parseDefinition(raw: unknown): FlowDefinition {
  if (!raw || typeof raw !== "object") {
    return { nodes: [], edges: [] };
  }
  const def = raw as FlowDefinition;
  return {
    nodes: Array.isArray(def.nodes) ? def.nodes : [],
    edges: Array.isArray(def.edges) ? def.edges : [],
  };
}

function hasCycleFrom(definition: FlowDefinition, startId: string): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const dfs = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const e of definition.edges.filter((x) => x.source === id)) {
      if (dfs(e.target)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return dfs(startId);
}

export function validateFlowDefinition(definition: FlowDefinition, _opts?: { requireWhatsApp?: boolean }) {
  const issues: ValidationIssue[] = [];
  const { nodes, edges } = definition;
  if (nodes.length === 0) {
    issues.push({ code: "NO_NODES", message: "Flow has no nodes." });
    return issues;
  }
  const triggers = nodes.filter((n) => n.type === "TRIGGER");
  if (triggers.length !== 1) {
    issues.push({ code: "TRIGGER", message: "Flow must have exactly one TRIGGER node." });
  }
  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    if (!ALLOWED_TYPES.has(n.type)) {
      issues.push({ code: "NODE_TYPE", message: `Invalid node type "${n.type}" on "${n.label}".`, nodeId: n.id });
    }
  }
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) {
      issues.push({ code: "EDGE", message: `Broken connection ${e.id} references missing nodes.` });
    }
  }
  const reachable = new Set<string>();
  const start = triggers[0]?.id;
  if (start) {
    const queue = [start];
    while (queue.length) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const e of edges.filter((x) => x.source === id)) queue.push(e.target);
    }
    if (hasCycleFrom(definition, start)) {
      // Pure WAIT loops without END can be intentional — flag only if no END reachable
      const endReachable = nodes.some((n) => n.type === "END" && reachable.has(n.id));
      if (!endReachable) {
        issues.push({
          code: "INFINITE_LOOP",
          message: "Flow appears to loop without reaching an END node.",
        });
      }
    }
  }
  for (const n of nodes) {
    if (start && !reachable.has(n.id) && n.type !== "TRIGGER") {
      issues.push({
        code: "DISCONNECTED",
        message: `Node "${n.label}" is not connected from the trigger.`,
        nodeId: n.id,
      });
    }
    if (n.type === "SEND_TEMPLATE") {
      const name = String(n.config["templateName"] ?? "");
      if (!name) {
        issues.push({
          code: "TEMPLATE",
          message: `Reminder node "${n.label}" requires a WhatsApp template name.`,
          nodeId: n.id,
        });
      }
    }
    if (n.type === "WAIT") {
      const mode = String(n.config["mode"] ?? "duration");
      if (mode === "duration") {
        const amount = Number(n.config["amount"] ?? 0);
        if (!amount || amount < 0) {
          issues.push({
            code: "WAIT",
            message: `Wait node "${n.label}" needs a positive duration.`,
            nodeId: n.id,
          });
        }
      }
      if (mode === "until_datetime" && !n.config["until"]) {
        issues.push({
          code: "WAIT",
          message: `Wait node "${n.label}" needs an until date/time.`,
          nodeId: n.id,
        });
      }
    }
    if (n.type === "CONDITION") {
      const field = n.config["field"] ?? n.config["kind"];
      if (!field && !n.config["and"] && !n.config["or"]) {
        issues.push({
          code: "CONDITION",
          message: `Condition "${n.label}" needs a field, kind, or AND/OR group.`,
          nodeId: n.id,
        });
      }
      const hasYes = edges.some((e) => e.source === n.id && e.branch === "yes");
      const hasNo = edges.some((e) => e.source === n.id && e.branch === "no");
      const hasAny = edges.some((e) => e.source === n.id);
      if (hasAny && !hasYes && !hasNo) {
        // allowed — default edge
      } else if (hasAny && (!hasYes || !hasNo)) {
        issues.push({
          code: "CONDITION_BRANCH",
          message: `Condition "${n.label}" should connect both YES and NO branches (or a single default path).`,
          nodeId: n.id,
        });
      }
    }
    if (n.type === "CREATE_TASK" || n.type === "ASSIGN_TASK") {
      if (!String(n.config["title"] ?? "").trim()) {
        issues.push({
          code: "TASK",
          message: `Task node "${n.label}" needs a title.`,
          nodeId: n.id,
        });
      }
    }
    if ((n.type === "ADD_TAG" || n.type === "REMOVE_TAG") && !String(n.config["tag"] ?? "").trim()) {
      issues.push({
        code: "TAG",
        message: `Tag node "${n.label}" needs a tag value.`,
        nodeId: n.id,
      });
    }
  }
  return issues;
}

export function nextNodes(definition: FlowDefinition, nodeId: string, branch?: string): FlowNode[] {
  const from = definition.edges.filter((e) => e.source === nodeId);
  let edges = from;
  if (branch) {
    const exact = from.filter((e) => e.branch === branch);
    if (exact.length > 0) edges = exact;
    else edges = from.filter((e) => !e.branch || e.branch === "default");
  } else {
    edges = from.filter((e) => !e.branch || e.branch === "default");
  }
  return edges
    .map((e) => definition.nodes.find((n) => n.id === e.target))
    .filter((n): n is FlowNode => Boolean(n));
}
