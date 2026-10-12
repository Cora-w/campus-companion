# 航院校园地图与食堂目录

2026-10-12 更新。仅修改前端内容和展示，既有后端/数据库未修改。

| 文件 | 功能 |
| --- | --- |
| public/maps/scavc-sanxingdui-2024.jpg、README.md | 学校官方2024年三星堆校区地图及来源 |
| src/features/discover/CampusMap.tsx、CampusMap.css | 自适应地图、放大预览、返回关闭、官方楼栋目录 |
| src/data/hubData.ts、features/discover/StudyGuide.tsx | 去除虚构办公室与路线，以官方楼栋提供搜索/选取，保留课表导入 |
| src/data/scavc-stores.json | 从 Database/db/seeds/scavc-stores.json 原样复制的16条店铺/档口、4个场所及图片来源 |
| src/data/discoverData.ts | 转换校园店铺信息，稳定 ID 与数据库 seed_key 对齐 |
| src/features/discover/Discover.tsx | 校园目录优先、搜索经营内容/地址、未知价格排后、店铺详情/收藏/评价 |
| qa/check-scavc-campus.mjs | 浏览器检查地图、搜索、收藏、320/390/430/1280像素布局 |

新增天河食堂9条、天舟食堂2条、学府食堂3条、文体综合楼2条。匿名档口按分组展示，不伪造成独立商户；价格、时间、商品菜单待补充，不添加虚构评分或点赞。图片为类别示意，授权与作者保留在JSON。原4家演示店铺保留并明确标注，默认优先显示航院目录，原演示评论不归入新增店铺。

官方地图的“天和食堂”与用户目录“天河食堂”、以及“西园综合楼”与“学府食堂”并未获得位置对应确认，因此没有自动合并名称或绘制商铺地图坐标。地图楼栋名称取官方图，店铺名称按用户资料。新增商铺仍是本地静态目录，评价/收藏沿用已有机制；并未伪装成已连接真实商户或可下单的菜单。

更新数据库种子目录后需同步此JSON副本，前端构建不依赖仓库外目录。校园商铺id为 `scavc-{venue}-{key}`，与数据库种子生成规则一致；它是目录标识，未来对接API仍需映射真实UUID。

验证：`npm run build`、`npm run lint`；浏览器以独立开发集群的Edge/Chrome调试端口执行 `node qa/check-scavc-campus.mjs`，默认APP_URL=http://127.0.0.1:5186，CDP_PORT=9346（均可环境变量覆盖）。使用测试浏览器资料目录与演示账号，结果截图输出qa/screenshots；不影响真实账号。
