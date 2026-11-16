export const PHYS = {
  GRAVITY: 52,
  GRAVITY_HOLD: 30, // while rising + jump held
  FALL_MAX: 32,
  MOVE_SPEED: 8.7,
  ACCEL_GROUND: 74,
  ACCEL_AIR: 40,
  FRICTION_GROUND: 56,
  FRICTION_AIR: 7,
  JUMP_V: 17.3,
  BOUNCE: 12.6,
  BOUNCE_HELD: 16.4,
  COYOTE: 0.11,
  BUFFER: 0.14,
  HW: 0.33, // half width (x/z)
  HH: 0.68, // half height (y)  -> player is 1.36 tall, 0.66 wide
  STEP_UP: 0.62,
  SPIN_TIME: 0.46,
  SPIN_CD: 0.55,
  SPIN_RADIUS: 1.55,
  SLAM_RADIUS: 3.1,
  INVULN: 1.5,
  STAR_TIME: 7.5,
};

export const COLORS = {
  sky: 0x53c5f5,
  skyLow: 0xa9e9ff,
  fog: 0x7fd6f7,
  water: 0x1c7fa8,
  coin: 0xffc61a,
  coinDark: 0xd98a00,
  grass: 0x53c558,
  dirt: 0xb0703c,
  brick: 0xd9694a,
  stone: 0x9fb0bd,
  pipe: 0x22c07a,
  cloud: 0xfff6e6,
  crate: 0xc98b3f,
  spike: 0xdfe8ef,
  goomba: 0xa5682f,
  koopa: 0x2fbf6d,
  capRed: 0xe83c3c,
  overall: 0x2f5fd0,
  skin: 0xffcfa0,
  shoe: 0x6b3f21,
};

export const SCORE = {
  COIN: 100,
  KILL: 200,
  BLOCK: 150,
  STAR: 500,
  ONEUP: 1000,
  CHECKPOINT: 300,
  CLEAR: 3000,
  LIFE_BONUS: 800,
  FLAG: 1500,
};

export const COMBO_MULT = [1, 2, 3, 5, 8, 12];
