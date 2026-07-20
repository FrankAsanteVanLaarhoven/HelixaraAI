/**
 * Physics priors for Worldview AI — classical kinematics / gravity / collision
 * used as inductive bias (not a full multiphysics engine).
 */

export const G = 9.80665; // m/s²

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RigidBodyState {
  id: string;
  position: Vec3;
  velocity: Vec3;
  mass: number; // kg
  radius: number; // m (sphere approx)
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function len(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function normalize(a: Vec3): Vec3 {
  const l = len(a) || 1;
  return scale(a, 1 / l);
}

/** Euler integration under constant gravity (y-up) */
export function stepGravity(
  body: RigidBodyState,
  dt: number,
  groundY = 0
): RigidBodyState {
  const gAcc = { x: 0, y: -G, z: 0 };
  let velocity = add(body.velocity, scale(gAcc, dt));
  let position = add(body.position, scale(velocity, dt));
  // ground contact
  if (position.y - body.radius < groundY) {
    position = { ...position, y: groundY + body.radius };
    velocity = {
      x: velocity.x * 0.85,
      y: -velocity.y * 0.35,
      z: velocity.z * 0.85,
    };
    if (Math.abs(velocity.y) < 0.15) velocity = { ...velocity, y: 0 };
  }
  return { ...body, position, velocity };
}

export function elasticSphereCollision(
  a: RigidBodyState,
  b: RigidBodyState
): [RigidBodyState, RigidBodyState] {
  const delta = sub(b.position, a.position);
  const dist = len(delta);
  const minDist = a.radius + b.radius;
  if (dist >= minDist || dist < 1e-9) return [a, b];

  const n = normalize(delta);
  const rv = sub(b.velocity, a.velocity);
  const velAlongNormal = rv.x * n.x + rv.y * n.y + rv.z * n.z;
  if (velAlongNormal > 0) return [a, b];

  const e = 0.6;
  const j = (-(1 + e) * velAlongNormal) / (1 / a.mass + 1 / b.mass);
  const impulse = scale(n, j);
  const a2 = {
    ...a,
    velocity: sub(a.velocity, scale(impulse, 1 / a.mass)),
  };
  const b2 = {
    ...b,
    velocity: add(b.velocity, scale(impulse, 1 / b.mass)),
  };
  // separate overlap
  const overlap = minDist - dist;
  const corr = scale(n, overlap / 2);
  return [
    { ...a2, position: sub(a2.position, corr) },
    { ...b2, position: add(b2.position, corr) },
  ];
}

export function simulateScene(
  bodies: RigidBodyState[],
  seconds: number,
  hz = 30
): { t: number; bodies: RigidBodyState[] }[] {
  const dt = 1 / hz;
  const steps = Math.max(1, Math.floor(seconds * hz));
  let state = bodies.map((b) => ({ ...b, position: { ...b.position }, velocity: { ...b.velocity } }));
  const frames: { t: number; bodies: RigidBodyState[] }[] = [];
  for (let i = 0; i <= steps; i++) {
    frames.push({
      t: i * dt,
      bodies: state.map((b) => ({
        ...b,
        position: { ...b.position },
        velocity: { ...b.velocity },
      })),
    });
    state = state.map((b) => stepGravity(b, dt));
    for (let i1 = 0; i1 < state.length; i1++) {
      for (let i2 = i1 + 1; i2 < state.length; i2++) {
        const [a, b] = elasticSphereCollision(state[i1], state[i2]);
        state[i1] = a;
        state[i2] = b;
      }
    }
  }
  return frames;
}

/** Optical-flow-ish motion energy from sequential brightness samples */
export function motionEnergy(samples: number[]): number {
  if (samples.length < 2) return 0;
  let e = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i] - samples[i - 1];
    e += d * d;
  }
  return e / (samples.length - 1);
}

/** Project world point to simple pinhole pixel */
export function projectPinhole(
  p: Vec3,
  fx = 800,
  fy = 800,
  cx = 640,
  cy = 360
): { u: number; v: number; depth: number } | null {
  if (p.z <= 0.01) return null;
  return {
    u: fx * (p.x / p.z) + cx,
    v: fy * (p.y / p.z) + cy,
    depth: p.z,
  };
}
