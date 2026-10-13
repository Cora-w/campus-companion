/**
 * 心伙伴 AI 网关 - Cloudflare Workers 版本
 * 功能：LLM语义风险打分(0-100)，关键词+大模型双重风险筛查，高危自动生成预警报告
 *
 * 需要配置的环境变量（Workers -> Settings -> Variables and Secrets）：
 *  - LLM_API_KEY          （必填，无则进入演示模式）
 *  - LLM_BASE_URL         （可选，默认 https://open.bigmodel.cn/api/paas/v4）
 *  - LLM_MODEL            （可选，默认 glm-4-flash）
 *  - TEACHER_WEBHOOK_URL  （可选，配置后高危预警自动推送到教师端后台）
 */
const DEFAULT_CONFIG = {
  baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  model: "glm-4-flash",
};
const RISK_TIMEOUT_MS = 15000;

const CHAT_SYSTEM_PROMPT = `你是「心伙伴」，一所校园里的 AI 心理陪伴助手。你的任务是倾听、理解与陪伴，帮助用户梳理情绪，而不是讲课或给建议。
行为准则：
1. 语气温暖、坦诚、简洁，一次只说一两句话，像朋友一样自然地回应，不要长篇大论。
2. 先接住情绪（共情），再适度澄清/陪伴，不急着给解决方案；除非用户主动询问，否则不要输出建议清单。
3. 不做心理诊断，不使用病症标签（如"你得了抑郁症"），不评价对错。
4. 尊重用户说的每一个细节，不编造用户未说的经历。
5. 当对话中出现下列高危信号时，用温和但明确的方式回应，并坚定建议寻求专业帮助，可在结尾附上学校心理支持渠道或求助热线：
   - 明确表达自伤/自杀想法或计划；
   - 表达"活着没意思""想消失"等重度绝望；
   - 有伤害他人的想法或计划；
   - 出现严重的自伤行为描述。
   示例回应："听到你这样说，我很担心你。你现在的痛苦值得被认真对待——请一定联系学校的心理老师，或者拨打 12356（全国心理援助热线），让专业的人陪着你，好吗？你不是一个人。"
6. 记录用户零散透露的重要信息（关系、事件、状态变化），为后续风险评估提供素材，但不要打断对话流。
当前对话环境为校园场景，用户可能是学生、教师或家长。始终以安全、保密、不评判为第一原则。`;

const RISK_ASSESS_PROMPT = `
你是校园心理风险评估助手，仅作为AI辅助筛查，绝对不能做医学诊断。
阅读下面完整对话记录，严格输出JSON，**禁止任何额外文字、解释、markdown**。
输出字段：
score: 0~100整数（风险总分，越高代表自伤、绝望、心理危机风险越高）
reason: 简短一句话，打分依据
risk_label: "正常" | "待观察" | "高危"
打分标准：
0-39：正常，普通倾诉吐槽，无消极绝望想法
40-74：持续低落、自我否定、压力巨大，无明确自伤计划
75-100：存在自伤/轻生念头，强烈绝望，存在伤害自己想法或计划
对话内容：{{dialog}}
`;

const HIGH_RISK_PATTERNS = [
  /不想活|不想活了|活着没意思|活不下去|死了算了|想死|自杀|自残|割腕|跳楼|喝药|烧炭|不想做人|没意义|死了更好|消失|想消失|不想存在|结束生命|了结|不想再继续|撑不下去|不想坚持|活够了|不想面对|死了就解脱|伤害自己|打自己|掐自己|撞墙|割手|割手臂|流血|想伤害|想杀人|想报复|杀了他|杀了|捅|砍|同归于尽|一起死|拉垫背|报复社会|伤害别人|伤害同学/,
];

const MEDIUM_RISK_PATTERNS = [
  /好难过|很难受|痛苦|绝望|崩溃|撑不住|扛不住|受不了|撑不下去了|坚持不下去了|没希望|看不到希望|迷茫|迷失|空虚|麻木|行尸走肉|失眠|睡不着|吃不下|哭|经常哭|不想说话|不想见人|不想出门|不想上学|不想上课|不想考试|不想面对|逃避|退缩|孤立|孤独|没人理解|没人懂|被孤立|被排挤|被欺负|被霸凌|被针对|压力大|压力好大|喘不过气|紧张|焦虑|很焦虑|抑郁|很抑郁|可能抑郁/,
];

function ruleScan(text) {
  const t = text.toLowerCase();
  for (const re of HIGH_RISK_PATTERNS) {
    if (re.test(t)) return ["high", ["高危关键词命中"]];
  }
  for (const re of MEDIUM_RISK_PATTERNS) {
    if (re.test(t)) return ["medium", ["中危关键词命中"]];
  }
  return ["none", []];
}

