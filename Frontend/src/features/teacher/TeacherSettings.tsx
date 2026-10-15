import { Button, Switch } from 'antd'
import type { Session } from '../../types/domain'
import { Icon } from '../../components/shared/Shared'
export function TeacherSettings({ session, count, reminders, setReminders, logout, embedded }: { session: Session; count: number; reminders: { priority: boolean; followUp: boolean }; setReminders: (value: { priority: boolean; followUp: boolean }) => void; logout: () => void; embedded?: boolean }) {
  return <div className="tw-professional-settings">
    <section className="tw-staff-identity"><span className="tw-staff-mark"><Icon name="shield"/></span><div><small>心理支持服务</small><h2>{session.name}</h2><p>心理教师 · {session.id}</p></div><span className="tw-staff-role">教师</span></section>
    <section className="tw-setting-group"><h2>服务范围</h2><dl className="tw-definition"><div><dt>负责学生</dt><dd>{count} 位已分配学生 · 演示</dd></div><div><dt>工作权限</dt><dd>预警复核、预约安排、干预与跟进</dd></div><div><dt>数据范围</dt><dd>授权状态摘要及本人的服务记录</dd></div><div><dt>角色分配</dt><dd>由学校管理员维护</dd></div></dl></section>
    <section className="tw-setting-group"><h2>提醒偏好</h2><div className="teacher-setting"><div><b>高风险提醒</b><p>提醒新的高风险事项</p></div><Switch aria-label="高风险提醒" checked={reminders.priority} onChange={priority => setReminders({ ...reminders, priority })}/></div><div className="teacher-setting"><div><b>到期回访提醒</b><p>提醒到期的跟进计划和观察复核</p></div><Switch aria-label="跟进到期提醒" checked={reminders.followUp} onChange={followUp => setReminders({ ...reminders, followUp })}/></div><p className="tw-settings-help">仅保存本次演示偏好，不发送通知；待办仍保留。</p></section>
    <details className="tw-service-guide"><summary>服务流程参考 <Icon name="next"/></summary><p>正式服务规范由学校心理中心确认。</p><ol>{['核实摘要与实际支持需要', '记录复核依据，确认是否接手', '安排沟通、记录干预与跟进计划', '必要时协调升级并确认接收', '回访与阶段复核后结案'].map(step => <li key={step}>{step}</li>)}</ol></details>
    <div className="tw-confidential-note"><Icon name="shield"/><p>仅查看授权摘要。私人聊天原文不在教师工作区展示，AI 线索由教师复核。</p></div>
    {!embedded && <Button className="tw-sign-out" block onClick={logout}>退出教师账号</Button>}
  </div>
}
