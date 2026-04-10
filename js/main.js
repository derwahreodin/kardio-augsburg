/* ============================================================
   KARDIOLOGIE AUGSBURG — main.js
   ============================================================ */

'use strict';

/* ── 1. THREE.JS ANIMATED DOTTED SURFACE ── */
function initThreeJS() {
  if (typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('dotted-surface');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 18, 40);
  camera.lookAt(0, -4, 0);

  // Grid dimensions
  const COLS = 70;
  const ROWS = 45;
  const SPACING = 1.3;
  const COUNT = COLS * ROWS;

  const positions = new Float32Array(COUNT * 3);
  const basePositions = new Float32Array(COUNT * 3);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = (row * COLS + col) * 3;
      const x = (col - COLS / 2) * SPACING;
      const y = (row - ROWS / 2) * SPACING;
      positions[idx]     = x;
      positions[idx + 1] = y;
      positions[idx + 2] = 0;
      basePositions[idx]     = x;
      basePositions[idx + 1] = y;
      basePositions[idx + 2] = 0;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x2E87C8,
    size: 0.18,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Subtle ambient light influence (just for the dots color)
  const clock = new THREE.Clock();

  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  window.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function animate() {
    const animId = requestAnimationFrame(animate);

    // Lazy mouse follow
    mouseX += (targetMouseX - mouseX) * 0.04;
    mouseY += (targetMouseY - mouseY) * 0.04;

    const t = clock.getElapsedTime();
    const posArray = geometry.attributes.position.array;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = (row * COLS + col) * 3;
        const bx = basePositions[idx];
        const by = basePositions[idx + 1];

        // Wave: combination of two sine waves for organic feel
        const wave1 = Math.sin(col * 0.22 + t * 0.55) * Math.cos(row * 0.2 + t * 0.35);
        const wave2 = Math.sin(col * 0.1 - t * 0.3) * Math.sin(row * 0.15 + t * 0.4);
        const z = (wave1 * 2.0 + wave2 * 1.2);

        posArray[idx]     = bx + mouseX * 0.5;
        posArray[idx + 1] = by - mouseY * 0.3;
        posArray[idx + 2] = z;
      }
    }

    geometry.attributes.position.needsUpdate = true;

    // Very gentle overall rotation
    points.rotation.z = mouseX * 0.03;

    renderer.render(scene, camera);
  }

  animate();

  // Handle resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', onResize);
}

/* ── 2. SCROLL REVEAL ── */
function initScrollReveal() {
  const elements = document.querySelectorAll('.animate-on-scroll, .animate-from-right');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ── 3. STICKY NAV ── */
function initStickyNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const onScroll = () => {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial check
}

/* ── 4. ACTIVE NAV LINKS ── */
function initActiveNav() {
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  const sections = [];

  navLinks.forEach((link) => {
    const id = link.getAttribute('href').slice(1);
    const section = document.getElementById(id);
    if (section) sections.push({ link, section });
  });

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Remove active from all
          navLinks.forEach((l) => l.classList.remove('active'));
          // Find and activate matching link
          const match = sections.find((s) => s.section === entry.target);
          if (match) match.link.classList.add('active');
        }
      });
    },
    {
      rootMargin: '-30% 0px -60% 0px',
      threshold: 0,
    }
  );

  sections.forEach(({ section }) => observer.observe(section));
}

/* ── 5. MOBILE MENU ── */
function initMobileMenu() {
  const btn = document.getElementById('menu-btn');
  const overlay = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('menu-close');
  const mobileLinks = overlay ? overlay.querySelectorAll('a') : [];

  if (!btn || !overlay) return;

  function openMenu() {
    overlay.classList.add('is-open');
    overlay.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';

    // Focus first focusable element
    if (closeBtn) closeBtn.focus();
  }

  function closeMenu() {
    overlay.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';

    // Restore focus
    setTimeout(() => {
      overlay.setAttribute('hidden', '');
      btn.focus();
    }, 400); // match CSS transition
  }

  btn.addEventListener('click', () => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMenu);
  }

  // Close on overlay link click
  mobileLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      closeMenu();
    }
  });

  // Focus trap within overlay
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = overlay.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

/* ── 6. STAT COUNTERS ── */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1800;
    const startTime = performance.now();
    const isFloat = !Number.isInteger(target);

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = prefix + (isFloat ? value.toFixed(1) : Math.floor(value)) + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = prefix + (isFloat ? target.toFixed(1) : target) + suffix;
      }
    }

    requestAnimationFrame(update);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* ── 7A. ÜBER UNS SCROLL-VIDEO SCRUB ── */
