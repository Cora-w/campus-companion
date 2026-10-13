# 心伙伴 AI 后端服务

基于 Cloudflare Workers 的 AI 心理陪伴网关，提供对话接口与心理风险自动筛查。

## 接口

### `GET /api/health`
健康检查，返回当前运行模式（real/mock）和模型名称。

### `POST /api/chat`
对话接口。

**请求体：**
```json
{
  "message": "用户输入文字",
  "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}],
  "userId": "stu_001"
}
```

**返回：**
```json
{
  "reply": "AI 回复文本",
  "risk": {
    "score": 0,
    "reason": "无风险",
    "risk_label": "正常"
  },
  "riskReport": null
}
```

## 风险等级

| risk_label | 分数区间 | 说明 |
|---|---|---|
| 正常 | 0-39 | 普通倾诉，无消极想法 |
| 待观察 | 40-74 | 持续低落、压力大，无自伤计划 |
| 高危 | 75-100 | 存在自伤/轻生念头，自动生成预警报告 |

高危时 `riskReport` 不为 null，包含 userId、报告时间、对话摘要，并自动推送到教师端 Webhook（如已配置）。

## 部署

1. 登录 Cloudflare Workers 控制台
2. 创建新 Worker，将 `index.js` 完整粘贴
3. 在 Settings -> Variables and Secrets 配置环境变量：
   - `LLM_API_KEY`（必填）
   - `LLM_BASE_URL`（可选）
   - `LLM_MODEL`（可选）
   - `TEACHER_WEBHOOK_URL`（可选）
4. 保存部署

## 技术栈

- Cloudflare Workers（Serverless）
- 智谱 GLM 大模型 API
- 关键词正则 + LLM 语义双重风险筛查
