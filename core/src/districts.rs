//! Sequential production frontiers, independent from the original food loop.
//! State ABI is documented by `World::export`; every inventory has a capacity.
use super::{dist,angle_to};

const N:usize=8;
const PRICES:[u32;N]=[16,24,36,55,90,140,240,400];
const RAW_NEED:[u32;N]=[1,2,3,1,1,3,4,3];
const MID_YIELD:[u32;N]=[2,3,2,2,2,1,1,2];
const MID_NEED:[u32;N]=[1,2,2,4,3,2,3,4];
const FINAL_YIELD:[u32;N]=[1,1,1,1,1,1,1,1];
const SOURCE_PERIOD:[f32;N]=[2.0,3.0,2.5,1.8,0.6,3.0,0.8,4.0];
const PROC_PERIOD:[f32;N]=[1.0,1.8,2.5,3.3,2.8,3.8,4.8,5.5];
const FINISH_PERIOD:[f32;N]=[1.5,2.5,2.8,4.0,3.8,4.5,6.0,7.0];

#[derive(Clone)]
pub struct District {
    pub unlocked:bool,
    // source, processor, finisher, transport, crew, storage, direct loot, market
    pub levels:[u32;8],
    // raw source output, processor input, mid output, finisher input, final output, market input
    pub stocks:[u32;6],
    pub timers:[f32;4],
    pub sales:u32,
    pub cash:u32,
    pub reserve:u32,
}
impl District {
    fn new()->Self {Self{unlocked:false,levels:[0;8],stocks:[0;6],timers:[0.0;4],sales:0,cash:0,reserve:8}}
    pub fn cap(&self)->u32 {24+24*self.levels[5]}
    pub fn mastered(&self)->bool {self.levels[0]>=2&&self.levels[1]>=2&&self.levels[2]>=2&&self.levels[3]>=1&&self.levels[7]>=1}
}
#[derive(Clone)]
pub struct Worker {pub district:usize,pub role:u32,pub x:f32,pub z:f32,pub angle:f32,pub task:u32,pub stage:u32,pub carried:u32,pub timer:f32}
#[derive(Clone)]
pub struct Loot {pub district:usize,pub x:f32,pub z:f32,pub n:u32,pub age:f32}
#[derive(Clone)]
pub struct Monster {pub district:usize,pub x:f32,pub z:f32,pub hp:f32,pub max_hp:f32,pub windup:f32,pub alive:bool,pub angle:f32,pub flash:f32,pub timer:f32}

