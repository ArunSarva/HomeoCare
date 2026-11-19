// Injected into every page by lib.mjs. Provides window.__hc helpers to
// find interactive elements, draw numbered balloons, and drive the UI.
(function () {
  const SEL = [
    'a[href]', 'button', 'input:not([type=hidden])', 'select', 'textarea',
    '[role=button]', '[role=tab]', '[role=menuitem]', '[role=switch]', '[role=checkbox]',
    '[contenteditable=true]', 'summary',
    'label:has(input[type=checkbox])', 'label:has(input[type=radio])',
  ].join(',');

  let seen = new WeakSet();

  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) return false;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
    const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
    const cy = Math.min(innerHeight - 1, Math.max(0, r.top + Math.min(r.height / 2, 20)));
    const top = document.elementFromPoint(cx, cy);
    return !!top && (el.contains(top) || top.contains(el));
  }

  function clean(t) { return (t || '').replace(/\s+/g, ' ').trim(); }

  function labelOf(el) {
    const aria = el.getAttribute('aria-label'); if (aria) return clean(aria);
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      if (el.labels && el.labels[0]) return clean(el.labels[0].innerText).replace(/\s*\*$/, '');
      let p = el.parentElement;
      for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
        const l = p.querySelector('label');
        if (l && clean(l.innerText) && !l.contains(el)) return clean(l.innerText).replace(/\s*\*$/, '');
        if (l && l.contains(el)) return clean(l.innerText).replace(/\s*\*$/, '');
      }
      if (tag === 'SELECT' && el.options.length) return clean(el.options[0].text) || 'drop-down';
      return el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('type') || 'field';
    }
    const t = clean(el.innerText);
    if (t) return t.slice(0, 80);
    return clean(el.getAttribute('title')) || clean(el.getAttribute('href')) || 'icon button';
  }

  function kindOf(el) {
    const tag = el.tagName;
    if (tag === 'A') return 'Link';
    if (tag === 'BUTTON' || el.getAttribute('role') === 'button') return 'Button';
    if (tag === 'SELECT') return 'Drop-down list';
    if (tag === 'TEXTAREA') return 'Text area';
    if (tag === 'INPUT') {
      const t = (el.getAttribute('type') || 'text').toLowerCase();
      return ({ text: 'Text box', search: 'Search box', password: 'Password box', date: 'Date picker', time: 'Time picker', number: 'Number box', tel: 'Phone box', email: 'E-mail box', checkbox: 'Check box', radio: 'Option button', file: 'File chooser' })[t] || 'Text box';
    }
    if (el.getAttribute('role') === 'tab') return 'Tab';
    if (el.getAttribute('role') === 'menuitem') return 'Menu item';
    if (el.getAttribute('role') === 'switch' || el.getAttribute('role') === 'checkbox') return 'Switch';
    if (tag === 'LABEL') return 'Check box';
    if (el.isContentEditable) return 'Rich-text editor';
    return 'Control';
  }

  function collect(scope) {
    let els = Array.from(document.querySelectorAll(SEL)).filter((el) => {
      if (seen.has(el)) return false;
      if (!visible(el)) return false;
      if (scope !== 'all') {
        const main = document.querySelector('main'); const root = document.getElementById('root');
        const outsideRoot = root && !root.contains(el);
        if (scope === 'overlay') { if (!outsideRoot && !el.matches('[role=menuitem]') && !el.closest('[role=menu],[role=dialog],[role=listbox],[class*=rui-modal]')) return false; }
        else if (main && !main.contains(el) && !outsideRoot) return false;
      }
      const tr = el.closest('tbody tr');
      if (tr && tr !== tr.parentElement.firstElementChild) return false;
      return true;
    });
    els = els.filter((el) => !els.some((o) => o !== el && el.contains(o)));
    els.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return Math.abs(ra.top - rb.top) < 12 ? ra.left - rb.left : ra.top - rb.top;
    });
    return els;
  }

  function matchAct(el, act) {
    if (!act) return false;
    const label = labelOf(el);
    if (act.startsWith('css:')) return el.matches(act.slice(4));
    return label === act || label.toLowerCase().includes(act.toLowerCase());
  }

  function draw(els, startN, act) {
    let layer = document.getElementById('__bal');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = '__bal';
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
      document.body.appendChild(layer);
    }
    const placed = [];
    const items = [];
    let actDone = false;
    els.forEach((el, i) => {
      const n = startN + i;
      seen.add(el);
      const r = el.getBoundingClientRect();
      const isAct = !actDone && matchAct(el, act);
      if (isAct) actDone = true;
      const color = isAct ? '#059669' : '#e11d48';
      const box = document.createElement('div');
      box.style.cssText = `position:fixed;left:${r.left - 2}px;top:${r.top - 2}px;width:${r.width + 4}px;height:${r.height + 4}px;border:${isAct ? 3 : 2}px dashed ${color};border-radius:6px;box-sizing:border-box;`;
      layer.appendChild(box);
      const D = 22;
      const cands = [
        [r.left - D / 2, r.top - D / 2], [r.right - D / 2, r.top - D / 2], [r.left - D / 2, r.bottom - D / 2],
        [r.right - D / 2, r.bottom - D / 2], [r.left - D - 4, r.top + r.height / 2 - D / 2], [r.right + 4, r.top + r.height / 2 - D / 2],
        [r.left + r.width / 2 - D / 2, r.top - D - 2], [r.left + r.width / 2 - D / 2, r.bottom + 2],
      ];
      let pos = cands.find(([x, y]) => x >= 0 && y >= 0 && x + D <= innerWidth && y + D <= innerHeight && !placed.some(([px, py]) => Math.abs(px - x) < D + 2 && Math.abs(py - y) < D + 2));
      if (!pos) {
        pos = [Math.max(0, Math.min(innerWidth - D, r.left)), Math.max(0, Math.min(innerHeight - D, r.top))];
        let k = 0;
        while (placed.some(([px, py]) => Math.abs(px - pos[0]) < D && Math.abs(py - pos[1]) < D) && k++ < 12) pos = [pos[0] + D, pos[1]];
      }
      placed.push(pos);
      const b = document.createElement('div');
      b.textContent = String(n);
      b.style.cssText = `position:fixed;left:${pos[0]}px;top:${pos[1]}px;width:${D}px;height:${D}px;line-height:${D}px;text-align:center;border-radius:50%;background:${color};color:#fff;font:700 ${n > 99 ? 10 : 12}px Arial,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.45);border:2px solid #fff;box-sizing:border-box;`;
      layer.appendChild(b);

      const tag = el.tagName;
      const o = { n, kind: kindOf(el), label: labelOf(el), isAct };
      if (tag === 'A') o.href = el.getAttribute('href');
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        o.required = el.required || el.getAttribute('aria-required') === 'true' || /\*\s*$/.test(el.labels && el.labels[0] ? el.labels[0].innerText : '');
        o.placeholder = el.getAttribute('placeholder') || '';
        o.readonly = el.readOnly || el.disabled;
        if (tag === 'SELECT') o.options = Array.from(el.options).map((x) => clean(x.text)).filter(Boolean);
        if (el.type !== 'password') o.value = tag === 'SELECT' ? clean(el.selectedOptions[0] && el.selectedOptions[0].text) : el.value;
      }
      if (tag === 'BUTTON' && el.disabled) o.readonly = true;
      const tr = el.closest('tbody tr');
      if (tr && tr.parentElement.children.length > 1) o.repeated = true;
      items.push(o);
    });
    return items;
  }

  function clearBalloons() {
    const l = document.getElementById('__bal'); if (l) l.remove();
  }

  function scroller() {
    const c = Array.from(document.querySelectorAll('main, main *, #root *')).filter((e) => {
      if (e.scrollHeight <= e.clientHeight + 24) return false;
      const oy = getComputedStyle(e).overflowY;
      return oy === 'auto' || oy === 'scroll';
    });
    c.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth);
    return c[0] || null;
  }

  window.__hc = {
    annotate(scope, startN, act) { clearBalloons(); return draw(collect(scope), startN, act); },
    clearBalloons, scroller,
    clearSeen() { seen = new WeakSet(); },
    info() {
      const s = scroller();
      return s ? { sh: s.scrollHeight, ch: s.clientHeight, top: s.scrollTop } : { sh: 0, ch: 0, top: 0 };
    },
    scrollTo(y) { const s = scroller(); if (s) s.scrollTop = y; return !!s; },
  };
})();