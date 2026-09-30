//! Polar Camp — simulation core.
//!
//! All gameplay rules live here (movement, combat, production chain, customers,
//! economy, upgrades). The crate compiles to a dependency-free WebAssembly
//! module; the three.js front-end only renders what this module exports.
//!
//! Loop (reverse-engineered from the Whiteout Survival mini-game):
//!   hunt bears -> carry meat -> grinder -> raw slices -> grill -> cooked steaks
//!   -> counter -> customers pay -> collect cash -> buy upgrades on floor pads.

use std::f32::consts::PI;

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

pub struct Game {
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
                Pad { kind: PadKind::ConveyorA, x: 3.0, z: -4.6, costs: &[140], level: 0, paid: 0, visible: true },
                Pad { kind: PadKind::Backpack, x: 1.2, z: -0.8, costs: &[60, 220, 550], level: 0, paid: 0, visible: true },
                Pad { kind: PadKind::ConveyorB, x: 5.8, z: -1.6, costs: &[200], level: 0, paid: 0, visible: false },
                Pad { kind: PadKind::Boots, x: -2.0, z: 1.8, costs: &[150, 450], level: 0, paid: 0, visible: false },
                Pad { kind: PadKind::Hero, x: 5.8, z: 2.2, costs: &[400], level: 0, paid: 0, visible: false },
                Pad { kind: PadKind::Grill2, x: -1.0, z: -3.2, costs: &[350], level: 0, paid: 0, visible: false },
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
        if self.hero() { 180.0 } else { 100.0 }
    }
    fn has_conv1(&self) -> bool {
        self.pad_level(PadKind::ConveyorA) > 0
    }
    fn has_conv2(&self) -> bool {
        self.pad_level(PadKind::ConveyorB) > 0
    }
    fn grill_period(&self) -> f32 {
        if self.pad_level(PadKind::Grill2) > 0 { 0.22 } else { 0.45 }
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
        self.update_player(dt, ix, iz);
        self.update_bears(dt);
        self.update_combat(dt);
        self.update_meat_pickup(dt);
        self.update_transfers(dt);
        self.update_machines(dt);
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
        let sp = self.speed();
        let p = &mut self.player;
        p.moving = len > 0.08;
        if p.moving {
            let nx = p.x + dx * sp * dt;
            let nz = p.z + dz * sp * dt;
            if Game::walkable(nx, nz) {
                p.x = nx;
                p.z = nz;
            } else if Game::walkable(nx, p.z) {
                p.x = nx;
            } else if Game::walkable(p.x, nz) {
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
        let in_camp = CAMP.contains(p.x, p.z, 0.0);
        let regen = if in_camp { 30.0 } else if p.since_hurt > 2.0 { 10.0 } else { 0.0 };
        let max = if self.pads.iter().any(|q| q.kind == PadKind::Hero && q.level > 0) { 180.0 } else { 100.0 };
        p.hp = (p.hp + regen * dt).min(max);
    }

    fn update_bears(&mut self, dt: f32) {
        let (px, pz) = (self.player.x, self.player.z);
        let player_alive = self.player.dead_t <= 0.0;
        let player_in_field = FIELD.contains(px, pz, -1.0);
        let mut hurt = 0.0;
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
                    b.hp = BEAR_HP;
                    b.alive = true;
                    b.aggro_t = 0.0;
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
            if b.aggro_t > 0.0 && player_alive && player_in_field {
                tx = px;
                tz = pz;
                speed = 2.3;
                if dp < 1.45 && b.attack_cd <= 0.0 {
                    b.attack_cd = 1.6;
                    hurt += 4.0;
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
            b.moving = d > 1.1;
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
        let dmg = if hero { 2.0 } else { 1.0 };
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
            let (bx, bz, ba) = (b.x, b.z, b.angle);
            self.push_event([ev::BEAR_DIE, bx, bz, ba, 0.0, 0.0, 0.0]);
            self.meats.push(Meat { x: bx, z: bz, age: 0.0 });
        }
    }

    fn update_meat_pickup(&mut self, dt: f32) {
        let cap = self.capacity();
        let alive = self.player.dead_t <= 0.0;
        let (px, pz) = (self.player.x, self.player.z);
        let mut i = 0;
        while i < self.meats.len() {
            self.meats[i].age += dt;
            let m = &self.meats[i];
            let can = alive
                && (self.player.stack == Item::None || self.player.stack == Item::Meat)
                && self.player.stack_n < cap
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
        if (p.stack == Item::None || p.stack == kind) && p.stack_n < self.capacity() {
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
        if self.near(GRINDER_IN) && self.take_from_player(Item::Meat) {
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
        if self.near(GRILL_IN) && self.take_from_player(Item::Raw) {
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
        if self.near(COUNTER_IN) && self.take_from_player(Item::Cooked) {
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
        // grinder: 1 meat -> 2 raw slices
        if self.grinder_in > 0 {
            self.grind_t += dt;
            if self.grind_t >= 0.35 {
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
        let conv1_speed = 0.9;
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
        if self.grill_in > 0 {
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
        self.conv2.retain_mut(|t| {
            *t += dt * 0.8;
            if *t >= 1.0 {
                arrived += 1;
                false
            } else {
                true
            }
        });
        self.counter += arrived;
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
                self.serve_t = 0.18;
                let (cx, cz) = (self.customers[i].x, self.customers[i].z);
                self.fly(Item::Cooked, COUNTER.0, COUNTER.1 - 0.2, cx, cz, false);
            }
            let c = &mut self.customers[i];
            if c.got >= c.want && self.serve_t <= 0.0 {
                c.state = CState::Leaving;
                c.leave_step = 0;
                let bills = c.want * STEAK_PRICE_BILLS;
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
                    let n = self.grinder_out;
                    self.grinder_out = 0;
                    self.grill_in += n;
                    self.reveal(PadKind::ConveyorB);
                    self.reveal(PadKind::Boots);
                }
                PadKind::ConveyorB => {
                    let n = self.grill_out;
                    self.grill_out = 0;
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
            o.extend_from_slice(&[b.x, b.z, b.angle, b.hp / BEAR_HP, b.flash, b.walk, b.moving as u8 as f32]);
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
        &self.out
    }

    pub fn layout(&self) -> &[f32] {
        &self.layout
    }

    // ---- save / load (money + upgrade levels) -----------------------------

    pub fn save(&self) -> Vec<u32> {
        let mut v = vec![1, self.money];
        v.extend(self.pads.iter().map(|p| p.level));
        v
    }

    pub fn load(&mut self, v: &[u32]) {
        if v.len() != 2 + self.pads.len() || v[0] != 1 {
            return;
        }
        self.money = v[1];
        for (i, lvl) in v[2..].iter().enumerate() {
            let p = &mut self.pads[i];
            p.level = (*lvl).min(p.costs.len() as u32);
        }
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
static mut SAVE: [u32; 16] = [0; 16];

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
pub extern "C" fn pc_save_ptr() -> *mut u32 {
    unsafe { SAVE.as_mut_ptr() }
}

/// Writes the save into the SAVE buffer and returns its length.
#[no_mangle]
#[allow(static_mut_refs)]
pub extern "C" fn pc_save() -> u32 {
    let v = game().save();
    unsafe {
        for (i, x) in v.iter().enumerate().take(16) {
            SAVE[i] = *x;
        }
    }
    v.len().min(16) as u32
}

/// Loads `len` values previously written into the SAVE buffer by JS.
#[no_mangle]
#[allow(static_mut_refs)]
pub extern "C" fn pc_load(len: u32) {
    let v: Vec<u32> = unsafe { SAVE[..(len as usize).min(16)].to_vec() };
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
        assert_eq!(g.money + backpack_paid, 860);
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
    fn export_is_consistent() {
        let mut g = Game::new(4);
        g.tick(0.5, 0.0, -1.0);
        let n = g.export().len();
        assert!(n > 13 + 10 + 1 + BEAR_COUNT * 7);
        assert_eq!(g.layout().len(), 12 + 18 + 8 + 4);
    }
}
