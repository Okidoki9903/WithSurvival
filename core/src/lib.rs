//! WithSurvival: Les Terres oubliees — simulation core.
//!
//! All gameplay rules live here (movement, combat, production chain, customers,
//! economy, upgrades). The crate compiles to a dependency-free WebAssembly
//! module; the three.js front-end only renders what this module exports.
//!
//! Loop (reverse-engineered from the Whiteout Survival mini-game):
//!   hunt bears -> carry meat -> grinder -> raw slices -> grill -> cooked steaks
//!   -> counter -> customers pay -> collect cash -> buy upgrades on floor pads.

use std::f32::consts::PI;
mod districts;

// ---------------------------------------------------------------------------
// Layout (world units, x = right, z = towards the camera / south)
// ---------------------------------------------------------------------------

pub const CAMP: Rect = Rect { x0: -9.0, x1: 9.0, z0: -8.0, z1: 6.6 };
pub const GATE: Rect = Rect { x0: -2.6, x1: 2.6, z0: -13.5, z1: -6.5 };
pub const FIELD: Rect = Rect { x0: -20.0, x1: 20.0, z0: -44.0, z1: -12.0 };

pub const GRINDER: (f32, f32) = (-5.6, -4.8);
pub const GRINDER_IN: (f32, f32) = (-2.9, -5.4);
pub const GRINDER_OUT: (f32, f32) = (-5.6, -2.0);
pub const GRILL: (f32, f32) = (-6.6, 3.6);
pub const GRILL_IN: (f32, f32) = (-6.6, 1.3);
pub const GRILL_OUT: (f32, f32) = (-3.9, 4.3);
pub const COUNTER: (f32, f32) = (0.6, 6.9);
pub const COUNTER_IN: (f32, f32) = (0.6, 5.0);
pub const CASH: (f32, f32) = (3.8, 5.0);
pub const CONV1: [(f32, f32); 2] = [(-5.6, -1.6), (-6.6, 0.9)];
pub const CONV2: [(f32, f32); 2] = [(-3.4, 4.9), (-1.2, 6.7)];
pub const QUEUE_X: f32 = 0.6;
pub const QUEUE_Z0: f32 = 8.6;
pub const QUEUE_GAP: f32 = 1.15;

const ZONE_R: f32 = 1.35;
const BILL_VALUE: u32 = 10;
const STEAK_PRICE_BILLS: u32 = 1;

#[derive(Clone, Copy, Debug)]
pub struct Rect {
    pub x0: f32,
    pub x1: f32,
    pub z0: f32,
    pub z1: f32,
}

impl Rect {
    fn contains(&self, x: f32, z: f32, m: f32) -> bool {
        x >= self.x0 + m && x <= self.x1 - m && z >= self.z0 + m && z <= self.z1 - m
    }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

struct Rng(u32);

impl Rng {
    fn next(&mut self) -> f32 {
        // xorshift32
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.0 = x;
        (x >> 8) as f32 / (1u32 << 24) as f32
    }
    fn range(&mut self, a: f32, b: f32) -> f32 {
        a + (b - a) * self.next()
    }
}

fn dist(ax: f32, az: f32, bx: f32, bz: f32) -> f32 {
    ((ax - bx) * (ax - bx) + (az - bz) * (az - bz)).sqrt()
}

fn angle_to(ax: f32, az: f32, bx: f32, bz: f32) -> f32 {
    (bx - ax).atan2(bz - az)
}

fn wrap_angle(mut a: f32) -> f32 {
    while a > PI {
        a -= 2.0 * PI;
    }
    while a < -PI {
        a += 2.0 * PI;
    }
    a
}

fn turn_towards(cur: f32, target: f32, max_step: f32) -> f32 {
    let d = wrap_angle(target - cur);
    if d.abs() <= max_step {
        target
    } else {
        cur + max_step * d.signum()
    }
}

// ---------------------------------------------------------------------------
// Game data
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum Item {
    None = 0,
    Meat = 1,
    Raw = 2,
    Cooked = 3,
    Cash = 4,
}

pub mod ev {
    pub const FLY: f32 = 1.0;
    pub const BLOOD: f32 = 2.0;
    pub const BEAR_DIE: f32 = 3.0;
    pub const SWING: f32 = 4.0;
    pub const PURCHASE: f32 = 5.0;
    pub const HURT: f32 = 6.0;
    pub const PLAYER_DIE: f32 = 7.0;
    pub const HAPPY: f32 = 8.0;
    pub const CASH: f32 = 9.0;
}

pub struct Player {
    pub x: f32,
    pub z: f32,
    pub angle: f32,
    pub hp: f32,
    pub attack_cd: f32,
    pub swing: f32,
    pub moving: bool,
    pub stack: Item,
    pub stack_n: u32,
    pub transfer_cd: f32,
    pub since_hurt: f32,
    pub dead_t: f32,
}

pub struct Bear {
    pub x: f32,
    pub z: f32,
    pub angle: f32,
    pub hp: f32,
    pub alive: bool,
    pub respawn_t: f32,
    pub aggro_t: f32,
    pub attack_cd: f32,
    pub flash: f32,
    pub windup: f32,
    pub elite: bool,
    pub wander_t: f32,
    pub tx: f32,
    pub tz: f32,
    pub walk: f32,
    pub moving: bool,
}

pub struct Meat {
    pub x: f32,
    pub z: f32,
    pub age: f32,
}

#[derive(PartialEq, Eq, Clone, Copy, Debug)]
pub enum CState {
    Arriving,
    Waiting,
    Leaving,
}

pub struct Customer {
    pub id: u32,
    pub x: f32,
    pub z: f32,
    pub angle: f32,
    pub want: u32,
    pub got: u32,
    pub state: CState,
    pub leave_step: u8,
    pub walk: f32,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum PadKind {
    ConveyorA = 0,
    ConveyorB = 1,
    Hero = 2,
    Backpack = 3,
    Boots = 4,
    Grill2 = 5,
}

pub struct Pad {
    pub kind: PadKind,
    pub x: f32,
    pub z: f32,
    pub costs: &'static [u32],
    pub level: u32,
    pub paid: u32,
    pub visible: bool,
}

impl Pad {
    fn maxed(&self) -> bool {
        self.level as usize >= self.costs.len()
    }
    fn cost(&self) -> u32 {
        self.costs.get(self.level as usize).copied().unwrap_or(0)
    }
}

pub struct Worker {
    pub kind: u32, pub x:f32, pub z:f32, pub angle:f32,
    pub task:u32, pub carried:u32, pub timer:f32, pub level:u32,
}

pub struct Game {
    pub world:districts::World,
    pub buildings:[u32;5],
    pub workers:Vec<Worker>,
    farm_t:f32,
    pub farm_stock:u32,
    pub contract_progress:u32,
    pub contracts_done:u32,
    build_pad_t:f32,
    pub tier: u32,
    pub region: u32,
    pub enclosure: u32,
    pub weapon: u32,
    pub grinder_level: u32,
    pub kitchen_level: u32,
    pub helper_level: u32,
    helper_t: f32,
    pub kills: u32,
    pub region_kills: [u32;4],
    pub served: u32,
    pub essence: u32,
    dash_t: f32,
    dash_cd: f32,
    rng: Rng,
    pub time: f32,
    pub money: u32,
    pub player: Player,
    pub bears: Vec<Bear>,
    pub meats: Vec<Meat>,
    pub customers: Vec<Customer>,
    next_customer_id: u32,
    customer_t: f32,
    serve_t: f32,
    pub grinder_in: u32,
    pub grinder_out: u32,
    grind_t: f32,
    pub grill_in: u32,
    pub grill_out: u32,
    grill_t: f32,
    pub counter: u32,
    pub cash_pile: u32,
    pub conv1: Vec<f32>,
    pub conv2: Vec<f32>,
    pub pads: Vec<Pad>,
    pay_t: f32,
    events: Vec<f32>,
    out: Vec<f32>,
    layout: Vec<f32>,
}

pub const BEAR_COUNT: usize = 46;
const BEAR_HP: f32 = 3.0;

impl Game {
    pub fn new(seed: u32) -> Game {
        let mut g = Game {
            rng: Rng(seed.max(1)),
            world:districts::World::new(),
            buildings:[0;5],workers:Vec::new(),farm_t:0.0,farm_stock:0,contract_progress:0,contracts_done:0,build_pad_t:0.0,
            tier: 0, region: 0, enclosure: 0, weapon: 0, grinder_level: 0, kitchen_level: 0, helper_level: 0, helper_t: 0.0, kills: 0, region_kills: [0;4], served: 0, essence: 0, dash_t: 0.0, dash_cd: 0.0,
            time: 0.0,
            money: 0,
            player: Player {
                x: 0.0,
                z: 0.0,
                angle: PI,
                hp: 100.0,
                attack_cd: 0.0,
                swing: -1.0,
                moving: false,
                stack: Item::None,
                stack_n: 0,
                transfer_cd: 0.0,
                since_hurt: 10.0,
                dead_t: 0.0,
            },
            bears: Vec::new(),
            meats: Vec::new(),
            customers: Vec::new(),
            next_customer_id: 1,
            customer_t: 0.0,
            serve_t: 0.0,
            grinder_in: 0,
            grinder_out: 0,
            grind_t: 0.0,
            grill_in: 0,
            grill_out: 0,
            grill_t: 0.0,
            counter: 0,
            cash_pile: 0,
            conv1: Vec::new(),
            conv2: Vec::new(),
            pads: vec![
                Pad { kind: PadKind::ConveyorA, x: 3.0, z: -4.6, costs: &[140,300,650], level: 0, paid: 0, visible: true },
                Pad { kind: PadKind::Backpack, x: 1.2, z: -0.8, costs: &[60, 220, 550], level: 0, paid: 0, visible: true },
                Pad { kind: PadKind::ConveyorB, x: 5.8, z: -1.6, costs: &[200,420,850], level: 0, paid: 0, visible: false },
                Pad { kind: PadKind::Boots, x: -2.0, z: 1.8, costs: &[150, 450], level: 0, paid: 0, visible: false },
                Pad { kind: PadKind::Hero, x: 5.8, z: 2.2, costs: &[400], level: 0, paid: 0, visible: false },
                Pad { kind: PadKind::Grill2, x: -1.0, z: -3.2, costs: &[350,700,1200], level: 0, paid: 0, visible: false },
            ],
            pay_t: 0.0,
            events: Vec::new(),
            out: Vec::new(),
            layout: Vec::new(),
        };
        for _ in 0..BEAR_COUNT {
            let (x, z) = g.random_field_point(false);
            let a = g.rng.range(-PI, PI);
            g.bears.push(Bear {
                x,
                z,
                angle: a,
                hp: BEAR_HP,
                alive: true,
                respawn_t: 0.0,
                aggro_t: 0.0,
                attack_cd: 0.0,
                flash: 0.0,
                windup: 0.0,
                elite: false,
                wander_t: 0.0,
                tx: x,
                tz: z,
                walk: 0.0,
                moving: false,
            });
        }
        g.build_layout();
        g
    }

    // ---- upgrade queries -------------------------------------------------

