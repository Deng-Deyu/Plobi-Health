# 决策日志

## M1 (0-30 min) - 脚手架 + 首次部署

- 使用已安装的 Next.js 16.2.6 + Tailwind CSS v4 + shadcn/ui（无需重新 create next-app）
- 清理默认 public 资源与 page.tsx 样板内容
- 添加 openai / zustand / react-force-graph-2d / pdfjs-dist / mammoth / zod / nanoid 依赖
- 完成三栏布局空壳（左 30% / 中 50% / 右 20%）
- 完成 lib/doubao.ts、lib/types.ts、/api/health 自检路由
- 创建 .env.local / .env.example

## M2 (30-75 min) - P0-1 文件解析

- 前端 pdfjs-dist 解析 PDF（worker 文件已复制到 public/）
- MD 用正则 `^#+ ` 切章节、TXT 按行匹配章节标题切分
- DOCX 用 mammoth 提取纯文本后按 # 标题切分
- TextbookPanel 上传/列表 UI 完成（支持 PDF/MD/TXT/DOCX）
- POST /api/textbooks 写入 tmp/textbooks.json，GET 返回列表
- 已准备 data/sample-1.md 与 sample-2.md 示例教材
- 决策：pdfjs-dist 在 Next.js SSR 下会触发 DOMMatrix 报错，改为函数内动态 `import('pdfjs-dist')` 解决
- 决策：TXT 章节正则使用 `^...$` + `m` 标志，避免正文内容中的"第一章"被误匹配
