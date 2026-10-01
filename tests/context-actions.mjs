import assert from 'node:assert/strict';
import {chooseContext,padAction,preferredBuild} from '../web/context-actions.js';
const L={grinderIn:{x:-2.9,z:-5.4},grillIn:{x:-6.6,z:1.3},counterIn:{x:.6,z:5},cash:{x:3.8,z:5},grinderOut:{x:-5.6,z:-2},grillOut:{x:-3.9,z:4.3}};
const base=()=>({player:{x:0,z:0,dead:0,stack:0,stackN:0,cap:14},money:10,served:0,currentDistrict:-1,meats:[],bears:[],districts:[],worldPads:[],carryN:0});
{
 const s=base();s.player.stack=1;s.player.stackN=3;s.cashPile=40;
 assert.equal(chooseContext(s,L).id,'base:deposit-meat','carried raw meat takes priority over a competing cash pile');
}
{
 const s=base();s.served=1;s.worldPads=[{scope:0,district:0,kind:12,x:7.5,z:-7,totalCost:60,paid:20,remaining:40,level:0,max:3,available:true}];
 const a=preferredBuild(s);assert.equal(a.kind,12);assert.equal(a.progress,1/3);assert.ok(a.enabled,'a distant physical tile can be approached with partial coins');
 s.player.x=7.5;s.player.z=-7;s.money=0;assert.equal(padAction(s,s.worldPads[0]).enabled,false,'empty wallet cannot spend at the tile');
}
{
 const s=base();s.carryN=4;s.carryKind=3;s.carryDistrict=1;
 const action=chooseContext(s,L);assert.equal(action.id,'cross:food-serve');assert.deepEqual({x:action.x,z:action.z},L.counterIn,'farm food has a genuine destination at the shared meal counter');
 s.carryDistrict=3;assert.notEqual(chooseContext(s,L)?.id,'cross:food-serve','forged tools are never presented as edible');
}
{
 const s=base();const d={id:0,unlocked:true,sourceX:-10,sourceZ:25,processorX:-3,processorZ:25,finisherX:4,finisherZ:25,marketX:11,marketZ:25,rawOut:0,midOut:0,finishedOut:0,transportLevel:0};s.districts=[d];s.currentDistrict=0;s.player.x=-10;s.player.z=25;
 assert.equal(chooseContext(s,L).label,'PÊCHER','empty source offers harvesting rather than a fictitious pile');
 s.carryN=2;s.carryDistrict=0;s.carryKind=2;const action=chooseContext(s,L);assert.equal(action.label,'DÉPOSER');assert.equal(action.x,4);assert.equal(action.z,22.5,'intermediate goods target the finisher input rather than output');
}
console.log('PASS contextual priority, real partial funding, shared food destination, non-food rejection and exact production input.');