    pub fn camp_radius(&self) -> f32 { 9.0 + self.enclosure as f32 * 3.0 }
    pub fn town_cost(&self) -> u32 { [180, 450, 900, 1600].get(self.tier as usize).copied().unwrap_or(0) }
    pub fn unlocked_regions(&self) -> u32 { (1 + self.tier).min(4) }
    fn region_hp(&self) -> f32 { [3.0, 5.0, 9.0, 15.0][self.region as usize]*(1.0+0.12*(self.contracts_done/5).min(12) as f32) }
    fn camp(&self) -> Rect { Rect { x0: -self.camp_radius(), x1: self.camp_radius(), z1:6.6+4.0*self.enclosure as f32, ..CAMP } }
    pub fn storage_cap(&self)->u32 { 30+40*self.buildings[4] }
    fn contract_target(&self)->u32 { [12,6,8,10,1][self.contract_kind() as usize]+if self.contract_kind()==4 {0} else {(self.contracts_done/5).min(20)*2} }
    fn contract_reward(&self)->u32 { 120+80*self.buildings[3]+self.contracts_done.min(20)*25 }
    fn contract_kind(&self)->u32 { self.contracts_done%5 }
    fn contract_region(&self)->u32 { (self.contracts_done/5)%self.unlocked_regions() }
    fn contract_add(&mut self,kind:u32,amount:u32) {
        if self.buildings[3]==0 || self.contract_kind()!=kind {return;}
        self.contract_progress+=amount;
        if self.contract_progress>=self.contract_target() {
            self.contract_progress=0;self.money+=self.contract_reward();self.essence+=3+self.buildings[3];self.contracts_done+=1;
            self.ensure_elite();
        }
    }
    fn ensure_elite(&mut self) {
        if self.buildings[3]>0 && self.contract_kind()==4 && self.region==self.contract_region() && !self.bears.iter().any(|b|b.alive && b.elite) {
            let hp=self.region_hp()*4.0;
            let b=&mut self.bears[0];b.elite=true;b.hp=hp;b.alive=true;b.x=0.0;b.z=-31.0;b.tx=0.0;b.tz=-31.0;b.windup=0.0;b.aggro_t=0.0;
        }
    }
    fn upgrade_spec(&self,kind:u32)->Option<(u32,&'static [u32],u32,u32,f32,f32)> {
        if kind<=5 {
            let p=self.pads.iter().find(|p|p.kind as u32==kind)?;
            return Some((p.level,p.costs,0,0,p.x,p.z));
        }
        Some(match kind {
            6=>(self.tier,&[180,450,900,1600],0,0,0.0,0.0),
            7=>(self.enclosure,&[100,280,650],0,0,7.3,4.3),
            8=>(self.weapon,&[90,240,600],0,0,5.8,2.2),
            9=>(self.grinder_level,&[80,220,550,1000],0,0,3.0,-4.6),
            10=>(self.kitchen_level,&[100,260,650,1200],0,0,-1.0,-3.2),
            11=>(self.helper_level,&[200,500,1100],0,0,5.8,-1.6),
            12=>(self.buildings[0],&[80,420,900],0,0,7.0,-6.0),
            13=>(self.buildings[1],&[260,600,1200],1,1,10.0,-4.0),
            14=>(self.buildings[2],&[320,750,1400],2,2,13.0,3.0),
            15=>(self.buildings[3],&[450,1000,1800],3,3,-13.0,-4.0),
            16=>(self.buildings[4],&[180,460,1000],1,1,-10.0,1.0),
            _=>return None,
        })
    }
    // A settlement needs actual space and specialized services to grow.
    fn missing_dependency(&self,kind:u32)->u32 {
        if kind!=6 {return 0;}
        match self.tier {
            1=>if self.enclosure<1 {7} else if self.buildings[4]<1 {16} else {0},
            2=>if self.enclosure<2 {7} else if self.buildings[1]<1 {13} else if self.buildings[2]<1 {14} else {0},
            3=>if self.enclosure<3 {7} else if self.buildings[3]<1 {15} else if self.buildings[4]<2 {16} else {0},
            _=>0,
        }
    }
    fn can_upgrade(&self,kind:u32)->bool {
        let Some((level,costs,tier,enclosure,_,_))=self.upgrade_spec(kind) else{return false;};
        let Some(&cost)=costs.get(level as usize) else{return false;};
        (kind>5 || self.pads.iter().find(|p|p.kind as u32==kind).unwrap().visible) && self.money>=if kind<=5 {cost-self.pads.iter().find(|p|p.kind as u32==kind).unwrap().paid} else {cost} && self.tier>=tier && self.enclosure>=enclosure
        && self.missing_dependency(kind)==0
        && (kind!=6 || (self.kills>=[3,10,22,40][level as usize] && self.region_kills[level as usize]>=3))
        && (kind!=8 || self.essence>=[0,8,20][level as usize])
    }
    pub fn upgrade(&mut self,kind:u32)->bool {
        if !self.can_upgrade(kind) {return false;}
        let (level,costs,_,_,x,z)=self.upgrade_spec(kind).unwrap();
        if kind<=5 {
            let p=self.pads.iter_mut().find(|p|p.kind as u32==kind).unwrap();
            self.money-=costs[level as usize]-p.paid;p.paid=0;p.level+=1;
            match kind {
                0=>{let n=self.grinder_out.min(self.storage_cap().saturating_sub(self.grill_in+self.conv1.len() as u32));self.grill_in+=n;self.grinder_out-=n;self.reveal(PadKind::ConveyorB);self.reveal(PadKind::Boots);},
                1=>{let n=self.grill_out.min(self.storage_cap().saturating_sub(self.counter+self.conv2.len() as u32));self.counter+=n;self.grill_out-=n;self.reveal(PadKind::Hero);},
                2=>{self.player.hp=self.max_hp();self.reveal(PadKind::Grill2);},_=>{},
            }
            self.push_event([ev::PURCHASE,kind as f32,x,z,0.0,0.0,0.0]);return true;
        }
        self.money-=costs[level as usize];
        if kind==8 {self.essence-=[0,8,20][level as usize];}
        match kind {
            6=>{self.tier+=1;self.player.hp=self.max_hp();},7=>self.enclosure+=1,
            8=>self.weapon+=1,9=>self.grinder_level+=1,10=>self.kitchen_level+=1,
            11=>self.helper_level+=1,12..=16=>self.buildings[(kind-12) as usize]+=1,_=>{},
        }
        self.sync_workers();
        self.ensure_elite();
        self.push_event([ev::PURCHASE,kind as f32,x,z,0.0,0.0,0.0]);
        true
    }
    fn sync_workers(&mut self) {
        let counts=[self.buildings[0],self.buildings[1]+if self.helper_level>=3 {1} else {0},if self.buildings[2]>0 {1} else {0}];
        for kind in 0..3 {
            let have=self.workers.iter().filter(|w|w.kind==kind).count() as u32;
            for _ in have..counts[kind as usize] {
                self.workers.push(Worker{kind,x:0.0,z:-5.0,angle:PI,task:0,carried:0,timer:0.0,level:self.buildings[kind as usize].max(1)});
            }
            for w in self.workers.iter_mut().filter(|w|w.kind==kind) {w.level=self.buildings[kind as usize].max(1);}
        }
    }
    pub fn travel(&mut self, region: u32) -> bool {
        if region >= self.unlocked_regions() || self.player.dead_t > 0.0 { return false; }
        if region == self.region { return true; }
        self.region = region;
        self.player.x = 0.0; self.player.z = -15.0;
        self.player.since_hurt = 0.0;
        self.meats.clear();
        let hp = self.region_hp();
        for i in 0..self.bears.len() {
            let (x,z) = self.random_field_point(false);
            let b = &mut self.bears[i];
            b.x=x; b.z=z; b.tx=x; b.tz=z; b.hp=hp; b.alive=true; b.aggro_t=0.0; b.attack_cd=1.0; b.windup=0.0;b.elite=false;
        }
        self.ensure_elite();
        true
    }
    pub fn dash(&mut self) -> bool {
        if self.dash_cd > 0.0 || self.player.dead_t > 0.0 { return false; }
        self.dash_t=0.28; self.dash_cd=3.5; true
    }
    fn pad_level(&self, k: PadKind) -> u32 {
        self.pads.iter().find(|p| p.kind == k).map(|p| p.level).unwrap_or(0)
    }
    pub fn hero(&self) -> bool {
        self.pad_level(PadKind::Hero) > 0
    }
    pub fn capacity(&self) -> u32 {
        14 + 10 * self.pad_level(PadKind::Backpack) + if self.hero() { 10 } else { 0 }
    }
    pub fn speed(&self) -> f32 {
        5.2 + 1.0 * self.pad_level(PadKind::Boots) as f32 + if self.hero() { 0.4 } else { 0.0 }
    }
    pub fn max_hp(&self) -> f32 {
        (if self.hero() { 180.0 } else { 100.0 }) + 15.0 * self.tier as f32
    }
    fn has_conv1(&self) -> bool {
        self.pad_level(PadKind::ConveyorA) > 0
    }
    fn has_conv2(&self) -> bool {
        self.pad_level(PadKind::ConveyorB) > 0
    }
    fn grill_period(&self) -> f32 {
        (if self.pad_level(PadKind::Grill2) > 0 { 0.22 } else { 0.45 }) / (1.0 + 0.3 * self.kitchen_level as f32)
    }

    // ---- helpers -----------------------------------------------------------

    fn random_field_point(&mut self, north_edge: bool) -> (f32, f32) {
        let x = self.rng.range(FIELD.x0 + 1.5, FIELD.x1 - 1.5);
        let z = if north_edge {
            self.rng.range(FIELD.z0 + 1.0, FIELD.z0 + 5.0)
        } else {
            self.rng.range(FIELD.z0 + 1.5, FIELD.z1 - 2.0)
        };
        (x, z)
    }

    fn push_event(&mut self, e: [f32; 7]) {
        self.events.extend_from_slice(&e);
    }

    fn fly(&mut self, item: Item, fx: f32, fz: f32, tx: f32, tz: f32, to_player: bool) {
        self.push_event([ev::FLY, item as u8 as f32, fx, fz, tx, tz, if to_player { 1.0 } else { 0.0 }]);
    }

    pub fn walkable(x: f32, z: f32) -> bool {
        CAMP.contains(x, z, 0.5) || GATE.contains(x, z, 0.5) || FIELD.contains(x, z, 0.5)
    }

    // ---- main update -------------------------------------------------------

    pub fn tick(&mut self, dt: f32, ix: f32, iz: f32) {
        let mut remaining = dt.clamp(0.0, 0.25);
        while remaining > 0.0 {
            let step = remaining.min(1.0 / 60.0);
            self.step(step, ix, iz);
            remaining -= step;
        }
    }

