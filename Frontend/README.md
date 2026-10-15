# 心伙伴前端

React、TypeScript、Vite、Ant Design 的校园生活与心理支持移动端原型。学生、心理教师与管理员共用校园首页、发现、发布、消息和“我的”；教师服务及校园管理功能按身份显示在“我的”，学生开店仍需管理员授权。

## 启动

npm install 后执行 npm run dev。构建用 npm run build。当前 Windows 环境如遇配置加载 spawn EPERM，可使用 npm run dev -- --configLoader native 或 npm run build -- --configLoader native。

登录前先选择学校。四川航天职业技术学院的演示账号：学生 20260001、心理教师 20261001、管理员 20262001，密码均为 Demo@2026。青禾大学（演示学校）的学生账号也为 20260001，用来验证同学号跨校不会串号。登录后直接进入所选学校，无需再次绑定。教师和管理员的工作功能在“我的”中按身份显示。数据为虚构演示，刷新后恢复样例。

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

## 轮播稳定性回归

`node qa/check-carousel-stability.mjs` 使用 dev 5191 和 CDP `[::1]:9351` 检查摄影展快速切图、循环边界、圆点导航、触屏滑动、返回恢复、不同屏宽，以及共用相册、图片预览和首页自动轮播。脚本检测动画结束后页码和轨道是否继续变化，防止只检查最终页码而漏掉中间持续抖动。测试使用独立浏览器页面并重置演示登录状态。

`node --experimental-strip-types --test qa/school-identity.test.mjs qa/api.test.mjs` 验证学校与账号命名空间及身份权限；`node qa/check-school-privacy.mjs` 使用 dev 5191 与 CDP `[::1]:9351` 验证登录前选校、跨校同学号、头像昵称、教师独占身份查看及足迹四种筛选。

`node qa/check-comment-motion.mjs` 验证三种身份的回车/点击评论、入场动画和发送回执、重复提交保护、中文选字、滚动定位、减少动态效果及重新打开时不重播旧评论（dev 5191 与 CDP `[::1]:9351`）。

校园导览：搜索或点选楼栋，在详情选择“我的当前位置（GPS）”或校门等出发地点，点击“去这里 · 步行导航”打开百度地图。无需先校准校园示意图；示意图连线和直线耗时只作参考，外部地图需确认目的地。`TEACHER_QA_CDP=http://[::1]:9351 TEACHER_QA_URL=http://127.0.0.1:5191 node qa/check-campus-walking.mjs` 验证起点、定位拒绝、坐标参数及取消导航，测试拦截外部请求，不证明实际道路收录或真机地图调起已验证。
