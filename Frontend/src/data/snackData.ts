export type SnackProduct = { active?: boolean; id: string; name: string; category: string; price: number; unit: string; icon: string; color: string; stock: number; note: string }
export type SnackShop = { schoolId?: string; id: string; ownerId?: string; isOpen?: boolean; adminSuspended?: boolean; name: string; avatar: string; tagline: string; location: string; hours: string; color: string; products: SnackProduct[] }
export const snackShops: SnackShop[] = [
  { id: 'afterclass', name: '下课零食社', avatar: '下', tagline: '课间十分钟，也要吃点喜欢的', location: '第一食堂旁 · 生活服务街 03 号', hours: '09:00–22:00', color: '#f3d6ad', products: [
    { id:'chips', name:'海盐脆薯片', category:'咸味小食', price:650, unit:'60g / 袋', icon:'🥔', color:'#f6dfaf', stock:12, note:'薄切酥脆，咸香刚刚好。' },
    { id:'tea', name:'白桃乌龙茶', category:'饮品', price:500, unit:'500ml / 瓶', icon:'🍑', color:'#f3d4ca', stock:20, note:'清爽茶香，搭配小食很合适。' },
    { id:'cookie', name:'可可曲奇', category:'甜味零食', price:890, unit:'100g / 盒', icon:'🍪', color:'#e9cfb7', stock:8, note:'浓郁可可，适合分享。' },
    { id:'nuts', name:'每日坚果', category:'咸味小食', price:490, unit:'25g / 袋', icon:'🥜', color:'#e1e6cd', stock:15, note:'小袋便携，含坚果类原料。' },
  ] },
  { id:'littlebread', name:'小麦面包房', avatar:'麦', tagline:'把刚出炉的快乐装进纸袋', location:'图书馆东侧 · 02 号铺', hours:'08:00–20:30', color:'#e3e8cf', products:[
    { id:'croissant', name:'黄油可颂', category:'烘焙', price:800, unit:'1 个', icon:'🥐', color:'#efe0bf', stock:9, note:'含小麦、乳制品，具体配料请向店家确认。' },
    { id:'bread', name:'软软吐司', category:'烘焙', price:1200, unit:'半条 / 袋', icon:'🍞', color:'#eadbc6', stock:6, note:'早餐与课间的小满足。' },
    { id:'milk', name:'原味牛奶', category:'饮品', price:450, unit:'250ml / 盒', icon:'🥛', color:'#dce9e6', stock:18, note:'含乳制品。' },
  ] },
  { id:'nightshop', name:'晚自习补给站', avatar:'晚', tagline:'给认真学习的你，补一点能量', location:'二号宿舍楼下 · 便利店', hours:'10:00–23:00', color:'#dbe1ed', products:[
    { id:'rice', name:'海苔饭团', category:'轻食', price:700, unit:'1 个', icon:'🍙', color:'#dce4d7', stock:7, note:'当日食用，具体配料以店内标签为准。' },
    { id:'coffee', name:'拿铁咖啡', category:'饮品', price:990, unit:'300ml / 杯', icon:'☕', color:'#e7d6c9', stock:10, note:'含咖啡因及乳制品。' },
    { id:'chocolate', name:'黑巧克力', category:'甜味零食', price:790, unit:'40g / 块', icon:'🍫', color:'#e7cfce', stock:0, note:'暂时售罄，看看其他商品吧。' },
  ] },
]
export const snackPrice = (cents: number) => (cents / 100).toFixed(2)

