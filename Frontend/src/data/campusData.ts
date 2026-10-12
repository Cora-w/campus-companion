import type { PostVisibility } from '../features/student/postVisibility'
export type CampusPost = {
  visibility?: PostVisibility; ownerId?: string;
  id: string; author: string; category: string; title: string; text: string;
  location: string; time: string; likes: number; comments: { id: string; author: string; text: string }[];
  images: string[]; placeId?: string; owned?: boolean; anonymous?: boolean; cover?: 'food' | 'campus' | 'guide';
}
export const categories = ['全部', '校园日常', '美食发现', '新生指南', '活动搭子', '闲置互助', '匿名树洞']
export const campusPosts: CampusPost[] = [
  { id: 'post-1', author: '南门观察员', category: '美食发现', title: '刚来学校？先收藏这份食堂路线', text: '一食堂二楼的番茄牛肉面，适合下课后想吃点热乎的同学。午间高峰可以错开一点。你们还有什么私藏窗口？评论里一起补充。', location: '第一食堂 · 二楼', time: '20 分钟前 · 样例', likes: 86, comments: [{ id: 'c-1', author: '小林', text: '想看早餐合集，早八真的很需要。' }], images: [], cover: 'food' },
  { id: 'post-2', author: '校园漫游', category: '校园日常', title: '下课以后，去操场走两圈', text: '今天没有特别的安排，就和室友散步到天黑。发现图书馆后面的小路很安静，下次带相机来。', location: '校内 · 运动场', time: '45 分钟前 · 样例', likes: 32, comments: [], images: [], cover: 'campus' },
  { id: 'post-3', author: '学姐的备忘录', category: '新生指南', title: '新生第一周：这几个地方先认全', text: '取快递去南门服务中心，办校园卡先看学生服务中心的开放时间。找不到教室时，可以先确认楼栋与楼层，再看看门牌。欢迎在这里留言问路。', location: '学生服务中心', time: '今天 · 样例', likes: 124, comments: [], images: [], cover: 'guide' },
  { id: 'post-4', author: '周末不宅', category: '活动搭子', title: '周六有人一起逛校园摄影展吗？', text: '打算下午去艺术楼看展，看完可以顺路去东门喝杯咖啡。有兴趣的同学评论里见。', location: '艺术楼 · 展厅', time: '今天 · 样例', likes: 18, comments: [], images: [] },
  { id: 'post-5', author: '整理书架中', category: '闲置互助', title: '几本闲置教材，想交给需要的同学', text: '书里有一些笔记，具体版本可以先在评论里核对。校内当面交接，先看清书况再决定。', location: '图书馆附近', time: '昨天 · 样例', likes: 9, comments: [], images: [] },
  { id: 'post-6', author: '匿名同学', category: '匿名树洞', title: '开学后，正在慢慢找到自己的节奏', text: '有时候想一个人待着，有时候又想找朋友说说话。今天先完成一件小事，剩下的明天再说。', location: '', time: '昨天 · 样例', likes: 27, comments: [], images: [], anonymous: true },
]
export type CampusPlace = { id: string; name: string; kind: '好吃' | '好玩' | '指南'; area: '校内' | '周边'; category: string; desc: string; location: string; price: string; hours: string; cover: string }
export const campusPlaces: CampusPlace[] = [
  { id: 'place-1', name: '一食堂 · 番茄牛肉面', kind: '好吃', area: '校内', category: '食堂', desc: '下课后的一碗热汤面，同学推荐的日常选择。', location: '第一食堂二楼 06 窗口', price: '参考 ¥15 / 份', hours: '样例营业时间 10:30–20:00', cover: 'food' },
  { id: 'place-2', name: '东门咖啡小馆', kind: '好吃', area: '周边', category: '咖啡', desc: '和朋友坐一会儿，也能带本书来读。', location: '东门外步行约 8 分钟（示例）', price: '参考 ¥18 / 人', hours: '样例营业时间 09:00–21:00', cover: 'coffee' },
  { id: 'place-3', name: '校园摄影展', kind: '好玩', area: '校内', category: '展览', desc: '从同学的镜头里，重新认识每天经过的校园。', location: '艺术楼一层展厅', price: '免费 · 示例活动', hours: '样例开放时间 周六 14:00–17:00', cover: 'campus' },
  { id: 'place-4', name: '河畔步行道', kind: '好玩', area: '周边', category: '散步', desc: '适合周末散步，出发前确认路线和天气。', location: '南门外步行约 15 分钟（示例）', price: '免费', hours: '开放信息待学校核实', cover: 'walk' },
  { id: 'place-5', name: '快递怎么取？', kind: '指南', area: '校内', category: '新生必看', desc: '先查看取件短信，核对站点和取件码。大件包裹可提前咨询站点。', location: '南门服务中心', price: '校园生活指南', hours: '样例服务时间 09:00–20:00', cover: 'guide' },
  { id: 'place-6', name: '图书馆入馆与自习', kind: '指南', area: '校内', category: '学习', desc: '携带校园卡，按楼层指引选择阅览区。预约与开放时间以学校发布为准。', location: '图书馆一层服务台', price: '校园生活指南', hours: '实际开放时间待学校提供', cover: 'guide' },
]

