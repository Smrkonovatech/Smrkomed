/**
 * Knowledge retrieval over existing WhatsAppKnowledgeArticle (PUBLISHED only).
 * Bounded context — never inject the full KB.
 */

import { prisma } from "@smrkomed/database";

export type KbHit = {
  id: string;
  title: string;
  category: string;
  specialty: string | null;
  content: string;
  score: number;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 2);
}

export async function retrieveKnowledgeArticles(input: {
  clinicId: string;
  query: string;
  limit?: number;
  specialtyHint?: string | null;
}): Promise<KbHit[]> {
  const limit = Math.min(input.limit ?? 5, 8);
  const tokens = tokenize(input.query);
  const articles = await prisma.whatsAppKnowledgeArticle.findMany({
    where: {
      clinicId: input.clinicId,
      status: "PUBLISHED",
      ...(input.specialtyHint
        ? {
            OR: [
              { specialty: input.specialtyHint },
              { specialty: "GENERAL" },
              { specialty: null },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
    select: {
      id: true,
      title: true,
      category: true,
      specialty: true,
      content: true,
      keywords: true,
    },
  });

  const scored: KbHit[] = articles.map((a) => {
    const hay = `${a.title} ${a.category} ${a.specialty ?? ""} ${a.keywords ?? ""} ${a.content}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (a.title.toLowerCase().includes(t)) score += 4;
      if ((a.keywords ?? "").toLowerCase().includes(t)) score += 3;
      if (a.category.toLowerCase().includes(t)) score += 2;
      if (hay.includes(t)) score += 1;
    }
    if (input.specialtyHint && a.specialty === input.specialtyHint) score += 2;
    return {
      id: a.id,
      title: a.title,
      category: a.category,
      specialty: a.specialty,
      content: a.content.slice(0, 900),
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  // Prefer specialty-matched published hits when scores tie (clinic fertility → hospital → platform).
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const rank = (s: string | null) =>
      s === "FERTILITY" ? 3 : s === "HOSPITAL" ? 2 : s === "SMRKOMED" ? 1 : 0;
    return rank(b.specialty) - rank(a.specialty);
  });
  const top = scored.filter((s) => s.score > 0).slice(0, limit);
  if (top.length) return top;
  // Fallback: newest published (bounded) when no keyword hit
  return articles.slice(0, Math.min(3, limit)).map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    specialty: a.specialty,
    content: a.content.slice(0, 900),
    score: 0,
  }));
}

export function formatKnowledgeForPrompt(hits: KbHit[]): string {
  if (!hits.length) {
    return "No published clinic knowledge articles matched. Say information is unavailable and offer human follow-up.";
  }
  return hits
    .map(
      (h) =>
        `### ${h.title} [${h.category}${h.specialty ? ` · ${h.specialty}` : ""}]\n${h.content}`,
    )
    .join("\n\n");
}
