/** Explicit clock state, independent from the editor and requestAnimationFrame. */
export class Transport {
  time = 0;
  playing = false;
  speed = 1;
  loop = true;
  from = 0;
  to = 0;
  last = 0;
  setTimeline(timeline) {
    this.last = timeline.last;
    this.from = 0;
    this.to = timeline.duration;
    this.seek(0);
    this.playing = false;
  }
  seek(value) {
    this.time = Math.max(0, Math.min(this.last, value));
    return this.time;
  }
  range(from, to) {
    this.from = from;
    this.to = to;
  }
  play(on) {
    if (
      on &&
      (this.time < this.from || this.time >= Math.min(this.to, this.last))
    )
      this.seek(this.from);
    this.playing = on;
  }
  advance(seconds) {
    if (!this.playing) return this.time;
    const next = this.time + seconds * this.speed;
    if (next >= this.to) {
      if (this.loop)
        this.time = this.from + ((next - this.from) % (this.to - this.from));
      else {
        this.time = Math.min(this.to, this.last);
        this.playing = false;
      }
    } else this.time = next;
    return Math.min(this.time, this.last);
  }
}
