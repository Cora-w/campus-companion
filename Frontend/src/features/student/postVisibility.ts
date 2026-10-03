export type PostVisibility = 'campus' | 'friends' | 'private'
export const visibilityOptions: { value: PostVisibility; label: string; description: string; icon: string }[] = [
  { value: 'campus', label: '校园内同学', description: '展示在校园墙，校园内同学可以查看', icon: 'users' },
  { value: 'friends', label: '仅好友可见', description: '仅互为好友的同学可见，不展示在公开校园墙', icon: 'like' },
  { value: 'private', label: '仅自己可见', description: '作为个人记录，只在“我的发布”中查看', icon: 'shield' },
]
export const visibilityLabel = (value: PostVisibility = 'campus') => visibilityOptions.find(option => option.value === value)!.label

