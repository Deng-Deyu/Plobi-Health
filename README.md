# 学科知识整合智能体 (Textbook Integrator)

> 第一届浙大 AI 全栈极速黑客松参赛作品

一个基于 LLM 的学科知识整合 Agent，支持教材解析、知识图谱抽取、跨教材对齐整合、RAG 问答和多轮对话修改决策。

## 在线演示

- **Vercel 部署地址**: [待部署后更新]

## 快速开始

1. 克隆仓库
2. 复制 `.env.example` 为 `.env.local` 并填入火山引擎 API Key
3. 安装依赖：`npm install`
4. 启动开发服务器：`npm run dev`
5. 打开 http://localhost:3000

## 演示步骤

1. 打开页面，左侧上传教材（PDF/MD/TXT/DOCX）
2. 选中教材，点击中间「构建图谱」
3. 等待 ~30s，看到知识图谱可视化
4. 点击节点查看详情
5. 右侧「RAG 问答」输入问题，得到带引用的回答
6. 上传第二本教材，点击「跨教材整合」查看压缩比
7. 「对话」面板可自然语言修改整合决策

## 技术栈

- Next.js 16 + TypeScript + Tailwind CSS v4
- shadcn/ui
- react-force-graph-2d
- 火山引擎 Doubao (kimi-k2.6 + doubao-embedding-vision)

## 项目结构

详见 `AI_DEV_SPEC.md` 和 `docs/Agent架构说明.md`
