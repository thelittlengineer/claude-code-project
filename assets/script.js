/* Mawqi — scroll-driven landmark hero + site motion.
   Everything here is transform and opacity only, delta gated, and reversible. */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  var smoothstep = function (p, e0, e1) {
    var t = clamp((p - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  var yr = doc.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------- top bar ---------------- */
  var topbar = doc.querySelector('.topbar');
  var burger = doc.querySelector('.burger');
  var menu = doc.getElementById('menu');
  var solid = false;

  function barState() {
    var want = window.scrollY > 24;
    if (want !== solid) { solid = want; topbar.classList.toggle('solid', want); }
  }
  addEventListener('scroll', barState, { passive: true });
  barState();

  var onResize = null;   // wired once the hero drive exists
  addEventListener('resize', function () { if (onResize) onResize(); }, { passive: true });

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
      }
    });
  }

  /* ---------------- drifting motes ---------------- */
  var motes = doc.getElementById('motes');
  if (motes) {
    var frag = doc.createDocumentFragment();
    for (var m = 0; m < 26; m++) {
      var i = doc.createElement('i');
      i.style.left = (Math.random() * 100).toFixed(2) + '%';
      i.style.top = (Math.random() * 100).toFixed(2) + '%';
      i.style.animationDuration = (13 + Math.random() * 17).toFixed(1) + 's';
      i.style.animationDelay = '-' + (Math.random() * 24).toFixed(1) + 's';
      i.style.opacity = (0.18 + Math.random() * 0.42).toFixed(2);
      var s = (1 + Math.random() * 1.8).toFixed(1);
      i.style.width = s + 'px'; i.style.height = s + 'px';
      frag.appendChild(i);
    }
    motes.appendChild(frag);
  }

  /* ---------------- split the hero headlines once, at load ---------------- */
  function splitLines() {
    doc.querySelectorAll('.band .line').forEach(function (el) {
      var mode = el.getAttribute('data-split');
      var text = el.textContent.trim();
      if (mode === 'word') {
        var words = text.split(/\s+/);
        el.textContent = '';
        var sr = doc.createElement('span');
        sr.className = 'visually-hidden';
        sr.textContent = text;
        el.appendChild(sr);
        var vis = doc.createElement('span');
        vis.setAttribute('aria-hidden', 'true');
        words.forEach(function (w, n) {
          var sp = doc.createElement('span');
          sp.className = 'w';
          sp.textContent = n === words.length - 1 ? w : w + ' ';
          sp.style.setProperty('--th', (n / Math.max(1, words.length) * 0.42).toFixed(3));
          vis.appendChild(sp);
        });
        el.appendChild(vis);
      } else if (mode === 'half') {
        var ws = text.split(/\s+/);
        var cut = Math.ceil(ws.length / 2);
        el.textContent = '';
        var sr2 = doc.createElement('span');
        sr2.className = 'visually-hidden';
        sr2.textContent = text;
        el.appendChild(sr2);
        var vis2 = doc.createElement('span');
        vis2.setAttribute('aria-hidden', 'true');
        [[ws.slice(0, cut).join(' ') + ' ', -1], [ws.slice(cut).join(' '), 1]].forEach(function (pair) {
          var h = doc.createElement('span');
          h.className = 'half';
          h.textContent = pair[0];
          h.style.setProperty('--dir', pair[1]);
          vis2.appendChild(h);
        });
        el.appendChild(vis2);
      } else if (el.closest('[data-fx="focus"]')) {
        el.textContent = '';
        var stack = doc.createElement('span');
        stack.className = 'stack';
        var soft = doc.createElement('span');
        soft.className = 'soft';
        soft.setAttribute('aria-hidden', 'true');
        soft.textContent = text;
        var sharp = doc.createElement('span');
        sharp.className = 'sharp';
        sharp.textContent = text;
        stack.appendChild(soft);
        stack.appendChild(sharp);
        el.appendChild(stack);
      }
    });
  }
  splitLines();

  /* ---------------- the hero drive ---------------- */
  var hero = doc.getElementById('hero');
  var stage = doc.getElementById('stage');
  var sky = doc.getElementById('sky');
  var cue = doc.getElementById('cue');
  var bands = [].slice.call(doc.querySelectorAll('.band')).map(function (el, n, all) {
    return {
      el: el,
      a: parseFloat(el.getAttribute('data-a')),
      b: parseFloat(el.getAttribute('data-b')),
      first: n === 0,
      last: n === all.length - 1,
      op: -1, k: -1, live: null
    };
  });

  var target = 0, shown = 0, rafId = null, lastTick = 0;
  var lastP = -1, cueGone = null;
  var heroOnScreen = true;
  var scrubOn = false;
  var loadK = 0, loadStart = 0;

  function heroProgress() {
    if (!hero) return 0;
    var range = hero.offsetHeight - window.innerHeight;
    if (range <= 0) return 0;
    return clamp(window.scrollY / range, 0, 1);
  }

  function paint(p) {
    if (Math.abs(p - lastP) > 0.0007 || p === 0 || p === 1) {
      lastP = p;
      sky.style.setProperty('--p', p.toFixed(4));
    }
    var wantGone = p > 0.03;
    if (wantGone !== cueGone) { cueGone = wantGone; if (cue) cue.classList.toggle('gone', wantGone); }

    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var f = Math.min(0.02, (b.b - b.a) / 3);
      // the first band opens already settled, the last one never fades out
      var fadeIn = b.first ? 1 : smoothstep(p, b.a, b.a + f);
      var fadeOut = b.last ? 1 : 1 - smoothstep(p, b.b - f, b.b);
      var op = fadeIn * fadeOut;

      var ramp = Math.min(0.025, (b.b - b.a) * 0.35);
      var k = clamp((p - b.a) / ramp, 0, 1);
      if (b.first) k = Math.max(k, loadK);

      if (Math.abs(op - b.op) > 0.004) {
        b.op = op;
        b.el.style.opacity = op.toFixed(3);
      }
      if (Math.abs(k - b.k) > 0.008) {
        b.k = k;
        b.el.style.setProperty('--k', k.toFixed(3));
      }
      var live = op > 0.06;
      if (live !== b.live) { b.live = live; b.el.classList.toggle('live', live); }
    }
  }

  function tick(now) {
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;

    if (loadK < 1) {
      if (!loadStart) loadStart = now;
      loadK = clamp((now - loadStart) / 1100, 0, 1);
      loadK = loadK * loadK * (3 - 2 * loadK);
    }

    var kk = 0.16;
    shown += (target - shown) * (1 - Math.pow(1 - kk, dt / 16.667));
    var settled = Math.abs(target - shown) < 0.0005;
    if (settled) { shown = target; }

    paint(shown);

    if (settled && loadK >= 1) { rafId = null; lastTick = 0; }
    else rafId = requestAnimationFrame(tick);
  }

  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOnScreen && scrubOn) rafId = requestAnimationFrame(tick);
  }

  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      heroOnScreen = es[0].isIntersecting;
      if (heroOnScreen && scrubOn && rafId === null) rafId = requestAnimationFrame(tick);
    }, { rootMargin: '80px' }).observe(hero);
  }

  /* ---------------- the static hero gate: five queries, matched to the CSS ---------------- */
  var GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  var MQLS = GATES.map(function (q) { return matchMedia(q); });

  function enableScrub() {
    if (scrubOn || !hero) return;
    scrubOn = true;
    loadK = 0; loadStart = 0;
    bands.forEach(function (b) { b.op = -1; b.k = -1; b.live = null; });
    lastP = -1; cueGone = null;
    unpin();
    addEventListener('scroll', onScroll, { passive: true });
    target = shown = heroProgress();
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    removeEventListener('scroll', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    lastTick = 0;
    if (sky) sky.style.removeProperty('--p');
    bands.forEach(function (b) {
      b.el.style.removeProperty('opacity');
      b.el.style.removeProperty('--k');
      b.el.classList.remove('live');
      b.op = -1; b.k = -1; b.live = null;
    });
    lastP = -1;
  }

  function applyHeroMode() {
    var gated = MQLS.some(function (m) { return m.matches; });
    if (gated) disableScrub(); else enableScrub();
  }
  MQLS.forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', applyHeroMode);
    else if (m.addListener) m.addListener(applyHeroMode);
  });
  onResize = function () { if (scrubOn) onScroll(); };
  applyHeroMode();

  /* ---------------- section entrances ---------------- */
  var reveals = [].slice.call(doc.querySelectorAll('.sec, .divider'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('in');
        io.unobserve(el);
        setTimeout(function () { el.classList.add('done'); }, 1900);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in', 'done'); });
  }

  /* ---------------- the one interactive moment: plant the star ---------------- */
  var plantbtn = doc.getElementById('plantbtn');
  var placeSec = doc.getElementById('place');
  var gains = doc.getElementById('gains');
  var hold = 0, holding = false, holdRaf = null, holdLast = 0, planted = false;
  var gainEls = gains ? [].slice.call(gains.children) : [];

  function lightGains(n) {
    for (var i = 0; i < gainEls.length; i++) gainEls[i].classList.toggle('lit', i < n);
  }

  function holdTick(now) {
    var dt = Math.min(100, now - (holdLast || now));
    holdLast = now;
    var speed = holding ? 0.00092 : -0.0016;
    hold = clamp(hold + speed * dt, 0, 1);
    plantbtn.style.setProperty('--h', hold.toFixed(3));
    lightGains(Math.floor(hold * 3.001));

    if (hold >= 1 && !planted) {
      planted = true;
      placeSec.classList.add('planted');
      doc.getElementById('planthint').textContent = 'Planted.';
    }
    // once it is planted it stays planted: the visitor earned it
    if (planted) {
      hold = 1;
      plantbtn.style.setProperty('--h', '1');
      lightGains(3);
      holdRaf = null; holdLast = 0; holding = false;
      return;
    }
    if ((holding && hold < 1) || (!holding && hold > 0)) holdRaf = requestAnimationFrame(holdTick);
    else { holdRaf = null; holdLast = 0; }
  }

  function startHold(e) {
    if (planted) return;
    if (e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
    if (e.type === 'keydown' && e.repeat) return;
    if (e.cancelable) e.preventDefault();
    holding = true;
    if (holdRaf === null) holdRaf = requestAnimationFrame(holdTick);
  }
  function endHold() {
    holding = false;
    if (holdRaf === null && hold > 0) holdRaf = requestAnimationFrame(holdTick);
  }

  if (plantbtn) {
    plantbtn.addEventListener('pointerdown', startHold);
    addEventListener('pointerup', endHold);
    addEventListener('pointercancel', endHold);
    plantbtn.addEventListener('pointerleave', endHold);
    plantbtn.addEventListener('keydown', startHold);
    plantbtn.addEventListener('keyup', endHold);
    plantbtn.addEventListener('blur', endHold);
  }

  /* ---------------- the booking section must never be an empty box ---------------- */
  var jfSlot = doc.getElementById('JFWebsiteWidget-01a0630f7ad070008b1a46e6b41426f540f2');
  var bookFallback = doc.getElementById('bookfallback');
  if (jfSlot && bookFallback) {
    var checks = 0;
    var watchWidget = setInterval(function () {
      checks++;
      var loaded = jfSlot.childNodes.length > 0 || jfSlot.offsetHeight > 40;
      if (loaded) { bookFallback.hidden = true; clearInterval(watchWidget); }
      else if (checks >= 8) { bookFallback.hidden = false; clearInterval(watchWidget); }
    }, 600);
  }

  /* ---------------- reduced motion, honoured live in both directions ---------------- */
  function pinToFinalStates() {
    body.classList.add('pinned');
    reveals.forEach(function (el) { el.classList.add('in', 'done'); });
    if (plantbtn) {
      holding = false;
      if (holdRaf !== null) { cancelAnimationFrame(holdRaf); holdRaf = null; }
      hold = 1;
      plantbtn.style.setProperty('--h', '1');
      lightGains(3);
      if (!planted) {
        planted = true;
        placeSec.classList.add('planted');
        doc.getElementById('planthint').textContent = 'Planted.';
      }
    }
  }
  function unpin() {
    body.classList.remove('pinned');
    if (plantbtn && !planted) plantbtn.style.removeProperty('--h');
  }

  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  function onMotionFlip(e) {
    if (e.matches) { pinToFinalStates(); disableScrub(); }
    else { applyHeroMode(); }
  }
  if (rmq.addEventListener) rmq.addEventListener('change', onMotionFlip);
  else if (rmq.addListener) rmq.addListener(onMotionFlip);
  if (rmq.matches) pinToFinalStates();

  /* ---------------- pause every loop on a hidden tab ---------------- */
  doc.addEventListener('visibilitychange', function () {
    var hidden = doc.hidden;
    body.classList.toggle('paused', hidden);
    if (hidden) {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; lastTick = 0; }
      if (holdRaf !== null) { cancelAnimationFrame(holdRaf); holdRaf = null; holdLast = 0; holding = false; }
    } else if (scrubOn && heroOnScreen) {
      onScroll();
    }
  });
})();
