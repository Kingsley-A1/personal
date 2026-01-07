/**
 * REIGN - Shared Footer Component
 * Mobile bottom navigation and desktop footer
 */

const FooterComponent = {
  /**
   * Quick action items for mobile bottom nav
   */
  quickActions: [
    { id: "dashboard", label: "Home", icon: "ph-crown", href: "index.html" },
    { id: "morning", label: "Dawn", icon: "ph-sun", href: "app/morning.html" },
    { id: "evening", label: "Dusk", icon: "ph-moon", href: "app/evening.html" },
    {
      id: "archive",
      label: "Logs",
      icon: "ph-book-open",
      href: "app/archive.html",
    },
    {
      id: "more",
      label: "More",
      icon: "ph-dots-three",
      type: "action",
      action: "FooterComponent.openMoreMenu()",
    },
  ],

  /**
   * Additional pages shown in the "More" menu
   */
  moreMenuItems: [
    {
      id: "focus",
      label: "Focus Chamber",
      icon: "ph-timer",
      href: "app/focus.html",
    },
    {
      id: "goals",
      label: "Royal Ambitions",
      icon: "ph-target",
      href: "app/goals.html",
    },
    {
      id: "reviews",
      label: "Weekly Review",
      icon: "ph-calendar-check",
      href: "app/reviews.html",
    },
    {
      id: "learning",
      label: "Learning Forge",
      icon: "ph-graduation-cap",
      href: "app/learning.html",
    },
    {
      id: "idea",
      label: "Today's Idea",
      icon: "ph-lightbulb",
      href: "app/idea.html",
    },
    {
      id: "lessons",
      label: "Daily Lessons",
      icon: "ph-book-open-text",
      href: "app/lessons.html",
    },
    {
      id: "analytics",
      label: "Progress",
      icon: "ph-chart-line-up",
      href: "app/analytics.html",
    },
    {
      id: "dailygood",
      label: "The Good in Today",
      icon: "ph-heart",
      href: "app/dailygood.html",
    },
    {
      id: "relationships",
      label: "Relationships",
      icon: "ph-heart-half",
      href: "app/relationships.html",
    },
    {
      id: "events",
      label: "Royal Calendar",
      icon: "ph-calendar-dots",
      href: "app/events.html",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "ph-user-circle",
      href: "app/profile.html",
    },
    {
      id: "docs",
      label: "Help & Docs",
      icon: "ph-book-open",
      href: "app/docs.html",
    },
    {
      id: "settings",
      label: "Settings",
      icon: "ph-gear-six",
      href: "app/settings.html",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "ph-bell",
      href: "app/notifications.html",
    },
    {
      id: "about",
      label: "About REIGN",
      icon: "ph-info",
      href: "app/about.html",
    },
    {
      id: "support",
      label: "Support",
      icon: "ph-hand-heart",
      href: "app/support.html",
    },
  ],

  /**
   * Render the mobile bottom navigation
   * @param {string} containerId - ID of the container element
   */
  render(containerId = "footer-container") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentPage = Nav.getCurrentPage();
    const basePath = window.location.pathname.includes("/app/") ? "../" : "";

    let navHTML = "";

    this.quickActions.forEach((item) => {
      if (item.type === "action") {
        navHTML += `
                    <button class="bottom-nav-btn action-btn" onclick="${item.action}" title="${item.label}">
                        <i class="ph-bold ${item.icon}"></i>
                        <span>${item.label}</span>
                    </button>
                `;
      } else {
        const isActive = item.id === currentPage;
        const href =
          item.id === "dashboard"
            ? `${basePath}index.html`
            : `${basePath}${item.href}`;

        navHTML += `
                    <a href="${href}" class="bottom-nav-btn ${
          isActive ? "active" : ""
        }">
                        <i class="ph-${isActive ? "fill" : "duotone"} ${
          item.icon
        }"></i>
                        <span>${item.label}</span>
                    </a>
                `;
      }
    });

    container.innerHTML = `
            <nav class="mobile-nav">
                ${navHTML}
            </nav>
            
            <!-- More Menu Modal -->
            <div id="more-menu-overlay" class="more-menu-overlay" onclick="FooterComponent.closeMoreMenu()"></div>
            <div id="more-menu" class="more-menu">
                <div class="more-menu-header">
                    <h3>More from REIGN</h3>
                    <button class="more-menu-close" onclick="FooterComponent.closeMoreMenu()">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
                <div class="more-menu-grid">
                    ${this.moreMenuItems
                      .map(
                        (item) => `
                        <a href="${basePath}${item.href}" class="more-menu-item">
                            <i class="ph-duotone ${item.icon}"></i>
                            <span>${item.label}</span>
                        </a>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  },

  /**
   * Open the "More" menu
   */
  openMoreMenu() {
    const menu = document.getElementById("more-menu");
    const overlay = document.getElementById("more-menu-overlay");
    if (menu) {
      menu.classList.add("show");
    }
    if (overlay) {
      overlay.classList.add("show");
    }
  },

  /**
   * Close the "More" menu
   */
  closeMoreMenu() {
    const menu = document.getElementById("more-menu");
    const overlay = document.getElementById("more-menu-overlay");
    if (menu) {
      menu.classList.remove("show");
    }
    if (overlay) {
      overlay.classList.remove("show");
    }
  },

  /**
   * Open quick add modal
   */
  openQuickAdd() {
    const content = `
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="ph-duotone ph-plus-circle" style="color: var(--royal-gold);"></i>
                    Quick Add
                </h2>
                <button class="modal-close" onclick="UI.closeModal()">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="quick-add-grid">
                    <a href="${this.getBasePath()}app/morning.html" class="quick-add-item">
                        <i class="ph-duotone ph-sun-horizon" style="color: #f59e0b;"></i>
                        <span>Morning Tasks</span>
                    </a>
                    <a href="${this.getBasePath()}app/idea.html" class="quick-add-item">
                        <i class="ph-duotone ph-lightbulb" style="color: #8b5cf6;"></i>
                        <span>New Idea</span>
                    </a>
                    <a href="${this.getBasePath()}app/lessons.html" class="quick-add-item">
                        <i class="ph-duotone ph-book-open-text" style="color: #60a5fa; text-shadow: 0 0 8px rgba(96, 165, 250, 0.4);"></i>
                        <span>Daily Lesson</span>
                    </a>
                    <a href="${this.getBasePath()}app/dailygood.html" class="quick-add-item">
                        <i class="ph-duotone ph-heart" style="color: #ec4899;"></i>
                        <span>Good Thing</span>
                    </a>
                    <a href="${this.getBasePath()}app/relationships.html" class="quick-add-item">
                        <i class="ph-duotone ph-user-plus" style="color: #10b981;"></i>
                        <span>Add Person</span>
                    </a>
                    <a href="${this.getBasePath()}app/events.html" class="quick-add-item">
                        <i class="ph-duotone ph-calendar-plus" style="color: #06b6d4;"></i>
                        <span>New Event</span>
                    </a>
                </div>
            </div>
        `;
    UI.showModal(content);
  },

  /**
   * Get base path for links
   */
  getBasePath() {
    return window.location.pathname.includes("/app/") ? "../" : "";
  },
};
