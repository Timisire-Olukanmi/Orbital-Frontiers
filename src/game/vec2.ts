export class Vec2 {
  constructor(public x: number, public y: number) {}
  add(v: Vec2) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v: Vec2) { return new Vec2(this.x - v.x, this.y - v.y); }
  mult(n: number) { return new Vec2(this.x * n, this.y * n); }
  div(n: number) { return new Vec2(this.x / n, this.y / n); }
  magSq() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.sqrt(this.magSq()); }
  normalize() { const m = this.mag(); return m === 0 ? new Vec2(0,0) : this.div(m); }
  dot(v: Vec2) { return this.x * v.x + this.y * v.y; }
  copy() { return new Vec2(this.x, this.y); }
  distance(v: Vec2) { return this.sub(v).mag(); }
}
