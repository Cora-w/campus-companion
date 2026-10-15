# 倾诉空间自测（2026-10-15）

入口保持原来的三枚小胶囊，只将重复聊天入口替换为「心理测试」「性格测试」，保留「找人聊聊」。背景、倾诉输入框和原页面布局不改。测试使用独立全屏页面，包含用途说明、知情开始、逐题单选、上一题、答题卡跳转、漏题定位、修改答案和退出清空确认。

参考网站（已检索）：

- [MHA Screening](https://screening.mhanational.org/screening-tools/)：参考筛查用途说明、结果解释与自主求助路径。
- [16Personalities](https://www.16personalities.com/free-personality-test)：参考逐步答题与维度呈现，不使用其题库、结果文案或品牌。
- [华盛顿大学 PHQ-9](https://www.hiv.uw.edu/page/mental-health-screening/phq-9) 与 [GAD-7](https://www.hiv.uw.edu/page/mental-health-screening/gad-7)：16 道心理筛查题，保持最近两周的时间范围及每题 0–3 分；9 题与 7 题分别计算，不能合并成一个自创诊断分数。PHQ-9 采用 5、10、15、20 分的症状程度分界，GAD-7 采用 5、10、15 分分界。
- [IPIP Big-Five Factor Markers](https://ipip.ori.org/newBigFive5broadKey.htm)：五个维度各 10 题，共 50 题，交错呈现，按官方正反向计分键计分。情绪稳定性整体反转呈现为情绪敏感性，反向题计分为 `6 - 回答`；每维平均 1–5 分。条形展示是量表区间位置，不是常模百分位。[IPIP 使用说明](https://ipip.ori.org/newPermission.htm)确认材料处于公共领域，可复制、翻译和使用。

题目是中文参考译文，未声称经过本地常模验证或等同于正式经验证中文版。结果用于自我了解和筛查，不诊断疾病、不判断危险等级、不自动修改教师档案。性格不作好坏评价，也不是 MBTI 类型判定。心理测试第 9 题任何正向回答都会即时呈现求助提示；结果页无论总分高低都提示尽快接受专业评估。不能仅凭总分排除危险。

答案与结果仅存组件内存，退出测试清空，不发送至后端、不保存到账号、不自动带入给老师的留言。未来如果接入保存或分享，需要另行设计明确授权、访问范围与后端接口。

验证：

- `node --experimental-strip-types --test qa/assessment.test.mjs`：两个量表全部分界、独立计分、第 9 题低总分求助、50 题正反向键、缺答和非法值。
- `node qa/check-assessments.mjs`：真实页面完成 16 / 50 题、三枚入口的单行布局、单选及上一题、确认框层级和可点性、漏题定位、编辑结果、退出清空、求助不自动分享、320 / 390 / 430 手机与 1209 桌面宽度，以及短屏滚动和固定底部按钮。
