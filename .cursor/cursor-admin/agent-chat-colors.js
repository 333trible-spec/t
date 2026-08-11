/* Paint **titles** + *italic strokes* by text.
   Perf rules (large chats must never freeze the UI):
   - Coalesce: at most ~1 paint / 450ms on DOM childList/characterData (no catch-up, no interval)
   - Observe childList/characterData only (NOT style/class — our paint must not re-trigger)
   - Prefer CSS classes; set inline styles only on the painted node (not every descendant)
   - Skip nodes already painted for the same agent
   - Soft-cap TreeWalker / editable-walk; avoid querySelectorAll('*') on whole document */
(function () {
  'use strict';

  var AGENTS = [
    { id: 'garri', color: '#7c3aed', titleCls: 'cursor-agent-title-garri', strokeCls: 'cursor-agent-stroke-garri', titles: ['\u0413\u0430\u0440\u0440\u0438'] },
    { id: 'vitek', color: '#2563eb', titleCls: 'cursor-agent-title-vitek', strokeCls: 'cursor-agent-stroke-vitek', titles: ['\u0412\u0438\u0442\u0451\u043a'] },
    { id: 'gena', color: '#dc2626', titleCls: 'cursor-agent-title-gena', strokeCls: 'cursor-agent-stroke-gena', titles: ['\u0413\u0435\u043d\u0430'] },
    { id: 'baza-znaniy', color: '#e5e5e5', strokeColor: '#a3a3a3', titleCls: 'cursor-agent-title-baza-znaniy', strokeCls: 'cursor-agent-stroke-baza-znaniy', titles: ['\u0411\u0430\u0437\u0430 \u0437\u043d\u0430\u043d\u0438\u0439'] },
    { id: 'designer-navigator', color: '#88c276', titleCls: 'cursor-agent-title-designer-navigator', strokeCls: 'cursor-agent-stroke-designer-navigator', titles: ['\u0414\u0438\u0437\u0430\u0439\u043d\u0435\u0440'] },
    {
      id: 'sheikh',
      color: '#f59e0b',
      titleCls: 'cursor-agent-title-sheikh',
      strokeCls: 'cursor-agent-stroke-sheikh',
      /* чат: только شيخ; Шейх — для старых сообщений (CSS прячет кириллицу через ::before) */
      titles: ['\u0634\u064A\u062E', '\u0428\u0435\u0439\u0445'],
      fontFamily: '"SheikhAmiri", "Traditional Arabic", "Arabic Typesetting", serif',
      titleFontSize: '0px',
      letterSpacing: '0',
      titleColorTransparent: true
    }
  ];

  var TITLE_SET = {};
  AGENTS.forEach(function (ag) {
    ag.titles.forEach(function (t) { TITLE_SET[t] = ag; });
  });

  var BLOCK = /^(P|DIV|LI|SECTION|ARTICLE|BLOCKQUOTE|H[1-6])$/;
  var ALL_TITLE = AGENTS.map(function (a) { return a.titleCls; });
  var ALL_STROKE = AGENTS.map(function (a) { return a.strokeCls; });
  var TITLE_PROPS = ['color', 'font-weight', 'font-size', 'font-family', 'letter-spacing', 'text-decoration', 'pointer-events', 'cursor'];
  var STROKE_PROPS = ['color', 'font-style', 'font-weight', 'font-family', 'letter-spacing', 'text-decoration'];

  var MIN_GAP_MS = 450;
  var WALKER_MAX = 120;
  var EDITABLE_DEPTH = 12;

  function norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  /** Match titles even if Cursor normalizes ё → е. */
  function normTitleKey(s) {
    return norm(s).replace(/\u0451/g, '\u0435').toLowerCase();
  }

  var TITLE_KEY_SET = {};
  AGENTS.forEach(function (ag) {
    ag.titles.forEach(function (t) {
      TITLE_KEY_SET[normTitleKey(t)] = ag;
    });
  });

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

  function classLooksEditable(cls) {
    if (!cls) return false;
    /* Readonly markdown panes (aislash-editor-input-readonly) must stay paintable. */
    if (cls.indexOf('readonly') !== -1) return false;
    if (cls.indexOf('monaco-editor') !== -1) return true;
    if (cls.indexOf('prosemirror') !== -1) return true;
    if (cls.indexOf('chat-input') !== -1 || cls.indexOf('prompt-input') !== -1) return true;
    if (cls.indexOf('aislash') !== -1 &&
        cls.indexOf('input') !== -1) return true;
    if (cls.indexOf('composer') !== -1 &&
        (cls.indexOf('input') !== -1 || cls.indexOf('editor') !== -1)) return true;
    return false;
  }

  /** Skip only the live input root — not whole message columns wrapped by aislash. */
  function isComposerInputRoot(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable === true) return true;
    var attr = el.getAttribute && el.getAttribute('contenteditable');
    if (attr === '' || (attr && attr.toLowerCase() === 'true')) return true;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return true;
    var cls = (el.className && el.className.toString) ? el.className.toString().toLowerCase() : '';
    return classLooksEditable(cls);
  }

  function isEditableContext(el) {
    if (!el || el.nodeType !== 1) return false;
    var cur = el;
    for (var i = 0; i < EDITABLE_DEPTH && cur; i++) {
      if (cur.isContentEditable === true) return true;
      var attr = cur.getAttribute && cur.getAttribute('contenteditable');
      if (attr === '' || (attr && attr.toLowerCase() === 'true')) return true;
      var role = cur.getAttribute && cur.getAttribute('role');
      if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;
      if (cur.tagName === 'TEXTAREA' || cur.tagName === 'INPUT') return true;
      var cls = (cur.className && cur.className.toString) ? cur.className.toString().toLowerCase() : '';
      if (classLooksEditable(cls)) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  function mutationTargetEl(mutation) {
    var t = mutation && mutation.target;
    if (!t) return null;
    if (t.nodeType === 3) return t.parentElement;
    if (t.nodeType === 1) return t;
    return null;
  }

  /** Typing in composer must not schedule paint — was freezing the chat input. */
  function mutationIsEditable(mutation) {
    var el = mutationTargetEl(mutation);
    if (el && isEditableContext(el)) return true;
    if (mutation.type !== 'childList' || !mutation.addedNodes) return false;
    for (var i = 0; i < mutation.addedNodes.length; i++) {
      var n = mutation.addedNodes[i];
      if (n.nodeType === 1 && isEditableContext(n)) return true;
      if (n.nodeType === 3 && n.parentElement && isEditableContext(n.parentElement)) return true;
    }
    return false;
  }

  function unpaintEl(el) {
    if (!el) return;
    clearClasses(el, ALL_TITLE);
    clearClasses(el, ALL_STROKE);
    try { el.removeAttribute('data-cursor-agent'); } catch (e) {}
    try { el.removeAttribute('data-cursor-agent-stroke'); } catch (e2) {}
    clearInlineProps(el, TITLE_PROPS);
    clearInlineProps(el, STROKE_PROPS);
  }

  function alreadyTitle(el, ag) {
    return el.getAttribute('data-cursor-agent') === ag.id &&
      el.classList.contains(ag.titleCls);
  }

  function alreadyStroke(el, ag) {
    return el.getAttribute('data-cursor-agent-stroke') === ag.id &&
      el.classList.contains(ag.strokeCls);
  }

  /** Class + light inline on THIS node only. Descendants = CSS (`.* *`). */
  function paintTitleEl(el, ag) {
    if (!el || !ag) return;
    if (alreadyTitle(el, ag)) return;
    clearClasses(el, ALL_TITLE);
    clearClasses(el, ALL_STROKE);
    el.classList.add(ag.titleCls);
    el.setAttribute('data-cursor-agent', ag.id);
    try { el.removeAttribute('data-cursor-agent-stroke'); } catch (e0) {}
    el.style.setProperty('color', ag.titleColorTransparent ? 'transparent' : ag.color, 'important');
    el.style.setProperty('font-weight', '700', 'important');
    el.style.setProperty('font-size', ag.titleFontSize || '1.15em', 'important');
    el.style.setProperty('text-decoration', 'none', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('cursor', 'default', 'important');
    if (ag.fontFamily) {
      el.style.setProperty('font-family', ag.fontFamily, 'important');
    } else {
      try { el.style.removeProperty('font-family'); } catch (eFf) {}
    }
    if (ag.letterSpacing != null && ag.letterSpacing !== '') {
      el.style.setProperty('letter-spacing', ag.letterSpacing, 'important');
    } else {
      try { el.style.removeProperty('letter-spacing'); } catch (eLs) {}
    }
    if (el.tagName === 'A') {
      try { el.removeAttribute('href'); } catch (e) {}
    }
  }

  function paintStrokeEl(el, ag) {
    if (!el || !ag) return;
    if (alreadyStroke(el, ag)) return;
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
    if (ag.fontFamily) {
      el.style.setProperty('font-family', ag.fontFamily, 'important');
    } else {
      try { el.style.removeProperty('font-family'); } catch (eFf2) {}
    }
    if (ag.letterSpacing) {
      el.style.setProperty('letter-spacing', '0.02em', 'important');
    } else {
      try { el.style.removeProperty('letter-spacing'); } catch (eLs2) {}
    }
  }

  function agentByExactText(text) {
    var t = norm(text);
    if (TITLE_SET[t]) return TITLE_SET[t];
    var tk = normTitleKey(t);
    if (TITLE_KEY_SET[tk]) return TITLE_KEY_SET[tk];
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
    if (tag === 'SPAN' || tag === 'P' || tag === 'DIV' || tag === 'H1' || tag === 'H2' ||
        tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6') {
      var t = norm(el.textContent);
      if (!agentByExactText(t)) return null;
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
      nodes = root.querySelectorAll('a, strong, b, span, p, h1, h2, h3, h4, h5, h6');
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

  /** All italic strokes after a title (cap matches agent rules: up to 2–3). */
  var STROKE_MAX = 3;

  function findStrokes(titleEl) {
    var found = [];
    var bubble = titleBlock(titleEl);
    for (var up = 0; up < 8 && bubble.parentElement; up++) bubble = bubble.parentElement;

    try {
      var walker = document.createTreeWalker(bubble, NodeFilter.SHOW_ELEMENT);
      walker.currentNode = titleEl;
      var steps = 0;
      while (steps < WALKER_MAX && found.length < STROKE_MAX) {
        steps++;
        var el = walker.nextNode();
        if (!el) break;
        if (titleEl.contains(el)) continue;
        if (!followsTitle(titleEl, el)) continue;
        if (isTitleNode(el)) break;

        var pick = null;
        if (el.tagName === 'EM' || el.tagName === 'I') {
          if (isStrokeCandidate(el, titleEl)) pick = el;
        } else if ((el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'SPAN') &&
            isStrokeCandidate(el, titleEl)) {
          var innerEm = el.querySelector && el.querySelector('em, i');
          if (innerEm && isStrokeCandidate(innerEm, titleEl)) pick = innerEm;
          else pick = el;
        } else if (isRealItalic(el) && isStrokeCandidate(el, titleEl)) {
          pick = el;
        }

        if (!pick) continue;
        /* skip if already covered as child/parent of a picked stroke */
        var dup = false;
        for (var d = 0; d < found.length; d++) {
          if (found[d] === pick || found[d].contains(pick) || pick.contains(found[d])) {
            dup = true;
            break;
          }
        }
        if (!dup) found.push(pick);
      }
    } catch (e2) {}
    return found;
  }

  /** Prefer chat panes (incl. multitask left/right columns + shadow DOM hosts). */
  function collectPaintRoots(doc) {
    var roots = [];
    var sels = [
      '[class*="composer-bar"]',
      '[class*="agent-sidebar"]',
      '[class*="agent-chat"]',
      '[class*="chat-widget"]',
      '[class*="markdown-root"]',
      '[class*="markdown-body"]',
      '[class*="markdown-section"]',
      '[class*="composer-messages"]',
      '[class*="message-content"]',
      '[class*="message-render"]',
      '[class*="anysphere-markdown"]',
      '[class*="rendered-markdown"]',
      '[class*="agent-message"]',
      '[class*="chat-message"]',
      '[class*="conversation"]',
      '[data-message-id]',
      '[class*="aislash-editor-input-readonly"]'
    ];
    var seen = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    for (var s = 0; s < sels.length; s++) {
      var nodes;
      try { nodes = doc.querySelectorAll(sels[s]); } catch (e) { continue; }
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (isComposerInputRoot(n)) continue;
        if (seen) {
          if (seen.has(n)) continue;
          seen.add(n);
        }
        roots.push(n);
      }
    }
    if (roots.length === 0 && doc.body) roots.push(doc.body);
    else if (roots.length === 0 && doc.documentElement) roots.push(doc.documentElement);
    return roots;
  }

  var shadowSeen = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  var shadowSeenList = shadowSeen ? null : [];

  function shadowAlready(root) {
    if (!root) return true;
    if (shadowSeen) return shadowSeen.has(root);
    for (var i = 0; i < shadowSeenList.length; i++) if (shadowSeenList[i] === root) return true;
    return false;
  }

  function markShadow(root) {
    if (!root) return;
    if (shadowSeen) shadowSeen.add(root);
    else shadowSeenList.push(root);
  }

  function collectDocuments() {
    var docs = [];
    var docSeen = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    var docList = docSeen ? null : [];

    function addDoc(d) {
      if (!d) return;
      if (docSeen) {
        if (docSeen.has(d)) return;
        docSeen.add(d);
      } else {
        for (var i = 0; i < docList.length; i++) if (docList[i] === d) return;
        docList.push(d);
      }
      docs.push(d);
    }

    function walkShadow(node, depth) {
      if (!node || depth > 24) return;
      if (node.shadowRoot && !shadowAlready(node.shadowRoot)) {
        markShadow(node.shadowRoot);
        addDoc(node.shadowRoot);
        walkShadow(node.shadowRoot, depth + 1);
      }
      var kids = node.children;
      if (!kids) return;
      for (var i = 0; i < kids.length; i++) walkShadow(kids[i], depth + 1);
    }

    addDoc(document);
    walkShadow(document.documentElement, 0);

    var iframes = document.querySelectorAll('iframe');
    for (var f = 0; f < iframes.length; f++) {
      try {
        if (iframes[f].contentDocument) {
          addDoc(iframes[f].contentDocument);
          walkShadow(iframes[f].contentDocument.documentElement, 0);
        }
      } catch (e) {}
    }
    return docs;
  }

  var shadowObservers = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  var shadowObserverList = shadowObservers ? null : [];

  function observeRoot(root) {
    if (!root || (root.nodeType !== 9 && root.nodeType !== 11)) return;
    if (shadowObservers) {
      if (shadowObservers.has(root)) return;
      shadowObservers.add(root);
    } else {
      for (var i = 0; i < shadowObserverList.length; i++) if (shadowObserverList[i] === root) return;
      shadowObserverList.push(root);
    }
    try {
      new MutationObserver(function (mutations) {
        if (obsPaused || busy) return;
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type !== 'childList' && m.type !== 'characterData') continue;
          if (mutationIsEditable(m)) continue;
          scheduleBurst();
          return;
        }
      }).observe(root, {
        childList: true,
        subtree: true,
        characterData: true
      });
    } catch (e) {}
  }

  function attachShadowObservers() {
    var docs = collectDocuments();
    for (var d = 0; d < docs.length; d++) observeRoot(docs[d]);
  }

  function paintRoot(root) {
    if (!root || !root.querySelectorAll) return;

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

    var titles = findTitles(root);
    for (var i = 0; i < titles.length; i++) {
      var titleEl = titles[i].el;
      var ag = titles[i].ag;
      paintTitleEl(titleEl, ag);
      markKeep(titleEl);

      var p = titleEl.parentElement;
      if (p && (p.tagName === 'P' || p.tagName === 'DIV') &&
          norm(p.textContent) === norm(titleEl.textContent) &&
          !isEditableContext(p)) {
        paintTitleEl(p, ag);
        markKeep(p);
      }

      var strokes = findStrokes(titleEl);
      for (var si = 0; si < strokes.length; si++) {
        var stroke = strokes[si];
        paintStrokeEl(stroke, ag);
        markKeep(stroke);
        var wrap = stroke.parentElement;
        if (wrap && isStrokeCandidate(wrap, titleEl) &&
            norm(wrap.textContent) === norm(stroke.textContent)) {
          paintStrokeEl(wrap, ag);
          markKeep(wrap);
        }
      }
    }

    var links;
    try { links = root.querySelectorAll('a'); } catch (e) { links = []; }
    for (var L = 0; L < links.length; L++) {
      if (isEditableContext(links[L])) continue;
      var agL = agentByExactText(links[L].textContent);
      if (!agL) continue;
      paintTitleEl(links[L], agL);
      markKeep(links[L]);
    }

    var marked;
    try {
      marked = root.querySelectorAll(
        '[data-cursor-agent], [data-cursor-agent-stroke], ' +
        ALL_TITLE.concat(ALL_STROKE).map(function (c) { return '.' + c; }).join(', ')
      );
    } catch (e2) {
      marked = [];
    }
    for (var s = 0; s < marked.length; s++) {
      if (kept(marked[s])) continue;
      unpaintEl(marked[s]);
    }
  }

  function paintAll() {
    attachShadowObservers();
    var docs = collectDocuments();
    for (var d = 0; d < docs.length; d++) {
      var roots = collectPaintRoots(docs[d]);
      for (var r = 0; r < roots.length; r++) paintRoot(roots[r]);
    }
  }

  var busy = false;
  var obsPaused = false;
  var pending = false;
  var lastPaintAt = 0;

  function runPaint() {
    if (obsPaused) return;
    obsPaused = true;
    busy = true;
    lastPaintAt = Date.now();
    try {
      paintAll();
    } finally {
      busy = false;
      obsPaused = false;
    }
  }

  function scheduleBurst() {
    if (busy || obsPaused || pending) return;
    pending = true;
    var wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastPaintAt));
    setTimeout(function () {
      pending = false;
      requestAnimationFrame(runPaint);
    }, wait);
  }

  try {
    observeRoot(document.documentElement);
  } catch (e) {}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleBurst);
  else scheduleBurst();
})();
