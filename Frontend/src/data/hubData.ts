export type SupportRequest = { id: string; studentId: string; studentName: string; topic: string; time: string; status: '待联系' | '已受理'; teacherId?: string }
export type HubPage = 'guide' | 'market' | 'activities' | 'listen'
export const hubTitles: Record<HubPage, string> = { guide: '校园指南', market: '校园闲置', activities: '活动搭子', listen: '倾诉空间' }
export const rooms = [
  { id:'a', name:'高等数学课堂', building:'第一教学楼', room:'3 层 · A305', hours:'按课表上课', route:'南门 → 中央步道 → 第一教学楼东门 → 东侧楼梯上三楼，右转第二间', x:25,y:30 },
  { id:'b', name:'陈老师 · 辅导员办公室', building:'学生服务中心', room:'2 层 · 208', hours:'工作日 14:00–17:00（样例）', route:'南门 → 右侧步道 → 学生服务中心正门 → 电梯二楼，左侧走廊', x:72,y:65 },
  { id:'c', name:'李老师 · 计算机教研室', building:'实验楼', room:'4 层 · B402', hours:'工作日 15:00–16:30（样例），建议提前预约', route:'南门 → 中央步道 → 图书馆前右转 → 实验楼 → 电梯四楼', x:74,y:28 },
  { id:'d', name:'大学英语课堂', building:'第二教学楼', room:'2 层 · 206', hours:'按课表上课', route:'南门 → 中央步道 → 左侧第二栋楼 → 西侧楼梯二楼', x:24,y:65 },
  { id:'e', name:'心理支持预约处', building:'学生服务中心', room:'3 层 · 302', hours:'工作日 09:00–17:00（样例）', route:'南门 → 右侧步道 → 学生服务中心 → 电梯三楼，出门右侧', x:72,y:65 },
]
export const schoolNotices = [
  {id:'n1',type:'校历',title:'假期与返校安排',detail:'样例：假期前请整理宿舍电源，返校安排与补课时间以教务处校历为准。学校尚未提供真实日期。',action:'订阅校历提醒',open:true},
  {id:'n2',type:'考试',title:'大学英语四、六级报名提醒',detail:'样例：核对学籍信息、确认报考资格，在学校公布的报名渠道完成缴费。具体时间与要求以学校正式通知为准。',action:'关注报名通知',open:true},
  {id:'n3',type:'竞赛',title:'校园创新设计赛 · 组队招募',detail:'样例：2–4 人组队，可提交校园服务、生活改善等方向方案。当前报名开放状态为演示，正式时间、资格与报名地址待学校提供。',action:'登记参赛意向',open:true},
  {id:'n4',type:'竞赛',title:'校园摄影赛 · 报名已结束',detail:'样例：本轮征集已结束，可关注下一期通知。',action:'报名已结束',open:false},
]
export type MarketItem = { photos?:string[]; seller?:string; id:string; title:string; price:number; detail:string; place:string; owner:boolean; status:'在售'|'已预订'|'已售出'; reservedByMe?:boolean }
export const marketSeed: MarketItem[] = [
  {id:'m1',title:'三档调光台灯',price:25,detail:'用了一个学期，带电源线。底座有轻微划痕，可当面试亮度。',place:'二号宿舍楼下',owner:false,status:'在售'},
  {id:'m2',title:'九成新羽毛球拍',price:60,detail:'含拍套，手胶刚换。可在体育馆门口看实物。',place:'北区体育馆',owner:false,status:'已售出'},
  {id:'m3',title:'我的高数教材（上册）',price:15,detail:'有课堂笔记，无缺页。这是你的演示商品，可操作成交状态。',place:'图书馆门口',owner:true,status:'在售'},
  {id:'m4',title:'宿舍小书架',price:20,detail:'两层桌面书架，需自己带走。已有同学预订。',place:'三号宿舍楼下',owner:false,status:'已预订'},
]
export type BuddyActivity = {id:string;title:string;place:string;time:string;detail:string;count:number;capacity:number;joined:boolean;owner:boolean;closed:boolean}
export const activitySeed: BuddyActivity[] = [
  {id:'b1',title:'周末羽毛球双打',place:'北区体育馆',time:'本周六 15:00–17:00 · 样例',detail:'入门水平，自带球拍，场地费按实际人数平摊。',count:3,capacity:4,joined:false,owner:false,closed:false},
  {id:'b2',title:'一起逛校园摄影展',place:'艺术楼门口',time:'本周日 14:00 · 样例',detail:'随便逛逛，不需要摄影基础，四个人出发。',count:4,capacity:4,joined:false,owner:false,closed:false},
  {id:'b3',title:'我发起的图书馆自习',place:'图书馆二楼',time:'明天 19:00–21:00 · 样例',detail:'各学各的，中途可以一起休息十分钟。',count:2,capacity:3,joined:true,owner:true,closed:false},
  {id:'b4',title:'傍晚操场散步',place:'南区操场',time:'昨天 18:00 · 样例',detail:'活动已结束，期待下次相约。',count:3,capacity:4,joined:false,owner:false,closed:true},
]

