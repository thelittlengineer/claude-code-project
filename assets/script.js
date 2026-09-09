/* Mawqi — scroll-driven landmark hero, plus one thread of light drawn down
   the whole page by the scroll. Transform and opacity only, delta gated,
   reversible, and it rests the moment nothing is moving. */
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

  /* ---------------- drifting motes in the hero ---------------- */
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
      var sz = (1 + Math.random() * 1.8).toFixed(1);
      i.style.width = sz + 'px'; i.style.height = sz + 'px';
      frag.appendChild(i);
    }
    motes.appendChild(frag);
  }

  /* ---------------- split the hero headlines once, at load ---------------- */
  doc.querySelectorAll('.band .line').forEach(function (el) {
    var mode = el.getAttribute('data-split');
    var text = el.textContent.trim();
    function reader() { var s = doc.createElement('span'); s.className = 'visually-hidden'; s.textContent = text; return s; }
    if (mode === 'word') {
      var words = text.split(/\s+/);
      el.textContent = '';
      el.appendChild(reader());
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
      el.appendChild(reader());
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

  /* ---------------- the hero ---------------- */
  var hero = doc.getElementById('hero');
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
  var heroOnScreen = true, scrubOn = false;
  var loadK = 0, loadStart = 0;
  var pageDirty = true;

  function heroProgress() {
    if (!hero) return 0;
    var range = hero.offsetHeight - window.innerHeight;
    if (range <= 0) return 0;
    return clamp(window.scrollY / range, 0, 1);
  }

  function paintHero(p) {
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
      var op = (b.first ? 1 : smoothstep(p, b.a, b.a + f)) *
               (b.last ? 1 : 1 - smoothstep(p, b.b - f, b.b));

      var ramp = Math.min(0.025, (b.b - b.a) * 0.35);
      var k = clamp((p - b.a) / ramp, 0, 1);
      if (b.first) k = Math.max(k, loadK);

      if (Math.abs(op - b.op) > 0.004) { b.op = op; b.el.style.opacity = op.toFixed(3); }
      if (Math.abs(k - b.k) > 0.008) { b.k = k; b.el.style.setProperty('--k', k.toFixed(3)); }
      var live = op > 0.06;
      if (live !== b.live) { b.live = live; b.el.classList.toggle('live', live); }
    }
  }

  /* ---------------- the thread of light, and the scroll-tracked pieces ---------------- */
  var mainEl = doc.getElementById('main');
  var thread = doc.getElementById('thread');
  var threadTop = 0, threadLen = 0, lastT = -1;
  var nodes = [];
  var NODE_SECTIONS = ['place', 'how', 'price', 'book', 'human', 'contact'];

  var tracks = [].slice.call(doc.querySelectorAll('[data-track]')).map(function (el) {
    return { el: el, top: 0, p: -1 };
  });
  var scenes = [].slice.call(doc.querySelectorAll('[data-scene]')).map(function (el) {
    return { el: el, top: 0, h: 1, p: -1 };
  });

  function measure() {
    var y = window.scrollY;
    if (thread && mainEl) {
      var first = doc.getElementById(NODE_SECTIONS[0]);
      var last = doc.getElementById(NODE_SECTIONS[NODE_SECTIONS.length - 1]);
      if (first && last) {
        var mainTop = mainEl.getBoundingClientRect().top + y;
        threadTop = first.getBoundingClientRect().top + y + 48;
        threadLen = Math.max(1, (last.getBoundingClientRect().bottom + y - 72) - threadTop);
        thread.style.top = (threadTop - mainTop) + 'px';
        thread.style.height = threadLen + 'px';
        thread.style.setProperty('--len', threadLen + 'px');

        if (!nodes.length) {
          NODE_SECTIONS.forEach(function () {
            var n = doc.createElement('span');
            n.className = 'thread-node';
            thread.appendChild(n);
            nodes.push({ el: n, at: 0, lit: null });
          });
        }
        NODE_SECTIONS.forEach(function (id, n) {
          var el = doc.getElementById(id);
          if (!el) return;
          var r = el.getBoundingClientRect();
          var at = clamp((r.top + y + r.height * 0.26 - threadTop) / threadLen, 0, 1);
          nodes[n].at = at;
          nodes[n].el.style.top = (at * 100).toFixed(3) + '%';
        });
      }
    }
    tracks.forEach(function (t) { t.top = t.el.getBoundingClientRect().top + y; t.p = -1; });
    scenes.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      s.top = r.top + y; s.h = Math.max(1, r.height); s.p = -1;
    });
    lastT = -1;
    pageDirty = true;
  }

  function paintPage() {
    var vh = window.innerHeight, y = window.scrollY;

    if (thread && threadLen > 1) {
      var t = clamp((y + vh * 0.62 - threadTop) / threadLen, 0, 1);
      if (Math.abs(t - lastT) > 0.0015 || t === 0 || t === 1) {
        lastT = t;
        thread.style.setProperty('--t', t.toFixed(4));
        for (var n = 0; n < nodes.length; n++) {
          var lit = t >= nodes[n].at - 0.005;
          if (lit !== nodes[n].lit) { nodes[n].lit = lit; nodes[n].el.classList.toggle('lit', lit); }
        }
      }
    }

    for (var i = 0; i < tracks.length; i++) {
      var tr = tracks[i];
      var p = clamp((vh * 0.88 - (tr.top - y)) / (vh * 0.46), 0, 1);
      if (Math.abs(p - tr.p) > 0.006) { tr.p = p; tr.el.style.setProperty('--rp', p.toFixed(3)); }
    }

    for (var j = 0; j < scenes.length; j++) {
      var sc = scenes[j];
      var sp = clamp((y + vh - sc.top) / (sc.h + vh), 0, 1);
      if (Math.abs(sp - sc.p) > 0.005) { sc.p = sp; sc.el.style.setProperty('--sp', sp.toFixed(3)); }
    }
  }

  /* ---------------- one loop for both, resting when nothing moves ---------------- */
  function tick(now) {
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;

    if (pageDirty) { paintPage(); pageDirty = false; }

    var busy = false;
    if (scrubOn) {
      if (loadK < 1) {
        if (!loadStart) loadStart = now;
        var lk = clamp((now - loadStart) / 1100, 0, 1);
        loadK = lk * lk * (3 - 2 * lk);
        busy = true;
      }
      if (heroOnScreen) {
        var k = 0.16;
        shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
        if (Math.abs(target - shown) < 0.0005) shown = target; else busy = true;
      } else {
        shown = target;
      }
      paintHero(shown);
    }

    if (busy) rafId = requestAnimationFrame(tick);
    else { rafId = null; lastTick = 0; }
  }

  function schedule() {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  function onScroll() {
    barState();
    if (scrubOn) target = heroProgress();
    pageDirty = true;
    schedule();
  }

  addEventListener('scroll', onScroll, { passive: true });

  var resizeTimer = null;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      measure();
      if (scrubOn) target = heroProgress();
      schedule();
    }, 140);
  }, { passive: true });

  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      heroOnScreen = es[0].isIntersecting;
      if (heroOnScreen) schedule();
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
    target = shown = heroProgress();
    schedule();
  }

  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
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
    if (MQLS.some(function (m) { return m.matches; })) disableScrub();
    else enableScrub();
  }
  MQLS.forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', applyHeroMode);
    else if (m.addListener) m.addListener(applyHeroMode);
  });

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
  var planthint = doc.getElementById('planthint');
  var hold = 0, holding = false, holdRaf = null, holdLast = 0, planted = false;
  var gainEls = gains ? [].slice.call(gains.children) : [];

  function lightGains(n) {
    for (var i = 0; i < gainEls.length; i++) gainEls[i].classList.toggle('lit', i < n);
  }

  function holdTick(now) {
    var dt = Math.min(100, now - (holdLast || now));
    holdLast = now;
    hold = clamp(hold + (holding ? 0.00092 : -0.0016) * dt, 0, 1);
    plantbtn.style.setProperty('--h', hold.toFixed(3));
    lightGains(Math.floor(hold * 3.001));

    if (hold >= 1 && !planted) {
      planted = true;
      placeSec.classList.add('planted');
      if (planthint) planthint.textContent = 'Planted.';
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

  /* ---------------- the booking area holds its space for the live calendar ---------------- */
  var jfSlot = doc.querySelector('[id^="JFWebsiteWidget-"]');
  var skeleton = doc.getElementById('bookskeleton');
  if (jfSlot && skeleton) {
    var checks = 0;
    var watchWidget = setInterval(function () {
      checks++;
      if (jfSlot.childNodes.length > 0 || jfSlot.offsetHeight > 40) {
        skeleton.hidden = true;
        clearInterval(watchWidget);
        measure();
        schedule();
      } else if (checks >= 12) {
        skeleton.classList.add('settled');
        clearInterval(watchWidget);
      }
    }, 600);
  }

  /* ---------------- the contact form ----------------
     Paste your Formspree endpoint below and messages arrive at your inbox.
     Leave it empty and the form still works: it opens the visitor's email
     app with everything filled in, so nobody ever hits a dead end.        */
  var FORM_ENDPOINT = '';                 // e.g. 'https://formspree.io/f/abcdwxyz'
  var FORM_EMAIL = 'rasem@mawqi.site';

  var cform = doc.getElementById('cform');
  if (cform) {
    var fdone = doc.getElementById('fdone');
    var fdonesub = doc.getElementById('fdonesub');
    var fnote = doc.getElementById('fnote');
    var fsend = doc.getElementById('fsend');

    var digits = function (v) { return (v || '').replace(/[^0-9]/g, ''); };
    var rules = {
      name: function (v) {
        if (!v.trim()) return 'Tell me your name.';
        if (v.trim().length < 2) return 'That looks too short to be a name.';
        return '';
      },
      phone: function (v) {
        if (!v.trim()) return 'I need a number I can call you on.';
        if (digits(v).length < 7) return 'That number looks too short. Check it for me.';
        if (digits(v).length > 15) return 'That number looks too long. Check it for me.';
        return '';
      },
      email: function (v) {
        if (!v.trim()) return 'I need your email so I can write back.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'That email does not look right. Check it for me.';
        return '';
      }
    };

    var fields = ['name', 'phone', 'email'].map(function (k) {
      return { key: k, el: doc.getElementById('f-' + k), err: doc.getElementById('e-' + k), touched: false };
    });
    var work = doc.getElementById('f-work');

    function showError(f, msg) {
      if (f.err.textContent !== msg) f.err.textContent = msg;
      var bad = !!msg;
      if ((f.el.getAttribute('aria-invalid') === 'true') !== bad) {
        f.el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      }
      f.el.setAttribute('aria-describedby', 'e-' + f.key);
    }
    function checkField(f, force) {
      var msg = rules[f.key](f.el.value);
      if (f.touched || force) showError(f, msg);
      return msg;
    }

    var LABELS = { name: 'your name', phone: 'your number', email: 'your email' };

    function setNote(text, bad) {
      fnote.textContent = text;
      fnote.classList.toggle('bad', !!bad);
    }

    // list what is still missing, in the order the fields appear
    function missingNote() {
      var missing = fields.filter(function (f) { return rules[f.key](f.el.value); })
                          .map(function (f) { return LABELS[f.key]; });
      if (!missing.length) return null;
      var list = missing.length === 1 ? missing[0]
        : missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1];
      return 'I still need ' + list + '.';
    }

    // once everything is filled in, drop the warning rather than leaving it red
    function refreshNote() {
      var msg = missingNote();
      if (msg) setNote(msg, true);
      else setNote('I read every message myself.', false);
    }

    fields.forEach(function (f) {
      f.el.addEventListener('blur', function () { f.touched = true; checkField(f); if (fnote.classList.contains('bad')) refreshNote(); });
      f.el.addEventListener('input', function () {
        if (f.touched) checkField(f);
        if (fnote.classList.contains('bad')) refreshNote();
      });
    });

    function mailtoFallback(data) {
      var body = 'Name: ' + data.name + '\nPhone: ' + data.phone + '\nEmail: ' + data.email +
                 '\n\nWhat they do:\n' + (data.work || '(not given)');
      location.href = 'mailto:' + FORM_EMAIL +
        '?subject=' + encodeURIComponent('Website enquiry from ' + data.name) +
        '&body=' + encodeURIComponent(body);
    }

    function finish(msg) {
      cform.hidden = true;
      fdone.hidden = false;
      if (msg) fdonesub.textContent = msg;
      fdone.scrollIntoView({ block: 'center', behavior: 'smooth' });
      measure();
      schedule();
    }

    cform.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (f) {
        f.touched = true;
        if (checkField(f, true) && !firstBad) firstBad = f;
      });
      if (firstBad) {
        refreshNote();
        firstBad.el.focus();
        return;
      }
      setNote('Sending...', false);
      fsend.disabled = true;

      var data = {
        name: fields[0].el.value.trim(),
        phone: fields[1].el.value.trim(),
        email: fields[2].el.value.trim(),
        work: work ? work.value.trim() : ''
      };

      if (!FORM_ENDPOINT) { fsend.disabled = false; setNote('I read every message myself.', false); mailtoFallback(data); return; }

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('bad status ' + res.status);
        finish('I will get back to you on ' + data.phone + '.');
      }).catch(function () {
        fsend.disabled = false;
        setNote('That did not send. Opening your email app instead.', true);
        mailtoFallback(data);
      });
    });

    var fagain = doc.getElementById('fagain');
    if (fagain) fagain.addEventListener('click', function () {
      cform.reset();
      fields.forEach(function (f) { f.touched = false; showError(f, ''); });
      setNote('I read every message myself.', false);
      fsend.disabled = false;
      fdone.hidden = true;
      cform.hidden = false;
      cform.scrollIntoView({ block: 'center', behavior: 'smooth' });
      measure();
      schedule();
    });
  }

  /* ---------------- reduced motion, honoured live in both directions ---------------- */
  function pinToFinalStates() {
    body.classList.add('pinned');
    reveals.forEach(function (el) { el.classList.add('in', 'done'); });
    if (thread) thread.style.removeProperty('--t');
    nodes.forEach(function (n) { n.el.classList.add('lit'); n.lit = true; });
    tracks.forEach(function (t) { t.el.style.setProperty('--rp', '1'); t.p = 1; });
    scenes.forEach(function (s) { s.el.style.setProperty('--sp', '0.5'); s.p = 0.5; });
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; lastTick = 0; }
    if (plantbtn) {
      holding = false;
      if (holdRaf !== null) { cancelAnimationFrame(holdRaf); holdRaf = null; }
      hold = 1;
      plantbtn.style.setProperty('--h', '1');
      lightGains(3);
      if (!planted) {
        planted = true;
        placeSec.classList.add('planted');
        if (planthint) planthint.textContent = 'Planted.';
      }
    }
  }
  function unpin() {
    body.classList.remove('pinned');
    nodes.forEach(function (n) { n.lit = null; });
    tracks.forEach(function (t) { t.p = -1; });
    scenes.forEach(function (s) { s.p = -1; });
    lastT = -1;
    pageDirty = true;
    if (plantbtn && !planted) plantbtn.style.removeProperty('--h');
  }

  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  function onMotionFlip(e) {
    if (e.matches) { disableScrub(); pinToFinalStates(); }
    else { applyHeroMode(); schedule(); }
  }
  if (rmq.addEventListener) rmq.addEventListener('change', onMotionFlip);
  else if (rmq.addListener) rmq.addListener(onMotionFlip);

  /* ---------------- pause every loop on a hidden tab ---------------- */
  doc.addEventListener('visibilitychange', function () {
    var hidden = doc.hidden;
    body.classList.toggle('paused', hidden);
    if (hidden) {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; lastTick = 0; }
      if (holdRaf !== null) { cancelAnimationFrame(holdRaf); holdRaf = null; holdLast = 0; holding = false; }
    } else {
      pageDirty = true;
      onScroll();
    }
  });

  /* ---------------- go ---------------- */
  barState();
  measure();
  applyHeroMode();
  if (rmq.matches) pinToFinalStates(); else schedule();
  addEventListener('load', function () { measure(); schedule(); });
  setTimeout(function () { measure(); schedule(); }, 1400);
})();
