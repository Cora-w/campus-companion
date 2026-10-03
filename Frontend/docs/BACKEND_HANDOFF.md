# 心伙伴前后端对接说明

这份文档给负责页面的前端与负责服务的后端共同使用。当前发布范围只有学生端。登录和退出已经经过服务层，可切换远程接口；其他业务仍为本地演示，不会因切换认证模式自动变成真实业务。

## 目录和职责

| 目录 | 放什么 | 谁主要修改 |
| --- | --- | --- |
| src/features/auth | 登录页面与样式 | 前端 |
| src/features/student | 校园墙、发布、学生个人中心 | 前端 |
| src/features/discover | 地点、地图、搜索、地点社区 | 前端 |
| src/features/messages | 会话、联系人、AI 对话展示 | 前端 |
| src/features/campus | 校园活动、指南、闲置 | 前端 |
| src/features/commerce | 商家页面、商品和订单演示逻辑 | 前端 |
| src/features/teacher 和 admin | 暂不开放的教师与管理员页面 | 前端 |
| src/components/shared | 通用组件 | 前端 |
| src/types/domain.ts | 共用实体类型，不含演示数据 | 双方确认 |
| src/api | HTTP 请求、接口参数和返回类型 | 双方按契约对齐 |
| src/services | 页面调用入口，选择 mock 或 remote 实现 | 前端 |
| src/mocks | 本地模拟接口和公开演示凭据 | 前端 |
| src/data | 既有业务种子数据及其旧类型和辅助函数 | 前端，逐模块迁移 |
| src/config | 环境变量解析 | 前端 |
| src/theme 和 assets | 主题、静态素材 | 前端 |
| docs/openapi.json | 可导入 Apifox 或 Swagger 的认证接口契约草案 | 双方确认 |
| qa | 浏览器回归和接口测试 | 前端 |

旧的 data 模块仍包含部分界面类型和工具函数，并非后端数据库模型；新增跨端类型放在 types，新业务请求放在 api，页面通过 services 调用。不要在组件里直接写服务器地址或密码校验。

## 接入步骤

1. 复制根目录 .env.example 为 .env.local。
2. 保持 VITE_API_MODE=mock 可直接做学生端演示。
3. 后端确认 docs/openapi.json，先实现登录、退出两个接口。
4. 设置 VITE_API_MODE=remote，VITE_API_BASE_URL 指向接口根地址，如 http://localhost:8080/api/v1，重启前端。
5. 检查成功登录、密码错误、禁用账户、网络失败、超时、退出和非学生账号。
6. 按下面清单逐个把本地业务状态迁移到服务层。

默认地址 /api/v1 需要部署平台把该路径反向代理到后端。开发时可以直接配置完整后端地址；跨域服务应允许实际前端来源以及 Authorization、Content-Type 请求头和 OPTIONS 预检。当前采用 Bearer token，不发送跨域 Cookie。若团队改用 Cookie，需要共同修改契约、凭据和 CSRF 策略。

所有 VITE_ 变量都会进入浏览器，不能放数据库密码、服务私钥或 AI 服务密钥。

## 已实现的认证通道

接口返回直接 JSON，不包 data 外层。失败使用非 2xx 状态码，返回 code、message、可选 requestId。统一请求层处理 15 秒超时、网络失败、204 和错误信息，不自动重试写请求。

POST /auth/login

请求：
```json
{"account":"S-DEMO-01","password":"仅为示例"}
```

成功 200：
```json
{"user":{"id":"真实用户ID","name":"显示名","role":"student"},"accessToken":"服务端签发的令牌"}
```

身份由后端查询账户返回，前端不提交 role。后端必须校验密码、停用状态和权限。目前前端只接收学生身份，其他角色显示“当前仅开放学生端”。后端也应按当前发布范围限制登录。

失败示例 401：
```json
{"code":"INVALID_CREDENTIALS","message":"账号或密码不匹配","requestId":"请求追踪ID"}
```

POST /auth/logout

携带 Authorization: Bearer <accessToken>，成功返回 204 空响应；后端使会话或令牌失效。前端即使请求失败也清除本机状态，并提示服务端退出未确认。

令牌只保存在内存中，刷新后需重新登录。没有自动刷新令牌、自动恢复会话或完整的全局会话过期跳转。401 会清除请求层令牌。页面现有业务仍使用演示数据，不能直接作为正式版上线。

mock 模式只允许学生演示账户 S-DEMO-01，密码 Demo@2026；remote 模式不会回退到本地校验，也不会显示演示凭据入口。

## 后续业务接口清单

下表是建议路径，尚未实现请求适配或后端服务；字段需要结合页面现有类型共同确认后再加入 OpenAPI。不要把这些路径当成已经可用的 API。

| 模块 | 建议接口 | 对接位置和注意事项 |
| --- | --- | --- |
| 我的资料 | GET /users/me，PATCH /users/me | features/student/StudentProfile；只允许修改自己的可编辑字段 |
| 校园墙 | GET /posts，POST /posts，DELETE /posts/{id} | StudentArea、PublishComposer；游标分页、可见范围、归属校验 |
| 评论与收藏 | GET/POST /posts/{id}/comments，PUT/DELETE /posts/{id}/bookmark | 服务端按用户去重，返回权威计数 |
| 地点和搜索 | GET /places，GET /places/{id} | features/discover；关键词、分类、经纬度按需传递 |
| 图片上传 | POST /uploads | PublishComposer、PhotoAlbum；返回资源 ID 和 URL，限制大小和类型，禁止以 base64 作为长期业务字段 |
| 好友与消息 | GET /conversations，GET/POST /conversations/{id}/messages，POST /friend-requests | features/messages；只有会话成员可读写，推送协议另行确认 |
| AI 对话 | POST /ai/conversations/{id}/messages | CompanionChat；密钥留在后端，SSE 事件格式和取消机制另行约定 |
| 店铺和订单 | GET /shops，POST /orders，PATCH /orders/{id}/status | features/commerce；库存、金额和状态流转必须服务端事务校验，金额为整数分 |
| 校园活动和闲置 | GET /activities，POST /activities/{id}/registrations，GET /market-items | features/campus；容量和归属由后端检查 |
| 心理支持联系 | POST /support-requests | App 的 requestSupport；身份来自认证会话，学生不传可伪造的 studentId |
| 教师和管理员 | 暂不开放 | 后续独立确认鉴权和隐私边界，不通过隐藏按钮代替服务端授权 |

建议统一列表格式为 { items, nextCursor }，时间采用 ISO 8601，ID 为字符串。创建订单和消息需约定幂等键。以上是待双方确认的规范，不是当前接口承诺。

## 分工和验收

前端负责页面、交互、加载及失败状态、类型适配。后端负责认证、权限、持久化、文件服务、消息推送和 AI 调用。双方先确认 OpenAPI 的请求和响应，再分别实现，避免以页面组件或数据库表结构直接充当契约。

验证命令：
- npm run build -- --configLoader native
- node --experimental-strip-types qa/api.test.mjs
- node qa/check-login.mjs（需要本地 5176 和独立测试浏览器调试端口 9334）

接口测试使用假的 HTTP 响应，验证前端适配器行为，不证明真实后端已经联调成功。