pub struct World {
    pub districts:[District;N],pub workers:Vec<Worker>,pub loot:Vec<Loot>,pub monsters:Vec<Monster>,
    pub time:f32,pub carry_district:usize,pub carry_stage:u32,pub carry_n:u32,pub prestige:u32,
    pub base_paid:[u32;17],pub paid:[[u32;9];8],fund_target:i32,fund_block:i32,just_loaded:bool,fund_hold:f32,fund_credit:f32,act_t:f32,pub base_mastered:bool,pub player_power:f32,pub player_attack_fired:bool,pub player_attack_angle:f32,transfer_t:f32,attack_t:f32,pad_t:f32,
}
impl World {
    pub fn new()->Self {Self{districts:std::array::from_fn(|_|District::new()),workers:Vec::new(),loot:Vec::new(),monsters:Vec::new(),time:0.0,carry_district:0,carry_stage:0,carry_n:0,prestige:0,base_paid:[0;17],paid:[[0;9];8],fund_target:-1,fund_block:-1,just_loaded:false,fund_hold:0.0,fund_credit:0.0,act_t:0.0,base_mastered:false,player_power:1.0,player_attack_fired:false,player_attack_angle:0.0,transfer_t:0.0,attack_t:0.0,pad_t:0.0}}
    pub fn z0(id:usize)->f32 {6.6+id as f32*20.0}
    pub fn tile(id:usize)->(f32,f32) {if id==0 {(-7.0,5.3)} else {(0.0,Self::z0(id-1)+18.0)}}
    pub fn pad(id:usize,kind:u32)->(f32,f32) {
        if kind==0 {return Self::tile(id);}
        let k=(kind-1) as usize;([-10.0,-3.0,4.0,11.0][k%4],Self::z0(id)+11.0+4.0*(k/4) as f32)
    }
    fn source(id:usize)->(f32,f32) {(-10.0,Self::z0(id)+5.0)}
    fn station(id:usize,stage:usize)->(f32,f32) {([-10.0,-3.0,4.0,11.0][stage],Self::z0(id)+5.0)}
    pub fn cash_point(id:usize)->(f32,f32) {(13.0,Self::z0(id)+7.5)}
    fn point(id:usize,stock:usize)->(f32,f32) {
        let (x,z)=Self::station(id,match stock {0=>0,1|2=>1,3|4=>2,_=>3});
        (x,z+if stock==1||stock==3||stock==5 {-2.5} else if stock==0 {0.0} else {2.5})
    }
    pub fn current(&self,x:f32,z:f32)->i32 {self.districts.iter().enumerate().find(|(i,d)|d.unlocked&&x.abs()<18.0&&z>=Self::z0(*i)&&z<=Self::z0(*i)+20.0).map(|(i,_)|i as i32).unwrap_or(-1)}
    pub fn walkable(&self,x:f32,z:f32)->bool {
        self.districts.iter().enumerate().any(|(i,d)|d.unlocked&&(
            (x.abs()<=17.5&&z>=Self::z0(i)+0.5&&z<=Self::z0(i)+19.5)
            ||(x.abs()<=2.0&&z>=Self::z0(i)-0.5&&z<=Self::z0(i)+0.5)
            ||(x.abs()<=2.0&&i+1<N&&self.districts[i+1].unlocked&&z>=Self::z0(i)+19.5&&z<=Self::z0(i)+20.5)))
    }
    pub fn unlock_cost(id:usize)->u32 {180+id as u32*120}
    pub fn needed_sales(id:usize)->u32 {if id==0 {5} else {10}}
    pub fn missing(&self,id:usize,kind:u32)->u32 {
        if id>=N||kind>8 {return 4;}
        if kind==0 {
            if self.districts[id].unlocked {return 0;}
            if id==0 {if !self.base_mastered {return 1;}}
            else if !self.districts[id-1].unlocked||!self.districts[id-1].mastered() {return 2;}
            else if self.districts[id-1].sales<Self::needed_sales(id) {return 3;}
        } else if !self.districts[id].unlocked {return 4;}
        0
    }
    pub fn max_level(kind:u32)->u32 {match kind {0|7=>1,4=>2,_=>3}}
    pub fn cost(&self,id:usize,kind:u32)->u32 {
        if kind==0 {return Self::unlock_cost(id);}
        let level=self.districts[id].levels[(kind-1) as usize];
        (70+id as u32*35)*[1,3,7][level.min(2) as usize]+match kind {4=>90,5=>120,7=>180,_=>0}
    }
    pub fn can_upgrade(&self,id:usize,kind:u32,money:u32)->bool {
        if id>=N||kind>8||self.missing(id,kind)!=0 {return false;}
        let level=if kind==0 {self.districts[id].unlocked as u32} else {self.districts[id].levels[(kind-1) as usize]};
        level<Self::max_level(kind)&&money>=self.cost(id,kind).saturating_sub(self.paid[id][kind as usize])
    }
    pub fn upgrade(&mut self,id:usize,kind:u32,money:&mut u32)->bool {
        if !self.can_upgrade(id,kind,*money) {return false;}
        *money-=self.cost(id,kind).saturating_sub(self.paid[id][kind as usize]);self.paid[id][kind as usize]=0;
        if kind==0 {self.districts[id].unlocked=true;} else {self.districts[id].levels[(kind-1) as usize]+=1;}
        self.sync();true
    }
    pub fn block_pad(&mut self,id:usize,kind:u32) {
        self.fund_block=(id*9+kind as usize) as i32;self.fund_hold=0.0;self.fund_credit=0.0;
    }
    pub fn init_fund_latch(&mut self,px:f32,pz:f32) {
        self.fund_block=-1;self.just_loaded=false;let mut best=1.5;
        for id in 0..8 {for kind in 0..9 {
            let level=if kind==0 {self.districts[id].unlocked as u32} else {self.districts[id].levels[(kind-1) as usize]};
            let (x,z)=Self::pad(id,kind);let distance=dist(px,pz,x,z);
            if level>0&&self.paid[id][kind as usize]==0&&distance<best {best=distance;self.fund_block=(id*9+kind as usize) as i32;}
        }}
    }
    pub fn fund_pad(&mut self,id:usize,kind:u32,px:f32,pz:f32,money:&mut u32)->u32 {
        if id>=8||kind>8||self.missing(id,kind)!=0 {return 0;}
        let level=if kind==0 {self.districts[id].unlocked as u32} else {self.districts[id].levels[(kind-1) as usize]};
        if level>=Self::max_level(kind) {return 0;}
        let (x,z)=Self::pad(id,kind);if dist(px,pz,x,z)>2.2 {return 0;}
        let cost=self.cost(id,kind);let n=(cost/5).max(8).min(cost.saturating_sub(self.paid[id][kind as usize])).min(*money);
        if n==0 {return 0;}if self.fund_block==(id*9+kind as usize) as i32 {self.fund_block=-1;}*money-=n;self.paid[id][kind as usize]+=n;
        if self.paid[id][kind as usize]>=cost&&self.upgrade(id,kind,money) {self.block_pad(id,kind);2} else {1}
    }
    pub fn base_direct_loot(&self)->bool {self.districts[0].unlocked&&self.districts[0].levels[6]>0}
    fn sync(&mut self) {
        for id in 0..N {
            if !self.districts[id].unlocked {continue;}
            let crew=self.districts[id].levels[4];
            for role in 0..3 {
                if crew>role&&!self.workers.iter().any(|w|w.district==id&&w.role==role) {
                    self.workers.push(Worker{district:id,role,x:-10.0,z:Self::z0(id)+5.0,angle:0.0,task:0,stage:0,carried:0,timer:0.0});
                }
            }
            if (id==4||id==6)&&!self.monsters.iter().any(|m|m.district==id) {
                for j in 0..if id==4 {5} else {3} {
                    let max_hp=if id==4 {32.0} else {120.0}*(1.0+0.15*self.prestige.min(12) as f32);
                    self.monsters.push(Monster{district:id,x:-12.0+j as f32*1.4,z:Self::z0(id)+4.0+j as f32*1.2,hp:max_hp,max_hp,windup:0.0,alive:true,angle:0.0,flash:0.0,timer:0.0});
                }
            }
        }
    }
    fn source_period(&self,id:usize)->f32 {SOURCE_PERIOD[id]/(1.0+0.35*self.districts[id].levels[0] as f32)}
    fn harvest(&mut self,id:usize,dt:f32,active:bool) {
        if id==4||id==6 {return;}
        let cap=self.districts[id].cap();
        let target=if self.districts[id].levels[6]>0&&self.districts[id].levels[1]>0 {1} else {0};
        if !active||self.districts[id].stocks[target]>=cap {return;}
        self.districts[id].timers[0]=(self.districts[id].timers[0]+dt).min(self.source_period(id));
        if self.districts[id].timers[0]<self.source_period(id)||self.districts[id].reserve==0 {return;}
        self.districts[id].timers[0]=0.0;
        let yield_n=[2,5,4,2,0,3,0,2][id].min(self.districts[id].reserve).min(cap-self.districts[id].stocks[target]);
        self.districts[id].reserve-=yield_n;self.districts[id].stocks[target]+=yield_n;
    }
    fn hit_monster(&mut self,index:usize,dmg:f32) {
        let m=&mut self.monsters[index];if !m.alive {return;}
        m.hp-=dmg;m.flash=1.0;
        if m.hp>0.0 {return;}
        m.alive=false;m.timer=if m.district==4 {12.0} else {25.0};m.windup=0.0;
        let (id,x,z)=(m.district,m.x,m.z);let amount=if id==4 {5} else {12};
        let d=&mut self.districts[id];
        let direct=if d.levels[6]>0&&d.levels[1]>0 {amount.min(d.cap()-d.stocks[1])} else {0};d.stocks[1]+=direct;
        if direct<amount {self.loot.push(Loot{district:id,x,z,n:amount-direct,age:0.0});}
    }
    fn move_worker(w:&mut Worker,x:f32,z:f32,dt:f32,speed:f32)->bool {
        let d=dist(w.x,w.z,x,z);if d>0.25 {let step=(speed*dt).min(d);w.angle=angle_to(w.x,w.z,x,z);w.x+=(x-w.x)/d*step;w.z+=(z-w.z)/d*step;}
        dist(w.x,w.z,x,z)<0.6
    }
    fn workers_tick(&mut self,dt:f32) {
        let mut workers=std::mem::take(&mut self.workers);
        for w in &mut workers {
            let id=w.district;let level=self.districts[id].levels[4];let speed=3.2+0.5*level as f32;w.timer=(w.timer-dt).max(0.0);
            if w.role==1 {
                w.task=4;
                if id==4||id==6 {
                    if let Some((i,x,z))=self.monsters.iter().enumerate().filter(|(_,m)|m.alive&&m.district==id).min_by(|(_,a),(_,b)|dist(w.x,w.z,a.x,a.z).total_cmp(&dist(w.x,w.z,b.x,b.z))).map(|(i,m)|(i,m.x,m.z)) {
                        if Self::move_worker(w,x,z,dt,speed)&&w.timer==0.0 {w.timer=0.7;self.hit_monster(i,1.0+0.7*self.districts[id].levels[0] as f32);}
                    }
                } else {let (x,z)=Self::source(id);if Self::move_worker(w,x,z,dt,speed) {self.harvest(id,dt,true);}}
                continue;
            }
            if w.carried>0 {
                let dest=match w.stage {1=>1,2=>3,_=>5};let (x,z)=Self::point(id,dest);w.task=2;
                if Self::move_worker(w,x,z,dt,speed)&&self.districts[id].levels[match dest {1=>1,3=>2,_=>7}]>0 {
                    let d=&mut self.districts[id];let n=w.carried.min(d.cap()-d.stocks[dest]);d.stocks[dest]+=n;w.carried-=n;if w.carried==0 {w.stage=0;}
                }
            } else if w.role==0 {
                if let Some((i,x,z))=self.loot.iter().enumerate().filter(|(_,l)|l.district==id).min_by(|(_,a),(_,b)|dist(w.x,w.z,a.x,a.z).total_cmp(&dist(w.x,w.z,b.x,b.z))).map(|(i,l)|(i,l.x,l.z)) {
                    w.task=1;if Self::move_worker(w,x,z,dt,speed) {let n=self.loot[i].n.min(4+2*level);self.loot[i].n-=n;w.carried=n;w.stage=1;if self.loot[i].n==0 {self.loot.swap_remove(i);}}
                } else {
                    let (x,z)=Self::point(id,0);w.task=1;
                    if Self::move_worker(w,x,z,dt,speed) {let n=self.districts[id].stocks[0].min(4+2*level);self.districts[id].stocks[0]-=n;w.carried=n;w.stage=if n>0 {1} else {0};}
                }
            } else {
                let stock=if self.districts[id].stocks[4]>0 {4} else {2};let (x,z)=Self::point(id,stock);w.task=1;
                if Self::move_worker(w,x,z,dt,speed) {let n=self.districts[id].stocks[stock].min(4+2*level);self.districts[id].stocks[stock]-=n;w.carried=n;w.stage=if n==0 {0} else if stock==2 {2} else {3};}
            }
        }
        self.workers=workers;
    }
    pub fn tick(&mut self,dt:f32,px:f32,pz:f32,carry_cap:u32,money:&mut u32,alive:bool,dashing:bool)->f32 {
        if self.just_loaded {self.init_fund_latch(px,pz);}
        if self.fund_block>=0 {
            let (x,z)=Self::pad(self.fund_block as usize/9,(self.fund_block as usize%9) as u32);
            if dist(px,pz,x,z)>1.5 {self.fund_block=-1;}
        }
        self.act_t=(self.act_t-dt).max(0.0);
        self.player_attack_fired=false;
        self.time+=dt;self.transfer_t=(self.transfer_t-dt).max(0.0);self.attack_t=(self.attack_t-dt).max(0.0);self.pad_t=(self.pad_t-dt).max(0.0);
        self.sync();let mut damage=0.0;
        // Funding starts only after an intentional pause on a separate floor tile.
        let mut target=-1;
        if alive {for id in 0..N {for kind in 0..9 {
            let level=if kind==0 {self.districts[id].unlocked as u32} else {self.districts[id].levels[(kind-1) as usize]};
            if self.missing(id,kind)==0&&level<Self::max_level(kind)&&(id*9+kind as usize) as i32!=self.fund_block {
                let (x,z)=Self::pad(id,kind);if dist(px,pz,x,z)<0.95 {target=(id*9+kind as usize) as i32;break;}
            }
        }if target>=0 {break;}}}
        if target!=self.fund_target {self.fund_target=target;self.fund_hold=0.0;self.fund_credit=0.0;}
        if target>=0 {
            self.fund_hold+=dt;
            if self.fund_hold>=0.55 {
                let id=target as usize/9;let kind=(target as usize%9) as u32;let cost=self.cost(id,kind);
                if *money>0 {
                    self.fund_credit+=dt*(cost as f32/3.0).max(8.0);
                    let n=(self.fund_credit as u32).min(cost.saturating_sub(self.paid[id][kind as usize])).min(*money);
                    self.fund_credit-=n as f32;*money-=n;self.paid[id][kind as usize]+=n;
                    if self.paid[id][kind as usize]>=cost {self.upgrade(id,kind,money);self.block_pad(id,kind);}
                } else {self.fund_credit=0.0;}
            }
        }
        for id in 0..N {
            if !self.districts[id].unlocked {continue;}
            let (sx,sz)=Self::source(id);
            self.districts[id].timers[3]+=dt;
            let renew=[7.0,18.0,14.0,12.0,0.0,10.0,0.0,20.0][id];
            if id!=4&&id!=6&&self.districts[id].timers[3]>=renew {self.districts[id].timers[3]=0.0;self.districts[id].reserve=[12,20,16,10,0,12,0,14][id];}
            self.harvest(id,dt,alive&&dist(px,pz,sx,sz)<1.7);
            let d=&mut self.districts[id];let cap=d.cap();
            if d.levels[1]>0&&d.stocks[1]>=RAW_NEED[id]&&d.stocks[2]+MID_YIELD[id]<=cap {
                d.timers[1]+=dt;if d.timers[1]>=PROC_PERIOD[id]/(1.0+0.4*d.levels[1] as f32) {d.timers[1]=0.0;d.stocks[1]-=RAW_NEED[id];d.stocks[2]+=MID_YIELD[id];}
            }
            let transport_pulses=(self.time*4.0) as u32-((self.time-dt).max(0.0)*4.0) as u32;
            if d.levels[3]>=1&&d.levels[2]>0&&d.stocks[2]>0&&d.stocks[3]<cap {let n=d.stocks[2].min(cap-d.stocks[3]).min(transport_pulses);d.stocks[2]-=n;d.stocks[3]+=n;}
            if d.levels[2]>0&&d.stocks[3]>=MID_NEED[id]&&d.stocks[4]+FINAL_YIELD[id]<=cap {
                d.timers[2]+=dt;if d.timers[2]>=FINISH_PERIOD[id]/(1.0+0.4*d.levels[2] as f32) {d.timers[2]=0.0;d.stocks[3]-=MID_NEED[id];d.stocks[4]+=FINAL_YIELD[id];}
            }
            if d.levels[3]>=2&&d.levels[7]>0&&d.stocks[4]>0&&d.stocks[5]<cap {let n=d.stocks[4].min(cap-d.stocks[5]).min(transport_pulses);d.stocks[4]-=n;d.stocks[5]+=n;}
            // Markets consume actual delivered finished stock, never raw inputs.
            if d.levels[7]>0&&d.stocks[5]>0 {
                let rate=(self.time*2.0) as u32;let prev=((self.time-dt)*2.0) as u32;
                if rate!=prev {d.stocks[5]-=1;d.sales+=1;d.cash=d.cash.saturating_add(PRICES[id]*(5+d.levels[7])/5*(10+self.prestige.min(20))/10);}
            }
            let (cash_x,cash_z)=Self::cash_point(id);
            if alive&&self.transfer_t==0.0&&d.cash>0&&dist(px,pz,cash_x,cash_z)<1.6 {
                let n=d.cash.min(40);d.cash-=n;*money=money.saturating_add(n);self.transfer_t=0.09;
            }
            if alive&&self.transfer_t==0.0 {
                for stock in 0..6 {
                    let (x,z)=Self::point(id,stock);if dist(px,pz,x,z)>1.35 {continue;}
                    if stock==0||stock==2||stock==4 {
                        let stage=1+stock as u32/2;
                        if d.stocks[stock]>0&&self.carry_n<carry_cap&&(self.carry_n==0||(self.carry_district==id&&self.carry_stage==stage)) {
                            d.stocks[stock]-=1;self.carry_district=id;self.carry_stage=stage;self.carry_n+=1;self.transfer_t=0.07;break;
                        }
                    } else if self.carry_n>0&&self.carry_district==id&&self.carry_stage==(stock as u32+1)/2&&d.stocks[stock]<cap&&(stock!=1||d.levels[1]>0)&&(stock!=3||d.levels[2]>0)&&(stock!=5||d.levels[7]>0) {
                        d.stocks[stock]+=1;self.carry_n-=1;if self.carry_n==0 {self.carry_stage=0;}self.transfer_t=0.07;break;
                    }
                }
            }
        }
        // Real beast/giant combat includes anticipation, escape, and respawning prey.
        let mut hits=Vec::new();
        for (i,m) in self.monsters.iter_mut().enumerate() {
            m.flash=(m.flash-dt*4.0).max(0.0);m.timer=(m.timer-dt).max(0.0);
            let home_x=-12.0+(i%5) as f32*1.4;let home_z=Self::z0(m.district)+4.0+(i%5) as f32*1.2;
            if !m.alive {if m.timer==0.0 {m.alive=true;m.max_hp=(if m.district==4 {32.0} else {120.0})*(1.0+0.15*self.prestige.min(12) as f32);m.hp=m.max_hp;m.windup=0.0;m.x=home_x;m.z=home_z;}continue;}
            let near=dist(px,pz,m.x,m.z);let zone=alive&&pz>=Self::z0(m.district)&&pz<Self::z0(m.district)+20.0;
            if zone&&near<2.7&&self.attack_t==0.0 {hits.push((i,(1.0+0.8*self.districts[m.district].levels[0] as f32)*self.player_power));self.attack_t=0.55;self.player_attack_fired=true;self.player_attack_angle=angle_to(px,pz,m.x,m.z);}
            if m.windup>0.0 {m.windup=(m.windup-dt).max(0.0);if m.windup==0.0 {if zone&&near<if m.district==4 {2.0} else {3.0}&&!dashing {damage+=if m.district==4 {8.0} else {20.0};}m.timer=2.0;}}
            else if zone&&near<2.0&&m.timer==0.0 {m.windup=if m.district==4 {0.6} else {1.1};}
            else if zone&&near<8.0&&near>1.5 {let speed=if m.district==4 {2.0} else {1.0};m.angle=angle_to(m.x,m.z,px,pz);m.x+=m.angle.sin()*speed*dt;m.z+=m.angle.cos()*speed*dt;}
            else if (!zone||near>=8.0)&&dist(m.x,m.z,home_x,home_z)>0.3 {
                m.angle=angle_to(m.x,m.z,home_x,home_z);m.x+=m.angle.sin()*1.5*dt;m.z+=m.angle.cos()*1.5*dt;
            }
        }
        for (i,dmg) in hits {self.hit_monster(i,dmg);}
        for i in (0..self.loot.len()).rev() {
            self.loot[i].age+=dt;
            let l=&self.loot[i];
            if alive&&self.carry_n<carry_cap&&dist(px,pz,l.x,l.z)<1.8&&(self.carry_n==0||(self.carry_district==l.district&&self.carry_stage==1)) {
                let n=l.n.min(carry_cap-self.carry_n);self.carry_district=l.district;self.carry_stage=1;self.carry_n+=n;self.loot[i].n-=n;
            }
            if self.loot[i].n==0||self.loot[i].age>180.0 {self.loot.swap_remove(i);}
        }
        self.workers_tick(dt);
        // Complete a kingdom-wide mastery cycle without discarding any goods.
        let target=100+80*self.prestige.min(1000);
        if self.districts.iter().all(|d|d.unlocked&&d.mastered()&&d.sales>=target) {self.prestige+=1;}
        damage
    }
    pub fn export(&self,px:f32,pz:f32,money:u32)->Vec<f32> {
        let mut o=vec![4.0,self.time,self.current(px,pz) as f32,self.carry_district as f32,self.carry_stage as f32,self.carry_n as f32,self.prestige as f32,8.0];
        for (id,d) in self.districts.iter().enumerate() {
            let z=Self::z0(id);let (tx,tz)=Self::tile(id);let price=PRICES[id]*(5+d.levels[7])/5*(10+self.prestige.min(20))/10;
            o.extend_from_slice(&[id as f32,d.unlocked as u8 as f32,id as f32,-18.0,18.0,z,z+20.0,-10.0,z+5.0,-3.0,z+5.0,4.0,z+5.0,11.0,z+5.0,tx,tz]);
            o.extend(d.levels.iter().map(|v|*v as f32));o.extend(d.stocks.iter().map(|v|*v as f32));
            o.extend_from_slice(&[d.cap() as f32,d.timers[0]/self.source_period(id),d.timers[1]/(PROC_PERIOD[id]/(1.0+0.4*d.levels[1] as f32)),d.timers[2]/(FINISH_PERIOD[id]/(1.0+0.4*d.levels[2] as f32)),d.sales as f32,d.reserve as f32,d.timers[3],RAW_NEED[id] as f32,MID_YIELD[id] as f32,MID_NEED[id] as f32,FINAL_YIELD[id] as f32,price as f32,Self::needed_sales(id) as f32,Self::unlock_cost(id) as f32,d.mastered() as u8 as f32]);
        }
        o.push(self.workers.len() as f32);for w in &self.workers {o.extend_from_slice(&[w.district as f32,w.role as f32,w.x,w.z,w.angle,w.task as f32,w.stage as f32,w.carried as f32,w.timer,self.districts[w.district].levels[4] as f32]);}
        o.push(self.loot.len() as f32);for l in &self.loot {o.extend_from_slice(&[l.district as f32,l.x,l.z,l.n as f32,l.age]);}
        o.push(self.monsters.len() as f32);for m in &self.monsters {o.extend_from_slice(&[m.district as f32,m.x,m.z,(m.hp/m.max_hp).max(0.0),m.windup,m.alive as u8 as f32,m.angle,m.flash,if m.district==4 {0.0} else {1.0},m.max_hp]);}
        o.push(72.0);
        for id in 0..N {for kind in 0..9 {let d=&self.districts[id];let level=if kind==0 {d.unlocked as u32} else {d.levels[(kind-1) as usize]};let (x,z)=Self::pad(id,kind);o.extend_from_slice(&[id as f32,kind as f32,level as f32,Self::max_level(kind) as f32,self.cost(id,kind).saturating_sub(self.paid[id][kind as usize]) as f32,self.can_upgrade(id,kind,money) as u8 as f32,self.missing(id,kind) as f32,Self::needed_sales(id) as f32,x,z,d.unlocked as u8 as f32,2.0]);}}
        o
    }
    pub fn act(&mut self,px:f32,pz:f32,carry_cap:u32,money:&mut u32)->u32 {
        if self.act_t>0.0 {return 0;}
        for id in 0..8 {
            if !self.districts[id].unlocked {continue;}
            let (x,z)=Self::cash_point(id);
            if self.districts[id].cash>0&&dist(px,pz,x,z)<1.6 {
                let n=self.districts[id].cash.min(40);self.districts[id].cash-=n;*money=money.saturating_add(n);self.act_t=0.2;return 5;
            }
            for stock in 0..6 {
                let (x,z)=Self::point(id,stock);if dist(px,pz,x,z)>1.6 {continue;}
                let d=&mut self.districts[id];
                if stock%2==0 {
                    let stage=1+stock as u32/2;
                    if d.stocks[stock]>0&&self.carry_n<carry_cap&&(self.carry_n==0||(self.carry_district==id&&self.carry_stage==stage)) {
                        d.stocks[stock]-=1;self.carry_district=id;self.carry_stage=stage;self.carry_n+=1;self.act_t=0.25;return 1;
                    }
                } else if self.carry_district==id&&self.carry_stage==(stock as u32+1)/2&&self.carry_n>0&&d.stocks[stock]<d.cap()&&(stock!=1||d.levels[1]>0)&&(stock!=3||d.levels[2]>0)&&(stock!=5||d.levels[7]>0) {
                    d.stocks[stock]+=1;self.carry_n-=1;if self.carry_n==0 {self.carry_stage=0;}self.act_t=0.25;return 2;
                }
            }
            let (x,z)=Self::source(id);
            if dist(px,pz,x,z)<1.7&&id!=4&&id!=6&&self.districts[id].reserve>0 {
                self.districts[id].timers[0]=self.source_period(id);self.harvest(id,0.0,true);self.act_t=self.source_period(id);return 4;
            }
        }
        0
    }
    pub fn pad_records(&self)->Vec<f32> {
        let mut v=Vec::new();
        for id in 0..8 {for kind in 0..9 {
            let d=&self.districts[id];let level=if kind==0 {d.unlocked as u32} else {d.levels[(kind-1) as usize]};let max=Self::max_level(kind);let cost=if level<max {self.cost(id,kind)} else {0};let paid=self.paid[id][kind as usize].min(cost);let (x,z)=Self::pad(id,kind);
            v.extend_from_slice(&[1.0,id as f32,kind as f32,x,z,cost as f32,paid as f32,cost.saturating_sub(paid) as f32,level as f32,max as f32,(self.missing(id,kind)==0&&level<max) as u8 as f32,self.missing(id,kind) as f32]);
        }}v
    }
    pub fn cash_records(&self)->Vec<f32> {
        let mut v=vec![6.0,8.0];for (id,d) in self.districts.iter().enumerate() {let (x,z)=Self::cash_point(id);v.extend_from_slice(&[id as f32,x,z,d.cash as f32]);}v
    }
    pub fn save(&self)->Vec<u32> {
        let mut v=vec![3,self.time.to_bits(),self.carry_district as u32,self.carry_stage,self.carry_n,self.prestige];
        for d in &self.districts {v.push(d.unlocked as u32);v.extend_from_slice(&d.levels);v.extend_from_slice(&d.stocks);v.extend(d.timers.iter().map(|t|t.to_bits()));v.extend_from_slice(&[d.sales,d.reserve]);}
        v.push(self.workers.len() as u32);for w in &self.workers {v.extend_from_slice(&[w.district as u32,w.role,w.x.to_bits(),w.z.to_bits(),w.angle.to_bits(),w.task,w.stage,w.carried,w.timer.to_bits()]);}
        v.push(self.loot.len() as u32);for l in &self.loot {v.extend_from_slice(&[l.district as u32,l.x.to_bits(),l.z.to_bits(),l.n,l.age.to_bits()]);}
        v.push(self.monsters.len() as u32);for m in &self.monsters {v.extend_from_slice(&[m.district as u32,m.x.to_bits(),m.z.to_bits(),m.hp.to_bits(),m.max_hp.to_bits(),m.windup.to_bits(),m.alive as u32,m.angle.to_bits(),m.flash.to_bits(),m.timer.to_bits()]);}
        v.extend_from_slice(&self.base_paid);for paid in &self.paid {v.extend_from_slice(paid);}
        v.extend(self.districts.iter().map(|d|d.cash));
        v
    }
    fn loaded_z(id:usize,z:f32,version:u32)->f32 {if version<=2 {z-13.4-2.0*id as f32} else {z}}
    pub fn load(&mut self,v:&[u32])->bool {
        if v.len()<177||(v[0]!=1&&v[0]!=2&&v[0]!=3) {return false;}
        let f=|x:u32|->Option<f32>{let x=f32::from_bits(x);if x.is_finite() {Some(x)} else {None}};
        let Some(time)=f(v[1]) else{return false;};let mut w=Self::new();w.time=time.max(0.0);w.carry_district=v[2].min(7) as usize;w.carry_stage=v[3].min(3);w.carry_n=v[4].min(100);w.prestige=v[5].min(1000);
        let mut cursor=6;
        for d in &mut w.districts {d.unlocked=v[cursor]==1;cursor+=1;for (i,level) in d.levels.iter_mut().enumerate() {*level=v[cursor].min(Self::max_level(i as u32+1));cursor+=1;}for stock in &mut d.stocks {*stock=v[cursor].min(96);cursor+=1;}for timer in &mut d.timers {let Some(t)=f(v[cursor]) else{return false;};*timer=t.clamp(0.0,100.0);cursor+=1;}d.sales=v[cursor];d.reserve=v[cursor+1].min(30);cursor+=2;let cap=d.cap();for stock in &mut d.stocks {*stock=(*stock).min(cap);}}
        macro_rules! count {($stride:expr,$max:expr)=>{{if cursor>=v.len(){return false;}let n=v[cursor] as usize;cursor+=1;if n>$max||cursor+n*$stride>v.len(){return false;}n}};}
        let n=count!(9,24);for _ in 0..n {let r=&v[cursor..cursor+9];cursor+=9;let Some(x)=f(r[2]) else{return false;};let Some(z)=f(r[3]) else{return false;};let z=Self::loaded_z(r[0] as usize,z,v[0]);let Some(a)=f(r[4]) else{return false;};let Some(t)=f(r[8]) else{return false;};if r[0]>=8||r[1]>=3||x.abs()>18.0||z<Self::z0(r[0] as usize)||z>Self::z0(r[0] as usize)+20.0{return false;}w.workers.push(Worker{district:r[0] as usize,role:r[1],x,z,angle:a,task:r[5].min(4),stage:r[6].min(3),carried:r[7].min(10),timer:t.clamp(0.0,10.0)});}
        let n=count!(5,300);for _ in 0..n {let r=&v[cursor..cursor+5];cursor+=5;let (Some(x),Some(z),Some(age))=(f(r[1]),f(r[2]),f(r[4])) else{return false;};let z=Self::loaded_z(r[0] as usize,z,v[0]);if r[0]>=8||x.abs()>18.0||z<Self::z0(r[0] as usize)||z>Self::z0(r[0] as usize)+20.0{return false;}w.loot.push(Loot{district:r[0] as usize,x,z,n:r[3].min(12),age:age.clamp(0.0,180.0)});}
        let n=count!(10,8);for _ in 0..n {let r=&v[cursor..cursor+10];cursor+=10;let (Some(x),Some(z),Some(hp),Some(max_hp),Some(windup),Some(angle),Some(flash),Some(timer))=(f(r[1]),f(r[2]),f(r[3]),f(r[4]),f(r[5]),f(r[7]),f(r[8]),f(r[9])) else{return false;};let z=Self::loaded_z(r[0] as usize,z,v[0]);if (r[0]!=4&&r[0]!=6)||x.abs()>18.0||z<Self::z0(r[0] as usize)||z>Self::z0(r[0] as usize)+20.0{return false;}w.monsters.push(Monster{district:r[0] as usize,x,z,hp:hp.clamp(0.0,max_hp.clamp(1.0,500.0)),max_hp:max_hp.clamp(1.0,500.0),windup:windup.clamp(0.0,2.0),alive:r[6]==1,angle,flash,timer:timer.clamp(0.0,30.0)});}
        if v[0]>=2 {
            if cursor+89+if v[0]>=3 {8} else {0}!=v.len(){return false;}
            for i in 0..17 {w.base_paid[i]=v[cursor].min(100_000);cursor+=1;}
            for id in 0..8 {for kind in 0..9 {w.paid[id][kind]=v[cursor].min(w.cost(id,kind as u32));cursor+=1;}}
        }
        if v[0]>=3 {for d in &mut w.districts {d.cash=v[cursor];cursor+=1;}}
        if cursor!=v.len(){return false;}w.sync();w.just_loaded=true;*self=w;true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn unlock_requires_mastery_and_sales_not_money_alone() {
        let mut w=World::new();let mut money=100_000;assert!(!w.upgrade(0,0,&mut money));w.base_mastered=true;assert!(w.upgrade(0,0,&mut money));assert!(!w.upgrade(1,0,&mut money));w.districts[0].levels=[2,2,2,1,0,0,0,1];assert!(!w.upgrade(1,0,&mut money));w.districts[0].sales=10;assert!(w.upgrade(1,0,&mut money));assert!(w.walkable(0.0,26.6));assert!(!w.walkable(16.0,26.6));
    }
    #[test] fn manual_chain_transfers_specific_resources_and_pays() {
        let mut w=World::new();w.districts[0].unlocked=true;w.districts[0].levels[1]=1;w.districts[0].levels[2]=1;w.districts[0].levels[7]=1;let mut money=0;
        for _ in 0..60 {w.tick(0.1,-10.0,11.6,14,&mut money,true,false);}assert!(w.carry_n>0);assert_eq!(w.carry_stage,1);
        for _ in 0..40 {w.tick(0.1,-3.0,9.1,14,&mut money,true,false);}assert!(w.districts[0].stocks[2]>0);
        for _ in 0..40 {w.tick(0.1,-3.0,14.1,14,&mut money,true,false);}assert_eq!(w.carry_stage,2);
        for _ in 0..50 {w.tick(0.1,4.0,9.1,14,&mut money,true,false);}
        for _ in 0..40 {w.tick(0.1,4.0,14.1,14,&mut money,true,false);}assert_eq!(w.carry_stage,3);
        for _ in 0..40 {w.tick(0.1,11.0,9.1,14,&mut money,true,false);}assert_eq!(money,0);assert!(w.districts[0].cash>0);assert!(w.districts[0].sales>0);
        for _ in 0..40 {w.tick(0.1,13.0,14.1,14,&mut money,true,false);}assert!(money>0);
    }
    #[test] fn eight_distinct_chains_work_with_real_automation() {
        let mut w=World::new();for d in &mut w.districts {d.unlocked=true;d.levels=[3,3,3,2,3,3,1,3];}let mut money=0;
        for _ in 0..36_000 {w.tick(0.1,0.0,0.0,14,&mut money,true,false);}
        for d in &w.districts {assert!(d.sales>0);assert!(d.stocks.iter().all(|n|*n<=d.cap()));}
        assert_eq!(money,0);assert!(w.districts.iter().map(|d|d.cash as u64).sum::<u64>()>10000);assert!(w.monsters.iter().any(|m|!m.alive));assert!(w.loot.len()<100);assert_eq!(w.workers.len(),24);
    }
    #[test] fn saved_distinct_resources_and_physical_workers_roundtrip() {
        let mut w=World::new();w.districts[2].unlocked=true;w.districts[2].levels[4]=3;w.districts[2].stocks=[3,4,5,6,7,8];w.sync();w.workers[0].carried=4;w.workers[0].stage=2;w.carry_n=7;w.carry_stage=3;w.carry_district=2;
        let v=w.save();let mut restored=World::new();assert!(restored.load(&v));assert_eq!(restored.save(),v);assert_eq!(restored.districts[2].stocks,[3,4,5,6,7,8]);assert!(!restored.load(&[1,3]));
    }
    #[test] fn direct_noncombat_harvest_preserves_goods_and_routes_processor() {
        let mut w=World::new();w.districts[3].unlocked=true;w.districts[3].levels[6]=1;w.districts[3].levels[1]=1;
        w.harvest(3,2.0,true);assert_eq!(w.districts[3].stocks[0],0);assert_eq!(w.districts[3].stocks[1],2);assert_eq!(w.districts[3].reserve,6);
        w.districts[3].stocks[1]=24;let reserve=w.districts[3].reserve;w.harvest(3,2.0,true);assert_eq!(w.districts[3].reserve,reserve);
    }
    #[test] fn automation_is_time_based_and_rejects_invalid_save_data() {
        let mut a=World::new();a.districts[0].unlocked=true;a.districts[0].levels[3]=2;a.districts[0].stocks[2]=24;
        let mut b=World::new();assert!(b.load(&a.save()));let mut cash=0;
        for _ in 0..100 {a.tick(0.1,0.0,0.0,14,&mut cash,true,false);}
        for _ in 0..200 {b.tick(0.05,0.0,0.0,14,&mut cash,true,false);}
        assert!(a.districts[0].stocks[2].abs_diff(b.districts[0].stocks[2])<=1);
        assert!(!a.upgrade(99,0,&mut cash));assert!(!a.upgrade(0,99,&mut cash));
        let mut corrupt=a.save();corrupt[1]=f32::NAN.to_bits();assert!(!a.load(&corrupt));
        let before=a.save();assert!(!a.load(&before[..before.len()-1]));assert_eq!(a.save(),before);
    }
    #[test] fn prestige_requires_every_complete_chain_and_keeps_inventory() {
        let mut w=World::new();for d in &mut w.districts {d.unlocked=true;d.levels=[3,3,3,1,0,0,0,1];d.sales=100;}w.districts[7].stocks[0]=5;
        let mut cash=0;w.tick(0.01,0.0,0.0,14,&mut cash,true,false);assert_eq!(w.prestige,1);assert_eq!(w.districts[7].stocks[0],5);
        w.tick(0.01,0.0,0.0,14,&mut cash,true,false);assert_eq!(w.prestige,1);
    }
    #[test] fn active_campaign_progression_earns_every_upgrade_from_sales() {
        let mut w=World::new();w.base_mastered=true;
        // The original mastered food business hands over the first tile's price.
        // No cash or stock is injected after this initial, documented transition.
        let mut cash=400;assert!(w.upgrade(0,0,&mut cash));let mut id=0;let mut x=0.0;let mut z=11.6;
        let mut complete_at=0.0;
        for _ in 0..144_000 {
            for kind in [2,3,8,4,5,1,7] {
                let goal=match kind {4=>2,5=>2,7|8=>1,_=>3};
                if w.districts[id].levels[(kind-1) as usize]<goal {w.upgrade(id,kind,&mut cash);}
            }
            if id<7&&cash>=World::unlock_cost(id+1)+3*(70+(id as u32+1)*35)&&w.can_upgrade(id+1,0,cash) {assert!(w.upgrade(id+1,0,&mut cash));id+=1;x=0.0;z=World::z0(id)+5.0;}
            if id==7&&w.districts[7].mastered()&&w.districts[7].sales>=100 {complete_at=w.time;break;}
            let d=&w.districts[id];
            let target=if w.carry_n>0 {World::point(w.carry_district,match w.carry_stage {1=>1,2=>3,_=>5})}
                else if d.cash>0 {World::cash_point(id)}
                else if d.stocks[4]>0&&d.levels[3]<2 {World::point(id,4)}
                else if d.stocks[2]>0&&d.levels[3]<1 {World::point(id,2)}
                else {World::source(id)};
            let distance=dist(x,z,target.0,target.1);if distance>0.4 {let step=(5.2_f32*0.1).min(distance);x+=(target.0-x)/distance*step;z+=(target.1-z)/distance*step;}
            w.tick(0.1,x,z,14,&mut cash,true,false);
        }
        assert!(complete_at>0.0,"campaign should remain economically completable without external income");
        println!("Ideal district campaign after base mastery: {:.1} minutes; final earned cash {}",complete_at/60.0,cash);
    }
    #[test] fn floor_funding_is_partial_saved_and_direct_purchase_only_pays_remaining() {
        let mut w=World::new();w.base_mastered=true;let mut cash=1000;
        for _ in 0..10 {w.tick(0.1,-7.0,5.3,14,&mut cash,true,false);}
        assert!(!w.districts[0].unlocked);assert!(w.paid[0][0]>0);assert_eq!(cash+w.paid[0][0],1000);
        let mut restored=World::new();assert!(restored.load(&w.save()));restored.base_mastered=true;
        assert_eq!(restored.paid,w.paid);assert!(restored.upgrade(0,0,&mut cash));assert_eq!(cash,820);assert_eq!(restored.paid[0][0],0);
        let mut previous=w.save();previous.truncate(previous.len()-97);previous[0]=1;
        assert!(restored.load(&previous));assert_eq!(restored.paid,[[0;9];8]);
    }
    #[test] fn physical_pad_hold_avoids_accidental_station_funding_and_is_time_based() {
        let mut a=World::new();a.districts[0].unlocked=true;let mut b=World::new();assert!(b.load(&a.save()));
        let mut ca=1000;let mut cb=1000;
        for _ in 0..20 {a.tick(0.1,-10.0,17.6,14,&mut ca,true,false);}
        for _ in 0..40 {b.tick(0.05,-10.0,17.6,14,&mut cb,true,false);}
        assert!(a.paid[0][1]>0);assert!(a.paid[0][1].abs_diff(b.paid[0][1])<=2);
        let before=a.paid;
        for _ in 0..20 {a.tick(0.1,-3.0,9.1,14,&mut ca,true,false);}
        assert_eq!(a.paid,before,"station input is separate from every funding pad");
        assert_eq!(a.fund_pad(0,1,0.0,0.0,&mut ca),0);
        for id in 0..8 {for kind in 1..9 {let (x,z)=World::pad(id,kind);assert!(x.abs()<18.0);assert!(z>=World::z0(id)+11.0&&z<=World::z0(id)+15.0);}}
    }
    #[test] fn context_action_moves_real_resources_without_advancing_world_time() {
        let mut w=World::new();w.districts[0].unlocked=true;w.districts[0].stocks[0]=2;w.districts[0].levels[1]=1;let time=w.time;
        assert_eq!(w.act(-10.0,11.6,14,&mut 0),1);assert_eq!(w.carry_n,1);assert_eq!(w.districts[0].stocks[0],1);assert_eq!(w.time,time);
        assert_eq!(w.act(-10.0,11.6,14,&mut 0),0);w.act_t=0.0;
        assert_eq!(w.act(-3.0,9.1,14,&mut 0),2);assert_eq!(w.carry_n,0);assert_eq!(w.districts[0].stocks[1],1);
    }
    #[test] fn district_pad_purchase_latches_and_reload_preserves_the_pause() {
        let mut w=World::new();w.districts[0].unlocked=true;let mut cash=1000;
        for _ in 0..60 {w.tick(0.1,-10.0,17.6,14,&mut cash,true,false);}
        assert_eq!(w.districts[0].levels[0],1);assert_eq!(cash,930);assert_eq!(w.paid[0][1],0);
        let mut reloaded=World::new();assert!(reloaded.load(&w.save()));
        for _ in 0..60 {reloaded.tick(0.1,-10.0,17.6,14,&mut cash,true,false);}
        assert_eq!(cash,930);assert_eq!(reloaded.paid[0][1],0);
        reloaded.tick(0.1,-7.0,17.6,14,&mut cash,true,false);
        for _ in 0..20 {reloaded.tick(0.1,-10.0,17.6,14,&mut cash,true,false);}
        assert!(cash<930);assert!(reloaded.paid[0][1]>0);
    }
    #[test] fn beasts_and_giants_drop_actual_tier_resources() {
        let mut w=World::new();w.districts[4].unlocked=true;w.districts[6].unlocked=true;w.sync();let index=w.monsters.iter().position(|m|m.district==6).unwrap();w.hit_monster(index,1000.0);assert_eq!(w.loot[0].n,12);assert!(!w.monsters[index].alive);
        w.districts[4].levels[6]=1;w.districts[4].levels[1]=1;w.hit_monster(0,100.0);assert_eq!(w.districts[4].stocks[1],5);
    }
    #[test] fn empty_foundations_require_real_construction_before_processing() {
        let mut w=World::new();w.districts[0].unlocked=true;w.districts[0].stocks=[0,2,0,2,0,2];let mut cash=1000;
        for _ in 0..100 {w.tick(0.1,0.0,0.0,14,&mut cash,true,false);}
        assert_eq!(w.districts[0].stocks,[0,2,0,2,0,2]);assert_eq!(w.districts[0].sales,0);
        assert!(w.upgrade(0,2,&mut cash));assert!(w.upgrade(0,3,&mut cash));assert!(w.upgrade(0,8,&mut cash));
        for _ in 0..100 {w.tick(0.1,0.0,0.0,14,&mut cash,true,false);}
        assert_eq!(w.districts[0].stocks[1],0);assert_eq!(w.districts[0].stocks[3],0);assert!(w.districts[0].stocks[2]>0);assert!(w.districts[0].stocks[4]>0);assert_eq!(w.districts[0].sales,2);
    }
    #[test] fn sales_cash_remains_physical_and_survives_reload() {
        let mut w=World::new();w.districts[0].unlocked=true;w.districts[0].levels[7]=1;w.districts[0].stocks[5]=3;let mut wallet=0;
        for _ in 0..100 {w.tick(0.1,0.0,0.0,14,&mut wallet,true,false);}
        assert_eq!(wallet,0);assert_eq!(w.districts[0].sales,3);let proceeds=w.districts[0].cash;assert!(proceeds>0);
        let mut loaded=World::new();assert!(loaded.load(&w.save()));assert_eq!(loaded.districts[0].cash,proceeds);
        let (x,z)=World::cash_point(0);assert_eq!(loaded.act(x,z,14,&mut wallet),5);
        assert_eq!(wallet+loaded.districts[0].cash,proceeds);
        for _ in 0..100 {loaded.tick(0.1,x,z,14,&mut wallet,true,false);}
        assert_eq!(wallet,proceeds);assert_eq!(loaded.districts[0].cash,0);
        let mut old=w.save();old[0]=2;old.truncate(old.len()-8);assert!(loaded.load(&old));assert_eq!(loaded.districts[0].cash,0);assert_eq!(loaded.districts[0].sales,3);
    }
    #[test] fn wood_chain_consumes_actual_logs_and_planks() {
        let mut w=World::new();w.districts[3].unlocked=true;w.harvest(3,10.0,true);assert!(w.districts[3].stocks[0]>0);
        w.districts[3].stocks=[0,2,0,0,0,0];w.districts[3].levels[1]=1;w.districts[3].levels[2]=1;let mut cash=0;
        for _ in 0..100 {w.tick(0.1,0.0,0.0,14,&mut cash,true,false);}
        assert_eq!(w.districts[3].stocks[1],0);assert_eq!(w.districts[3].stocks[2],4);
        w.districts[3].stocks[2]=0;w.districts[3].stocks[3]=4;
        for _ in 0..100 {w.tick(0.1,0.0,0.0,14,&mut cash,true,false);}
        assert_eq!(w.districts[3].stocks[3],0);assert_eq!(w.districts[3].stocks[4],1);assert_eq!(cash,0);
    }

}
