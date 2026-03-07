window.InOneCRM = window.InOneCRM || {};

(() => {
  const y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());

  const btn = document.querySelector("[data-menu]");
  const mobile = document.querySelector("[data-mobile]");
  if (btn && mobile) {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      mobile.hidden = open ? true : false;
    });
    mobile.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      btn.setAttribute("aria-expanded", "false");
      mobile.hidden = true;
    }));
  }

  // smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // reveal
  const items = Array.from(document.querySelectorAll("[data-reveal]"));
  if (items.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.16 });
    items.forEach(el => io.observe(el));
  }

  // screens gallery scroll progress + active step
  const gallery = document.querySelector(".gallery");
  if (gallery) {
    const steps = Array.from(gallery.querySelectorAll(".gItem"));
    // active highlight
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          steps.forEach(s => s.classList.toggle("is-active", s === en.target));
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 });
    steps.forEach(s => io2.observe(s));

    // progress rail
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = gallery.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const mid = vh * 0.52;
      const total = Math.max(1, r.height);
      const passed = mid - r.top;
      const prog = Math.max(0, Math.min(1, passed / total));
      gallery.style.setProperty("--prog", prog.toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
  }


  // panorama parallax + counters
  const panoramas = Array.from(document.querySelectorAll("[data-panorama]"));
  panoramas.forEach((card) => {
    const img = card.querySelector("[data-panorama-image]");
    const setVars = (x = 0, y = 0) => {
      const tx = Math.max(-12, Math.min(12, x));
      const ty = Math.max(-10, Math.min(10, y));
      card.style.setProperty("--tx", tx.toFixed(2));
      card.style.setProperty("--ty", ty.toFixed(2));
      card.style.setProperty("--mx", `${(tx * 1.2).toFixed(2)}px`);
      card.style.setProperty("--my", `${(ty * 1.2).toFixed(2)}px`);
      if (img) {
        img.style.setProperty("--py", `${(ty * 0.8).toFixed(2)}px`);
        img.style.setProperty("--ps", (1.02 + Math.abs(tx) * 0.0015).toFixed(3));
      }
    };

    const onMove = (event) => {
      if (window.matchMedia("(max-width: 860px)").matches) return;
      const r = card.getBoundingClientRect();
      const px = (event.clientX - r.left) / r.width - 0.5;
      const py = (event.clientY - r.top) / r.height - 0.5;
      setVars(px * 24, py * 18);
    };

    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", () => setVars(0, 0));

    let ticking = false;
    const onScrollPanorama = () => {
      if (ticking || window.matchMedia("(max-width: 860px)").matches) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const progress = ((vh * 0.58) - r.top) / (vh + r.height);
        const shift = Math.max(-10, Math.min(10, (progress - 0.5) * 24));
        card.style.setProperty("--my", `${shift.toFixed(2)}px`);
        if (img) img.style.setProperty("--py", `${(shift * 1.2).toFixed(2)}px`);
        ticking = false;
      });
    };
    onScrollPanorama();
    window.addEventListener("scroll", onScrollPanorama, { passive: true });
    window.addEventListener("resize", onScrollPanorama);

    const counters = Array.from(card.querySelectorAll("[data-count]"));
    if (counters.length) {
      let ran = false;
      const fmt = (n) => Number.isInteger(n) ? String(n) : n.toFixed(1);
      const runCounters = () => {
        if (ran) return;
        ran = true;
        counters.forEach((el) => {
          const target = Number(el.getAttribute("data-count") || 0);
          const suffix = target === 24 ? "h" : target === 5 ? "×" : target === 100 ? "%" : target === 37 ? "%" : "";
          const start = performance.now();
          const dur = 1300;
          const tick = (now) => {
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(target * eased);
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = `${fmt(target)}${suffix}`;
          };
          requestAnimationFrame(tick);
        });
      };
      const io3 = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runCounters();
            io3.disconnect();
          }
        });
      }, { threshold: 0.35 });
      io3.observe(card);
    }
  });

  InOneCRM.contact = function (event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const name = String(data.get("name") || "");
    const email = String(data.get("email") || "");
    const phone = String(data.get("phone") || "");
    const business = String(data.get("business") || "");
    const message = String(data.get("message") || "");
    const subject = encodeURIComponent("InOneCRM Contact / Trial Request");
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nBusiness: ${business}\n\nMessage:\n${message}`);
    window.location.href = `mailto:sales@inonecrm.com?subject=${subject}&body=${body}`;
    return false;
  };

  InOneCRM.signup = function (event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const email = String(data.get("email") || "");
    const company = String(data.get("company") || "");
    const password = String(data.get("password") || "");
    const phone = String(data.get("phone") || "");
    const business = String(data.get("business") || "");
    const message = String(data.get("message") || "");
    const subject = encodeURIComponent("InOneCRM Signup (7‑Day Trial)");
    const body = encodeURIComponent(`Work email: ${email}\nCompany: ${company}\nPhone: ${phone}\n\nPassword/OTP note: ${password}\nBusiness: ${business}\n\nProblem:\n${message}`);
    window.location.href = `mailto:sales@inonecrm.com?subject=${subject}&body=${body}`;
    return false;
  };


// Client portal (update this URL if your app runs elsewhere)
InOneCRM.portalUrl = "https://app.inonecrm.com";

InOneCRM.login = function (event) {
  event.preventDefault();
  // Static marketing site: redirect existing users to the client portal.
  window.location.href = InOneCRM.portalUrl;
  return false;
};


// enterprise gallery media parallax
const mediaCards = Array.from(document.querySelectorAll('.gItem .gMedia'));
mediaCards.forEach((media) => {
  const img = media.querySelector('img');
  if (!img) return;
  const reset = () => {
    media.style.setProperty('--mx','0px');
    media.style.setProperty('--my','0px');
    media.style.setProperty('--ms','1');
  };
  const move = (event) => {
    if (window.matchMedia('(max-width: 920px)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = media.getBoundingClientRect();
    const px = ((event.clientX - r.left) / r.width - 0.5) * 14;
    const py = ((event.clientY - r.top) / r.height - 0.5) * 10;
    media.style.setProperty('--mx', `${px.toFixed(2)}px`);
    media.style.setProperty('--my', `${py.toFixed(2)}px`);
    media.style.setProperty('--ms', '1.012');
  };
  media.addEventListener('mousemove', move);
  media.addEventListener('mouseleave', reset);
  reset();
});

})();