    fn step(&mut self, dt: f32, ix: f32, iz: f32) {
        self.time += dt;
        self.dash_t = (self.dash_t-dt).max(0.0);
        self.dash_cd = (self.dash_cd-dt).max(0.0);
        self.update_player(dt, ix, iz);
        self.world.base_mastered=self.grinder_level>=4&&self.kitchen_level>=4&&self.has_conv1()&&self.has_conv2()&&self.served>=20;
        let carry_cap=self.capacity().saturating_sub(self.player.stack_n);
        self.world.player_power=(if self.hero() {2.0} else {1.0})+0.8*self.weapon as f32;
        let district_hurt=self.world.tick(dt,self.player.x,self.player.z,carry_cap,&mut self.money,self.player.dead_t<=0.0,self.dash_t>0.0);
        if self.world.player_attack_fired {
            self.player.swing=0.0;self.player.angle=self.world.player_attack_angle;
            self.push_event([ev::SWING,self.player.x,self.player.z,self.player.angle,if self.hero(){1.0}else{0.0},2.7,0.0]);
        }
        if district_hurt>0.0 {
            self.player.hp-=district_hurt;self.player.since_hurt=0.0;
            self.push_event([ev::HURT,district_hurt,self.player.x,self.player.z,0.0,0.0,0.0]);
            if self.player.hp<=0.0 {self.kill_player();}
        }
        self.update_bears(dt);
        self.update_combat(dt);
        self.update_meat_pickup(dt);
        self.update_transfers(dt);
        self.update_machines(dt);
        self.update_workers(dt);
        self.update_customers(dt);
        self.update_pads(dt);
    }

    fn update_player(&mut self, dt: f32, ix: f32, iz: f32) {
        if self.player.dead_t > 0.0 {
            self.player.dead_t -= dt;
            if self.player.dead_t <= 0.0 {
                self.player.x = 0.0;
                self.player.z = 0.0;
                self.player.hp = self.max_hp();
            }
            self.player.moving = false;
            return;
        }
        let mut len = (ix * ix + iz * iz).sqrt();
        let (mut dx, mut dz) = (0.0, 0.0);
        if len > 0.08 {
            if len > 1.0 {
                len = 1.0;
            }
            let n = (ix * ix + iz * iz).sqrt();
            dx = ix / n * len;
            dz = iz / n * len;
        }
        let sp = self.speed() * if self.dash_t > 0.0 { 2.8 } else { 1.0 };
        let camp = self.camp();
        let max_hp = self.max_hp();
        let p = &mut self.player;
        p.moving = len > 0.08;
        if p.moving {
            let nx = p.x + dx * sp * dt;
            let nz = p.z + dz * sp * dt;
            if camp.contains(nx,nz,0.5) || Game::walkable(nx, nz) || self.world.walkable(nx,nz) {
                p.x = nx;
                p.z = nz;
            } else if camp.contains(nx,p.z,0.5) || Game::walkable(nx, p.z) || self.world.walkable(nx,p.z) {
                p.x = nx;
            } else if camp.contains(p.x,nz,0.5) || Game::walkable(p.x, nz) || self.world.walkable(p.x,nz) {
                p.z = nz;
            }
            let face = dx.atan2(dz);
            p.angle = turn_towards(p.angle, face, 14.0 * dt);
        }
        // solid machines
        for &(cx, cz, r) in &[(GRINDER.0, GRINDER.1, 1.7), (GRILL.0, GRILL.1, 1.4)] {
            let d = dist(p.x, p.z, cx, cz);
            if d < r && d > 0.0001 {
                p.x = cx + (p.x - cx) / d * r;
                p.z = cz + (p.z - cz) / d * r;
            }
        }
        // regen
        p.since_hurt += dt;
        let in_camp = camp.contains(p.x, p.z, 0.0);
        let regen = if in_camp { 30.0 } else if p.since_hurt > 2.0 { 10.0 } else { 0.0 };

        p.hp = (p.hp + regen * dt).min(max_hp);
    }

    fn update_bears(&mut self, dt: f32) {
        let (px, pz) = (self.player.x, self.player.z);
        let player_alive = self.player.dead_t <= 0.0;
        let player_in_field = FIELD.contains(px, pz, -1.0);
        let mut hurt = 0.0;
        let region = self.region;
        let region_hp = self.region_hp();
        let invulnerable = self.dash_t > 0.0;
        for i in 0..self.bears.len() {
            if !self.bears[i].alive {
                self.bears[i].respawn_t -= dt;
                if self.bears[i].respawn_t <= 0.0 {
                    let (x, z) = self.random_field_point(true);
                    let b = &mut self.bears[i];
                    b.x = x;
                    b.z = z;
                    b.tx = x;
                    b.tz = z;
                    b.hp = region_hp * if b.elite {4.0} else {1.0};
                    b.alive = true;
                    b.aggro_t = 0.0;
                    b.windup = 0.0;
                }
                continue;
            }
            let nt = self.rng.range(2.0, 6.0);
            let (wx, wz) = (self.rng.range(-4.0, 4.0), self.rng.range(-4.0, 4.0));
            let b = &mut self.bears[i];
            b.flash = (b.flash - dt * 5.0).max(0.0);
            b.attack_cd -= dt;
            b.aggro_t -= dt;
            let (tx, tz, speed);
            let dp = dist(b.x, b.z, px, pz);
            if (b.aggro_t > 0.0 || (region > 0 && dp < 4.5)) && player_alive && player_in_field {
                tx = px;
                tz = pz;
                speed = [2.3, 3.7, 1.8, 3.1][region as usize];
                if b.windup > 0.0 {
                    b.windup = (b.windup-dt).max(0.0);
                    if b.windup == 0.0 {
                        b.attack_cd = [1.6,1.0,2.2,1.35][region as usize];
                        // Commit the strike only after its visible anticipation.
                        // Escape the impact radius or dash to avoid all damage.
                        let radius = [1.7,1.6,2.3,1.9][region as usize];
                        if dp < radius && !invulnerable {
                            hurt += [4.0,6.0,14.0,11.0][region as usize]*if b.elite {2.5} else {1.0};
                        }
                    }
                } else if dp < 1.45 && b.attack_cd <= 0.0 {
                    b.windup = if b.elite {0.9} else {[0.45,0.35,0.7,0.5][region as usize]};
                }
            } else {
                b.wander_t -= dt;
                if b.wander_t <= 0.0 {
                    b.wander_t = nt;
                    b.tx = (b.x + wx).clamp(FIELD.x0 + 1.0, FIELD.x1 - 1.0);
                    b.tz = (b.z + wz).clamp(FIELD.z0 + 1.0, FIELD.z1 - 1.0);
                }
                tx = b.tx;
                tz = b.tz;
                speed = 0.9;
            }
            let d = dist(b.x, b.z, tx, tz);
            b.moving = d > 1.1 && b.windup <= 0.0;
            if b.moving {
                let a = angle_to(b.x, b.z, tx, tz);
                b.angle = turn_towards(b.angle, a, 4.0 * dt);
                b.x += b.angle.sin() * speed * dt;
                b.z += b.angle.cos() * speed * dt;
                b.walk += dt * speed * 3.0;
            } else if b.aggro_t > 0.0 {
                let a = angle_to(b.x, b.z, px, pz);
                b.angle = turn_towards(b.angle, a, 6.0 * dt);
            }
            b.x = b.x.clamp(FIELD.x0 + 0.8, FIELD.x1 - 0.8);
            b.z = b.z.clamp(FIELD.z0 + 0.8, FIELD.z1 - 0.8);
        }
        // separation between bears and from the player
        let n = self.bears.len();
        for i in 0..n {
            if !self.bears[i].alive {
                continue;
            }
            for j in (i + 1)..n {
                if !self.bears[j].alive {
                    continue;
                }
                let (dx, dz) = (self.bears[j].x - self.bears[i].x, self.bears[j].z - self.bears[i].z);
                let d2 = dx * dx + dz * dz;
                let min = 1.5;
                if d2 < min * min && d2 > 0.0001 {
                    let d = d2.sqrt();
                    let push = (min - d) * 0.5;
                    let (ux, uz) = (dx / d * push, dz / d * push);
                    self.bears[i].x -= ux;
                    self.bears[i].z -= uz;
                    self.bears[j].x += ux;
                    self.bears[j].z += uz;
                }
            }
            if player_alive {
                let b = &mut self.bears[i];
                let d = dist(b.x, b.z, px, pz);
                let min = 1.15;
                if d < min && d > 0.0001 {
                    b.x = px + (b.x - px) / d * min;
                    b.z = pz + (b.z - pz) / d * min;
                }
            }
        }
        if hurt > 0.0 && player_alive {
            self.player.hp -= hurt;
            self.player.since_hurt = 0.0;
            self.push_event([ev::HURT, hurt, px, pz, 0.0, 0.0, 0.0]);
            if self.player.hp <= 0.0 {
                self.kill_player();
            }
        }
    }

    fn kill_player(&mut self) {
        let (px, pz) = (self.player.x, self.player.z);
        self.push_event([ev::PLAYER_DIE, self.player.stack_n as f32, px, pz, 0.0, 0.0, 0.0]);
        // dropped meat stays on the field
        if self.player.stack == Item::Meat {
            let n = self.player.stack_n.min(12);
            for _ in 0..n {
                let (ox, oz) = (self.rng.range(-1.5, 1.5), self.rng.range(-1.5, 1.5));
                self.meats.push(Meat { x: px + ox, z: pz + oz, age: 0.0 });
            }
        }
        self.player.stack = Item::None;
        self.player.stack_n = 0;
        self.player.hp = 0.0;
        self.player.dead_t = 2.0;
        for b in &mut self.bears {
            b.aggro_t = 0.0;
            b.windup = 0.0;
        }
    }

    fn update_combat(&mut self, dt: f32) {
        let p = &mut self.player;
        p.attack_cd -= dt;
        if p.swing >= 0.0 {
            p.swing += dt * 3.2;
            if p.swing >= 1.0 {
                p.swing = -1.0;
            }
        }
        if p.dead_t > 0.0 || p.attack_cd > 0.0 {
            return;
        }
        let hero = self.hero();
        let (px, pz) = (self.player.x, self.player.z);
        let reach = if hero { 3.4 } else { 2.3 };
        // nearest bear in reach
        let mut best: Option<(usize, f32)> = None;
        for (i, b) in self.bears.iter().enumerate() {
            if !b.alive {
                continue;
            }
            let d = dist(px, pz, b.x, b.z);
            if d < reach && best.map_or(true, |(_, bd)| d < bd) {
                best = Some((i, d));
            }
        }
        let Some((ti, _)) = best else { return };
        let face = angle_to(px, pz, self.bears[ti].x, self.bears[ti].z);
        if !self.player.moving || !hero {
            self.player.angle = face;
        }
        let dmg = (if hero { 2.0 } else { 1.0 }) + self.weapon as f32 * 0.8;
        self.player.attack_cd = if hero { 0.38 } else { 0.5 };
        self.player.swing = 0.0;
        self.push_event([ev::SWING, px, pz, self.player.angle, if hero { 1.0 } else { 0.0 }, reach, 0.0]);
        let angle = self.player.angle;
        let mut killed = Vec::new();
        for (i, b) in self.bears.iter_mut().enumerate() {
            if !b.alive {
                continue;
            }
            let d = dist(px, pz, b.x, b.z);
            if d > reach {
                continue;
            }
            if !hero {
                let a = wrap_angle(angle_to(px, pz, b.x, b.z) - angle);
                if a.abs() > 1.2 && d > 1.2 {
                    continue;
                }
            }
            b.hp -= dmg;
            b.flash = 1.0;
            b.aggro_t = 4.0;
            // knockback
            if d > 0.001 {
                b.x += (b.x - px) / d * 0.25;
                b.z += (b.z - pz) / d * 0.25;
            }
            if b.hp <= 0.0 {
                killed.push(i);
            }
        }
        for i in 0..self.bears.len() {
            if self.bears[i].flash == 1.0 {
                let (bx, bz) = (self.bears[i].x, self.bears[i].z);
                self.push_event([ev::BLOOD, bx, bz, angle, 0.0, 0.0, 0.0]);
            }
        }
        for i in killed {
            let respawn = self.rng.range(3.0, 6.0);
            let b = &mut self.bears[i];
            b.alive = false;
            b.respawn_t = respawn;
            let elite=b.elite;b.elite=false;
            let (bx, bz, ba) = (b.x, b.z, b.angle);
            self.push_event([ev::BEAR_DIE, bx, bz, ba, 0.0, 0.0, 0.0]);
            self.kills += 1;
            self.region_kills[self.region as usize] += 1;
            if self.region==self.contract_region() {self.contract_add(if elite {4} else {1},1);}
            self.essence += 1 + self.region * 2;
            let amount=1+self.region;
            let direct=if self.world.base_direct_loot()&&self.has_conv1() {amount.min(self.storage_cap().saturating_sub(self.grinder_in))} else {0};
            self.grinder_in+=direct;
            if direct>0 {self.fly(Item::Meat,bx,bz,GRINDER_IN.0,GRINDER_IN.1,false);}
            for j in 0..amount-direct {self.meats.push(Meat{x:bx+j as f32*0.3,z:bz,age:0.0});}
        }
    }

