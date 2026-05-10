import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const maxDuration = 60;
export const runtime = "nodejs";

// 使用火山引擎 Ark (kimi-k2.6 支持视觉能力)
const ark = createOpenAI({
  baseURL: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: process.env.ARK_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { images } = await req.json(); // array of base64 strings

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const imageContents = images.map((img: string) => ({
      type: 'image',
      image: new URL(img),
    }));

    const { text } = await generateText({
      model: ark.chat(process.env.ARK_CHAT_MODEL || 'doubao-pro-32k-character-241215'),
      system: '你是一个专业的教材文本提取器。请读取图片中的文本，忽略页眉页脚，保留章节标题（用 Markdown 格式），直接输出纯文本，不要任何解释。',
      messages: [
        {
          role: 'user',
          // @ts-ignore
          content: [
            ...imageContents
          ],
        },
      ],
    });

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
