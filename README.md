# 学科知识整合智能体 (Textbook Integrator)

> 第一届浙大 AI 全栈极速黑客松参赛作品

[![Vercel Deploy](https://img.shields.io/badge/Vercel-线上演示-000?logo=vercel)](https://textbook-integrator.vercel.app)

一个基于 LLM 的学科知识整合 Agent，支持多格式教材解析、知识图谱自动抽取、跨教材对齐整合、RAG 问答和多轮对话修改决策。可将多本教材的知识点去重合并，生成压缩后的统一知识图谱。

## 在线演示

- **Vercel 部署地址**: https://textbook-integrator.vercel.app
- **GitHub 仓库**: https://github.com/Deng-Deyu/Plobi-Health

## 核心功能

- **多格式教材解析**：支持 PDF、Markdown、TXT、DOCX 前端解析，大文件不上传后端
- **知识图谱抽取**：LLM 自动抽取概念/定理/方法/现象四类知识点及前置依赖/并列/包含/应用关系
- **跨教材对齐整合**：Embedding 相似度召回 + LLM 二次判定（merge/keep/remove），目标压缩比 30%
- **RAG 问答**：基于教材内容的严格引用问答，答案标注 `[《教材名》第X章 第X页]`
- **多轮对话改决策**：自然语言指令（如"把 A 和 B 分开"）实时更新整合决策并刷新图谱
- **整合前后对比**：并排可视化展示整合前后的知识图谱变化

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Next.js 16 App Router + TypeScript |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 图谱可视化 | react-force-graph-2d |
| 文件解析 | pdfjs-dist（前端）+ mammoth（DOCX） |
| LLM | 火山引擎 Ark API（kimi-k2.6） |
| Embedding | 火山引擎（doubao-embedding-vision） |
| 向量检索 | 内存数组 + 余弦相似度（文件持久化） |
| 状态管理 | Zustand + localStorage |
| 部署 | Vercel（Node Runtime, maxDuration: 60s） |

## 项目结构

```
health-agent/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 三栏布局主页
│   │   ├── layout.tsx
│   │   └── api/                  # API 路由
│   │       ├── textbooks/        # 教材上传持久化
│   │       ├── extract/          # 知识点抽取
│   │       ├── align/            # 跨教材对齐整合
│   │       ├── rag/              # RAG 索引与查询
│   │       └── chat/             # 多轮对话 + tool calling
│   ├── components/
│   │   ├── TextbookPanel.tsx     # 左侧教材管理（拖拽上传、批量上传）
│   │   ├── GraphView.tsx         # 中间知识图谱（搜索、节点详情）
│   │   ├── GraphCompare.tsx      # 整合前后对比
│   │   ├── RagPanel.tsx          # RAG 问答面板
│   │   ├── ChatPanel.tsx         # 多轮对话面板
│   │   ├── DecisionList.tsx      # 整合决策列表
│   │   └── CompressionStat.tsx   # 压缩比统计
│   └── lib/
│       ├── doubao.ts             # LLM / Embedding 封装
│       ├── extract.ts            # 知识点抽取 Prompt + 解析
│       ├── align.ts              # 对齐整合逻辑
│       ├── rag.ts                # 向量存储与检索
│       ├── chunk.ts              # 分块算法（600字窗口 / 80字重叠）
│       ├── store.ts              # Zustand 状态管理
│       └── types.ts              # 全局类型定义
├── data/                         # 演示用示例教材
├── docs/                         # 架构文档、决策日志
├── report/                       # 整合报告
└── textbooks/                    # 本地真实教材（已 .gitignore）
```

## 快速开始

### 1. 环境准备

复制 `.env.example` 为 `.env.local`，填入火山引擎 API Key：

```env
ARK_API_KEY=your-api-key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3
ARK_CHAT_MODEL=kimi-k2.6
ARK_EMBED_MODEL=doubao-embedding-vision
SIM_THRESHOLD=0.85
TARGET_COMPRESS_RATIO=0.30
```

> 注意：不要把 `.env.local` 提交到 git。

### 2. 本地开发

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

### 3. 生产构建

```bash
npm run build
```

## 演示脚本

### 方式一：一键加载示例教材

1. 打开页面，点击左侧「加载示例教材」按钮
2. 系统自动加载 `data/sample-1.md` 和 `data/sample-2.md`
3. 选中一本教材，点击「构建图谱」
4. 等待 ~30s，中间面板显示知识图谱
5. 点击节点 → 右侧抽屉显示定义和原文片段

### 方式二：上传真实教材

1. 拖拽或点击上传 PDF/MD/TXT/DOCX（支持批量）
2. 等待解析完成（状态从 parsing → ready）
3. 上传第二本教材，点击「跨教材整合」
4. 查看压缩比（CompressionStat）和整合前后对比（GraphCompare）
5. 在「RAG 问答」输入问题，得到带引用的回答
6. 在「对话」面板输入指令（如"把'梯度下降'保留两个版本"），查看决策更新和图谱变化

## API 端点

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/textbooks` | POST/GET | 教材上传与列表 |
| `/api/extract` | POST | 知识点与关系抽取 |
| `/api/align` | POST | 跨教材对齐整合 |
| `/api/rag/index` | POST | 分块建索引 |
| `/api/rag/query` | POST | RAG 问答查询 |
| `/api/chat` | POST | 多轮对话 + Tool Calling |

## 关键设计决策

- **前端解析 PDF**：绕开 Vercel Serverless 函数 10s 超时限制
- **内存向量库**：5 小时黑客松时限内最快方案，用 `/tmp/vectors.json` 文件持久化
- **Embedding + LLM 二级判定**：先 embedding 快速召回候选（0.85 阈值），再 LLM 精细判定，平衡成本与准确率
- **并发上限 5**：防止 LLM API 限流导致抽取中断

## 演示数据

`data/` 目录下包含 2 份短示例教材，每份 ≤ 3000 字，确保 demo 5 分钟内跑完：

- `sample-1.md` — 机器学习基础概念
- `sample-2.md` — 深度学习入门

## 评分核心说明

本项目针对「第一届浙大 AI 全栈极速黑客松」赛题要求实现：

- **P0 必做**：教材解析、知识图谱、跨教材整合、RAG 问答、多轮对话改决策
- **P1 加分**：整合前后对比、压缩比统计、决策列表、搜索高亮
- **交付物**：Vercel URL + GitHub 仓库 + `docs/Agent架构说明.md` + `report/整合报告.md`