    fn update_meat_pickup(&mut self, dt: f32) {
        let cap = self.capacity();
        let alive = self.player.dead_t <= 0.0;
        let (px, pz) = (self.player.x, self.player.z);
        let mut i = 0;
        while i < self.meats.len() {
            self.meats[i].age += dt;
            if self.meats[i].age>120.0 {self.meats.swap_remove(i);continue;}
            let m = &self.meats[i];
            let can = alive
                && (self.player.stack == Item::None || self.player.stack == Item::Meat)
                && self.player.stack_n + self.world.carry_n < cap
                && m.age > 0.35;
            if can && dist(px, pz, m.x, m.z) < 2.6 {
                let (mx, mz) = (m.x, m.z);
                self.meats.swap_remove(i);
                self.player.stack = Item::Meat;
                self.player.stack_n += 1;
                self.fly(Item::Meat, mx, mz, px, pz, true);
                continue;
            }
            i += 1;
        }
    }

    fn near(&self, p: (f32, f32)) -> bool {
        self.player.dead_t <= 0.0 && dist(self.player.x, self.player.z, p.0, p.1) < ZONE_R
    }

    fn take_from_player(&mut self, kind: Item) -> bool {
        if self.player.stack == kind && self.player.stack_n > 0 {
            self.player.stack_n -= 1;
            if self.player.stack_n == 0 {
                self.player.stack = Item::None;
            }
            true
        } else {
            false
        }
    }

    fn give_to_player(&mut self, kind: Item) -> bool {
        let p = &self.player;
        if (p.stack == Item::None || p.stack == kind) && p.stack_n+self.world.carry_n < self.capacity() {
            self.player.stack = kind;
            self.player.stack_n += 1;
            true
        } else {
            false
        }
    }

    fn update_transfers(&mut self, dt: f32) {
        self.player.transfer_cd -= dt;
        if self.player.transfer_cd > 0.0 {
            return;
        }
        let (px, pz) = (self.player.x, self.player.z);
        let period = 0.055;
        // drop meat in grinder
        if self.near(GRINDER_IN) && self.grinder_in < self.storage_cap() && self.take_from_player(Item::Meat) {
            self.grinder_in += 1;
            self.fly(Item::Meat, px, pz, GRINDER.0 + 1.0, GRINDER.1 - 0.4, false);
            self.player.transfer_cd = period;
            return;
        }
        // pick raw slices at grinder output
        if !self.has_conv1() && self.near(GRINDER_OUT) && self.grinder_out > 0 && self.give_to_player(Item::Raw) {
            self.grinder_out -= 1;
            self.fly(Item::Raw, GRINDER_OUT.0, GRINDER_OUT.1, px, pz, true);
            self.player.transfer_cd = period;
            return;
        }
        // drop raw on grill
        if self.near(GRILL_IN) && self.grill_in < self.storage_cap() && self.take_from_player(Item::Raw) {
            self.grill_in += 1;
            self.fly(Item::Raw, px, pz, GRILL_IN.0, GRILL_IN.1 - 0.6, false);
            self.player.transfer_cd = period;
            return;
        }
        // pick cooked from grill
        if !self.has_conv2() && self.near(GRILL_OUT) && self.grill_out > 0 && self.give_to_player(Item::Cooked) {
            self.grill_out -= 1;
            self.fly(Item::Cooked, GRILL_OUT.0, GRILL_OUT.1, px, pz, true);
            self.player.transfer_cd = period;
            return;
        }
        // drop cooked on the counter
        if self.near(COUNTER_IN) && self.counter < self.storage_cap() && self.take_from_player(Item::Cooked) {
            self.counter += 1;
            self.fly(Item::Cooked, px, pz, COUNTER.0 - 0.6, COUNTER.1 - 0.3, false);
            self.player.transfer_cd = period;
            return;
        }
        // collect cash
        if self.near(CASH) && self.cash_pile > 0 {
            let n = self.cash_pile.min(3);
            self.cash_pile -= n;
            self.money += n * BILL_VALUE;
            self.push_event([ev::CASH, CASH.0, CASH.1, n as f32, 0.0, 0.0, 0.0]);
            self.player.transfer_cd = 0.03;
        }
    }

    fn update_machines(&mut self, dt: f32) {
        // Legacy output piles drain onto new conveyors as capacity becomes free.
        if self.has_conv1() && self.grinder_out>0 {
            let n=self.grinder_out.min(2).min(self.storage_cap().saturating_sub(self.grill_in+self.conv1.len() as u32));
            self.grinder_out-=n;for _ in 0..n {self.conv1.push(0.0);}
        }
        if self.has_conv2() && self.grill_out>0 {
            let n=self.grill_out.min(2).min(self.storage_cap().saturating_sub(self.counter+self.conv2.len() as u32));
            self.grill_out-=n;for _ in 0..n {self.conv2.push(0.0);}
        }
        // grinder: 1 meat -> 2 raw slices
        if self.grinder_in > 0 && self.grinder_out+2 <= self.storage_cap() && self.grill_in+self.conv1.len() as u32+2 <= self.storage_cap() {
            self.grind_t += dt;
            if self.grind_t >= 0.35 / (1.0 + 0.35 * self.grinder_level as f32) {
                self.grind_t = 0.0;
                self.grinder_in -= 1;
                if self.has_conv1() {
                    self.conv1.push(0.0);
                    self.conv1.push(-0.12);
                } else {
                    self.grinder_out += 2;
                }
            }
        } else {
            self.grind_t = 0.0;
        }
        // conveyors
        let conv1_speed = 0.9 + 0.25 * self.pad_level(PadKind::ConveyorA) as f32;
        let mut arrived = 0;
        self.conv1.retain_mut(|t| {
            *t += dt * conv1_speed;
            if *t >= 1.0 {
                arrived += 1;
                false
            } else {
                true
            }
        });
        self.grill_in += arrived;

        let period = self.grill_period();
        if self.grill_in > 0 && self.grill_out < self.storage_cap() && self.counter+(self.conv2.len() as u32) < self.storage_cap() {
            self.grill_t += dt;
            if self.grill_t >= period {
                self.grill_t = 0.0;
                self.grill_in -= 1;
                if self.has_conv2() {
                    self.conv2.push(0.0);
                } else {
                    self.grill_out += 1;
                }
            }
        } else {
            self.grill_t = 0.0;
        }
        let mut arrived = 0;
        let conv2_speed = 0.8 + 0.25 * self.pad_level(PadKind::ConveyorB) as f32;
        self.conv2.retain_mut(|t| {
            *t += dt * conv2_speed;
            if *t >= 1.0 {
                arrived += 1;
                false
            } else {
                true
            }
        });
        self.counter += arrived;
        // Porters move stock between machines; higher levels add cashier and hunter.
        self.helper_t -= dt;
        if self.helper_level > 0 && self.helper_t <= 0.0 {
            self.helper_t = 0.7 / self.helper_level as f32;
            if !self.has_conv1() && self.grinder_out > 0 && self.grill_in<self.storage_cap() { self.grinder_out-=1; self.grill_in+=1; }
            if !self.has_conv2() && self.grill_out > 0 && self.counter<self.storage_cap() { self.grill_out-=1; self.counter+=1; }
            if self.helper_level >= 2 && self.cash_pile > 0 { self.cash_pile-=1; self.money+=BILL_VALUE; }

        }
    }

    fn worker_move(w:&mut Worker,tx:f32,tz:f32,dt:f32)->bool {
        // All workers physically use the narrow gate when crossing the fence.
        let (mut gx,mut gz)=(tx,tz);
        if w.z < -12.0 && tz > -8.0 {gx=0.0;gz=-10.0;}
        else if w.z > -8.0 && tz < -12.0 {gx=0.0;gz=-10.0;}
        else if w.z>=-12.0 && w.z<=-8.0 && (w.x.abs()>1.5 || tx.abs()>2.0) {
            gx=0.0;gz=if tz < -12.0 {-13.0} else {-7.0};
        }
        let d=dist(w.x,w.z,gx,gz);
        if d>0.3 {let step=(dt*(3.5+0.3*w.level as f32)).min(d);w.x+=(gx-w.x)/d*step;w.z+=(gz-w.z)/d*step;w.angle=angle_to(w.x,w.z,gx,gz);}
        dist(w.x,w.z,tx,tz)<0.65
    }
    fn update_workers(&mut self,dt:f32) {
        self.sync_workers();
        if self.buildings[2]>0 && self.farm_stock<self.storage_cap() {
            self.farm_t+=dt;
            let period=8.0/self.buildings[2] as f32;
            if self.farm_t>=period {self.farm_t-=period;let harvest=(2*self.buildings[2]).min(self.storage_cap()-self.farm_stock);self.farm_stock+=harvest;self.contract_add(3,harvest);}
        }
        // Take ownership for this frame so world inventory remains authoritative.
        let mut workers=std::mem::take(&mut self.workers);
        for w in &mut workers {
            w.timer=(w.timer-dt).max(0.0);
            if w.kind==0 {
                if w.carried>0 {
                    w.task=2;
                    if Self::worker_move(w,GRINDER_IN.0,GRINDER_IN.1,dt) && self.grinder_in<self.storage_cap() {
                        let n=w.carried.min(self.storage_cap()-self.grinder_in);self.grinder_in+=n;w.carried-=n;
                        self.fly(Item::Meat,w.x,w.z,GRINDER.0,GRINDER.1,false);
                    }
                } else if let Some((index,x,z))=self.meats.iter().enumerate().min_by(|(_,a),(_,b)|dist(w.x,w.z,a.x,a.z).total_cmp(&dist(w.x,w.z,b.x,b.z))).map(|(i,m)|(i,m.x,m.z)) {
                    w.task=1;
                    if Self::worker_move(w,x,z,dt) {
                        let cap=2+2*w.level;
                        self.meats.swap_remove(index);w.carried=1;
                        for j in (0..self.meats.len()).rev() {if w.carried<cap && dist(w.x,w.z,self.meats[j].x,self.meats[j].z)<1.5 {self.meats.swap_remove(j);w.carried+=1;}}
                        self.contract_add(2,w.carried);
                    }
                } else {w.task=0;Self::worker_move(w,7.0,-6.0,dt);}
            } else if w.kind==1 {
                if let Some((index,x,z))=self.bears.iter().enumerate().filter(|(_,b)|b.alive).min_by(|(_,a),(_,b)|dist(w.x,w.z,a.x,a.z).total_cmp(&dist(w.x,w.z,b.x,b.z))).map(|(i,b)|(i,b.x,b.z)) {
                    w.task=3;
                    if Self::worker_move(w,x,z,dt) && w.timer<=0.0 {
                        w.timer=0.9;let b=&mut self.bears[index];b.hp-=0.7+0.6*w.level as f32;b.flash=1.0;
                        if b.hp<=0.0 {
                            b.alive=false;b.respawn_t=8.0;let elite=b.elite;b.elite=false;self.kills+=1;
                            if self.region==self.contract_region() {self.contract_add(if elite {4} else {1},1);}
                            let amount=1+self.region;
                            let direct=if self.world.base_direct_loot()&&self.has_conv1() {amount.min(self.storage_cap().saturating_sub(self.grinder_in))} else {0};self.grinder_in+=direct;
                            for j in 0..amount-direct {self.meats.push(Meat{x:x+j as f32*0.3,z,age:0.0});}
                            self.push_event([ev::BEAR_DIE,x,z,0.0,0.0,0.0,0.0]);
                        }
                    }
                } else {w.task=0;}
            } else {
                if w.carried>0 {
                    w.task=2;
                    if Self::worker_move(w,GRINDER_IN.0,GRINDER_IN.1,dt) && self.grinder_in<self.storage_cap() {
                        let n=w.carried.min(self.storage_cap()-self.grinder_in);w.carried-=n;self.grinder_in+=n;
                        self.fly(Item::Meat,w.x,w.z,GRINDER.0,GRINDER.1,false);
                    }
                } else {
                    w.task=4;
                    if Self::worker_move(w,13.0,3.0,dt) && self.farm_stock>0 {
                        w.carried=self.farm_stock.min(2+2*w.level);self.farm_stock-=w.carried;
                    }
                }
            }
        }
        self.workers=workers;
    }

