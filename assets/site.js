/* ORIGIN — shared behavior. Dependency-free. All motion gated on prefers-reduced-motion. */
(function () {
  document.body.classList.add('js');
  var motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header scrolled state ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.querySelector('.mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Same-page anchors (e.g. /#pricing) don't reload — close the menu on
    // any link tap so it never sits open over the scrolling page.
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Footer year ---------- */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Reveal on scroll (fade/slide-up with stagger) ---------- */
  if (motionOK && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      '.section-head, .punch, .sku, .step, .work-card, .included, .dare, .founder, ' +
      '.compare .col, .mappack, .faq details, .price-line, .receipts li'
    );
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    targets.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 5) * 0.05 + 's';
      io.observe(el);
    });
  }

  /* ---------- Dare card: faint particle field inside the dark card only ---------- */
  if (motionOK) {
    document.querySelectorAll('.dare').forEach(function (card) {
      var canvas = document.createElement('canvas');
      canvas.className = 'dare-fx';
      canvas.setAttribute('aria-hidden', 'true');
      card.insertBefore(canvas, card.firstChild);
      var ctx = canvas.getContext('2d');
      var W = 0, H = 0, pts = [];
      var COLORS = ['47,211,130', '47,143,230', '125,180,228'];

      var resize = function () {
        var r = card.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var target = Math.min(40, Math.max(16, Math.floor(W * H / 12000)));
        while (pts.length < target) {
          pts.push({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
            r: 0.7 + Math.random() * 1.5,
            c: COLORS[Math.floor(Math.random() * COLORS.length)],
            a: 0.2 + Math.random() * 0.4
          });
        }
        pts.length = target;
      };
      resize();
      window.addEventListener('resize', resize);

      var LINK = 90;
      var frame = function () {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < pts.length; i++) {
          var p1 = pts[i];
          p1.x += p1.vx; p1.y += p1.vy;
          if (p1.x < -10) p1.x = W + 10; if (p1.x > W + 10) p1.x = -10;
          if (p1.y < -10) p1.y = H + 10; if (p1.y > H + 10) p1.y = -10;
          for (var j = i + 1; j < pts.length; j++) {
            var p2 = pts[j];
            var dx = p1.x - p2.x, dy = p1.y - p2.y;
            if (dx > LINK || dx < -LINK || dy > LINK || dy < -LINK) continue;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < LINK) {
              ctx.strokeStyle = 'rgba(' + p1.c + ',' + (0.08 * (1 - d / LINK)).toFixed(3) + ')';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
          ctx.fillStyle = 'rgba(' + p1.c + ',' + p1.a + ')';
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, p1.r, 0, 6.2832);
          ctx.fill();
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
})();
