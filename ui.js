(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  window.ORBIT = window.ORBIT || {};

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    var props = attrs || {};
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value == null || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = String(value);
      else if (key === 'disabled') node.disabled = !!value;
      else if (key.indexOf('on') === 0 && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        node.setAttribute(key, value === true ? '' : String(value));
      }
    });
    (children || []).forEach(function (child) {
      if (child == null) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function svgEl(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function icon(name) {
    var svg = svgEl('svg', {
      viewBox: '0 0 24 24',
      class: 'icon',
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.75',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });
    function add(d) {
      svg.appendChild(svgEl('path', { d: d }));
    }
    if (name === 'dashboard') {
      svg.appendChild(svgEl('rect', { x: '3.5', y: '3.5', width: '7', height: '7', rx: '1.5' }));
      svg.appendChild(svgEl('rect', { x: '13.5', y: '3.5', width: '7', height: '7', rx: '1.5' }));
      svg.appendChild(svgEl('rect', { x: '3.5', y: '13.5', width: '7', height: '7', rx: '1.5' }));
      svg.appendChild(svgEl('rect', { x: '13.5', y: '13.5', width: '7', height: '7', rx: '1.5' }));
    } else if (name === 'chat') {
      add('M5 6.5h14A1.5 1.5 0 0 1 20.5 8v7a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5z');
    } else if (name === 'agent') {
      svg.appendChild(svgEl('circle', { cx: '6', cy: '12', r: '2' }));
      svg.appendChild(svgEl('circle', { cx: '18', cy: '7', r: '2' }));
      svg.appendChild(svgEl('circle', { cx: '18', cy: '17', r: '2' }));
      add('M8 12h6.2M16.3 8.6 8.7 11.2M16.3 15.4 8.7 12.8');
    } else if (name === 'folder') {
      add('M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8A1.5 1.5 0 0 1 20.5 11.5v7A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-11z');
    } else if (name === 'code') {
      add('M9 8 5 12l4 4M15 8l4 4-4 4');
    } else if (name === 'models') {
      add('M4 7h16M4 12h16M4 17h16');
      svg.appendChild(svgEl('circle', { cx: '8', cy: '7', r: '1.7', fill: 'currentColor', stroke: 'none' }));
      svg.appendChild(svgEl('circle', { cx: '15', cy: '12', r: '1.7', fill: 'currentColor', stroke: 'none' }));
      svg.appendChild(svgEl('circle', { cx: '10', cy: '17', r: '1.7', fill: 'currentColor', stroke: 'none' }));
    } else if (name === 'settings') {
      svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '3' }));
      add('M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3 6.1 17.9');
    } else if (name === 'plus') {
      add('M12 5v14M5 12h14');
    } else if (name === 'chevron') {
      add('M9 6l6 6-6 6');
    } else {
      svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '7' }));
    }
    return svg;
  }

  function mark() {
    var svg = svgEl('svg', {
      viewBox: '0 0 32 32',
      class: 'mark',
      width: '32',
      height: '32',
      'aria-hidden': 'true'
    });
    svg.appendChild(svgEl('ellipse', { cx: '16', cy: '16', rx: '11', ry: '4.6', transform: 'rotate(-18 16 16)', fill: 'none', stroke: '#6E3AFF', 'stroke-width': '1.6' }));
    svg.appendChild(svgEl('ellipse', { cx: '16', cy: '16', rx: '11', ry: '4.6', transform: 'rotate(46 16 16)', fill: 'none', stroke: '#5B2BE0', 'stroke-width': '1.6' }));
    svg.appendChild(svgEl('ellipse', { cx: '16', cy: '16', rx: '11', ry: '4.6', transform: 'rotate(108 16 16)', fill: 'none', stroke: '#2D62F0', 'stroke-width': '1.6' }));
    svg.appendChild(svgEl('circle', { cx: '16', cy: '16', r: '2.3', fill: '#5B2BE0' }));
    svg.appendChild(svgEl('circle', { cx: '26.2', cy: '14.2', r: '1.6', fill: '#2D62F0' }));
    return svg;
  }

  function orbitArt() {
    var svg = svgEl('svg', {
      viewBox: '0 0 160 160',
      class: 'orbit-art',
      'aria-hidden': 'true'
    });
    svg.appendChild(svgEl('rect', { x: '1', y: '1', width: '158', height: '158', rx: '28', fill: 'none', stroke: 'currentColor', 'stroke-opacity': '0.28' }));
    svg.appendChild(svgEl('ellipse', { cx: '80', cy: '80', rx: '54', ry: '20', fill: 'none', stroke: '#6E3AFF', 'stroke-width': '1.7', transform: 'rotate(-18 80 80)' }));
    svg.appendChild(svgEl('ellipse', { cx: '80', cy: '80', rx: '54', ry: '20', fill: 'none', stroke: '#5B2BE0', 'stroke-width': '1.7', transform: 'rotate(48 80 80)' }));
    svg.appendChild(svgEl('ellipse', { cx: '80', cy: '80', rx: '54', ry: '20', fill: 'none', stroke: '#2D62F0', 'stroke-width': '1.7', transform: 'rotate(108 80 80)' }));
    svg.appendChild(svgEl('circle', { cx: '80', cy: '80', r: '6', fill: '#5B2BE0' }));
    svg.appendChild(svgEl('circle', { cx: '132', cy: '72', r: '4', fill: '#2D62F0' }));
    svg.appendChild(svgEl('circle', { cx: '34', cy: '98', r: '3', fill: '#6E3AFF' }));
    return svg;
  }

  function button(opts) {
    var btn = el('button', {
      type: 'button',
      class: 'btn ' + (opts.variant ? 'btn-' + opts.variant : 'btn-secondary'),
      disabled: !!opts.disabled,
      title: opts.title || null
    });
    if (opts.icon) btn.appendChild(icon(opts.icon));
    btn.appendChild(el('span', { text: opts.label }));
    if (opts.onClick) btn.addEventListener('click', opts.onClick);
    return btn;
  }

  function pill(label, tone) {
    return el('span', { class: 'pill pill-' + (tone || 'off'), text: label });
  }

  function callout(tone, title, body) {
    return el('div', { class: 'callout callout-' + (tone || 'info') }, [
      el('div', {}, [
        el('strong', { text: title }),
        el('p', { text: body })
      ])
    ]);
  }

  function pageHead(opts) {
    var head = el('header', { class: 'page-head' });
    var text = el('div', { class: 'page-head-text' });
    if (opts.kicker) text.appendChild(el('p', { class: 'kicker', text: opts.kicker }));
    var row = el('div', { class: 'title-row' });
    row.appendChild(el('h1', { id: 'page-title', tabindex: '-1', text: opts.title }));
    if (opts.pill) row.appendChild(pill(opts.pill.label, opts.pill.tone));
    text.appendChild(row);
    if (opts.lede) text.appendChild(el('p', { class: 'lede', text: opts.lede }));
    head.appendChild(text);
    if (opts.actions && opts.actions.length) {
      head.appendChild(el('div', { class: 'page-actions' }, opts.actions));
    }
    return head;
  }

  function emptyState(title, body) {
    var box = el('div', { class: 'empty' }, [
      el('h3', { text: title }),
      el('p', { text: body })
    ]);
    box.insertBefore(mark(), box.firstChild);
    return box;
  }

  function alertBox(code, message) {
    var box = el('div', { class: 'alert', role: 'alert' });
    if (code) box.appendChild(el('span', { class: 'code', text: code }));
    box.appendChild(el('p', { text: message }));
    return box;
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatStamp(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return 'Unknown time';
    var hours = String(date.getHours());
    var minutes = String(date.getMinutes());
    if (hours.length < 2) hours = '0' + hours;
    if (minutes.length < 2) minutes = '0' + minutes;
    return date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear() + ', ' + hours + ':' + minutes;
  }

  function greeting(name) {
    var hour = new Date().getHours();
    var hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return name ? hello + ', ' + name : hello;
  }

  window.ORBIT.ui = {
    clear: clear,
    el: el,
    icon: icon,
    mark: mark,
    orbitArt: orbitArt,
    button: button,
    pill: pill,
    callout: callout,
    pageHead: pageHead,
    emptyState: emptyState,
    alertBox: alertBox,
    formatStamp: formatStamp,
    greeting: greeting
  };
})();