function extractJson(text) {
  const cleaned = String(text).replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("模型输出中未找到JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function riskScoreLLM(dialogText, env, keywordLevel = "none") {
  const prompt = RISK_ASSESS_PROMPT.replace("{{dialog}}", dialogText);
  const baseUrl = env.LLM_BASE_URL || DEFAULT_CONFIG.baseUrl;
  const model = env.LLM_MODEL || DEFAULT_CONFIG.model;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RISK_TIMEOUT_MS);
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.LLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: prompt }],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error("LLM评估接口异常 " + resp.status);
    const data = await resp.json();
    const res = extractJson(data.choices[0].message.content);
    let score = Number(res.score);
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(100, Math.round(score)));
    const label = ["正常", "待观察", "高危"].includes(res.risk_label) ? res.risk_label : "正常";
    return { score, reason: res.reason || "无理由", risk_label: label };
  } catch (e) {
    console.log("风险评估调用失败：", e.message);
    if (keywordLevel === "high") {
      return { score: 75, reason: "AI评估接口异常，按高危关键词兜底", risk_label: "高危" };
    }
    if (keywordLevel === "medium") {
      return { score: 40, reason: "AI评估接口异常，按中危关键词兜底", risk_label: "待观察" };
    }
    return { score: 0, reason: "评估失败", risk_label: "正常" };
  }
}

function buildChatMessages(history, userMessage) {
  const messages = [{ role: "system", content: CHAT_SYSTEM_PROMPT }];
  const recent = history.slice(-12);
  for (const h of recent) {
    if (h.role === "user" || h.role === "assistant") {
      messages.push({ role: h.role, content: (h.content || "").slice(0, 2000) });
    }
  }
  messages.push({ role: "user", content: userMessage.slice(0, 2000) });
  return messages;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/api/health" && request.method === "GET") {
        const hasKey = !!env.LLM_API_KEY;
        return new Response(JSON.stringify({
          status: "ok",
          mode: hasKey ? "real" : "mock",
          model: env.LLM_MODEL || DEFAULT_CONFIG.model,
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      if (path === "/api/chat" && request.method === "POST") {
        const body = await request.json();
        const { message = "", history = [], userId = "unknown" } = body;
        if (!message.trim()) {
          return new Response(JSON.stringify({ error: "message 不能为空" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const [ruleLevel] = ruleScan(message);
        let riskResult = { score: 0, reason: "无风险", risk_label: "正常" };
        let riskReport = null;

        if (ruleLevel === "high" || ruleLevel === "medium") {
          const fullDialogText = JSON.stringify([...history, { role: "user", content: message }]);
          riskResult = await riskScoreLLM(fullDialogText, env, ruleLevel);
          const { score, risk_label, reason } = riskResult;
          const reportTime = new Date().toISOString();
          if (score >= 75) {
            riskReport = {
              userId,
              reportTime,
              score,
              risk_label,
              reason,
              dialogSummary: fullDialogText.slice(0, 600),
              notice: "【AI辅助心理预警】本评估仅为筛查，非专业诊断，请老师人工复核"
            };
            console.log("=== 高危预警报告生成 ===", JSON.stringify(riskReport));
            if (env.TEACHER_WEBHOOK_URL) {
              const payload = JSON.stringify(riskReport);
              ctx.waitUntil(
                fetch(env.TEACHER_WEBHOOK_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: payload,
                }).then(r => console.log("预警推送完成，状态码:", r.status))
                  .catch(e => console.log("预警推送失败：", e.message))
              );
            }
          } else if (score >= 40) {
            console.log("【待观察记录】", JSON.stringify({ userId, score, reason, reportTime }));
          }
        }

        if (!env.LLM_API_KEY) {
          let reply;
          if (riskResult.risk_label === "高危") {
            reply = "听到你这样说，我很担心你。你现在的痛苦值得被认真对待——请一定联系学校的心理老师，或者拨打 12356（全国心理援助热线），让专业的人陪着你，好吗？你不是一个人。\n\n[演示模式·未配置AI密钥]";
          } else if (riskResult.risk_label === "待观察") {
            reply = "我在的。感觉你最近真的很难，谢谢你愿意告诉我。要不要和我多说一点？\n\n[演示模式·未配置AI密钥]";
          } else {
            reply = "我在听，你慢慢说。今天发生了什么，让你有这个感受？\n\n[演示模式·未配置AI密钥]";
          }
          return new Response(JSON.stringify({
            reply,
            risk: riskResult,
            riskReport
          }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const messages = buildChatMessages(history, message);
        const baseUrl = env.LLM_BASE_URL || DEFAULT_CONFIG.baseUrl;
        const model = env.LLM_MODEL || DEFAULT_CONFIG.model;
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.LLM_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.8,
            max_tokens: 800,
            stream: false,
          }),
        });
        if (!resp.ok) {
          const text = await resp.text();
          return new Response(JSON.stringify({ error: `LLM 返回 ${resp.status}: ${text.slice(0, 300)}` }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        const data = await resp.json();
        const reply = data.choices[0].message.content.trim();
        return new Response(JSON.stringify({
          reply,
          risk: riskResult,
          riskReport
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }
};
