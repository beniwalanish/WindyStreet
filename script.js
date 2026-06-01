/* =========================================================
   Windy Street — script.js
   Enterprise SaaS interactions
   ========================================================= */

(function () {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- 0. Momentum smooth scroll (Lenis) ----- */
  if (!prefersReduced && window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    // keep in-page anchor links working with the smooth instance
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64) });
      });
    });
  }

  /* ----- 1. Sticky header shadow on scroll ----- */
  const header = $('#siteHeader');
  const onScrollHeader = () => header && header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ----- 2. Mobile nav toggle ----- */
  const menuToggle = $('#menuToggle');
  const mobileNav  = $('#mobileNav');
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!open));
      mobileNav.hidden = open;
    });
    $$('a', mobileNav).forEach(a => {
      a.addEventListener('click', () => {
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileNav.hidden = true;
      });
    });
  }

  /* ----- 3. Animated stat counters ----- */
  const counters = $$('.stat-num[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        animateCount(e.target);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(el => io.observe(el));
  }
  function animateCount(el) {
    const target = parseInt(el.dataset.count || '0', 10);
    const suffix = el.dataset.suffix || '';
    if (prefersReduced) { el.textContent = target + suffix; return; }
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    };
    requestAnimationFrame(tick);
  }

  /* ----- 4. Scroll reveal ----- */
  const revealSelectors = [
    '.section-head', '.bento', '.process-card', '.client-card',
    '.voice-card', '.insight-card', '.stat-card', '.contact-form',
    '.contact-copy', '.cta-card', '.hero-mock', '.hero-copy',
    '.logo-strip', '.solve-points-line', '.solve-item'
  ];
  if ('IntersectionObserver' in window && !prefersReduced) {
    const targets = $$(revealSelectors.join(','));
    targets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${Math.min(i % 6, 5) * 60}ms`;
    });
    const revealIO = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    targets.forEach(t => revealIO.observe(t));
  }

  /* ----- 4b. Scroll-linked active state for the What We Solve points line ----- */
  const solveItems = $$('.solve-item');
  const pointSpans = $$('.solve-points-line span');
  if (solveItems.length && pointSpans.length && 'IntersectionObserver' in window) {
    const setActive = (idx) => {
      pointSpans.forEach((s, i) => s.classList.toggle('active', i === idx));
    };

    let visibleSet = new Set();
    const solveIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const idx = solveItems.indexOf(e.target);
        if (idx < 0) return;
        if (e.isIntersecting) visibleSet.add(idx);
        else visibleSet.delete(idx);
      });
      if (visibleSet.size) {
        // Highlight the topmost currently visible item
        const idx = Math.min(...visibleSet);
        setActive(idx);
      } else {
        setActive(-1);
      }
    }, { rootMargin: '-30% 0px -45% 0px', threshold: 0 });

    solveItems.forEach(item => solveIO.observe(item));
  }

  /* ----- 5. Smooth scroll with header offset ----- */
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const headerH = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
      window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });

  /* ----- 6. Contact form ----- */
  const contactForm = $('#contactFormEl');
  const formNote    = $('#formNote');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      formNote.textContent = '';
      formNote.classList.remove('success', 'error');

      const fields = $$('input, textarea, select', contactForm);
      let firstInvalid = null;

      fields.forEach(f => {
        const wrap = f.closest('.form-field');
        wrap?.classList.remove('error');
        if (!f.required) return;
        const val = (f.value || '').trim();
        let valid = val.length > 0;
        if (valid && f.type === 'email') {
          valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        }
        if (!valid) {
          wrap?.classList.add('error');
          if (!firstInvalid) firstInvalid = f;
        }
      });

      if (firstInvalid) {
        formNote.textContent = 'Please complete the highlighted fields.';
        formNote.classList.add('error');
        firstInvalid.focus();
        return;
      }

      const btn = $('button[type="submit"]', contactForm);
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Sending…';

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = original;
        contactForm.reset();
        formNote.textContent = '✓ Got it. A partner will be in touch within one working day.';
        formNote.classList.add('success');
      }, 900);
    });

    $$('input, textarea, select', contactForm).forEach(f => {
      f.addEventListener('input', () => {
        f.closest('.form-field')?.classList.remove('error');
      });
    });
  }

  /* ----- 7. Newsletter ----- */
  const newsletter = $('#newsletterForm');
  const newsNote   = $('#newsletterNote');
  if (newsletter) {
    newsletter.addEventListener('submit', e => {
      e.preventDefault();
      const input = $('input', newsletter);
      const val = (input.value || '').trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      newsNote.classList.remove('success', 'error');
      if (!ok) {
        newsNote.textContent = 'Please use a valid email.';
        newsNote.classList.add('error');
        input.focus();
        return;
      }
      newsletter.reset();
      newsNote.textContent = '✓ Subscribed. See you in your inbox.';
      newsNote.classList.add('success');
    });
  }

  /* ----- 7b. Flip cards — tap-to-flip on touch devices ----- */
  $$('.flip-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't toggle if user clicked the inner CTA link (let link work)
      if (e.target.closest('.flip-link')) return;
      // Only on touch / coarse pointer devices — desktops still use hover
      if (window.matchMedia('(hover: none)').matches) {
        card.classList.toggle('flipped');
      }
    });
  });

  /* ----- 7c. Click-to-play HTML5 video -----
     Plays only your self-hosted file: videos/windy-brand-film.mp4
     Drop your MP4 there to enable playback on the site.
  */
  $$('.video-wrap[data-video-id]').forEach(wrap => {
    const btn = $('.video-thumb-btn', wrap);
    if (!btn) return;

    btn.addEventListener('click', () => {
      const poster = $('img', btn)?.src || '';
      const id = wrap.dataset.videoId;

      const video = document.createElement('video');
      video.className = 'brand-video';
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.poster = poster;
      video.src = 'videos/windy-brand-film.mp4';

      // If the file isn't there, swap to a clear inline message
      video.addEventListener('error', () => {
        wrap.innerHTML = `
          <div class="video-fallback">
            <p><strong>Brand film not yet uploaded.</strong></p>
            <p>Drop your video file at <code>videos/windy-brand-film.mp4</code> to play it here.</p>
            <p><a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Open original on YouTube →</a></p>
          </div>`;
      });

      wrap.innerHTML = '';
      wrap.appendChild(video);
      wrap.classList.add('video-active');

      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => { /* manual play */ });
    });
  });

  /* ----- 7c-yt. Click-to-play YouTube facade ----- */
  $$('.video-wrap[data-yt]').forEach(wrap => {
    const btn = $('.video-thumb-btn', wrap);
    if (!btn) return;

    btn.addEventListener('click', () => {
      const id = wrap.dataset.yt;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = 'Windy Street film';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; web-share';
      iframe.allowFullscreen = true;

      wrap.innerHTML = '';
      wrap.appendChild(iframe);
      wrap.classList.add('video-active');
    });
  });

  /* ----- 7d. Process — sticky horizontal scroll driven by vertical scroll ----- */
  const processSection = $('.process');
  const processTrack   = $('#processTrack');
  const processBarFill = $('#processBarFill');
  const processIndex   = $('#processIndex');
  if (processSection && processTrack && window.matchMedia('(min-width: 769px)').matches) {
    const cards = $$('.process-card', processTrack);
    const total = cards.length;
    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = processSection.getBoundingClientRect();
      const sectionH = processSection.offsetHeight;
      const vh = window.innerHeight;
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
      // Scrollable = section height minus the pin's effective height (vh - headerH)
      const scrollable = sectionH - (vh - headerH);

      let progress = 0;
      if (rect.top >= headerH) {
        // Pin not yet sticking — section still entering viewport
        progress = 0;
      } else if (rect.top <= headerH - scrollable) {
        // Pin past sticky range — section leaving viewport
        progress = 1;
      } else {
        progress = Math.min(1, Math.max(0, (headerH - rect.top) / scrollable));
      }

      const translatePct = progress * (total - 1) * (100 / total);
      processTrack.style.transform = `translate3d(-${translatePct}%, 0, 0)`;

      if (processBarFill) {
        processBarFill.style.width = `${progress * 100}%`;
      }
      if (processIndex) {
        const i = Math.min(total, Math.round(progress * (total - 1)) + 1);
        processIndex.textContent = String(i).padStart(2, '0');
      }
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ----- 8. Back to top ----- */
  const backToTop = $('#backToTop');
  if (backToTop) {
    const onBtt = () => backToTop.classList.toggle('visible', window.scrollY > 600);
    window.addEventListener('scroll', onBtt, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  }

  /* ----- 9. Footer year ----- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----- 10. Subtle parallax on hero mockup ----- */
  const mock = $('.mock-window');
  const mockWrap = $('.hero-mock');
  if (mock && mockWrap && !prefersReduced && window.matchMedia('(min-width: 1100px)').matches) {
    let raf = null;
    mockWrap.addEventListener('mousemove', e => {
      if (raf) cancelAnimationFrame(raf);
      const r = mockWrap.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
      raf = requestAnimationFrame(() => {
        mock.style.transform = `rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
      });
    });
    mockWrap.addEventListener('mouseleave', () => {
      mock.style.transform = 'rotateY(0) rotateX(0)';
    });
    mock.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
    mock.style.transformStyle = 'preserve-3d';
  }

})();
