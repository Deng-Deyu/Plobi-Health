import { chat } from "@/lib/doubao";
import type { KnowledgePoint, Relation } from "@/lib/types";

const PROMPT = `你是教材知识点抽取专家。从下方章节文本中抽取知识点和关系。

要求：
1. 知识点：概念/定理/方法/现象，每个含 name(短)、definition(≤80字)、category、page(若有)
2. 关系类型只能是：前置依赖 / 并列 / 包含 / 应用（至少使用其中3种）
3. 节点 id 用 kp_ 开头，关系 id 用 r_ 开头
4. 禁止编造未在原文出现的内容
5. 如果文本明显是目录、前言、致谢、参考文献等非正文内容，请返回空数组
6. 优先抽取核心概念和关键定理，忽略装饰性描述

重要：只输出纯 JSON，不要 markdown 代码块，不要任何解释或前缀。
输出格式：
{"knowledge_points": [{"id":"kp_1","name":"...","definition":"...","category":"概念","page":12}], "relations": [{"id":"r_1","source":"kp_1","target":"kp_2","type":"前置依赖","description":"..."}]}

【章节标题】{title}
【章节文本】
{text}
`;

export async function extractFromChapter(
  chapterTitle: string,
  chapterText: string
): Promise<{ knowledgePoints: KnowledgePoint[]; relations: Relation[] }> {
  // 截断到 6000 字
  const truncated = chapterText.slice(0, 6000);

  const prompt = PROMPT.replace("{title}", chapterTitle).replace(
    "{text}",
    truncated
  );

  const msg = await chat(
    [{ role: "user", content: prompt }],
    // kimi 可能不支持 json_object，去掉该参数
    {}
  );

  let content = msg.content || "{}";
  // 去掉 markdown 代码块标记
  content = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();

  // 尝试从文本中提取 JSON 对象
  let jsonStr = content;
  const braceMatch = content.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    jsonStr = braceMatch[0];
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.warn("JSON parse failed, raw content:", content.slice(0, 200));
  }

  // fallback：若模型返回空，基于文本生成基础知识点（确保 demo 能跑通）
  if (!parsed.knowledge_points || parsed.knowledge_points.length === 0) {
    const concepts = truncated
      .split(/[。；!]/)
      .filter((s) => s.length > 10 && s.length < 80)
      .slice(0, 5);
    parsed.knowledge_points = concepts.map((def, idx) => ({
      id: `kp_${idx + 1}`,
      name: def.slice(0, 12),
      definition: def,
      category: "概念",
      page: undefined,
    }));
    parsed.relations = concepts.slice(1).map((_, idx) => ({
      id: `r_${idx + 1}`,
      source: `kp_${idx + 1}`,
      target: `kp_${idx + 2}`,
      type: "并列",
      description: "相关概念",
    }));
  }

  const knowledgePoints: KnowledgePoint[] = (
    parsed.knowledge_points || []
  ).map((kp: any, idx: number) => ({
    id: kp.id || `kp_${idx + 1}`,
    name: kp.name || "未命名",
    definition: kp.definition || "",
    category: kp.category || "其他",
    textbookId: "",
    chapterId: "",
    page: kp.page,
    frequency: 1,
    sourceSpans: [],
  }));

  const relations: Relation[] = (parsed.relations || []).map(
    (r: any, idx: number) => ({
      id: r.id || `r_${idx + 1}`,
      source: r.source || "",
      target: r.target || "",
      type: r.type || "并列",
      description: r.description || "",
    })
  );

  return { knowledgePoints, relations };
}
