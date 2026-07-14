/* Paint **titles** + *italic strokes* by text. Strokes = real italic only.
   Re-paint often: React/chat re-renders wipe inline styles until a later pass.
   Unpaint stale nodes without wiping kept strokes (children). */
(function () {
  'use strict';

  var AGENTS = [
    { id: 'garri', color: '#7c3aed', titleCls: 'cursor-agent-title-garri', strokeCls: 'cursor-agent-stroke-garri', titles: ['\u0413\u0430\u0440\u0440\u0438'] },
    { id: 'vitek', color: '#2563eb', titleCls: 'cursor-agent-title-vitek', strokeCls: 'cursor-agent-stroke-vitek', titles: ['\u0412\u0438\u0442\u0451\u043a'] },
    { id: 'gena', color: '#dc2626', titleCls: 'cursor-agent-title-gena', strokeCls: 'cursor-agent-stroke-gena', titles: ['\u0413\u0435\u043d\u0430'] },
    /* near-white on dark Cursor chat — pure #111 invisible on dark bg */
    { id: 'baza-znaniy', color: '#e5e5e5', strokeColor: '#a3a3a3', titleCls: 'cursor-agent-title-baza-znaniy', strokeCls: 'cursor-agent-stroke-baza-znaniy', titles: ['\u0411\u0430\u0437\u0430 \u0437\u043d\u0430\u043d\u0438\u0439'] },
    { id: 'designer-navigator', color: '#88c276', titleCls: 'cursor-agent-title-designer-navigator', strokeCls: 'cursor-agent-stroke-designer-navigator', titles: ['\u0414\u0438\u0437\u0430\u0439\u043d\u0435\u0440 \u041d\u0430\u0432\u0438\u0433\u0430\u0442\u043e\u0440\u0430'] }
  ];

  var TITLE_SET = {};
  AGENTS.forEach(function (ag) {
    ag.titles.forEach(function (t) { TITLE_SET[t] = ag; });
  });

  var BLOCK = /^(P|DIV|LI|SECTION|ARTICLE|BLOCKQUOTE|H[1-6])$/;
  var ALL_TITLE = AGENTS.map(function (a) { return a.titleCls; });
  var ALL_STROKE = AGENTS.map(function (a) { return a.strokeCls; });
  var TITLE_PROPS = ['color', 'font-weight', 'font-size', 'text-decoration', 'pointer-events', 'cursor'];
  var STROKE_PROPS = ['color', 'font-style', 'font-weight', 'text-decoration'];

  function norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  function strokeColorOf(ag) {
    return ag.strokeColor || ag.color;
  }

  function clearClasses(el, list) {
    for (var i = 0; i < list.length; i++) el.classList.remove(list[i]);
  }

  function clearInlineProps(el, props) {
    for (var i = 0; i < props.length; i++) {
      try { el.style.removeProperty(props[i]); } catch (e) {}
    }
  }

  /** Composer / input — never paint. */
  function isEditableContext(el) {
    if (!el || el.nodeType !== 1) return false;
    var cur = el;
    for (var i = 0; i < 24 && cur; i++) {
      if (cur.isContentEditable === true) return true;
      var attr = cur.getAttribute && cur.getAttribute('contenteditable');
      if (attr === '' || (attr && attr.toLowerCase() === 'true')) return true;
      var role = cur.getAttribute && cur.getAttribute('role');
      if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;
      if (cur.tagName === 'TEXTAREA' || cur.tagName === 'INPUT') return true;
      var cls = (cur.className && cur.className.toString) ? cur.className.toString().toLowerCase() : '';
      if (cls.indexOf('monaco-editor') !== -1) return true;
      if (cls.indexOf('aislash') !== -1) return true;
      if (cls.indexOf('composer') !== -1 && cls.indexOf('input') !== -1) return true;
      if (cls.indexOf('chat-input') !== -1 || cls.indexOf('prompt-input') !== -1) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  function rgbOf(color) {
    try {
      var d = document.createElement('div');
      d.style.color = color;
      document.documentElement.appendChild(d);
      var cs = getComputedStyle(d).color;
      d.remove();
      return cs;
    } catch (e) {
      return color;
    }
  }

  var EXPECTED = {};
  var EXPECTED_STROKE = {};
  AGENTS.forEach(function (ag) {
    EXPECTED[ag.id] = null;
    EXPECTED_STROKE[ag.id] = null;
  });

  function expectedRgb(ag, asStroke) {
    var map = asStroke ? EXPECTED_STROKE : EXPECTED;
    if (!map[ag.id]) map[ag.id] = rgbOf(asStroke ? strokeColorOf(ag) : ag.color);
    return map[ag.id];
  }

  function needsRepaint(el, ag, asStroke) {
    if (!el) return true;
    if (!el.classList.contains(asStroke ? ag.strokeCls : ag.titleCls)) return true;
    try {
      var got = getComputedStyle(el).color;
      var want = expectedRgb(ag, asStroke);
      if (got && want && got !== want) return true;
    } catch (e) {}
    return false;
  }

  /** Clear only this node — never wipe kept descendants. */
  function unpaintEl(el, keepFn) {
    if (!el) return;
    if (keepFn && keepFn(el)) return;
    clearClasses(el, ALL_TITLE);
    clearClasses(el, ALL_STROKE);
    try { el.removeAttribute('data-cursor-agent'); } catch (e) {}
    try { el.removeAttribute('data-cursor-agent-stroke'); } catch (e2) {}
    clearInlineProps(el, TITLE_PROPS);
    clearInlineProps(el, STROKE_PROPS);
  }

  function paintTitleEl(el, ag) {
    if (!el || !ag) return;
    clearClasses(el, ALL_TITLE);
    clearClasses(el, ALL_STROKE);
    el.classList.add(ag.titleCls);
    el.setAttribute('data-cursor-agent', ag.id);
    try { el.removeAttribute('data-cursor-agent-stroke'); } catch (e0) {}
    el.style.setProperty('color', ag.color, 'important');
    el.style.setProperty('font-weight', '700', 'important');
    el.style.setProperty('font-size', '1.15em', 'important');
    el.style.setProperty('text-decoration', 'none', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('cursor', 'default', 'important');
    if (el.tagName === 'A') {
      try { el.removeAttribute('href'); } catch (e) {}
    }
    var kids = el.querySelectorAll('*');
    for (var i = 0; i < kids.length; i++) {
      kids[i].style.setProperty('color', ag.color, 'important');
      kids[i].style.setProperty('font-weight', '700', 'important');
      kids[i].style.setProperty('text-decoration', 'none', 'important');
      if (kids[i].tagName === 'A') {
        try { kids[i].removeAttribute('href'); } catch (e2) {}
        kids[i].style.setProperty('pointer-events', 'none', 'important');
      }
    }
  }

  function paintStrokeEl(el, ag) {
    if (!el || !ag) return;
    var col = strokeColorOf(ag);
    clearClasses(el, ALL_STROKE);
    clearClasses(el, ALL_TITLE);
    el.classList.add(ag.strokeCls);
    el.setAttribute('data-cursor-agent-stroke', ag.id);
    try { el.removeAttribute('data-cursor-agent'); } catch (e0) {}
    el.style.setProperty('color', col, 'important');
    el.style.setProperty('font-style', 'italic', 'important');
    el.style.setProperty('font-weight', '400', 'important');
    el.style.setProperty('text-decoration', 'none', 'important');
    var kids = el.querySelectorAll('*');
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].tagName === 'A') continue;
      kids[i].style.setProperty('color', col, 'important');
      kids[i].style.setProperty('font-style', 'italic', 'important');
      kids[i].style.setProperty('text-decoration', 'none', 'important');
    }
  }

  function agentByExactText(text) {
    var t = norm(text);
    if (TITLE_SET[t]) return TITLE_SET[t];
    if (t.indexOf('\u0414\u043e \u043e\u043a\u043e\u043d\u0447\u0430\u043d\u0438\u044f \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0438') === 0 ||
        t.indexOf('\u041b\u0438\u0446\u0435\u043d\u0437\u0438\u044f:') === 0) {
      return TITLE_SET['\u0413\u0430\u0440\u0440\u0438'];
    }
    if (t.indexOf('\u041e\u0431\u0449\u0430\u044f \u0441\u0442\u0435\u043f\u0435\u043d\u044c \u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438') === 0) {
      return TITLE_SET['\u0413\u0435\u043d\u0430'];
    }
    return null;
  }

  function titleBlock(el) {
    var cur = el;
    for (var i = 0; i < 16 && cur; i++) {
      if (BLOCK.test(cur.tagName)) return cur;
      cur = cur.parentElement;
    }
    return el.parentElement || el;
  }

  function isTitleNode(el) {
    if (!el || el.nodeType !== 1) return null;
    if (isEditableContext(el)) return null;
    var ag = agentByExactText(el.textContent);
    if (!ag) return null;
    var tag = el.tagName;
    if (tag === 'STRONG' || tag === 'B' || tag === 'A') return ag;
    if (tag === 'SPAN' || tag === 'P' || tag === 'DIV') {
      var t = norm(el.textContent);
      if (!TITLE_SET[t] && !agentByExactText(t)) return null;
      var strong = el.querySelector && el.querySelector('strong, b, a');
      if (strong && agentByExactText(strong.textContent)) return null;
      return ag;
    }
    return null;
  }

  function findTitles(root) {
    var out = [];
    var nodes;
    try {
      nodes = root.querySelectorAll('a, strong, b, span, p');
    } catch (e) {
      return out;
    }
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var ag = isTitleNode(el);
      if (!ag) continue;
      if ((el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'SPAN') &&
          el.querySelector('strong, b, a')) {
        continue;
      }
      out.push({ el: el, ag: ag });
    }
    return out;
  }

  function isRealItalic(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName;
    if (tag === 'EM' || tag === 'I') return true;
    var cls = (el.className && el.className.toString) ? el.className.toString().toLowerCase() : '';
    if (cls.indexOf('italic') !== -1 || cls.indexOf('emphasis') !== -1) return true;
    try {
      var fs = getComputedStyle(el).fontStyle;
      if (fs === 'italic' || fs === 'oblique') return true;
    } catch (e) {}
    return false;
  }

  function followsTitle(titleEl, el) {
    if (!titleEl || !el || titleEl === el) return false;
    if (titleEl.contains(el)) return false;
    try {
      return !!(titleEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    } catch (e) {
      return false;
    }
  }

  /** Stroke = italic text only. Never paint plain paragraphs. */
  function isStrokeCandidate(el, titleEl) {
    if (!el || el === titleEl) return false;
    if (isEditableContext(el)) return false;
    if (!followsTitle(titleEl, el)) return false;
    if (el.tagName === 'A') return false;
    if (isTitleNode(el)) return false;
    var text = norm(el.textContent);
    if (!text || text.length > 500) return false;

    if (el.tagName === 'EM' || el.tagName === 'I') return true;

    var em = el.querySelector && el.querySelector('em, i');
    if (em && norm(em.textContent) === text) return true;

    if (isRealItalic(el) && text.length <= 420) {
      if (el.querySelector && el.querySelector('ul, ol, table, pre, code, h1, h2, h3, strong, b')) return false;
      return true;
    }
    return false;
  }

  /**
   * First italic after title, before next agent title.
   * Handles: same <p> as title, next sibling <p>, span-italic without <em>.
   */
  function findStroke(titleEl) {
    var bubble = titleBlock(titleEl);
    for (var up = 0; up < 14 && bubble.parentElement; up++) bubble = bubble.parentElement;

    try {
      var walker = document.createTreeWalker(bubble, NodeFilter.SHOW_ELEMENT);
      walker.currentNode = titleEl;
      var steps = 0;
      while (steps < 250) {
        steps++;
        var el = walker.nextNode();
        if (!el) break;
        if (titleEl.contains(el)) continue;
        if (!followsTitle(titleEl, el)) continue;
        if (isTitleNode(el)) break;

        if (el.tagName === 'EM' || el.tagName === 'I') {
          if (isStrokeCandidate(el, titleEl)) return el;
          continue;
        }

        // block that is entirely one italic
        if ((el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'SPAN') &&
            isStrokeCandidate(el, titleEl)) {
          var innerEm = el.querySelector && el.querySelector('em, i');
          if (innerEm && isStrokeCandidate(innerEm, titleEl)) return innerEm;
          return el;
        }

        if (isRealItalic(el) && isStrokeCandidate(el, titleEl)) return el;
      }
    } catch (e2) {}
    return null;
  }

  function paintRoot(doc) {
    if (!doc || !doc.querySelectorAll) return;

    var keep = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    var keepList = keep ? null : [];

    function markKeep(el) {
      if (!el) return;
      if (keep) keep.add(el);
      else keepList.push(el);
    }
    function kept(el) {
      if (!el) return false;
      if (keep) return keep.has(el);
      for (var i = 0; i < keepList.length; i++) if (keepList[i] === el) return true;
      return false;
    }

    var painted = [];

    var titles = findTitles(doc);
    for (var i = 0; i < titles.length; i++) {
      var titleEl = titles[i].el;
      var ag = titles[i].ag;
      paintTitleEl(titleEl, ag);
      markKeep(titleEl);
      painted.push({ el: titleEl, ag: ag, stroke: false });

      var p = titleEl.parentElement;
      if (p && (p.tagName === 'P' || p.tagName === 'DIV') &&
          norm(p.textContent) === norm(titleEl.textContent) &&
          !isEditableContext(p)) {
        paintTitleEl(p, ag);
        markKeep(p);
        painted.push({ el: p, ag: ag, stroke: false });
      }

      var stroke = findStroke(titleEl);
      if (stroke) {
        paintStrokeEl(stroke, ag);
        markKeep(stroke);
        painted.push({ el: stroke, ag: ag, stroke: true });
        var wrap = stroke.parentElement;
        if (wrap && isStrokeCandidate(wrap, titleEl) &&
            norm(wrap.textContent) === norm(stroke.textContent)) {
          paintStrokeEl(wrap, ag);
          markKeep(wrap);
          painted.push({ el: wrap, ag: ag, stroke: true });
        }
      }
    }

    var links;
    try { links = doc.querySelectorAll('a'); } catch (e) { links = []; }
    for (var L = 0; L < links.length; L++) {
      if (isEditableContext(links[L])) continue;
      var agL = agentByExactText(links[L].textContent);
      if (!agL) continue;
      paintTitleEl(links[L], agL);
      markKeep(links[L]);
      painted.push({ el: links[L], ag: agL, stroke: false });
    }

    // Unpaint stale markers — only the node itself (do not clear kept kids)
    var marked;
    try {
      marked = doc.querySelectorAll(
        '[data-cursor-agent], [data-cursor-agent-stroke], ' +
        ALL_TITLE.concat(ALL_STROKE).map(function (c) { return '.' + c; }).join(', ')
      );
    } catch (e2) {
      marked = [];
    }
    for (var s = 0; s < marked.length; s++) {
      if (kept(marked[s])) continue;
      unpaintEl(marked[s], kept);
    }

    // Re-affirm paint after sweep (in case ancestor CSS reset raced)
    for (var r = 0; r < painted.length; r++) {
      var item = painted[r];
      if (!item.el || !item.el.isConnected) continue;
      if (item.stroke) paintStrokeEl(item.el, item.ag);
      else paintTitleEl(item.el, item.ag);
    }

    var all;
    try { all = doc.querySelectorAll('*'); } catch (e3) { return; }
    for (var j = 0; j < all.length; j++) {
      if (all[j].shadowRoot) paintRoot(all[j].shadowRoot);
    }
  }

  function paintAll() {
    paintRoot(document);
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      try { if (iframes[i].contentDocument) paintRoot(iframes[i].contentDocument); } catch (e) {}
    }
  }

  var busy = false;
  var obsPaused = false;

  function scheduleBurst() {
    if (busy || obsPaused) return;
    busy = true;
    requestAnimationFrame(function () {
      busy = false;
      obsPaused = true;
      try { paintAll(); } finally { obsPaused = false; }
      [80, 250, 700].forEach(function (ms) {
        setTimeout(function () {
          obsPaused = true;
          try { paintAll(); } finally { obsPaused = false; }
        }, ms);
      });
    });
  }

  try {
    new MutationObserver(function () {
      if (obsPaused) return;
      scheduleBurst();
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  } catch (e) {}

  setInterval(function () {
    obsPaused = true;
    try { paintAll(); } finally { obsPaused = false; }
  }, 600);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleBurst);
  else scheduleBurst();
})();
