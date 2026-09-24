(function (root) {
  'use strict';

  const LIGHT_COUNT = 5;

  function input(state) {
    if (state === 'ready') return 'arm';
    if (state === 'wait') return 'false-start';
    if (state === 'go') return 'finish';
    return 'none';
  }

  function start(options = {}) {
    const schedule = options.schedule || setTimeout;
    const cancel = options.cancel || clearTimeout;
    const random = options.random || Math.random;
    const interval = options.interval ?? 500;
    const minimumWait = options.minimumWait ?? 1000;
    const maximumWait = options.maximumWait ?? 2500;
    const timers = new Set();
    let litCount = 0;
    let cancelled = false;

    function later(callback, delay) {
      const timer = schedule(() => {
        timers.delete(timer);
        if (!cancelled) callback();
      }, delay);
      timers.add(timer);
    }

    function illuminateNext() {
      if (cancelled) return;
      litCount += 1;
      options.onLight?.(litCount);
      if (litCount < LIGHT_COUNT) {
        later(illuminateNext, interval);
      } else {
        const delay = minimumWait + random() * (maximumWait - minimumWait);
        later(() => options.onStart?.(), delay);
      }
    }

    later(illuminateNext, interval);
    return Object.freeze({
      cancel() {
        if (cancelled) return;
        cancelled = true;
        for (const timer of timers) cancel(timer);
        timers.clear();
      },
      get litCount() { return litCount; },
    });
  }

  root.ReactionCountdown = Object.freeze({ LIGHT_COUNT, input, start });
})(window);
