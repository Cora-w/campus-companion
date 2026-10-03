import type { CampusPost } from '../../data/campusData'
import { placePhotos } from './placePhotos'

// Fictional community examples; the UI identifies the photos and posts as samples.
const exhibition = placePhotos['place-3'][0].src
const riverside = placePhotos['place-4'].map(p => p.src)
export const placeCommunityPosts: CampusPost[] = [
  {id:'place-story-1',placeId:'place-3',author:'镜头里的小周',category:'校园日常',title:'不用走远，也能看一场很棒的摄影展',text:'从艺术楼正门进去，左手边就是展厅。最喜欢记录校园生活的那一组，平时经过的楼梯和走廊，换个角度居然这么好看。慢慢看了四十分钟，建议留点时间读作品旁边的文字。',location:'艺术楼一层展厅',time:'今天 · 样例分享',likes:68,comments:[{id:'place-reply-1',author:'橙子',text:'想和室友一起去，展厅里可以拍照吗？'}],images:[exhibition]},
  {id:'place-story-2',placeId:'place-3',author:'午后看展',category:'校园日常',title:'比起打卡，更想认真看看这些作品',text:'挑了个没课的下午来，展厅很安静。喜欢光影和人物的同学可以多留意靠里侧的作品。拍照前记得确认现场规则，不用闪光灯，也别挡住其他同学。',location:'艺术楼一层展厅',time:'昨天 · 样例分享',likes:43,comments:[],images:['https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1000&q=80']},
  {id:'place-story-3',placeId:'place-3',author:'校园漫游',category:'校园日常',title:'下课后的半小时，留给艺术楼',text:'一个人逛也很自在。先看了入口处的介绍，再沿着展线慢慢走。开放安排还是以现场公告为准，不确定时先问一问值班同学，避免白跑。',location:'艺术楼一层展厅',time:'昨天 · 样例分享',likes:25,comments:[],images:['https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1000&q=80']},
  {id:'place-story-4',placeId:'place-4',author:'散步不用目的地',category:'校园日常',title:'南门出去，和室友沿河走到日落',text:'从南门出发慢慢走过去，树荫下很舒服。沿着河边走一段再原路返回，不赶时间的时候很适合。带上水，傍晚注意蚊虫，天黑之前回来。',location:'南门外河畔步行道',time:'今天 · 样例分享',likes:91,comments:[{id:'place-reply-2',author:'阿宁',text:'这段路适合慢跑吗？'}, {id:'place-reply-3',author:'小满',text:'看起来树荫好多，下次试试！'}],images:[riverside[0],riverside[1]]},
  {id:'place-story-5',placeId:'place-4',author:'慢一点的小林',category:'校园日常',title:'找到一张长椅，坐着看了一会儿河',text:'今天没安排打卡路线，就沿河慢慢走。走累了坐一会儿，比一直刷手机舒服。雨后路面可能湿滑，穿双方便走路的鞋更好。',location:'南门外河畔步行道',time:'昨天 · 样例分享',likes:37,comments:[],images:[riverside[1]]},
]

export function placeHeat(post: CampusPost, liked: string[]) {
  return post.likes + Number(liked.includes(post.id)) + post.comments.length * 2
}
export function placeSlides(posts: CampusPost[], liked: string[]) {
  const seen = new Set<string>()
  return [...posts].sort((a,b) => placeHeat(b,liked)-placeHeat(a,liked)).flatMap(post => post.images.map(src => ({src,post}))).filter(item => {
    if (seen.has(item.src)) return false
    seen.add(item.src); return true
  })
}

