import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Element } from '../../src/dom/index.js';
import {
  Animation,
  KeyframeEffect,
  AnimationTimeline,
} from '../../src/dom/animation.js';

describe('Web Animations API', () => {
  describe('element.animate()', () => {
    it('returns an Animation', () => {
      const el = new Element('div');
      const anim = el.animate([{ opacity: '0' }, { opacity: '1' }], {
        duration: 300,
      });
      assert.ok(anim instanceof Animation);
    });

    it('returned animation is in running state', () => {
      const el = new Element('div');
      const anim = el.animate([{ opacity: '0' }, { opacity: '1' }], {
        duration: 300,
      });
      assert.equal(anim.playState, 'running');
    });

    it('returned animation has effect with keyframes', () => {
      const el = new Element('div');
      const kf = [{ opacity: '0' }, { opacity: '1' }];
      const anim = el.animate(kf, { duration: 300 });
      assert.notEqual(anim.effect, null);
      const frames = anim.effect!.getKeyframes();
      assert.equal(frames.length, 2);
    });

    it('accepts duration as number', () => {
      const el = new Element('div');
      const anim = el.animate([{ opacity: '0' }], 500);
      assert.notEqual(anim.effect, null);
      const timing = anim.effect!.getTiming();
      assert.equal(timing.duration, 500);
    });
  });

  describe('element.getAnimations()', () => {
    it('returns empty array', () => {
      const el = new Element('div');
      assert.deepEqual(el.getAnimations(), []);
    });
  });

  describe('Animation states', () => {
    it('starts idle before play', () => {
      const effect = new KeyframeEffect(null, []);
      const anim = new Animation(effect);
      assert.equal(anim.playState, 'idle');
    });

    it('transitions to running on play', () => {
      const effect = new KeyframeEffect(null, []);
      const anim = new Animation(effect);
      anim.play();
      assert.equal(anim.playState, 'running');
    });

    it('transitions to finished on finish', () => {
      const effect = new KeyframeEffect(null, [], { duration: 100 });
      const anim = new Animation(effect);
      anim.play();
      anim.finish();
      assert.equal(anim.playState, 'finished');
    });

    it('currentTime is set to duration on finish', () => {
      const effect = new KeyframeEffect(null, [], { duration: 200 });
      const anim = new Animation(effect);
      anim.play();
      anim.finish();
      assert.equal(anim.currentTime, 200);
    });
  });

  describe('Animation play/pause/cancel/finish', () => {
    it('play sets currentTime to 0', () => {
      const anim = new Animation(new KeyframeEffect(null, []));
      anim.play();
      assert.equal(anim.currentTime, 0);
    });

    it('pause sets state to paused', () => {
      const anim = new Animation(new KeyframeEffect(null, []));
      anim.play();
      anim.pause();
      assert.equal(anim.playState, 'paused');
    });

    it('pause from idle does not change state', () => {
      const anim = new Animation(new KeyframeEffect(null, []));
      anim.pause();
      assert.equal(anim.playState, 'idle');
    });

    it('cancel resets to idle', () => {
      const anim = new Animation(new KeyframeEffect(null, []));
      anim.play();
      anim.cancel();
      assert.equal(anim.playState, 'idle');
      assert.equal(anim.currentTime, null);
      assert.equal(anim.startTime, null);
    });

    it('cancel fires oncancel callback', () => {
      const anim = new Animation(new KeyframeEffect(null, []));
      anim.play();
      let cancelFired = false;
      anim.oncancel = () => {
        cancelFired = true;
      };
      anim.cancel();
      assert.equal(cancelFired, true);
    });

    it('finish fires onfinish callback', () => {
      const anim = new Animation(
        new KeyframeEffect(null, [], { duration: 100 }),
      );
      anim.play();
      let finishFired = false;
      anim.onfinish = () => {
        finishFired = true;
      };
      anim.finish();
      assert.equal(finishFired, true);
    });

    it('reverse flips playbackRate', () => {
      const anim = new Animation(new KeyframeEffect(null, []));
      assert.equal(anim.playbackRate, 1);
      anim.reverse();
      assert.equal(anim.playbackRate, -1);
      anim.reverse();
      assert.equal(anim.playbackRate, 1);
    });
  });

  describe('KeyframeEffect', () => {
    it('stores keyframes', () => {
      const kf = [{ opacity: '0' }, { opacity: '1' }];
      const effect = new KeyframeEffect(null, kf);
      const frames = effect.getKeyframes();
      assert.equal(frames.length, 2);
      assert.deepEqual(frames[0], { opacity: '0' });
    });

    it('setKeyframes replaces keyframes', () => {
      const effect = new KeyframeEffect(null, [{ opacity: '0' }]);
      effect.setKeyframes([{ transform: 'scale(2)' }]);
      const frames = effect.getKeyframes();
      assert.equal(frames.length, 1);
      assert.deepEqual(frames[0], { transform: 'scale(2)' });
    });

    it('null keyframes results in empty array', () => {
      const effect = new KeyframeEffect(null, null);
      assert.deepEqual(effect.getKeyframes(), []);
    });

    it('stores target element', () => {
      const el = new Element('div');
      const effect = new KeyframeEffect(el, []);
      assert.equal(effect.target, el);
    });

    it('getTiming returns effect timing', () => {
      const effect = new KeyframeEffect(null, [], {
        duration: 300,
        delay: 50,
        easing: 'ease-in',
        iterations: 2,
        direction: 'alternate',
        fill: 'forwards',
      });
      const timing = effect.getTiming();
      assert.equal(timing.duration, 300);
      assert.equal(timing.delay, 50);
      assert.equal(timing.easing, 'ease-in');
      assert.equal(timing.iterations, 2);
      assert.equal(timing.direction, 'alternate');
      assert.equal(timing.fill, 'forwards');
    });

    it('getTiming returns defaults', () => {
      const effect = new KeyframeEffect(null, []);
      const timing = effect.getTiming();
      assert.equal(timing.duration, 0);
      assert.equal(timing.delay, 0);
      assert.equal(timing.easing, 'linear');
      assert.equal(timing.iterations, 1);
      assert.equal(timing.direction, 'normal');
      assert.equal(timing.fill, 'none');
    });

    it('duration as number option', () => {
      const effect = new KeyframeEffect(null, [], 500);
      const timing = effect.getTiming();
      assert.equal(timing.duration, 500);
    });

    it('updateTiming updates timing properties', () => {
      const effect = new KeyframeEffect(null, [], { duration: 100 });
      effect.updateTiming({ duration: 200, easing: 'ease-out' });
      const timing = effect.getTiming();
      assert.equal(timing.duration, 200);
      assert.equal(timing.easing, 'ease-out');
    });
  });

  describe('AnimationTimeline', () => {
    it('currentTime returns a number', () => {
      const timeline = new AnimationTimeline();
      assert.equal(typeof timeline.currentTime, 'number');
    });
  });

  describe('Animation.finished promise', () => {
    it('resolves on finish', async () => {
      const anim = new Animation(
        new KeyframeEffect(null, [], { duration: 100 }),
      );
      anim.play();
      anim.finish();
      const result = await anim.finished;
      assert.equal(result, anim);
    });
  });

  describe('Animation.ready promise', () => {
    it('resolves on play', async () => {
      const anim = new Animation(new KeyframeEffect(null, []));
      anim.play();
      const result = await anim.ready;
      assert.equal(result, anim);
    });
  });

  describe('Animation properties', () => {
    it('id defaults to empty string', () => {
      const anim = new Animation();
      assert.equal(anim.id, '');
    });

    it('id is settable', () => {
      const anim = new Animation();
      anim.id = 'my-animation';
      assert.equal(anim.id, 'my-animation');
    });

    it('effect is null when not provided', () => {
      const anim = new Animation();
      assert.equal(anim.effect, null);
    });

    it('timeline is created by default', () => {
      const anim = new Animation();
      assert.notEqual(anim.timeline, null);
    });
  });
});