// Fictional campus examples for preview; these are not live student posts.
campusPosts.push(...([
  ['post-7','早八不空腹','美食发现','一食堂早餐实测：8 元能吃到什么？','今天 7:20 去的，豆浆 2 元、鸡蛋 1.5 元、两个素包 4 元，一共 7.5 元。西侧窗口排得比较快，赶第一节课可以走那边。','一食堂一楼',67,'小林','豆浆可以自带杯吗？'],
  ['post-8','自习靠窗坐','校园日常','图书馆三楼，这几个位置有插座','靠东侧窗户的长桌下面有插座，下午会晒一点。今天自习到闭馆，记得带件外套，空调真的有点冷。','图书馆三楼',43,'小周','昨天坐过，确实需要外套。'],
  ['post-9','周末不宅','活动搭子','周六羽毛球双打，还差两位同学','约了周六 15:00—17:00 的场地，目前两个人。入门水平，主要出出汗，不介意失误。场地费到时候平摊，想来的评论一下。','北区体育馆',26,'阿远','新手可以吗？我有球拍。'],
  ['post-10','整理书架中','闲置互助','出一盏台灯，宿舍楼下可以试亮度','用了一个学期，三档色温、触摸调光，底座有一小处划痕。带电源线，想 25 元转给需要的同学，约好后当面试。','二号宿舍楼下',12,'小陈','晚上七点能看一下吗？'],
  ['post-11','学姐的备忘录','新生指南','第一次洗衣服：洗衣房使用顺序整理好了','先看机器是否空闲，再扫码选择程序；洗衣液要自己带。洗完及时取走，晚饭时间人少些。鞋子不能放进衣物洗衣机。','宿舍公共洗衣房',95,'刚入学的小许','正好需要，原来要自己带洗衣液。'],
  ['post-12','南门观察员','美食发现','东门这家盖饭，双拼比单点更划算','今天点了土豆牛肉加番茄炒蛋，18 元，米饭可以加。牛肉偏咸，口味清淡的记得提前说。十二点半去排了十分钟左右。','东门小吃街',78,'阿宁','我更喜欢他家的青椒鸡蛋。'],
  ['post-13','校园漫游','校园日常','傍晚的操场，适合把今天慢慢走完','做完小组汇报，和室友绕了四圈。没有拍出特别好看的照片，但是晚风挺舒服。下次准备早点来看看日落。','南区操场',54,'小满','今天的云真的很好看。'],
  ['post-14','周末不宅','活动搭子','周日下午去看摄影展，有人一起吗？','打算两点在艺术楼门口碰面，看完展去东门坐一会儿。不需要懂摄影，就是随便逛逛。三四个人就出发。','艺术楼',31,'阿远','我想去，可以带相机吗？'],
  ['post-15','整理书架中','闲置互助','求借一把螺丝刀，装小书架用','书架到了才发现没有附工具，需要十字螺丝刀，用半小时就还。可以去宿舍楼下取，有的话麻烦评论一下，谢谢。','三号宿舍楼',7,'小周','我有一套，晚饭后可以借你。'],
  ['post-16','匿名同学','匿名树洞','第一次一个人去社团活动，比想象中顺利','在门口犹豫了好一会儿，最后还是进去了。大家一起玩桌游，不用一直找话题。给同样想去又有点犹豫的同学留个记录。','',22,'路过的同学','我也想试试，下次鼓起勇气去。'],
  ['post-17','学姐的备忘录','新生指南','教学楼名字太像？先看课表里的楼号','新教学楼和第二教学楼不是同一个地方。找教室先看楼号，再看楼层，第一周最好提前十分钟出发。评论里可以一起补充容易走错的教室。','第二教学楼',61,'小林','第一天就走反了，好在没迟到。'],
  ['post-18','匿名同学','匿名树洞','终于把拖了一周的作业交了','不算做得多好，但交出去的一刻还是松了一口气。准备去吃顿喜欢的晚饭，再早点休息。','',18,'路过的同学','完成一件事也值得庆祝。'],
] as string[][]).map(([id,author,category,title,text,location,likes,commentAuthor,commentText], i) => ({id,author,category,title,text,location,likes:Number(likes),time: `${i < 4 ? '今天' : '昨天'} · 样例`,comments:[{id:`${id}-comment`,author:commentAuthor,text:commentText}],images:[],anonymous:category==='匿名树洞'})))

// Preview imagery is explicitly labelled as illustrative, never student uploads.
for (const post of campusPosts) {
 if(post.id==='post-8') post.images=['https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80'];
 if(post.id==='post-2') post.comments=[{id:'walk-reply',author:'小林',text:'图书馆后面那条路晚上有路灯吗？想晚自习后走一走。'}];
}

// Six-photo fixture for the shared album; illustrative stock photos only.
campusPosts.unshift({id:'post-album-demo',author:'校园漫游',category:'校园日常',title:'六张照片，收藏下课后的慢时光',text:'图书馆、河边与展厅，左右滑动看看不同的风景。此帖为多图交互样例，照片不是本校实拍。',location:'校园与周边 · 示意',time:'今天 · 六图样例',likes:16,comments:[],images:['photo-1507842217343-583bb7270b66','photo-1708146315637-daef7c6ce4e5','photo-1766766786108-6c98d82a26eb','photo-1764475552765-9f30797d9728','photo-1579783902614-a3fb3927b6a5','photo-1561214115-f2f134cc4912'].map(id=>`https://images.unsplash.com/${id}?auto=format&fit=max&w=1100&q=80`)})

