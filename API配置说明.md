# API 配置说明

## 当前使用的 API

### 主 API：火山引擎 Ark
- **API Key**: `ARK_API_KEY`
- **Base URL**: `https://ark.cn-beijing.volces.com/api/v3`
- **Chat Model**: `doubao-pro-32k-character-241215`
- **Embed Model**: `doubao-embedding-text-240715`
- **用途**: 主要聊天和 embedding 服务

### 备用 API：Kimi 官方
- **API Key**: `sk-kimi-iKddyNsMjUWjUTyzhTVTQ5KHRQ9Z7QzYejy3XBMaTiY3DUTedrTIjIOPC1LTNdbh`
- **Base URL**: `https://api.moonshot.cn/v1`
- **Model**: `kimi-k2`
- **用途**: 当火山引擎 API 失效时切换

## 如何切换 API

### 方案 1：修改环境变量（推荐）

在 `.env.local` 文件中修改：

```env
# 使用火山引擎（默认）
ARK_API_KEY=your-key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_CHAT_MODEL=doubao-pro-32k-character-241215

# 或使用 Kimi 官方
# ARK_API_KEY=sk-kimi-iKddyNsMjUWjUTyzhTVTQ5KHRQ9Z7QzYejy3XBMaTiY3DUTedrTIjIOPC1LTNdbh
# ARK_BASE_URL=https://api.moonshot.cn/v1
# ARK_CHAT_MODEL=kimi-k2
```

### 方案 2：代码中自动降级

可以修改 `src/lib/doubao.ts`，添加自动降级逻辑：

```typescript
const useKimiFallback = process.env.USE_KIMI_FALLBACK === 'true';

const openai = createOpenAI({
  baseURL: useKimiFallback 
    ? process.env.KIMI_BASE_URL 
    : process.env.ARK_BASE_URL,
  apiKey: useKimiFallback 
    ? process.env.KIMI_API_KEY 
    : process.env.ARK_API_KEY,
});
```

## API 能力对比

| 能力 | 火山引擎 Ark | Kimi 官方 |
|------|-------------|----------|
| 文本对话 | ✅ doubao-pro | ✅ kimi-k2 |
| 视觉理解 | ✅ kimi-k2.6 | ✅ kimi-k2 |
| Embedding | ✅ doubao-embedding | ❌ 不支持 |
| OCR | ✅ 支持 | ✅ 支持 |

## 注意事项

1. **不要提交 `.env.local` 到 Git**（已在 `.gitignore` 中）
2. **Kimi API Key 是敏感信息**，仅限本地使用
3. **Embedding 功能**只有火山引擎支持，切换到 Kimi 后 RAG 功能会失效
4. **视觉模型 OCR** 两者都支持，但模型名称不同

## 故障排查

### API 调用失败
```bash
# 检查环境变量是否配置
echo $ARK_API_KEY
echo $ARK_BASE_URL

# 测试 API 连通性
curl -H "Authorization: Bearer $ARK_API_KEY" \
  $ARK_BASE_URL/chat/completions \
  -d '{"model":"'"$ARK_CHAT_MODEL"'","messages":[{"role":"user","content":"test"}]}'
```

### 切换后 RAG 失效
- Kimi 官方 API 不支持 Embedding
- 需要保持 `ARK_EMBED_MODEL` 使用火山引擎
- 或改用其他 Embedding 服务
