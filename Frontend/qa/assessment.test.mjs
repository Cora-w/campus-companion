import test from 'node:test'
import assert from 'node:assert/strict'
import { mentalItems, personalityItems, scoreMental, scorePersonality } from '../src/features/listening/assessmentModel.ts'

test('PHQ-9 and GAD-7 remain separate at every severity boundary', () => {
  assert.equal(mentalItems.length,16)
  for(const [score,level] of [[0,0],[4,0],[5,1],[9,1],[10,2],[14,2],[15,3],[19,3],[20,4],[27,4]]) {
    let left=score;const answers=Array.from({length:9},()=>{const n=Math.min(3,left);left-=n;return n}).concat(Array(7).fill(0))
    const result=scoreMental(answers);assert.equal(result.depression,score);assert.equal(result.depressionLevel,level);assert.equal(result.anxiety,0)
  }
  for(const [score,level] of [[0,0],[4,0],[5,1],[9,1],[10,2],[14,2],[15,3],[21,3]]) {
    let left=score;const answers=Array(9).fill(0).concat(Array.from({length:7},()=>{const n=Math.min(3,left);left-=n;return n}))
    const result=scoreMental(answers);assert.equal(result.anxiety,score);assert.equal(result.anxietyLevel,level);assert.equal(result.depression,0)
  }
})

test('any positive answer to PHQ-9 item 9 prompts support even with low overall scores',()=>{
  const values=Array(16).fill(0);values[8]=1;const result=scoreMental(values)
  assert.equal(result.needsSupport,true);assert.equal(result.depressionLevel,0)
  values[8]=0;assert.equal(scoreMental(values).needsSupport,false)
})

test('all 50 items follow the official five ten-item scoring keys',()=>{
  assert.equal(personalityItems.length,50)
  const keys={
    extraversion:{positive:[0,10,20,30,40],negative:[5,15,25,35,45]},
    agreeableness:{positive:[6,16,26,36,41,46],negative:[1,11,21,31]},
    conscientiousness:{positive:[2,12,22,32,42,47],negative:[7,17,27,37]},
    sensitivity:{positive:[3,13,23,28,33,38,43,48],negative:[8,18]},
    imagination:{positive:[4,14,24,34,39,44,49],negative:[9,19,29]},
  }
  for(const [key,{positive,negative}] of Object.entries(keys)){
    for(const i of positive){assert.equal(personalityItems[i].trait,key);assert.ok(!personalityItems[i].reverse)}
    for(const i of negative){assert.equal(personalityItems[i].trait,key);assert.equal(personalityItems[i].reverse,true)}
    const answers=Array(50).fill(3);positive.forEach(i=>answers[i]=5);negative.forEach(i=>answers[i]=1)
    const max=scorePersonality(answers).find(row=>row.key===key);assert.equal(max.average,5);assert.equal(max.position,100)
    positive.forEach(i=>answers[i]=1);negative.forEach(i=>answers[i]=5)
    const min=scorePersonality(answers).find(row=>row.key===key);assert.equal(min.average,1);assert.equal(min.position,0)
  }
  assert.ok(scorePersonality(Array(50).fill(3)).every(row=>row.average===3&&row.position===50))
})

test('partial and malformed answers cannot produce a result',()=>{
  assert.throws(()=>scoreMental([0,0,0,0]));assert.throws(()=>scorePersonality(Array(20).fill(3)))
  for(const value of [null,undefined,4,-1,NaN,.5])assert.throws(()=>scoreMental([...Array(15).fill(0),value]))
  for(const value of [null,undefined,0,6,NaN,1.5])assert.throws(()=>scorePersonality([...Array(49).fill(3),value]))
  assert.throws(()=>scoreMental(Array(16)));assert.throws(()=>scorePersonality(Array(50)))
})
