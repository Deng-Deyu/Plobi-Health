import path from "path";

// Vercel Serverless 的 /var/task 是只读的，可写目录是绝对路径 /tmp
// 本地开发时继续使用项目目录下的 tmp
export const TMP_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "tmp");
