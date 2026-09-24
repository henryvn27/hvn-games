import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

class FakeClock {
  now = 0;
  nextId = 1;
  timers = new Map();

  setTimeout(callback, delay) {
    const id = this.nextId++;
    this.timers.set(id, {at: this.now + delay, callback});
    return id;
  }

  clearTimeout(id) { this.timers.delete(id); }

  advance(milliseconds) {
    const target = this.now + milliseconds;
    while (true) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (!due) break;
      const [id, timer] = due;
      this.timers.delete(id);
      this.now = timer.at;
      timer.callback();
    }
    this.now = target;
  }
}

const browser = {window: {}};
runInNewContext(readFileSync(new URL('./reaction-countdown.js', import.meta.url), 'utf8'), browser);
const {ReactionCountdown} = browser.window;

test('five lights illuminate sequentially before a variable wait and shared lights-out', () => {
  const clock = new FakeClock();
  const lights = [];
  let started = false;
  ReactionCountdown.start({
    schedule: clock.setTimeout.bind(clock),
    cancel: clock.clearTimeout.bind(clock),
    random: () => 0.5,
    onLight: (count) => lights.push({count, at: clock.now}),
    onStart: () => { started = true; },
  });

  clock.advance(2499);
  assert.deepEqual(lights.map(({count}) => count), [1, 2, 3, 4]);
  assert.equal(started, false);
  clock.advance(1);
  assert.deepEqual(lights.map(({count}) => count), [1, 2, 3, 4, 5]);
  assert.deepEqual(lights.map(({at}) => at), [500, 1000, 1500, 2000, 2500]);
  clock.advance(1749);
  assert.equal(started, false);
  clock.advance(1);
  assert.equal(started, true);
});

test('early input cancels the sequence; restarting schedules one fresh sequence', () => {
  const clock = new FakeClock();
  const lights = [];
  let starts = 0;
  const options = {
    schedule: clock.setTimeout.bind(clock),
    cancel: clock.clearTimeout.bind(clock),
    random: () => 0,
    onLight: (count) => lights.push(count),
    onStart: () => { starts += 1; },
  };
  const first = ReactionCountdown.start(options);
  clock.advance(1000);
  assert.deepEqual(lights, [1, 2]);
  assert.equal(ReactionCountdown.input('wait'), 'false-start');
  first.cancel();
  clock.advance(5000);
  assert.deepEqual(lights, [1, 2]);
  assert.equal(starts, 0);

  assert.equal(ReactionCountdown.input('ready'), 'arm');
  ReactionCountdown.start(options);
  clock.advance(4500);
  assert.deepEqual(lights, [1, 2, 1, 2, 3, 4, 5]);
  assert.equal(starts, 1);
  assert.equal(ReactionCountdown.input('go'), 'finish');
});
