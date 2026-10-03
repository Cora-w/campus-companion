import assert from 'node:assert/strict'
import { placeOrderTransaction as place, changeOrderTransaction as change } from '../src/features/commerce/orderTransactions.ts'
import { snackShops } from '../src/data/snackData.ts'
const student={id:'S-DEMO-01',role:'student'}, merchant={id:'M-DEMO-01',role:'merchant',shopId:'afterclass'}
let state={shops:structuredClone(snackShops),orders:[]}
const stock=()=>state.shops[0].products[0].stock
const order=(id,count=1)=>({id,shopId:'afterclass',studentId:student.id,shop:'下课零食社',items:[{productId:'chips',name:'海盐脆薯片',count,price:650}],total:650*count,fee:0,mode:'到店自提',address:'店铺地址',recipient:'',phone:'',status:'待接单'})
function ok(result){assert.equal(result.error,'');state=result.state}
function denied(result){assert.ok(result.error);assert.equal(result.state,state)}
ok(place(state,order('a',12),student));assert.equal(stock(),0)
denied(place(state,order('b'),student));denied(place(state,order('a'),student))
denied(change(state,'a','已取消',{id:'other',role:'student'}))
denied(change(state,'a','已取消',{...merchant,shopId:'littlebread'}))
ok(change(state,'a','已取消',student));assert.equal(stock(),12)
denied(change(state,'a','已取消',student));assert.equal(stock(),12)
ok(place(state,order('c',2),student));assert.equal(stock(),10)
ok(change(state,'c','已取消',merchant));assert.equal(stock(),12)
ok(place(state,order('d'),student));ok(change(state,'d','备货中',merchant))
denied(change(state,'d','已取消',student));denied(change(state,'d','配送中',merchant))
ok(change(state,'d','待自提',merchant));ok(change(state,'d','已完成',merchant));assert.equal(stock(),11)
denied(change(state,'d','已取消',merchant))
for(const count of [-1,0,0.5,99])denied(place(state,order('invalid',count),student))
denied(place(state,{...order('price'),items:[{...order('price').items[0],price:1}]},student))
denied(place(state,{...order('total'),total:1},student))
denied(place(state,{...order('dup'),items:[...order('dup').items,...order('dup').items]},student))
state={...state,shops:state.shops.map(s=>({...s,products:s.products.map(p=>p.id==='chips'?{...p,active:false}:p)}))}
denied(place(state,order('inactive'),student))
console.log('PASS inventory exhaustion, restore once, rejection, ownership, valid transitions, invalid quantities/prices/totals/delisted products')