    fn update_customers(&mut self, dt: f32) {
        // spawn
        self.customer_t -= dt;
        let queued = self.customers.iter().filter(|c| c.state != CState::Leaving).count();
        if self.customer_t <= 0.0 && queued < 8 {
            self.customer_t = 1.6;
            let want = 1 + (self.rng.next() * 4.0) as u32;
            let id = self.next_customer_id;
            self.next_customer_id += 1;
            self.customers.push(Customer {
                id,
                x: QUEUE_X + self.rng.range(-0.2, 0.2),
                z: 30.0,
                angle: PI,
                want: want.min(4),
                got: 0,
                state: CState::Arriving,
                leave_step: 0,
                walk: 0.0,
            });
        }
        // queue slots
        let mut slot = 0usize;
        let mut front: Option<usize> = None;
        for i in 0..self.customers.len() {
            let c = &mut self.customers[i];
            if c.state == CState::Leaving {
                let (tx, tz) = if c.leave_step == 0 { (4.5, QUEUE_Z0 + 0.8) } else { (4.5, 32.0) };
                let d = dist(c.x, c.z, tx, tz);
                if d < 0.3 {
                    c.leave_step += 1;
                } else {
                    let a = angle_to(c.x, c.z, tx, tz);
                    c.angle = turn_towards(c.angle, a, 10.0 * dt);
                    c.x += (tx - c.x) / d * 3.2 * dt;
                    c.z += (tz - c.z) / d * 3.2 * dt;
                    c.walk += dt * 10.0;
                }
                continue;
            }
            let tx = QUEUE_X;
            let tz = QUEUE_Z0 + slot as f32 * QUEUE_GAP;
            let d = dist(c.x, c.z, tx, tz);
            if d > 0.05 {
                let step = (3.0 * dt).min(d);
                c.x += (tx - c.x) / d * step;
                c.z += (tz - c.z) / d * step;
                c.walk += dt * 10.0;
                c.angle = turn_towards(c.angle, PI, 10.0 * dt);
            }
            if slot == 0 && d < 0.3 {
                c.state = CState::Waiting;
                front = Some(i);
            }
            slot += 1;
        }
        self.customers.retain(|c| !(c.state == CState::Leaving && c.leave_step >= 2));

        // serving
        self.serve_t -= dt;
        if let Some(i) = front {
            if self.serve_t <= 0.0 && self.counter > 0 && self.customers[i].got < self.customers[i].want {
                self.counter -= 1;
                self.customers[i].got += 1;
                self.contract_add(0,1);
                self.serve_t = 0.18;
                let (cx, cz) = (self.customers[i].x, self.customers[i].z);
                self.fly(Item::Cooked, COUNTER.0, COUNTER.1 - 0.2, cx, cz, false);
            }
            let c = &mut self.customers[i];
            if c.got >= c.want && self.serve_t <= 0.0 {
                c.state = CState::Leaving;
                c.leave_step = 0;
                let bills = c.want * (STEAK_PRICE_BILLS + self.tier);
                self.served += 1;
                let (cx, cz) = (c.x, c.z);
                self.cash_pile += bills;
                self.push_event([ev::HAPPY, cx, cz, bills as f32, 0.0, 0.0, 0.0]);
                for _ in 0..bills.min(4) {
                    self.fly(Item::Cash, COUNTER.0, COUNTER.1, CASH.0, CASH.1, false);
                }
            }
        }
    }

    fn update_pads(&mut self, dt: f32) {
        self.pay_t -= dt;
        self.build_pad_t=(self.build_pad_t-dt).max(0.0);
        if self.build_pad_t<=0.0 && self.player.dead_t<=0.0 {
            for kind in [12,13,14,15,16] {
                let (_,_,_,_,x,z)=self.upgrade_spec(kind).unwrap();
                if dist(self.player.x,self.player.z,x,z)<1.1 && self.upgrade(kind) {self.build_pad_t=3.0;break;}
            }
        }
        if self.player.dead_t > 0.0 {
            return;
        }
        let (px, pz) = (self.player.x, self.player.z);
        let mut bought: Option<usize> = None;
        for (i, pad) in self.pads.iter_mut().enumerate() {
            if !pad.visible || pad.maxed() {
                continue;
            }
            if dist(px, pz, pad.x, pad.z) > 1.3 {
                continue;
            }
            if self.money == 0 || self.pay_t > 0.0 {
                break;
            }
            let cost = pad.cost();
            let chunk = (cost / 30).max(2).min(cost - pad.paid).min(self.money);
            pad.paid += chunk;
            self.money -= chunk;
            self.pay_t = 0.03;
            self.events.extend_from_slice(&[ev::FLY, Item::Cash as u8 as f32, px, pz, pad.x, pad.z, 0.0]);
            if pad.paid >= cost {
                pad.level += 1;
                pad.paid = 0;
                bought = Some(i);
            }
            break;
        }
        if let Some(i) = bought {
            let (k, x, z) = (self.pads[i].kind, self.pads[i].x, self.pads[i].z);
            self.push_event([ev::PURCHASE, k as u8 as f32, x, z, 0.0, 0.0, 0.0]);
            match k {
                PadKind::ConveyorA => {
                    // anything waiting at the grinder output rides the new belt
                    let n = self.grinder_out.min(self.storage_cap().saturating_sub(self.grill_in+self.conv1.len() as u32));
                    self.grinder_out -= n;
                    self.grill_in += n;
                    self.reveal(PadKind::ConveyorB);
                    self.reveal(PadKind::Boots);
                }
                PadKind::ConveyorB => {
                    let n = self.grill_out.min(self.storage_cap().saturating_sub(self.counter+self.conv2.len() as u32));
                    self.grill_out -= n;
                    self.counter += n;
                    self.reveal(PadKind::Hero);
                }
                PadKind::Hero => {
                    self.player.hp = self.max_hp();
                    self.reveal(PadKind::Grill2);
                }
                _ => {}
            }
        }
    }

    fn reveal(&mut self, k: PadKind) {
        if let Some(p) = self.pads.iter_mut().find(|p| p.kind == k) {
            p.visible = true;
        }
    }

    // ---- export ------------------------------------------------------------

    fn build_layout(&mut self) {
        let l = &mut self.layout;
        l.clear();
        for r in [CAMP, GATE, FIELD] {
            l.extend_from_slice(&[r.x0, r.x1, r.z0, r.z1]);
        }
        for p in [GRINDER, GRINDER_IN, GRINDER_OUT, GRILL, GRILL_IN, GRILL_OUT, COUNTER, COUNTER_IN, CASH] {
            l.extend_from_slice(&[p.0, p.1]);
        }
        for p in CONV1.iter().chain(CONV2.iter()) {
            l.extend_from_slice(&[p.0, p.1]);
        }
        l.extend_from_slice(&[QUEUE_X, QUEUE_Z0, QUEUE_GAP, ZONE_R]);
    }

