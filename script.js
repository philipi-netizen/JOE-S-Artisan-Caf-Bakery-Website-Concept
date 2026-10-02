(() => {
  "use strict";

  /* =========================================================
     JOE'S ARTISAN CAFÉ & BAKERY
     Interaction Layer
     ========================================================= */

  const SELECTORS = {
    navbar: ".navbar",
    navLinks: ".nav-link",
    menuToggle: ".menu-toggle",
    mobileMenu: ".mobile-menu",
    reveal: ".reveal",
    hero: ".hero",
    heroMedia: ".hero-media img",
    whatsapp: ".whatsapp-link, .floating-whatsapp",
    buttons: ".button, .nav-cta"
  };

  const WHATSAPP_NUMBER = "265888841119";

  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  const navbar = document.querySelector(SELECTORS.navbar);
  const menuToggle = document.querySelector(SELECTORS.menuToggle);
  const mobileMenu = document.querySelector(SELECTORS.mobileMenu);
  const hero = document.querySelector(SELECTORS.hero);
  const heroImage = document.querySelector(SELECTORS.heroMedia);

  let lastScrollY = window.scrollY || window.pageYOffset || 0;
  let scrollTicking = false;
  let parallaxTicking = false;
  let menuOpen = false;
  let previousFocusedElement = null;

  const MOBILE_BREAKPOINT = 900;
  const PARALLAX_BREAKPOINT = 760;
  const NAV_SCROLL_THRESHOLD = 32;
  const NAV_HIDE_DISTANCE = 8;


  /* =========================================================
     UTILITIES
     ========================================================= */

  const isReducedMotion = () => prefersReducedMotion.matches;

  const isMobileMenuViewport = () =>
    window.innerWidth <= MOBILE_BREAKPOINT;

  const isParallaxViewport = () =>
    window.innerWidth > PARALLAX_BREAKPOINT && !isReducedMotion();

  const getNavHeight = () =>
    navbar ? Math.ceil(navbar.getBoundingClientRect().height) : 0;

  const getScrollY = () =>
    window.scrollY || window.pageYOffset || 0;

  const setBodyMenuLock = (locked) => {
    document.body.classList.toggle("menu-open", locked);
  };


  /* =========================================================
     PRELOADER
     ========================================================= */

  const initPreloader = () => {
    const preloader = document.querySelector(".preloader");

    if (!preloader) return;

    let hidden = false;

    const hidePreloader = () => {
      if (hidden) return;
      hidden = true;

      preloader.classList.add("is-hidden");
      preloader.setAttribute("aria-hidden", "true");

      /*
       * Remove it from interaction after the transition.
       * Keeping the element in the DOM briefly allows the
       * existing CSS transition to finish cleanly.
       */
      window.setTimeout(() => {
        preloader.style.pointerEvents = "none";
        preloader.setAttribute("inert", "");
      }, 700);
    };

    /*
     * Normal path: wait until all critical page assets have loaded.
     */
    if (document.readyState === "complete") {
      window.setTimeout(hidePreloader, 250);
    } else {
      window.addEventListener("load", () => {
        window.setTimeout(hidePreloader, 250);
      }, { once: true });
    }

    /*
     * Safety fallback: never leave the visitor trapped behind
     * the preloader because of a slow/broken external asset.
     */
    window.setTimeout(hidePreloader, 4500);
  };


  /* =========================================================
     SMOOTH ANCHOR SCROLLING
     ========================================================= */

  const getAnchorTarget = (link) => {
    if (!link) return null;

    const href = link.getAttribute("href");

    if (!href || href === "#") return null;
    if (!href.startsWith("#")) return null;

    const id = href.slice(1);

    if (!id) return null;

    return document.getElementById(decodeURIComponent(id));
  };

  const scrollToTarget = (target) => {
    if (!target) return;

    const navOffset = getNavHeight();
    const targetTop =
      target.getBoundingClientRect().top +
      getScrollY() -
      navOffset -
      12;

    if (isReducedMotion()) {
      window.scrollTo(0, Math.max(0, targetTop));
      return;
    }

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth"
    });
  };

  const initSmoothAnchors = () => {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");

        /*
         * "#" is intentionally used by the existing concept
         * for secondary pages that are not built yet.
         * Do not hijack it into a scroll-to-top action.
         */
        if (!href || href === "#") {
          event.preventDefault();
          return;
        }

        const target = getAnchorTarget(link);

        if (!target) return;

        event.preventDefault();

        /*
         * Close mobile navigation before scrolling.
         */
        if (menuOpen) {
          closeMobileMenu();
        }

        scrollToTarget(target);

        /*
         * Keep keyboard/screen-reader focus meaningful.
         */
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
        }

        window.setTimeout(() => {
          try {
            target.focus({ preventScroll: true });
          } catch {
            target.focus();
          }
        }, isReducedMotion() ? 0 : 450);
      });
    });
  };


  /* =========================================================
     NAVBAR — COMPACT + HIDE / REVEAL
     ========================================================= */

  const updateNavbar = () => {
    if (!navbar) return;

    const currentY = getScrollY();
    const delta = currentY - lastScrollY;

    navbar.classList.toggle(
      "scrolled",
      currentY > NAV_SCROLL_THRESHOLD
    );

    /*
     * Always show the navbar at the very top.
     */
    if (currentY <= NAV_SCROLL_THRESHOLD) {
      navbar.classList.remove("hidden");
      lastScrollY = currentY;
      return;
    }

    /*
     * Never hide the navbar while the mobile menu is open.
     */
    if (menuOpen) {
      navbar.classList.remove("hidden");
      lastScrollY = currentY;
      return;
    }

    /*
     * Small movements are ignored to prevent jitter.
     */
    if (Math.abs(delta) < NAV_HIDE_DISTANCE) {
      return;
    }

    if (delta > 0 && currentY > 120) {
      navbar.classList.add("hidden");
    } else if (delta < 0) {
      navbar.classList.remove("hidden");
    }

    lastScrollY = currentY;
  };

  const requestNavbarUpdate = () => {
    if (scrollTicking) return;

    scrollTicking = true;

    window.requestAnimationFrame(() => {
      updateNavbar();
      scrollTicking = false;
    });
  };

  const initNavbar = () => {
    if (!navbar) return;

    window.addEventListener("scroll", requestNavbarUpdate, {
      passive: true
    });

    window.addEventListener("resize", () => {
      if (!isMobileMenuViewport() && menuOpen) {
        closeMobileMenu();
      }

      requestNavbarUpdate();
      requestParallaxUpdate();
    }, { passive: true });

    updateNavbar();
  };


  /* =========================================================
     ACTIVE NAVIGATION SECTION
     ========================================================= */

  const initActiveNavigation = () => {
    const navLinks = Array.from(
      document.querySelectorAll(SELECTORS.navLinks)
    );

    if (!navLinks.length) return;

    const sectionIds = [
      "home",
      "about",
      "menu",
      "cakes",
      "visit"
    ];

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!sections.length) return;

    const linkForSection = (sectionId) =>
      navLinks.find((link) => {
        const href = link.getAttribute("href");
        return href === `#${sectionId}`;
      });

    const setActiveSection = (sectionId) => {
      navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        const isActive = href === `#${sectionId}`;

        link.classList.toggle("active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    /*
     * Near the top, Home should remain active.
     */
    const updateTopState = () => {
      if (getScrollY() < 160) {
        setActiveSection("home");
      }
    };

    /*
     * IntersectionObserver avoids continuous section calculations
     * during scrolling.
     */
    if ("IntersectionObserver" in window) {
      const visibleSections = new Map();

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            visibleSections.set(entry.target.id, entry.isIntersecting);
          });

          const currentVisible = sections.filter(
            (section) => visibleSections.get(section.id)
          );

          if (!currentVisible.length) {
            updateTopState();
            return;
          }

          /*
           * Choose the section closest to the top of the viewport
           * among currently visible sections.
           */
          const sorted = currentVisible.sort((a, b) => {
            const aTop = Math.abs(
              a.getBoundingClientRect().top - getNavHeight()
            );
            const bTop = Math.abs(
              b.getBoundingClientRect().top - getNavHeight()
            );

            return aTop - bTop;
          });

          if (sorted[0]) {
            setActiveSection(sorted[0].id);
          }
        },
        {
          root: null,
          rootMargin: `-${getNavHeight() + 15}px 0px -55% 0px`,
          threshold: [0.05, 0.2, 0.5]
        }
      );

      sections.forEach((section) => observer.observe(section));
    } else {
      /*
       * Graceful fallback for browsers without IntersectionObserver.
       */
      updateTopState();
    }

    window.addEventListener("scroll", updateTopState, {
      passive: true
    });

    /*
     * Keep an unused reference logically meaningful for environments
     * where minification/tree-shaking may otherwise remove the helper.
     */
    void linkForSection;
  };


  /* =========================================================
     MOBILE MENU
     ========================================================= */

  const setMenuAccessibility = (open) => {
    if (!menuToggle || !mobileMenu) return;

    menuToggle.setAttribute("aria-expanded", String(open));

    mobileMenu.setAttribute("aria-hidden", String(!open));

    if (open) {
      mobileMenu.removeAttribute("inert");
    } else {
      mobileMenu.setAttribute("inert", "");
    }
  };

  const openMobileMenu = () => {
    if (!menuToggle || !mobileMenu || menuOpen) return;

    menuOpen = true;
    previousFocusedElement = document.activeElement;

    mobileMenu.classList.add("is-open");
    menuToggle.classList.add("is-open");

    setBodyMenuLock(true);
    setMenuAccessibility(true);

    /*
     * Focus the first useful interactive element.
     */
    const firstFocusable = mobileMenu.querySelector(
      "a, button, [tabindex]:not([tabindex='-1'])"
    );

    window.setTimeout(() => {
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 50);
  };

  const closeMobileMenu = () => {
    if (!menuToggle || !mobileMenu || !menuOpen) return;

    menuOpen = false;

    mobileMenu.classList.remove("is-open");
    menuToggle.classList.remove("is-open");

    setBodyMenuLock(false);
    setMenuAccessibility(false);

    /*
     * Return focus to the menu button where appropriate.
     */
    if (
      previousFocusedElement &&
      typeof previousFocusedElement.focus === "function"
    ) {
      window.setTimeout(() => {
        try {
          previousFocusedElement.focus({ preventScroll: true });
        } catch {
          previousFocusedElement.focus();
        }
      }, 0);
    }

    previousFocusedElement = null;
  };

  const initMobileMenu = () => {
    if (!menuToggle || !mobileMenu) return;

    /*
     * Establish accessible state without requiring HTML edits.
     */
    if (!menuToggle.hasAttribute("aria-expanded")) {
      menuToggle.setAttribute("aria-expanded", "false");
    }

    if (!menuToggle.hasAttribute("aria-controls")) {
      if (!mobileMenu.id) {
        mobileMenu.id = "mobile-navigation";
      }

      menuToggle.setAttribute(
        "aria-controls",
        mobileMenu.id
      );
    }

    if (!mobileMenu.hasAttribute("aria-hidden")) {
      mobileMenu.setAttribute("aria-hidden", "true");
    }

    mobileMenu.setAttribute("inert", "");

    menuToggle.addEventListener("click", (event) => {
      event.preventDefault();

      if (menuOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    /*
     * Close after selecting a mobile navigation link.
     */
    mobileMenu.addEventListener("click", (event) => {
      const link = event.target.closest("a");

      if (!link) return;

      closeMobileMenu();
    });

    /*
     * Close when clicking the menu background itself.
     * Actual links/content remain interactive.
     */
    mobileMenu.addEventListener("click", (event) => {
      if (event.target === mobileMenu) {
        closeMobileMenu();
      }
    });

    /*
     * Escape closes the menu.
     */
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuOpen) {
        event.preventDefault();
        closeMobileMenu();
      }
    });

    /*
     * Prevent accidental interaction with the menu when closed.
     */
    setMenuAccessibility(false);
  };


  /* =========================================================
     INTERSECTION OBSERVER — SECTION REVEALS
     ========================================================= */

  const initRevealAnimations = () => {
    const revealElements = Array.from(
      document.querySelectorAll(SELECTORS.reveal)
    );

    if (!revealElements.length) return;

    /*
     * Accessibility / reduced-motion mode:
     * reveal immediately rather than leaving content hidden.
     */
    if (isReducedMotion()) {
      revealElements.forEach((element) => {
        element.classList.add("is-visible");
        element.style.removeProperty("transition-delay");
      });

      return;
    }

    if (!("IntersectionObserver" in window)) {
      revealElements.forEach((element) => {
        element.classList.add("is-visible");
      });

      return;
    }

    /*
     * Automatically stagger siblings/groups without requiring
     * additional HTML classes.
     */
    const groups = new Map();

    revealElements.forEach((element) => {
      const parent = element.parentElement;

      if (!parent) return;

      if (!groups.has(parent)) {
        groups.set(parent, []);
      }

      groups.get(parent).push(element);
    });

    groups.forEach((elements) => {
      if (elements.length < 2) return;

      elements.forEach((element, index) => {
        const delay = Math.min(index * 70, 350);

        element.style.transitionDelay = `${delay}ms`;
      });
    });

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");

          /*
           * Once visible, stop observing to avoid unnecessary work.
           */
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12
      }
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });
  };


  /* =========================================================
     RESTRAINED HERO PARALLAX
     ========================================================= */

  const updateParallax = () => {
    parallaxTicking = false;

    if (!hero || !heroImage) return;

    if (!isParallaxViewport()) {
      heroImage.style.setProperty("--hero-parallax", "0px");
      return;
    }

    const rect = hero.getBoundingClientRect();

    /*
     * Stop processing once the hero is well outside the viewport.
     */
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      return;
    }

    /*
     * Small movement only.
     * The image already has a subtle scale in CSS.
     */
    const progress =
      (window.innerHeight - rect.top) /
      (window.innerHeight + rect.height);

    const clamped = Math.max(0, Math.min(1, progress));

    const offset = (clamped - 0.5) * 24;

    heroImage.style.setProperty(
      "--hero-parallax",
      `${offset.toFixed(2)}px`
    );
  };

  const requestParallaxUpdate = () => {
    if (parallaxTicking) return;

    parallaxTicking = true;

    window.requestAnimationFrame(updateParallax);
  };

  const initParallax = () => {
    if (!hero || !heroImage) return;

    if (!isParallaxViewport()) {
      heroImage.style.setProperty("--hero-parallax", "0px");
      return;
    }

    window.addEventListener("scroll", requestParallaxUpdate, {
      passive: true
    });

    requestParallaxUpdate();
  };


  /* =========================================================
     CONTEXTUAL WHATSAPP
     ========================================================= */

  const createWhatsAppUrl = (message) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  const initWhatsApp = () => {
    const links = document.querySelectorAll(SELECTORS.whatsapp);

    if (!links.length) return;

    links.forEach((link) => {
      let message = "Hi, I'd like to make an enquiry.";

      /*
       * Floating/global WhatsApp.
       */
      if (link.classList.contains("floating-whatsapp")) {
        message = "Hi, I'd like to make an enquiry.";
      }

      /*
       * Custom cake CTA.
       */
      const cakeParent = link.closest(
        ".cakes-section, .custom-cakes, [data-section='cakes']"
      );

      if (
        cakeParent ||
        link.classList.contains("cake-whatsapp") ||
        link.textContent.toLowerCase().includes("cake")
      ) {
        message = "Hi, I'd like to enquire about a custom cake.";
      }

      /*
       * Menu/café CTA.
       */
      const menuParent = link.closest(
        ".menu-feature, .featured-menu, [data-section='menu']"
      );

      if (
        menuParent ||
        link.classList.contains("menu-whatsapp") ||
        link.textContent.toLowerCase().includes("menu")
      ) {
        message = "Hi, I'd like to enquire about the menu.";
      }

      /*
       * Explicit data attribute wins if the existing HTML has one.
       */
      const customMessage = link.getAttribute(
        "data-whatsapp-message"
      );

      if (customMessage) {
        message = customMessage;
      }

      link.setAttribute("href", createWhatsAppUrl(message));
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");

      /*
       * Prevent accidental duplicate navigation caused by malformed
       * old href values.
       */
      link.addEventListener("click", () => {
        link.setAttribute("href", createWhatsAppUrl(message));
      });
    });
  };


  /* =========================================================
     SUBTLE INTERACTION FEEDBACK
     ========================================================= */

  const initInteractionFeedback = () => {
    const interactiveElements = document.querySelectorAll(
      SELECTORS.buttons
    );

    if (!interactiveElements.length) return;

    interactiveElements.forEach((element) => {
      const pressOn = () => {
        element.classList.add("is-pressed");
      };

      const pressOff = () => {
        element.classList.remove("is-pressed");
      };

      element.addEventListener("pointerdown", pressOn, {
        passive: true
      });

      element.addEventListener("pointerup", pressOff, {
        passive: true
      });

      element.addEventListener("pointercancel", pressOff, {
        passive: true
      });

      element.addEventListener("pointerleave", pressOff, {
        passive: true
      });

      element.addEventListener("blur", pressOff);

      element.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          pressOn();
        }
      });

      element.addEventListener("keyup", (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          pressOff();
        }
      });
    });
  };


  /* =========================================================
     IMAGE SAFETY / LAZY LOADING
     ========================================================= */

  const initImageHandling = () => {
    const images = document.querySelectorAll("img");

    images.forEach((image) => {
      /*
       * Keep the logo/hero eager; defer non-critical imagery.
       */
      const isHeroImage = image === heroImage;
      const isLogo = image.classList.contains("logo");

      if (!isHeroImage && !isLogo && !image.hasAttribute("loading")) {
        image.setAttribute("loading", "lazy");
      }

      if (!image.hasAttribute("decoding")) {
        image.setAttribute("decoding", "async");
      }

      /*
       * Prevent broken image dimensions from causing avoidable
       * layout instability where width/height are already provided.
       */
      image.addEventListener("error", () => {
        image.classList.add("image-error");
      }, { once: true });
    });
  };


  /* =========================================================
     KEYBOARD / FOCUS SAFETY
     ========================================================= */

  const initKeyboardSafety = () => {
    /*
     * Prevent keyboard focus from escaping into hidden mobile menu.
     * The inert attribute handles modern browsers.
     * This additional check protects the menu's state.
     */
    document.addEventListener("focusin", (event) => {
      if (!menuOpen && mobileMenu?.contains(event.target)) {
        event.target.blur();

        if (menuToggle) {
          menuToggle.focus();
        }
      }
    });
  };


  /* =========================================================
     REDUCED MOTION CHANGE HANDLING
     ========================================================= */

  const initMotionPreferenceHandling = () => {
    if (!prefersReducedMotion || typeof prefersReducedMotion.addEventListener !== "function") {
      return;
    }

    prefersReducedMotion.addEventListener("change", () => {
      if (prefersReducedMotion.matches) {
        document.querySelectorAll(SELECTORS.reveal).forEach((element) => {
          element.classList.add("is-visible");
          element.style.removeProperty("transition-delay");
        });

        if (heroImage) {
          heroImage.style.setProperty("--hero-parallax", "0px");
        }
      } else {
        requestParallaxUpdate();
      }
    });
  };


  /* =========================================================
     INITIALIZATION
     ========================================================= */

  const init = () => {
    initPreloader();
    initNavbar();
    initSmoothAnchors();
    initActiveNavigation();
    initMobileMenu();
    initRevealAnimations();
    initParallax();
    initWhatsApp();
    initInteractionFeedback();
    initImageHandling();
    initKeyboardSafety();
    initMotionPreferenceHandling();
  };


  /*
   * Works whether this file is loaded with `defer`, at the end
   * of <body>, or dynamically after the document is ready.
   */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

})();