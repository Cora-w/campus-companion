# 心伙伴前端

React、TypeScript、Vite、Ant Design 的校园生活与心理支持移动端原型。目前开放学生、心理教师与管理员演示入口，商家入口暂未开放。

## 启动

npm install 后执行 npm run dev。构建用 npm run build。当前 Windows 环境如遇配置加载 spawn EPERM，可使用 npm run dev -- --configLoader native 或 npm run build -- --configLoader native。

学生演示账号 S-DEMO-01，心理教师演示账号 T-DEMO-01，管理员演示账号 A-DEMO-01，密码均为 Demo@2026。登录页切换对应身份后登录，首次登录需要绑定演示学校。数据为虚构演示，刷新后恢复样例。

## 文件和后端协作

先阅读 [前后端对接说明](docs/BACKEND_HANDOFF.md)，认证契约见 [OpenAPI](docs/openapi.json)，环境配置见 [.env.example](.env.example)。

页面按业务放在 src/features，共用组件放在 src/components/shared，数据种子在 src/data，共用类型在 src/types，接口在 src/api，切换入口在 src/services，模拟接口在 src/mocks，配置在 src/config。

登录和退出已提供真实 HTTP 通道，默认 mock 模式。切换 remote 只影响认证；校园墙、消息、订单等业务仍使用本地数据，待按文档逐项接入。当前令牌仅保存在内存，刷新需重新登录。

[需求说明](docs/FRONTEND_REQUIREMENTS.md)和[设计说明](docs/DESIGN.md) 保留需求与设计背景；历史文档中的旧组件路径以当前目录和对接说明为准。

## 根目录分类

- src：前端源码。
- public：公开静态文件。
- docs：需求、设计和后端对接文档。
- qa：测试脚本；截图统一在 qa/screenshots。
- 根目录其余文件为运行配置，README 为入口说明。

node_modules、dist 和测试浏览器缓存由工具生成，已在 VS Code 文件树中隐藏；仍保留在磁盘。打开整个项目或单独打开 Frontend 均生效，可在 .vscode/settings.json 中取消隐藏。