    /// Serialises the whole visible state into a flat f32 buffer (see web/main.js `readState`).
    pub fn export(&mut self) -> &[f32] {
        let hero = self.hero();
        let cap = self.capacity();
        let max_hp = self.max_hp();
        let conv1 = self.has_conv1();
        let conv2 = self.has_conv2();
        let grill_period = self.grill_period();
        let region_hp = self.region_hp();
        let radius = self.camp_radius();
        let unlocked = self.unlocked_regions();
        let town_cost = self.town_cost();
        let district_export=self.world.export(self.player.x,self.player.z,self.money);
        let upgrade_records:Vec<f32>=(0..=16).flat_map(|kind|{
            let (level,costs,tier,enclosure,x,z)=self.upgrade_spec(kind).unwrap();
            let mut cost=costs.get(level as usize).copied().unwrap_or(0);
            if kind<=5 {cost=cost.saturating_sub(self.pads.iter().find(|p|p.kind as u32==kind).unwrap().paid);}
            [kind as f32,level as f32,costs.len() as f32,cost as f32,tier as f32,enclosure as f32,(level<costs.len() as u32 && (kind>5 || self.pads.iter().find(|p|p.kind as u32==kind).unwrap().visible)) as u8 as f32,self.can_upgrade(kind) as u8 as f32,x,z,if kind==8 && level<3 {[0.0,8.0,20.0][level as usize]} else {0.0},self.missing_dependency(kind) as f32]
        }).collect();
        let storage_cap=self.storage_cap();let contract_target=self.contract_target();let contract_reward=self.contract_reward();
        let contract_kind=self.contract_kind();let contract_region=self.contract_region();
        let elite=self.bears.iter().filter(|b|b.alive).enumerate().find(|(_,b)|b.elite).map(|(i,b)|(i as f32,b.hp)).unwrap_or((-1.0,0.0));
        let o = &mut self.out;
        o.clear();
        let p = &self.player;
        o.extend_from_slice(&[
            self.time,
            self.money as f32,
            p.x,
            p.z,
            p.angle,
            p.swing,
            hero as u8 as f32,
            p.stack as u8 as f32,
            p.stack_n as f32,
            cap as f32,
            (p.hp / max_hp).max(0.0),
            p.moving as u8 as f32,
            p.dead_t.max(0.0),
        ]);
        o.extend_from_slice(&[
            self.grinder_in as f32,
            self.grinder_out as f32,
            self.grind_t / 0.35,
            self.grill_in as f32,
            self.grill_out as f32,
            self.grill_t / grill_period,
            self.counter as f32,
            self.cash_pile as f32,
            conv1 as u8 as f32,
            conv2 as u8 as f32,
        ]);
        let alive = self.bears.iter().filter(|b| b.alive).count();
        o.push(alive as f32);
        for b in self.bears.iter().filter(|b| b.alive) {
            o.extend_from_slice(&[b.x, b.z, b.angle, b.hp / (region_hp*if b.elite {4.0} else {1.0}), b.flash, b.walk, b.moving as u8 as f32]);
        }
        o.push(self.meats.len() as f32);
        for m in &self.meats {
            o.extend_from_slice(&[m.x, m.z, m.age]);
        }
        o.push(self.conv1.len() as f32);
        o.extend(self.conv1.iter().map(|t| t.max(0.0)));
        o.push(self.conv2.len() as f32);
        o.extend(self.conv2.iter().copied());
        o.push(self.customers.len() as f32);
        for c in &self.customers {
            let st = match c.state {
                CState::Arriving => 0.0,
                CState::Waiting => 1.0,
                CState::Leaving => 2.0,
            };
            o.extend_from_slice(&[c.id as f32, c.x, c.z, c.angle, c.want as f32, c.got as f32, st, c.walk]);
        }
        o.push(self.pads.len() as f32);
        for pad in &self.pads {
            o.extend_from_slice(&[
                pad.kind as u8 as f32,
                pad.x,
                pad.z,
                pad.cost() as f32,
                pad.paid as f32,
                (pad.visible && !pad.maxed()) as u8 as f32,
                pad.level as f32,
            ]);
        }
        o.push((self.events.len() / 7) as f32);
        o.extend_from_slice(&self.events);
        self.events.clear();
        // Extension v2. Legacy records above retain their original strides.
        o.extend_from_slice(&[2.0,self.tier as f32,self.region as f32,unlocked as f32,radius,self.kills as f32,self.served as f32,self.essence as f32,town_cost as f32,alive as f32]);
        o.extend(self.bears.iter().filter(|b| b.alive).map(|_| self.region as f32));
        o.extend_from_slice(&[self.enclosure as f32,self.weapon as f32,self.dash_cd,self.grinder_level as f32,self.kitchen_level as f32,self.helper_level as f32]);
        o.extend(self.bears.iter().filter(|b| b.alive).map(|b| b.windup));
        o.extend(self.region_kills.iter().map(|n| *n as f32));
        o.extend_from_slice(&[3.0,self.buildings[0] as f32,self.buildings[1] as f32,self.buildings[2] as f32,self.buildings[3] as f32,self.buildings[4] as f32,storage_cap as f32,if self.buildings[2]>0 {self.farm_t/(8.0/self.buildings[2] as f32)} else {0.0},contract_target as f32,self.contract_progress as f32,contract_reward as f32,self.contracts_done as f32,self.workers.len() as f32]);
        for w in &self.workers {o.extend_from_slice(&[w.kind as f32,w.x,w.z,w.angle,w.task as f32,w.carried as f32,w.timer,w.level as f32]);}
        o.push(17.0);o.extend_from_slice(&upgrade_records);
        o.extend_from_slice(&[contract_kind as f32,contract_region as f32,(self.contracts_done/5) as f32,(elite.0>=0.0) as u8 as f32,elite.1,region_hp*4.0,elite.0,self.farm_stock as f32]);
        o.extend_from_slice(&district_export);
        &self.out
    }

    pub fn layout(&self) -> &[f32] {
        &self.layout
    }

    // ---- save / load (money + upgrade levels) -----------------------------

    pub fn save(&self) -> Vec<u32> {
        let mut v = vec![3, self.money];
        v.extend(self.pads.iter().map(|p| p.level));
        v.extend_from_slice(&[self.tier,self.region,self.enclosure,self.weapon,self.kills,self.served,self.essence,self.grinder_level,self.kitchen_level,self.helper_level]);
        v.extend(self.pads.iter().map(|p| p.paid));
        v.extend_from_slice(&self.region_kills);
        v.extend_from_slice(&self.buildings);
        v.extend_from_slice(&[self.farm_stock,self.contract_progress,self.contracts_done,(self.farm_t*1000.0) as u32]);
        v.push(self.workers.len() as u32);
        for w in &self.workers {v.extend_from_slice(&[w.kind,w.x.to_bits(),w.z.to_bits(),w.angle.to_bits(),w.task,w.carried,w.timer.to_bits(),w.level]);}
        v.extend_from_slice(&[self.grinder_in,self.grinder_out,self.grill_in+self.conv1.len() as u32,self.grill_out,self.counter+self.conv2.len() as u32,self.cash_pile,self.player.stack as u32,self.player.stack_n,self.player.x.to_bits(),self.player.z.to_bits()]);
        v
    }

