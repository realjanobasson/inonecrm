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

})();
