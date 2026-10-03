export type DiscoverProduct = { id: string; name: string; price: number; likes: number; image: string; description: string }
export type DiscoverShop = { id: string; name: string; area: string; category: string; address: string; hours: string; price: number; likes: number; image: string; tags: string[]; products: DiscoverProduct[] }
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=80`
const noodles = photo('photo-1569718212165-3a8278d5f624')
const coffee = photo('photo-1509042239860-f550ce710b93')
const meal = photo('photo-1547592180-85f173990554')
const bread = photo('photo-1509440159596-0249088772ff')
export const discoverShops: DiscoverShop[] = [
  { id:'place-1', name:'一食堂 · 老汤面馆', area:'校内', category:'面食', address:'第一食堂二楼 06 窗口', hours:'10:30–20:00', price:15, likes:328, image:noodles, tags:['课间快餐','热汤暖胃'], products:[
    {id:'noodle-tomato',name:'番茄牛肉面',price:15,likes:216,image:noodles,description:'番茄酸甜、汤底浓郁，喜欢清淡可以备注少盐。'},
    {id:'noodle-braised',name:'红烧牛肉面',price:16,likes:158,image:noodles,description:'浓香红烧汤底，口味偏重，可选择辣度。'},
    {id:'noodle-egg',name:'番茄鸡蛋面',price:10,likes:92,image:noodles,description:'预算友好的一碗热面，不吃牛肉也有选择。'},
  ]},
  { id:'discover-rice',name:'东门小灶 · 家常盖饭',area:'周边',category:'家常菜',address:'东门小吃街 12 号（东门出门右转）',hours:'10:00–21:00',price:18,likes:286,image:meal,tags:['米饭可续','适合聚餐'],products:[
    {id:'rice-beef',name:'土豆牛肉双拼饭',price:18,likes:189,image:meal,description:'牛肉配土豆，再拼一份番茄炒蛋，分量适合正餐。'},
    {id:'rice-pepper',name:'青椒鸡蛋盖饭',price:12,likes:121,image:meal,description:'现炒青椒鸡蛋，微辣，想少油可以提前说。'},
  ]},
  { id:'place-2',name:'东门咖啡小馆',area:'周边',category:'咖啡甜品',address:'东门外青禾路 18 号一层',hours:'09:00–21:00',price:18,likes:204,image:coffee,tags:['安静自习','朋友小聚'],products:[
    {id:'coffee-latte',name:'生椰拿铁',price:18,likes:142,image:coffee,description:'椰香柔和，默认微甜，可以选择冰饮或热饮。'},
    {id:'coffee-americano',name:'冰美式',price:12,likes:96,image:coffee,description:'无糖黑咖啡，风味偏苦，适合不爱甜的同学。'},
  ]},
  { id:'discover-bakery',name:'麦香烘焙屋',area:'校内',category:'烘焙早餐',address:'学生生活中心一楼西侧 03 号',hours:'07:00–20:30',price:12,likes:167,image:bread,tags:['早八早餐','现烤面包'],products:[
    {id:'bread-salt',name:'海盐黄油卷',price:6,likes:118,image:bread,description:'外皮微脆，内里松软，刚出炉时黄油香更浓。'},
    {id:'bread-toast',name:'全麦吐司',price:12,likes:76,image:bread,description:'麦香扎实，适合带回宿舍做早餐。'},
  ]},
]
export type DiscoverReview = { id: string; target: string; author: string; text: string; rating: number; likes: number; time: string }
export const discoverReviews: DiscoverReview[] = [
  {id:'visit-1',target:'place-1',author:'下课去吃饭',rating:5,text:'窗口很好找，二楼楼梯上来右手边。十二点人多，建议错峰，阿姨出餐挺快。',likes:24,time:'样例探店'},
  {id:'visit-2',target:'noodle-tomato',author:'小林同学',rating:5,text:'番茄味很足，牛肉炖得软。面偏软，喜欢有嚼劲的可以提前跟阿姨说。',likes:18,time:'样例探店'},
  {id:'visit-3',target:'noodle-tomato',author:'晚饭吃什么',rating:4,text:'汤底酸甜，分量够吃。个人觉得有一点咸，下次会点少盐。',likes:9,time:'样例探店'},
  {id:'visit-4',target:'place-2',author:'靠窗发呆',rating:4,text:'靠窗的座位很舒服，下午适合和朋友聊天，周末可能要等位。',likes:12,time:'样例探店'},
  {id:'visit-5',target:'discover-rice',author:'干饭小分队',rating:5,text:'双拼选择多，米饭可以续，午休来吃很方便。',likes:16,time:'样例探店'},
  {id:'visit-6',target:'discover-bakery',author:'早八不空腹',rating:4,text:'早上七点就开门了，买好早餐再去上课正合适。',likes:8,time:'样例探店'},
]