    pub fn load(&mut self, v: &[u32]) {
        let legacy = v.len() == 8 && v.first() == Some(&1);
        let current = (v.len() == 24 || v.len() == 28) && v.first() == Some(&2);
        let newest=v.first()==Some(&3) && (v.len()==37 || (v.len()>=38 && v[37]<=8 && (v.len()==38+v[37] as usize*8 || v.len()==48+v[37] as usize*8)));
        if !legacy && !current && !newest { return; }
        self.money = v[1].min(100_000_000);
        for (i, lvl) in v[2..8].iter().enumerate() {
            let p = &mut self.pads[i];
            p.level = (*lvl).min(p.costs.len() as u32);
            p.paid = 0;
        }
        if current || newest {
            self.tier=v[8].min(4); self.enclosure=v[10].min(3); self.weapon=v[11].min(3);
            self.kills=v[12]; self.served=v[13]; self.essence=v[14];
            self.region_kills=if v.len()>=28 { [v[24],v[25],v[26],v[27]] } else {
                // Existing v2 saves have no regional breakdown. Preserve earned
                // town mastery, but do not invent mastery of the next frontier.
                let mut counts=[0;4]; for i in 0..self.tier as usize {counts[i]=3;} counts
            };
            self.grinder_level=v[15].min(4); self.kitchen_level=v[16].min(4); self.helper_level=v[17].min(3);
            let region=v[9].min(self.unlocked_regions()-1);
            self.travel(region);
            for (i,p) in self.pads.iter_mut().enumerate() { p.paid=v[18+i].min(p.cost().saturating_sub(1)); }
        }

        if newest {
            for i in 0..5 {self.buildings[i]=v[28+i].min(3);}
            self.farm_stock=v[33].min(self.storage_cap());self.contracts_done=v[35];
            self.contract_progress=v[34].min(self.contract_target()-1);self.farm_t=(v[36] as f32/1000.0).min(8.0);
        }
        self.workers.clear();self.sync_workers();
        if newest && v.len()>=38 {
            for (worker,record) in self.workers.iter_mut().zip(v[38..38+v[37] as usize*8].chunks_exact(8)) {
                let x=f32::from_bits(record[1]);let z=f32::from_bits(record[2]);let a=f32::from_bits(record[3]);let t=f32::from_bits(record[6]);
                if worker.kind==record[0] && x.is_finite() && z.is_finite() && a.is_finite() && t.is_finite() && x.abs()<=20.0 && (-44.0..=7.0).contains(&z) {
                    worker.x=x;worker.z=z;worker.angle=a;worker.task=record[4].min(4);worker.carried=record[5].min(8);worker.timer=t.clamp(0.0,2.0);
                }
            }
        }
        if newest && v.len()>=48 && v.len()==48+v[37] as usize*8 {
            let stock=&v[38+v[37] as usize*8..];let cap=self.storage_cap();
            self.grinder_in=stock[0].min(cap);self.grinder_out=stock[1].min(cap);self.grill_in=stock[2].min(cap);self.grill_out=stock[3].min(cap);self.counter=stock[4].min(cap);self.cash_pile=stock[5].min(1_000_000);self.conv1.clear();self.conv2.clear();
            self.player.stack=match stock[6] {1=>Item::Meat,2=>Item::Raw,3=>Item::Cooked,4=>Item::Cash,_=>Item::None};
            self.player.stack_n=stock[7].min(self.capacity());if self.player.stack==Item::None {self.player.stack_n=0;}
            let x=f32::from_bits(stock[8]);let z=f32::from_bits(stock[9]);if x.is_finite() && z.is_finite() && (self.camp().contains(x,z,0.5) || Self::walkable(x,z) || (x.abs()<18.0&&(20.0..=194.0).contains(&z))) {self.player.x=x;self.player.z=z;}
        }
        self.ensure_elite();
        // re-apply reveal chain
        let levels: Vec<(PadKind, u32)> = self.pads.iter().map(|p| (p.kind, p.level)).collect();
        for (k, l) in levels {
            if l == 0 {
                continue;
            }
            match k {
                PadKind::ConveyorA => {
                    self.reveal(PadKind::ConveyorB);
                    self.reveal(PadKind::Boots);
                }
                PadKind::ConveyorB => self.reveal(PadKind::Hero),
                PadKind::Hero => self.reveal(PadKind::Grill2),
                _ => {}
            }
        }
        self.player.hp = self.max_hp();
    }
}

// ---------------------------------------------------------------------------
// WebAssembly ABI (no wasm-bindgen: plain C exports, JS reads linear memory)
// ---------------------------------------------------------------------------

static mut GAME: Option<Game> = None;
static mut SAVE: [u32; 128] = [0; 128];
static mut WORLD_SAVE:[u32;4096]=[0;4096];

#[allow(static_mut_refs)]
fn game() -> &'static mut Game {
    unsafe { GAME.get_or_insert_with(|| Game::new(12345)) }
}

#[no_mangle]
pub extern "C" fn pc_init(seed: u32) {
    unsafe {
        GAME = Some(Game::new(seed));
    }
}

#[no_mangle]
pub extern "C" fn pc_district_upgrade(id:u32,kind:u32)->u32 {
    let g=game();g.world.base_mastered=g.grinder_level>=4&&g.kitchen_level>=4&&g.has_conv1()&&g.has_conv2()&&g.served>=20;
    g.world.upgrade(id as usize,kind,&mut g.money) as u32
}
#[no_mangle]
pub extern "C" fn pc_world_save_capacity()->u32 {4096}
#[no_mangle]
#[allow(static_mut_refs)]
pub extern "C" fn pc_world_save_ptr()->*mut u32 {unsafe {WORLD_SAVE.as_mut_ptr()}}
#[no_mangle]
#[allow(static_mut_refs)]
pub extern "C" fn pc_world_save()->u32 {
    let v=game().world.save();unsafe {for (i,x) in v.iter().enumerate().take(4096) {WORLD_SAVE[i]=*x;}}v.len().min(4096) as u32
}
#[no_mangle]
#[allow(static_mut_refs)]
pub extern "C" fn pc_world_load(len:u32)->u32 {
    let v=unsafe {WORLD_SAVE[..(len as usize).min(4096)].to_vec()};let g=game();
    let result=g.world.load(&v);g.world.carry_n=g.world.carry_n.min(g.capacity().saturating_sub(g.player.stack_n));g.world.base_mastered=g.grinder_level>=4&&g.kitchen_level>=4&&g.has_conv1()&&g.has_conv2()&&g.served>=20;result as u32
}

#[no_mangle]
pub extern "C" fn pc_upgrade(kind: u32) -> u32 { game().upgrade(kind) as u32 }
#[no_mangle]
pub extern "C" fn pc_travel(region: u32) -> u32 { game().travel(region) as u32 }
#[no_mangle]
pub extern "C" fn pc_dash() -> u32 { game().dash() as u32 }
#[no_mangle]
pub extern "C" fn pc_tick(dt: f32, ix: f32, iz: f32) {
    game().tick(dt, ix, iz);
}

/// Exports state; returns pointer, length via `pc_state_len`.
#[no_mangle]
pub extern "C" fn pc_state_ptr() -> *const f32 {
    game().export().as_ptr()
}

#[no_mangle]
pub extern "C" fn pc_state_len() -> u32 {
    game().out.len() as u32
}

#[no_mangle]
pub extern "C" fn pc_layout_ptr() -> *const f32 {
    game().layout().as_ptr()
}

#[no_mangle]
pub extern "C" fn pc_layout_len() -> u32 {
    game().layout().len() as u32
}

#[no_mangle]
#[allow(static_mut_refs)]
pub extern "C" fn pc_save_capacity()->u32 {128}

#[no_mangle]
#[allow(static_mut_refs)]
pub extern "C" fn pc_save_ptr() -> *mut u32 {
    unsafe { SAVE.as_mut_ptr() }
}

/// Writes the save into the SAVE buffer and returns its length.
#[no_mangle]
#[allow(static_mut_refs)]
pub extern "C" fn pc_save() -> u32 {
    let v = game().save();
    unsafe {
        for (i, x) in v.iter().enumerate().take(128) {
            SAVE[i] = *x;
        }
    }
    v.len().min(128) as u32
}

/// Loads `len` values previously written into the SAVE buffer by JS.
#[no_mangle]
#[allow(static_mut_refs)]
pub extern "C" fn pc_load(len: u32) {
    let v: Vec<u32> = unsafe { SAVE[..(len as usize).min(128)].to_vec() };
    game().load(&v);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn walk_to(g: &mut Game, x: f32, z: f32, max_t: f32) {
        let mut t = 0.0;
        while t < max_t {
            let (dx, dz) = (x - g.player.x, z - g.player.z);
            let d = (dx * dx + dz * dz).sqrt();
            if d < 0.3 {
                g.tick(0.1, 0.0, 0.0);
                return;
            }
            g.tick(1.0 / 60.0, dx / d, dz / d);
            t += 1.0 / 60.0;
        }
    }

    #[test]
    fn hunting_fills_stack_with_meat() {
        let mut g = Game::new(7);
        walk_to(&mut g, 0.0, -15.0, 10.0);
        // stay in the field swinging at whatever comes close
        for _ in 0..40 {
            let b = g.bears.iter().filter(|b| b.alive).min_by(|a, b| {
                dist(a.x, a.z, g.player.x, g.player.z).total_cmp(&dist(b.x, b.z, g.player.x, g.player.z))
            });
            let (bx, bz) = b.map(|b| (b.x, b.z)).unwrap();
            walk_to(&mut g, bx, bz, 2.0);
            for _ in 0..60 {
                g.tick(1.0 / 60.0, 0.0, 0.0);
            }
            if g.player.stack_n >= 3 {
                break;
            }
        }
        assert_eq!(g.player.stack, Item::Meat);
        assert!(g.player.stack_n >= 3, "stack {}", g.player.stack_n);
    }

    #[test]
    fn production_chain_pays_money() {
        let mut g = Game::new(3);
        g.player.stack = Item::Meat;
        g.player.stack_n = 5;
        walk_to(&mut g, GRINDER_IN.0, GRINDER_IN.1, 10.0);
        for _ in 0..200 {
            g.tick(1.0 / 60.0, 0.0, 0.0);
        }
        assert_eq!(g.player.stack_n, 0);
        assert_eq!(g.grinder_out, 10);
        walk_to(&mut g, GRINDER_OUT.0, GRINDER_OUT.1, 10.0);
        for _ in 0..60 {
            g.tick(1.0 / 60.0, 0.0, 0.0);
        }
        assert_eq!(g.player.stack, Item::Raw);
        assert_eq!(g.player.stack_n, 10);
        walk_to(&mut g, GRILL_IN.0, GRILL_IN.1, 10.0);
        for _ in 0..400 {
            g.tick(1.0 / 60.0, 0.0, 0.0);
        }
        assert_eq!(g.grill_out, 10);
        walk_to(&mut g, GRILL_OUT.0, GRILL_OUT.1, 10.0);
        for _ in 0..60 {
            g.tick(1.0 / 60.0, 0.0, 0.0);
        }
        assert_eq!(g.player.stack, Item::Cooked);
        walk_to(&mut g, COUNTER_IN.0, COUNTER_IN.1, 10.0);
        for _ in 0..60 * 30 {
            g.tick(1.0 / 60.0, 0.0, 0.0);
        }
        assert_eq!(g.counter, 0);
        let pending: u32 = g.customers.iter().filter(|c| c.state == CState::Waiting).map(|c| c.got).sum();
        assert_eq!(g.cash_pile + pending, 10);
        let pile = g.cash_pile;
        walk_to(&mut g, CASH.0, CASH.1, 10.0);
        for _ in 0..60 {
            g.tick(1.0 / 60.0, 0.0, 0.0);
        }
        assert_eq!(g.money, pile * BILL_VALUE);
    }

    #[test]
    fn pads_unlock_upgrades() {
        let mut g = Game::new(9);
        g.money = 1000;
        walk_to(&mut g, 3.0, -4.6, 10.0);
        for _ in 0..200 {
            g.tick(1.0 / 60.0, 0.0, 0.0);
        }
        assert!(g.has_conv1());
        // walking across the backpack pad on the way also spends some money
        let backpack_paid = g.pads.iter().find(|p| p.kind == PadKind::Backpack).unwrap().paid;
        let conveyor = g.pads.iter().find(|p| p.kind == PadKind::ConveyorA).unwrap();
        let spent: u32 = conveyor.costs.iter().take(conveyor.level as usize).sum();
        assert_eq!(g.money + backpack_paid + conveyor.paid + spent, 1000);
        assert!(g.pads.iter().find(|p| p.kind == PadKind::ConveyorB).unwrap().visible);
        // conveyor carries grinder output straight to the grill
        g.grinder_in = 2;
        for _ in 0..300 {
            g.tick(1.0 / 60.0, 0.0, 0.0);
        }
        assert_eq!(g.grinder_out, 0);
        assert!(g.grill_out >= 3);
    }

    #[test]
    fn save_roundtrip() {
        let mut g = Game::new(1);
        g.money = 55;
        g.pads[0].level = 1;
        let s = g.save();
        let mut h = Game::new(2);
        h.load(&s);
        assert_eq!(h.money, 55);
        assert!(h.has_conv1());
        assert!(h.pads.iter().find(|p| p.kind == PadKind::ConveyorB).unwrap().visible);
    }

    #[test]
    fn settlement_requires_hunts_and_unlocks_regions() {
        let mut g = Game::new(1); g.money=10_000;
        assert!(!g.travel(1)); assert!(!g.upgrade(6));
        g.kills=3; g.region_kills[0]=3; assert!(g.upgrade(6)); assert_eq!(g.money,9820);
        assert!(g.travel(1)); assert_eq!(g.region,1);
        assert!(g.bears.iter().all(|b| b.hp==5.0));
        assert!(!g.travel(2));
        g.kills=40; g.region_kills=[3;4];g.enclosure=3;g.buildings=[1,1,1,1,2];
        for _ in 0..3 { assert!(g.upgrade(6)); }
        assert!(g.travel(3)); assert!(!g.upgrade(6));
    }

    #[test]
    fn expansion_and_weapon_have_bounded_levels() {
        let mut g=Game::new(2); g.money=10_000; g.essence=100;
        for _ in 0..3 { assert!(g.upgrade(7)); assert!(g.upgrade(8)); }
        assert_eq!(g.camp_radius(),18.0);
        assert!(!g.upgrade(7)); assert!(!g.upgrade(8));
        g.player.x=10.0; g.player.z=0.0;
        g.tick(0.2,1.0,0.0); assert!(g.player.x>10.0);
    }

    #[test]
    fn progression_and_partial_payments_survive_save() {
        let mut g=Game::new(2); g.tier=3; g.kills=44; g.served=12; g.essence=80;
        g.enclosure=2; g.weapon=3; g.travel(2); g.pads[1].paid=17;
        let mut h=Game::new(3); h.load(&g.save());
        assert_eq!((h.tier,h.region,h.enclosure,h.weapon,h.kills,h.served,h.essence),(3,2,2,3,44,12,80));
        assert_eq!(h.pads[1].paid,17);
        h.load(&[1,42,1,0,0,0,0,0]); assert_eq!(h.money,42); assert!(h.has_conv1());
        let before=h.save(); h.load(&[2,999]); assert_eq!(h.save(),before);
    }

    #[test]
    fn dash_has_cooldown_and_finite_duration() {
        let mut g=Game::new(1); assert!(g.dash()); assert!(!g.dash());
        for _ in 0..16 {g.tick(0.25,0.0,0.0);}
        assert_eq!(g.dash_t,0.0); assert!(g.dash());
    }

    #[test]
    fn automation_moves_stock_and_collects_revenue() {
        let mut g=Game::new(1); g.helper_level=2;
        g.grinder_out=4; g.grill_out=4; g.cash_pile=3;
        for _ in 0..240 { g.tick(1.0/60.0,0.0,0.0); }
        assert_eq!(g.grinder_out,0); assert_eq!(g.grill_out,0);
        assert_eq!(g.cash_pile,0); assert_eq!(g.money,30);
        assert!(g.counter>0);
    }

    #[test]
    fn kitchen_upgrades_increase_actual_throughput() {
        let mut slow=Game::new(1); let mut fast=Game::new(1);
        slow.grinder_in=30; fast.grinder_in=30; fast.grinder_level=4;
        for _ in 0..120 {slow.tick(1.0/60.0,0.0,0.0);fast.tick(1.0/60.0,0.0,0.0);}
        assert!(fast.grinder_out>slow.grinder_out*2);
        slow.grill_in=20;fast.grill_in=20;fast.kitchen_level=4;
        for _ in 0..120 {slow.tick(1.0/60.0,0.0,0.0);fast.tick(1.0/60.0,0.0,0.0);}
        assert!(fast.grill_out>slow.grill_out);
    }

    #[test]
    fn enemy_attacks_telegraph_and_can_be_dodged() {
        let mut g=Game::new(1); g.travel(0); g.player.x=0.0;g.player.z=-20.0;
        for b in &mut g.bears { b.alive=false; b.respawn_t=100.0; }
        let b=&mut g.bears[0];b.alive=true;b.x=0.0;b.z=-21.2;b.aggro_t=4.0;b.attack_cd=0.0;
        let hp=g.player.hp; g.update_bears(0.1);
        assert_eq!(g.player.hp,hp); assert!(g.bears[0].windup>0.0);
        g.player.z=-17.0;
        for _ in 0..6 {g.update_bears(0.1);}
        assert_eq!(g.player.hp,hp,"escaping windup must avoid damage");
        g.bears[0].x=0.0;g.bears[0].z=-18.2;g.bears[0].attack_cd=0.0;g.bears[0].windup=0.1;
        assert!(g.dash());g.update_bears(0.11);
        assert_eq!(g.player.hp,hp,"dash must avoid pending impact");
        g.dash_t=0.0;g.bears[0].windup=0.1;g.update_bears(0.11);
        assert!(g.player.hp<hp,"undodged telegraph must resolve damage");
    }

    #[test]
    fn advanced_weapons_consume_hunting_essence() {
        let mut g=Game::new(1);g.money=1000;
        assert!(g.upgrade(8));assert!(!g.upgrade(8));
        g.essence=8; assert!(g.upgrade(8));assert_eq!(g.essence,0);
    }

    #[test]
    fn town_mastery_cannot_be_farmed_in_the_first_region() {
        let mut g=Game::new(1);g.money=10_000;g.enclosure=3;g.buildings=[1,1,1,1,2];g.kills=100;g.region_kills=[100,0,0,0];
        assert!(g.upgrade(6));assert!(!g.upgrade(6));
        g.region_kills[1]=3;assert!(g.upgrade(6));assert!(!g.upgrade(6));
        g.region_kills[2]=3;assert!(g.upgrade(6));assert!(!g.upgrade(6));
        g.region_kills[3]=3;assert!(g.upgrade(6));
        let mut h=Game::new(2);h.load(&g.save());assert_eq!(h.region_kills,g.region_kills);
        let mut previous=g.save();previous.truncate(24);previous[0]=2;h.load(&previous);
        assert_eq!(h.tier,4);assert_eq!(h.region_kills,[3;4]);
    }

    #[test]
    fn collectors_physically_retrieve_and_deliver_real_drops() {
        let mut g=Game::new(2);g.buildings[0]=1;
        g.meats=vec![Meat{x:0.0,z:-18.0,age:1.0},Meat{x:0.2,z:-18.0,age:1.0}];
        g.update_workers(0.1);assert_eq!(g.meats.len(),2);assert_eq!(g.grinder_in,0);
        for _ in 0..300 {g.update_workers(0.1);}
        assert_eq!(g.meats.len(),0);assert_eq!(g.grinder_in,2);
        assert!(g.workers[0].z>-8.0);
    }

    #[test]
    fn hunters_kill_actual_monsters_without_faking_mastery_or_inputs() {
        let mut g=Game::new(1);g.helper_level=3;
        for b in &mut g.bears {b.alive=false;}
        for _ in 0..100 {g.update_workers(0.1);}
        assert_eq!(g.grinder_in,0);assert_eq!(g.meats.len(),0);
        g.bears[0].alive=true;g.bears[0].hp=1.0;g.bears[0].x=0.0;g.bears[0].z=-16.0;
        for _ in 0..100 {g.update_workers(0.1);}
        assert!(!g.bears[0].alive);assert_eq!(g.meats.len(),1);
        assert_eq!(g.region_kills,[0;4]);assert_eq!(g.grinder_in,0);
    }

    #[test]
    fn buildings_are_gated_and_towns_need_specialized_services() {
        let mut g=Game::new(1);g.money=10_000;g.kills=40;g.region_kills=[3;4];
        assert!(g.upgrade(12));assert!(!g.upgrade(13));
        assert!(g.upgrade(6));assert!(!g.upgrade(6));assert_eq!(g.missing_dependency(6),7);
        assert!(g.upgrade(7));assert_eq!(g.missing_dependency(6),16);
        assert!(g.upgrade(16));assert!(g.upgrade(6));
        assert_eq!(g.storage_cap(),70);assert!(!g.upgrade(14));
        assert!(g.upgrade(7));assert!(g.upgrade(13));assert!(g.upgrade(14));assert!(g.upgrade(6));
    }

    #[test]
    fn farm_workers_deliver_renewable_harvest_and_contracts_vary() {
        let mut g=Game::new(1);g.tier=3;g.enclosure=3;g.buildings=[0,0,1,1,1];
        for _ in 0..400 {g.update_workers(0.1);}
        assert!(g.grinder_in>0);assert_eq!(g.contract_kind(),0);
        g.contract_add(0,g.contract_target());assert_eq!(g.contract_kind(),1);
        g.contract_add(0,1000);assert_eq!(g.contract_progress,0);
        g.contract_add(1,g.contract_target());assert_eq!(g.contract_kind(),2);
        g.contract_add(2,g.contract_target());assert_eq!(g.contract_kind(),3);
        g.contract_add(3,g.contract_target());assert_eq!(g.contract_kind(),4);
        assert!(g.bears.iter().any(|b|b.elite && b.alive));
        g.contract_add(4,1);assert_eq!(g.contract_kind(),0);assert_eq!(g.contracts_done,5);
        let mut h=Game::new(2);h.load(&g.save());assert_eq!(h.buildings,g.buildings);assert_eq!(h.contracts_done,5);
    }

    #[test]
    fn four_hour_industry_soak_is_bounded_and_active() {
        let mut g=Game::new(42);g.tier=4;g.enclosure=3;g.buildings=[3,3,3,3,3];g.helper_level=3;
        g.pads[0].level=3;g.pads[2].level=3;g.grinder_level=4;g.kitchen_level=4;
        for frame in 0..57_600 {
            g.tick(0.25,0.0,0.0);
            if frame%4==0 {
                let state=g.export();assert!(state.iter().all(|x|x.is_finite()));assert!(state.len()<10_000);
                let cap=g.storage_cap();assert!(g.grinder_in<=cap);assert!(g.grinder_out<=cap);
                assert!(g.grill_in+g.conv1.len() as u32<=cap);assert!(g.grill_out<=cap);
                assert!(g.counter+g.conv2.len() as u32<=cap);assert!(g.farm_stock<=cap);
                assert!(g.meats.len()<500);assert!(g.customers.len()<30);assert_eq!(g.workers.len(),8);
            }
        }
        assert!(g.served>100);assert!(g.kills>100);assert!(g.money>1000);
    }

    #[test]
    fn logistics_positions_and_carried_goods_survive_reload() {
        let mut g=Game::new(1);g.buildings=[1,1,1,1,1];g.sync_workers();
        g.workers[0].x=0.0;g.workers[0].z=-16.0;g.workers[0].carried=4;g.workers[0].task=2;
        let mut h=Game::new(2);h.load(&g.save());
        assert_eq!(h.workers[0].carried,4);assert_eq!(h.workers[0].z,-16.0);
        assert!(g.save().len()<=pc_save_capacity() as usize);
    }

    #[test]
    fn conveyor_purchase_preserves_full_stock_and_respects_unlocks() {
        let mut g=Game::new(1);g.money=10_000;g.grinder_out=30;g.grill_in=30;
        assert!(!g.upgrade(2));assert!(!g.upgrade(1));
        assert!(g.upgrade(0));assert_eq!(g.grinder_out+g.grill_in,60);assert_eq!(g.grill_in,30);
        g.grill_in=0;g.update_machines(0.01);assert!(g.grinder_out<30);assert!(g.conv1.len()>0);
        g.grill_out=30;g.counter=30;assert!(g.upgrade(1));assert_eq!(g.grill_out+g.counter,60);
        g.counter=0;g.update_machines(0.01);assert!(g.grill_out<30);assert!(g.conv2.len()>0);
    }

    #[test]
    fn reload_conserves_machine_goods_in_transit_and_player_inventory() {
        let mut g=Game::new(1);g.grinder_in=3;g.grinder_out=4;g.grill_in=5;g.grill_out=6;g.counter=7;g.cash_pile=8;
        g.conv1=vec![0.2,0.4];g.conv2=vec![0.6];g.player.stack=Item::Cooked;g.player.stack_n=9;
        let mut h=Game::new(2);h.load(&g.save());
        assert_eq!((h.grinder_in,h.grinder_out,h.grill_in,h.grill_out,h.counter,h.cash_pile),(3,4,7,6,8,8));
        assert_eq!(h.player.stack,Item::Cooked);assert_eq!(h.player.stack_n,9);
    }

    #[test]
    fn expanded_settlement_has_reachable_southern_neighborhoods() {
        let mut g=Game::new(1);g.enclosure=3;g.player.x=5.0;g.player.z=6.0;
        for _ in 0..300 {g.tick(0.1,0.0,1.0);}
        assert!(g.player.z>17.5,"expanded neighborhoods must be walkable");
        assert!(g.player.z<=18.1,"cannot cross the expanded southern fence");
        let mut base=Game::new(2);base.player.x=5.0;base.player.z=6.0;
        for _ in 0..100 {base.tick(0.1,0.0,1.0);}
        assert!(base.player.z<=6.1);
    }

    #[test]
    fn original_food_chain_direct_loot_uses_actual_kills_and_bounded_input() {
        let mut g=Game::new(1);g.world.districts[0].unlocked=true;g.world.districts[0].levels[6]=1;g.pads[0].level=1;
        g.player.x=0.0;g.player.z=-20.0;for b in &mut g.bears {b.alive=false;}
        g.bears[0].alive=true;g.bears[0].hp=0.5;g.bears[0].x=0.0;g.bears[0].z=-21.3;
        g.update_combat(0.1);assert_eq!(g.grinder_in,1);assert_eq!(g.meats.len(),0);
        g.grinder_in=g.storage_cap();g.bears[0].alive=true;g.bears[0].hp=0.5;g.player.attack_cd=0.0;
        g.update_combat(0.1);assert_eq!(g.grinder_in,g.storage_cap());assert_eq!(g.meats.len(),1);
    }

    #[test]
    fn district_and_original_carry_share_backpack_capacity() {
        let mut g=Game::new(1);g.world.carry_n=g.capacity();assert!(!g.give_to_player(Item::Raw));
        g.world.carry_n-=1;assert!(g.give_to_player(Item::Raw));assert!(!g.give_to_player(Item::Raw));
    }

    #[test]
    fn district_combat_uses_weapon_and_emits_existing_animation_events() {
        let mut weak=Game::new(1);weak.world.districts[4].unlocked=true;weak.player.x=-10.0;weak.player.z=113.0;
        let mut strong=Game::new(1);strong.world.districts[4].unlocked=true;strong.player.x=-10.0;strong.player.z=113.0;strong.weapon=3;strong.pads[4].level=1;
        weak.tick(0.1,0.0,0.0);strong.tick(0.1,0.0,0.0);
        let weak_hp=weak.world.monsters.iter().map(|m|m.hp).sum::<f32>();let strong_hp=strong.world.monsters.iter().map(|m|m.hp).sum::<f32>();
        assert!(strong_hp<weak_hp);assert!(strong.player.swing>=0.0);
        assert!(strong.events.chunks_exact(7).any(|e|e[0]==ev::SWING));
        let m=&mut weak.world.monsters[0];m.x=weak.player.x;m.z=weak.player.z-1.5;m.windup=0.01;
        weak.tick(0.1,0.0,0.0);assert!(weak.events.chunks_exact(7).any(|e|e[0]==ev::HURT));
    }

    #[test]
    fn export_is_consistent() {
        let mut g = Game::new(4);
        g.tick(0.5, 0.0, -1.0);
        let n = g.export().len();
        assert!(n > 13 + 10 + 1 + BEAR_COUNT * 7);
        assert_eq!(g.layout().len(), 12 + 18 + 8 + 4);
    }
}
