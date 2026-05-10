import type { KnowledgePoint, Relation, AlignDecision } from "./types";
import { batchEmbed, cosine, chat } from "./doubao";

export interface AlignResult {
  decisions: AlignDecision[];
  mergedKnowledgePoints: KnowledgePoint[];
  mergedRelations: Relation[];
  stats: {
    originalChars: number;
    integratedChars: number;
    ratio: number;
  };
}

export async function alignKnowledgePoints(
  allKps: KnowledgePoint[],
  allRelations: Relation[],
  originalChars: number
): Promise<AlignResult> {
  if (allKps.length === 0) {
    return {
      decisions: [],
      mergedKnowledgePoints: [],
      mergedRelations: [],
      stats: { originalChars, integratedChars: 0, ratio: 0 },
    };
  }

  const texts = allKps.map((k) => `${k.name}：${k.definition}`);
  const embeds = await batchEmbed(texts);

  // 两两相似度，只跨教材
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < allKps.length; i++) {
    for (let j = i + 1; j < allKps.length; j++) {
      if (allKps[i].textbookId === allKps[j].textbookId) continue;
      const sim = cosine(embeds[i], embeds[j]);
      if (sim > 0.85) pairs.push([i, j, sim]);
    }
  }

  // 简单分组：每个高相似对作为一个候选组
  const groups: number[][] = [];
  const used = new Set<number>();
  for (const [i, j] of pairs) {
    if (used.has(i) || used.has(j)) continue;
    groups.push([i, j]);
    used.add(i);
    used.add(j);
  }

  const decisions: AlignDecision[] = [];
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const kpList = group.map((idx) => allKps[idx]);
    const prompt = `以下知识点来自不同教材，判断是否应合并：
${kpList.map((k, i) => `${i + 1}. ${k.name}：${k.definition}`).join("\n")}

请输出 JSON：{"decision": "merge/keep/remove", "reason": "...", "confidence": 0.9, "mergedName": "..."}`;

    let decision: any = { decision: "keep", reason: "默认保留", confidence: 0.5 };
    try {
      const msg = await chat([{ role: "user", content: prompt }]);
      let content = msg.content || "{}";
      content = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
      const brace = content.match(/\{[\s\S]*\}/);
      if (brace) content = brace[0];
      decision = JSON.parse(content);
    } catch {
      // fallback
    }

    decisions.push({
      id: `dec_${g + 1}`,
      groupKpIds: kpList.map((k) => k.id),
      decision: decision.decision || "keep",
      reason: decision.reason || "",
      confidence: decision.confidence || 0.5,
      mergedName: decision.mergedName,
    });
  }

  // 应用决策：merge 的保留一个，remove 的去掉
  const keptIds = new Set<string>();
  const mergedKps: KnowledgePoint[] = [];
  const idMap = new Map<string, string>(); // old -> new

  for (const d of decisions) {
    if (d.decision === "merge" && d.groupKpIds.length > 0) {
      const first = allKps.find((k) => k.id === d.groupKpIds[0])!;
      const merged: KnowledgePoint = {
        ...first,
        id: `merged_${d.id}`,
        name: d.mergedName || first.name,
        frequency: d.groupKpIds.reduce((sum, id) => {
          const kp = allKps.find((k) => k.id === id);
          return sum + (kp?.frequency || 1);
        }, 0),
      };
      mergedKps.push(merged);
      for (const oldId of d.groupKpIds) {
        keptIds.add(oldId);
        idMap.set(oldId, merged.id);
      }
    } else if (d.decision === "remove") {
      for (const id of d.groupKpIds) keptIds.add(id);
    }
  }

  // 保留未参与合并/删除的
  for (const kp of allKps) {
    if (!keptIds.has(kp.id)) {
      mergedKps.push(kp);
      idMap.set(kp.id, kp.id);
    }
  }

  // 重映射关系
  const mergedRelations: Relation[] = allRelations
    .map((r) => ({
      ...r,
      source: idMap.get(r.source) || r.source,
      target: idMap.get(r.target) || r.target,
    }))
    .filter((r, i, arr) => {
      // 去重相同 source-target
      return arr.findIndex((x) => x.source === r.source && x.target === r.target) === i;
    });

  const integratedChars = mergedKps.reduce(
    (sum, k) => sum + (k.definition?.length || 0),
    0
  );
  const ratio = originalChars > 0 ? integratedChars / originalChars : 0;

  return {
    decisions,
    mergedKnowledgePoints: mergedKps,
    mergedRelations,
    stats: {
      originalChars,
      integratedChars,
      ratio: Math.round(ratio * 100) / 100,
    },
  };
}