function initUeberVideoScroll() {
  const wrapper     = document.querySelector('.ueber-scroll-wrapper');
  const video       = document.getElementById('ueber-video');
  const progressBar = document.getElementById('ueber-progress');
  const phases      = document.querySelectorAll('.ueber-phase');
  const dots        = document.querySelectorAll('.ueber-dot');

  if (!wrapper || !video) return;

  const NUM_PHASES  = phases.length;  // 4
  let ticking       = false;
  let lastProgress  = -1;
  let videoReady    = false;

  function updatePhases(progress) {
    if (progressBar) progressBar.style.width = (progress * 100) + '%';
    const active = Math.min(Math.floor(progress * NUM_PHASES), NUM_PHASES - 1);
    phases.forEach((el, i) => el.classList.toggle('active', i === active));
    dots.forEach((dot, i)  => dot.classList.toggle('active', i === active));
  }

  function update() {
    const wrapperTop    = wrapper.getBoundingClientRect().top + window.scrollY;
    const wrapperHeight = wrapper.offsetHeight;
    const vh            = window.innerHeight;
    const scrolled      = window.scrollY - wrapperTop;
    const maxScroll     = wrapperHeight - vh;

    const progress = Math.max(0, Math.min(1, scrolled / maxScroll));

    if (Math.abs(progress - lastProgress) < 0.0005) { ticking = false; return; }
    lastProgress = progress;

    if (videoReady) {
      const START = 1, END = 5;
      video.currentTime = START + progress * (END - START);
    }
    updatePhases(progress);
    ticking = false;
  }

  // Activate scroll listener as soon as video can be seeked
  function onVideoReady() {
    videoReady = true;
    update();
  }
  video.addEventListener('canplay',        onVideoReady, { once: true });
  video.addEventListener('loadedmetadata', onVideoReady, { once: true });

  // Also run phases immediately even without video (fallback)
  updatePhases(0);

  video.preload = 'auto';
  video.load();

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
}

/* ── 7. HERO PARALLAX ── */
function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const heroContent = document.querySelector('.hero-content');
  const heroHours = document.querySelector('.hero-hours-card');
  if (!heroContent) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        // Parallax only within hero viewport
        if (scrollY < window.innerHeight) {
          const y2 = scrollY * 0.12;
          if (heroHours) heroHours.style.transform = `translateY(${y2}px)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ── 8. CONTACT FORM ── */
function initContactForm() {
  const form = document.getElementById('kontakt-form');
  if (!form) return;

  const successBox = document.getElementById('form-success');

  function showError(input, msgId) {
    input.classList.add('error');
    const msg = document.getElementById(msgId);
    if (msg) msg.classList.add('visible');
  }

  function clearError(input, msgId) {
    input.classList.remove('error');
    const msg = document.getElementById(msgId);
    if (msg) msg.classList.remove('visible');
  }

  // Real-time validation on blur
  const nameInput = form.querySelector('#form-name');
  const emailInput = form.querySelector('#form-email');
  const messageInput = form.querySelector('#form-message');
  const privacyCheck = form.querySelector('#form-privacy');

  if (nameInput) {
    nameInput.addEventListener('blur', () => {
      if (!nameInput.value.trim()) {
        showError(nameInput, 'error-name');
      } else {
        clearError(nameInput, 'error-name');
      }
    });
  }

  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
      if (!valid) {
        showError(emailInput, 'error-email');
      } else {
        clearError(emailInput, 'error-email');
      }
    });
  }

  if (messageInput) {
    messageInput.addEventListener('blur', () => {
      if (!messageInput.value.trim()) {
        showError(messageInput, 'error-message');
      } else {
        clearError(messageInput, 'error-message');
      }
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let valid = true;

    // Validate name
    if (!nameInput || !nameInput.value.trim()) {
      if (nameInput) showError(nameInput, 'error-name');
      valid = false;
    } else {
      clearError(nameInput, 'error-name');
    }

    // Validate email
    const emailOk = emailInput && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
    if (!emailOk) {
      if (emailInput) showError(emailInput, 'error-email');
      valid = false;
    } else {
      clearError(emailInput, 'error-email');
    }

    // Validate message
    if (!messageInput || !messageInput.value.trim()) {
      if (messageInput) showError(messageInput, 'error-message');
      valid = false;
    } else {
      clearError(messageInput, 'error-message');
    }

    // Validate privacy
    if (!privacyCheck || !privacyCheck.checked) {
      valid = false;
      if (privacyCheck) {
        privacyCheck.parentElement.style.color = 'var(--color-accent)';
      }
    } else {
      if (privacyCheck) {
        privacyCheck.parentElement.style.color = '';
      }
    }

    if (!valid) return;

    // Build mailto URL
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const phone = form.querySelector('#form-phone') ? form.querySelector('#form-phone').value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';

    const subject = encodeURIComponent(`Nachricht über Website – ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nE-Mail: ${email}${phone ? '\nTelefon: ' + phone : ''}\n\nNachricht:\n${message}`
    );

    window.location.href = `mailto:info@kardiologen-augsburg.de?subject=${subject}&body=${body}`;

    // Show success message
    if (successBox) {
      successBox.classList.add('visible');
      form.style.opacity = '0.4';
      form.style.pointerEvents = 'none';
    }
  });
}

/* ── 9. SMOOTH SCROLL POLYFILL FOR OLDER SAFARI ── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navHeight = 90;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

/* ── INIT ALL ── */
document.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  initScrollReveal();
  initStickyNav();
  initActiveNav();
  initMobileMenu();
  initCounters();
  initParallax();
  initUeberVideoScroll();
  initContactForm();
  initSmoothScroll();
});
