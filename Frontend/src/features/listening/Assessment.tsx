import { useRef, useState } from 'react'
import { Button, Checkbox } from 'antd'
import { Drawer, Modal } from '../../navigation/BackOverlays'
import { Icon } from '../../components/shared/Shared'
import { assessmentItems, scoreMental, scorePersonality } from './assessmentModel'
import type { AssessmentKind } from './assessmentModel'
import './Assessment.css'

export function Assessment({ kind, close, support }: { kind: AssessmentKind; close: () => void; support: () => void }) {
  const mental = kind === 'mental'
  const items = assessmentItems(kind)
  const [stage, setStage] = useState<'intro' | 'questions' | 'result'>('intro')
  const [consent, setConsent] = useState(false)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null))
  const [leaving, setLeaving] = useState(false)
  const [overview, setOverview] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const choices = mental ? ['完全没有', '有几天', '一半以上的天数', '几乎每天'] : ['很不符合', '不太符合', '中间 / 不确定', '比较符合', '非常符合']
  const answered = answers.filter(n => n !== null).length
  const move = (next: number) => { setIndex(next); setOverview(false); scroller.current?.scrollTo({ top: 0 }); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })) }
  const back = () => { if (overview) { setOverview(false); return } if (stage === 'questions' && answered > 0) setLeaving(true); else close() }
  const result = mental && stage === 'result' ? scoreMental(answers) : null
  const needsSupport = mental && answers[8] !== null && answers[8]! > 0
  const showSupport = () => support()
  return <>
    <Drawer open placement="bottom" height="100%" zIndex={1800} rootClassName="assessment-root" title={mental ? '心理测试' : '性格测试'} onClose={back} extra={stage === 'questions' && <button className="assessment-overview-button" onClick={() => setOverview(v => !v)} aria-expanded={overview}>答题卡</button>}>
      <div className="assessment-scroll" ref={scroller}>
        {stage === 'intro' && <section className="assessment-intro">
          <div className={'assessment-art ' + (mental ? 'mental' : 'personality')} aria-hidden="true"><Icon name={mental ? 'like' : 'users'} /><span/><span/><b>{mental ? 'MIND CHECK-IN' : 'MEET YOURSELF'}</b></div>
          <span className="assessment-eyebrow">{mental ? '了解情绪，也照顾自己' : '发现自己的不同侧面'}</span>
          <h1>{mental ? '给最近的心情，做个回顾' : '从日常习惯，认识自己'}</h1>
          <p>{mental ? '从情绪、睡眠、精力和担忧等体验出发，回顾最近两周的状态。请按真实感受作答。' : '通过五个维度了解你的性格偏好。没有理想性格，也没有标准答案，选择平时的自己就好。'}</p>
          <div className="assessment-facts"><span><b>{items.length} 题</b>完整题目</span><span><b>{mental ? '3–5 分钟' : '6–10 分钟'}</b>参考用时</span><span><b>{mental ? '2 个维度' : '5 个维度'}</b>结果回顾</span></div>
          <div className="assessment-includes"><h3>这次会了解什么</h3>{mental ? <><p><span>01</span><b>情绪与生活状态</b><small>PHQ-9 · 9 题</small></p><p><span>02</span><b>焦虑与担忧体验</b><small>GAD-7 · 7 题</small></p></> : <p className="assessment-dimension-list">外向性 / 宜人性 / 尽责性 / 情绪敏感性 / 想象与求知</p>}</div>
          <div className="assessment-note"><Icon name="shield"/><p>仅自己可见，退出后清空，不自动分享给老师。{mental ? '筛查结果不等同于诊断。' : '中文参考译文用于自我探索，不是能力评定或性格排名。'}</p></div>
          <Checkbox checked={consent} onChange={e => setConsent(e.target.checked)}>我了解测试用途，愿意开始自测</Checkbox>
        </section>}
        {stage === 'questions' && <section className="assessment-questions">
          <div className="assessment-progress-copy"><span>{mental ? (index < 9 ? '情绪状态 · PHQ-9' : '焦虑体验 · GAD-7') : '大五人格 · 日常偏好'}</span><b>{index + 1}<small> / {items.length}</small></b></div>
          <div className="assessment-progress" role="progressbar" aria-label="已回答题数" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={items.length}><span style={{ width: answered / items.length * 100 + '%' }}/></div>
          {overview && <div className="assessment-overview"><p>已答 {answered} / {items.length} 题 · 点击题号可修改</p><div>{items.map((_, i) => <button key={i} type="button" className={answers[i] !== null ? 'answered' : ''} aria-current={i === index ? 'step' : undefined} aria-label={'第 ' + (i + 1) + ' 题，' + (answers[i] === null ? '未答' : '已答')} onClick={() => move(i)}>{i + 1}</button>)}</div></div>}
          <div className="assessment-question-card">
            <span className="assessment-eyebrow">{mental ? '最近两周，这种情况出现的频率是？' : '这句话在多大程度上符合平时的你？'}</span>
            <h2 ref={heading} tabIndex={-1} id="assessment-question">{items[index].text}</h2>
            <div className="assessment-choices" role="radiogroup" aria-labelledby="assessment-question">{choices.map((choice, i) => <label key={choice} className={answers[index] === i + (mental ? 0 : 1) ? 'selected' : ''}><input type="radio" name={'assessment-' + index} value={i} checked={answers[index] === i + (mental ? 0 : 1)} onChange={() => setAnswers(prev => prev.map((n, j) => j === index ? i + (mental ? 0 : 1) : n))}/><span>{choice}</span><i aria-hidden="true"><Icon name="check"/></i></label>)}</div>
          </div>
          {mental && index === 8 && needsSupport && <div className="assessment-safety" role="status"><b>这些感受值得被认真对待</b><p>不必等做完测试再求助。请尽快和可信任的人或专业人员沟通；若现在可能伤害自己，请立即联系当地急救服务，并请可信任的人陪在身边。</p><button onClick={showSupport}>查看真人支持</button></div>}
          <p className="assessment-question-hint">选择后点击下一题。可以用答题卡检查和修改答案。</p>
        </section>}
        {stage === 'result' && <section className="assessment-result">
          <span className="assessment-eyebrow">{mental ? '本次情绪回顾' : '你的五个性格维度'}</span><h1>{mental ? '看见感受，照顾自己' : '每一种倾向，都有自己的节奏'}</h1>
          {result ? <><p className="assessment-result-intro">两份量表独立计分，只反映最近两周的体验。分数不能用来诊断疾病，也不能替代面对面的专业评估。</p><div className="assessment-mental-scores">{[{name:'情绪相关困扰',scale:'PHQ-9',score:result.depression,max:27,label:result.depressionLabel},{name:'焦虑相关困扰',scale:'GAD-7',score:result.anxiety,max:21,label:result.anxietyLabel}].map(row => <article key={row.scale}><div><span>{row.name}</span><small>{row.scale}</small></div><strong>{row.score}<small> / {row.max}</small></strong><b>{row.label}</b><div className="assessment-trait-bar"><span style={{width:row.score / row.max * 100 + '%'}}/></div></article>)}</div>
            <div className="assessment-recommendation"><h3>接下来，可以这样照顾自己</h3><p>{result.needsSupport ? '你提到了与死亡或伤害自己有关的想法，无论总分高低，都建议尽快找专业人员进一步评估。若存在眼前危险，请立即联系当地急救服务，并请可信任的人陪伴。' : result.depression >= 10 || result.anxiety >= 10 ? '近期困扰可能值得进一步了解。可以预约学校心理老师或其他专业人员，一起梳理对生活的影响。' : '留意休息、活动和与他人的连接。即使分数较低，只要你觉得难受、困扰持续或影响生活，也可以主动寻求支持。'}</p><button onClick={showSupport}>找人聊聊 <Icon name="next"/></button></div>
            <details className="assessment-scoring"><summary>查看计分说明</summary><p>每题按 0–3 分计分。PHQ-9 的 0–4、5–9、10–14、15–19、20–27 分；GAD-7 的 0–4、5–9、10–14、15–21 分分别对应逐渐增加的症状程度参考。中文题目为参考译文，未经本地常模验证。低分不能排除心理问题，任何分数都不能直接判断紧急危险。</p></details>
          </> : <><p className="assessment-result-intro">数值是每个维度 10 道题的平均分，不是人群排名。不同环境和经历也会影响你的回答。</p><div className="assessment-traits">{scorePersonality(answers).map(trait => <article key={trait.key}><div><h3>{trait.name}</h3><b>{trait.average.toFixed(2)}<small> / 5</small></b></div><div className="assessment-trait-bar" role="meter" aria-label={trait.name} aria-valuenow={trait.average} aria-valuemin={1} aria-valuemax={5}><span style={{ width: trait.position + '%' }}/></div><div className="assessment-trait-poles"><span>{trait.low}</span><span>{trait.high}</span></div><p>{trait.description}</p></article>)}</div><p className="assessment-privacy">反向题按 6 减去所选分数计入平均值。结果用于探索偏好，不是固定标签，也不等同于 MBTI。</p></>}
          <p className="assessment-privacy"><Icon name="shield"/> 本次答案仅在页面内保留，不自动写入教师风险档案。</p>
        </section>}
        {stage !== 'questions' && <details className="assessment-sources"><summary>了解测试与来源</summary><p>{mental ? 'PHQ-9 与 GAD-7 中文参考译文；参考华盛顿大学提供的原题及计分。不是已验证的本地化版本。' : '依据 IPIP 官方 Big-Five Factor Markers 的五组 10 题量表翻译，共 50 题。情绪稳定性反向呈现为情绪敏感性。中文参考译文未经本地常模验证。'}</p><a href={mental ? 'https://www.hiv.uw.edu/page/mental-health-screening/phq-9' : 'https://ipip.ori.org/newBigFive5broadKey.htm'} target="_blank" rel="noopener noreferrer">{mental ? '华盛顿大学 · PHQ-9 题目与计分' : 'IPIP · 大五人格原题与计分键'}</a>{mental ? <a href="https://www.hiv.uw.edu/page/mental-health-screening/gad-7" target="_blank" rel="noopener noreferrer">华盛顿大学 · GAD-7 题目与计分</a> : <a href="https://ipip.ori.org/newPermission.htm" target="_blank" rel="noopener noreferrer">IPIP 公共领域使用说明</a>}</details>}
      </div>
      <footer className="assessment-actions">
        {stage === 'intro' && <Button type="primary" block disabled={!consent} onClick={() => { setStage('questions'); move(0) }}>开始测试</Button>}
        {stage === 'questions' && <><Button disabled={index === 0} onClick={() => move(index - 1)}>上一题</Button><Button type="primary" disabled={answers[index] === null} onClick={() => { if (index === items.length - 1) { if (answered !== items.length) { move(answers.findIndex(n => n === null)); return } setStage('result'); scroller.current?.scrollTo({ top: 0 }) } else move(index + 1) }}>{index === items.length - 1 ? answered === items.length ? '查看结果' : '补全未答题' : '下一题'}</Button></>}
        {stage === 'result' && <><Button onClick={() => { setStage('questions'); move(0) }}>修改答案</Button><Button type="primary" onClick={close}>完成，返回</Button></>}
      </footer>
    </Drawer>
    <Modal zIndex={2400} open={leaving} title="退出这次测试？" okText="退出并清空" cancelText="继续答题" onCancel={() => setLeaving(false)} onOk={close}><p>本次答案不会保存。留在页面可以继续完成测试。</p></Modal>
  </>
}
