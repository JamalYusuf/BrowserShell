/** Interactive demo tabs, theme toggle, scroll reveal, command rotator */
(function () {
  const THEME_KEY = 'bs-site-theme';

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(next);
  }

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', toggleTheme);

  const demoRoot = document.querySelector('[data-demo-root]');
  if (demoRoot) {
    const tabs = demoRoot.querySelectorAll('.demo-tab');
    const panels = demoRoot.querySelectorAll('[data-demo-panel]');
    const siteLabel = demoRoot.querySelector('[data-demo-site]');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const id = tab.dataset.demoId;
        const site = tab.dataset.demoSite;
        tabs.forEach((t) => {
          t.classList.toggle('active', t === tab);
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        panels.forEach((p) => {
          const show = p.dataset.demoPanel === id;
          p.classList.toggle('active', show);
          p.hidden = !show;
        });
        if (siteLabel && site) siteLabel.textContent = site;
      });
    });
  }

  const rotator = document.querySelector('[data-command-rotator]');
  if (rotator) {
    const commands = [
      'tabs | grep github',
      'history search react',
      'downloads',
      'forget --dry-run',
      'links | head',
      'watch 5 tabs',
      'bookmark search docs',
      'siteinfo',
      'ai summarize',
    ];
    let i = 0;
    const cmdEl = rotator.querySelector('[data-rotator-cmd]');
    const cycle = () => {
      if (!cmdEl) return;
      cmdEl.style.opacity = '0';
      setTimeout(() => {
        cmdEl.textContent = commands[i % commands.length];
        cmdEl.style.opacity = '1';
        i += 1;
      }, 180);
    };
    cycle();
    setInterval(cycle, 2800);
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')?.slice(1);
      const el = id && document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }
})();