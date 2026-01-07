/**
 * REIGN - Core Module
 * Shared utilities, authentication, storage, and common functionality
 * This module is loaded on ALL pages for consistent behavior
 * @version 1.0.0
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  APP_NAME: "REIGN",
  APP_VERSION: "2.0.0",
  // Use /api for production (Vercel proxy), localhost:3001 for dev
  API_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3001/api"
      : "/api",
  STORAGE_KEY: "reignData",
  AUTH_TOKEN_KEY: "reign_token",
  USER_KEY: "reign_user",
  THEME_KEY: "reign_theme",

  getAuthToken() {
    return localStorage.getItem(this.AUTH_TOKEN_KEY);
  },

  setAuthToken(token) {
    localStorage.setItem(this.AUTH_TOKEN_KEY, token);
  },

  clearAuth() {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },
};

// ============================================
// STORAGE MODULE
// ============================================
const Storage = {
  /**
   * Get today's date key
   * @returns {string} YYYY-MM-DD format
   */
  getToday() {
    const today = new Date();
    return today.toISOString().split("T")[0];
  },

  /**
   * Get all app data
   * @returns {Object} Complete app data
   */
  getData() {
    try {
      const data = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to parse storage data:", e);
    }
    return this.getDefaultData();
  },

  /**
   * Save app data
   * @param {Object} data - Data to save
   * @param {boolean} skipSync - Skip auto-sync (to prevent loops)
   */
  saveData(data, skipSync = false) {
    try {
      data.lastUpdated = new Date().toISOString();
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));

      // Auto-sync to cloud if logged in (debounced)
      if (!skipSync && typeof Sync !== "undefined" && Auth.isLoggedIn()) {
        Sync.debouncedUpload();
      }

      return true;
    } catch (e) {
      console.error("Failed to save data:", e);
      if (e.name === "QuotaExceededError") {
        Utils.showToast("Storage full! Please clear some old data.", "danger");
      }
      return false;
    }
  },

  /**
   * Get default data structure
   * @returns {Object} Empty data structure
   */
  getDefaultData() {
    return {
      logs: {},
      learning: { courses: [], streak: 0 },
      ideas: [],
      lessons: [],
      dailyGood: [],
      relationships: [],
      events: [],
      savings: { goals: [], transactions: [] },
      goals: {
        vision: "",
        yearly: [],
        monthly: [],
        weekly: [],
        reviews: [],
      },
      focus: {
        settings: {
          focusDuration: 25,
          shortBreak: 5,
          longBreak: 15,
          pomodorosUntilLong: 4,
          soundEnabled: true,
        },
        sessions: [],
        stats: {
          totalPomodoros: 0,
          totalFocusMinutes: 0,
          currentStreak: 0,
          bestStreak: 0,
        },
      },
      settings: {
        username: "King",
        role: "king",
        theme: "dark",
        notifications: true,
        soundEnabled: false,
      },
      lastUpdated: null,
    };
  },

  /**
   * Get analytics summary
   * @param {Object} data - App data
   * @returns {Object} Analytics summary
   */
  getAnalytics(data) {
    const logs = data.logs || {};
    const totalDays = Object.keys(logs).length;
    const totalTasks = Object.values(logs).reduce((sum, log) => {
      return sum + (log.morning?.tasks?.length || 0);
    }, 0);
    const completedTasks = Object.values(logs).reduce((sum, log) => {
      return (
        sum +
        (log.morning?.tasks?.filter((t) => t.status === "completed").length ||
          0)
      );
    }, 0);

    return {
      totalDays,
      totalTasks,
      completedTasks,
      completionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  },

  /**
   * Get last 7 days of activity
   * @param {Object} data - App data
   * @returns {Array} Last 7 days summary
   */
  getLast7Days(data) {
    const days = [];
    const logs = data.logs || {};

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      const log = logs[dateKey];

      days.push({
        date: dateKey,
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        hasMorning: !!log?.morning,
        hasEvening: !!log?.evening,
        tasksCompleted:
          log?.morning?.tasks?.filter((t) => t.status === "completed").length ||
          0,
        totalTasks: log?.morning?.tasks?.length || 0,
      });
    }

    return days;
  },
};

// ============================================
// UTILITIES MODULE
// ============================================
const Utils = {
  /**
   * Get appropriate greeting based on time
   * @returns {string} Greeting text
   */
  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  },

  /**
   * Get user's name from settings or auth
   * @returns {string} Username or empty string
   */
  getUserName() {
    const user = Auth.getUser();
    if (user && user.name) {
      return user.name.split(" ")[0];
    }
    const data = Storage.getData();
    return data.settings?.username || "";
  },

  /**
   * Get personalized greeting with role and name
   * @returns {string} Complete personalized greeting
   */
  getPersonalizedGreeting() {
    const greeting = this.getGreeting();
    const user = Auth.getUser();
    const data = Storage.getData();
    const role = data.settings?.role;

    // Case 1: Registered user with role
    if (user && user.name) {
      const firstName = user.name.split(" ")[0];
      const roleTitle = role === "queen" ? "Queen" : "King";
      return `${greeting} ${roleTitle} ${firstName}`;
    }

    // Case 2: Role selected but not registered
    if (role && !user) {
      const roleTitle = role === "queen" ? "Queen" : "King";
      return `${greeting} ${roleTitle}`;
    }

    // Case 3: Not registered, no role
    return greeting;
  },

  /**
   * Get motivational quote with rotation to ensure all quotes are shown
   * @returns {string} Quote text with author
   */
  getRandomQuote() {
    const quotes = [
      // Discipline & Character
      "A king is not born, he is made through discipline and purpose. – REIGN",
      "Rule your morning, and you rule your day. – REIGN",
      "Greatness is not in never falling, but in rising every time we fall. – Nelson Mandela",
      "The crown weighs heavy on those who refuse to prepare. – REIGN",
      "Today's choices are tomorrow's legacy. – REIGN",
      "Discipline is the crown jewel of character. – REIGN",
      "Every sunrise is a new decree waiting to be written. – REIGN",
      "The throne belongs to those who show up daily. – REIGN",
      "Small consistent actions build empires. – REIGN",
      "Your kingdom is only as strong as your habits. – REIGN",

      // Success & Achievement
      "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
      "The only way to do great work is to love what you do. – Steve Jobs",
      "It is not the strongest of the species that survives, but the most adaptable. – Charles Darwin",
      "In the middle of difficulty lies opportunity. – Albert Einstein",
      "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
      "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
      "The best time to plant a tree was 20 years ago. The second best time is now. – Chinese Proverb",
      "Excellence is not a destination but a continuous journey. – Brian Tracy",
      "Champions keep playing until they get it right. – Billie Jean King",
      "The harder you work, the luckier you get. – Gary Player",

      // Leadership & Wisdom
      "A leader is one who knows the way, goes the way, and shows the way. – John C. Maxwell",
      "He who conquers himself is the mightiest warrior. – Confucius",
      "The greatest glory in living lies not in never falling, but in rising every time we fall. – Nelson Mandela",
      "Leadership is not about being in charge. It's about taking care of those in your charge. – Simon Sinek",
      "The price of greatness is responsibility. – Winston Churchill",
      "Before you are a leader, success is about growing yourself. When you become a leader, success is about growing others. – Jack Welch",
      "True nobility is not about being better than others, it's about being better than your former self. – REIGN",
      "A throne earned through wisdom outlasts one seized by force. – REIGN",
      "The mark of a true sovereign is measured in the lives they uplift. – REIGN",
      "Crowns are forged in the fires of perseverance. – REIGN",

      // Mindset & Growth
      "Whether you think you can or you think you can't, you're right. – Henry Ford",
      "The mind is everything. What you think you become. – Buddha",
      "Your only limit is your mind. – REIGN",
      "The greatest weapon against stress is our ability to choose one thought over another. – William James",
      "It's not what happens to you, but how you react that matters. – Epictetus",
      "The only impossible journey is the one you never begin. – Tony Robbins",
      "Growth and comfort do not coexist. – Ginni Rometty",
      "Every master was once a disaster. – T. Harv Eker",
      "The only person you are destined to become is the person you decide to be. – Ralph Waldo Emerson",
      "Believe you can and you're halfway there. – Theodore Roosevelt",

      // Action & Courage
      "Do not wait to strike till the iron is hot; make it hot by striking. – William Butler Yeats",
      "Action is the foundational key to all success. – Pablo Picasso",
      "Courage is not the absence of fear, but rather the judgment that something else is more important. – Ambrose Redmoon",
      "Take the first step in faith. You don't have to see the whole staircase, just take the first step. – Martin Luther King Jr.",
      "The secret of getting ahead is getting started. – Mark Twain",
      "A year from now you will wish you had started today. – Karen Lamb",
      "Don't be afraid to give up the good to go for the great. – John D. Rockefeller",
      "Hesitation is the assassin of opportunity. – REIGN",
      "Fortune favors the bold. – Latin Proverb",
      "Ships in harbor are safe, but that's not what ships are built for. – John A. Shedd",

      // Time & Purpose
      "Lost time is never found again. – Benjamin Franklin",
      "Time is the most valuable thing a man can spend. – Theophrastus",
      "The two most powerful warriors are patience and time. – Leo Tolstoy",
      "Your time is limited, don't waste it living someone else's life. – Steve Jobs",
      "Yesterday is history, tomorrow is a mystery, today is a gift. That's why it's called the present. – Alice Morse Earle",
      "Make each day your masterpiece. – John Wooden",
      "Every moment is a fresh beginning. – T.S. Eliot",
      "Purpose is the reason you journey. Passion is the fire that lights your way. – REIGN",
      "A life without purpose is a throne without a kingdom. – REIGN",
      "Time spent on self-improvement is never wasted. – REIGN",

      // Perseverance & Resilience
      "Fall seven times, stand up eight. – Japanese Proverb",
      "The oak fought the wind and was broken, the willow bent when it must and survived. – Robert Jordan",
      "Tough times never last, but tough people do. – Robert H. Schuller",
      "Rock bottom became the solid foundation on which I rebuilt my life. – J.K. Rowling",
      "It does not matter how slowly you go as long as you do not stop. – Confucius",
      "Persistence can change failure into extraordinary achievement. – Matt Biondi",
      "The gem cannot be polished without friction, nor man perfected without trials. – Chinese Proverb",
      "Strength does not come from winning. Your struggles develop your strengths. – Arnold Schwarzenegger",
      "When you come to the end of your rope, tie a knot and hang on. – Franklin D. Roosevelt",
      "Storms make trees take deeper roots. – Dolly Parton",

      // Self-Improvement & Excellence
      "Be the change you wish to see in the world. – Mahatma Gandhi",
      "Strive not to be a success, but rather to be of value. – Albert Einstein",
      "The only way to achieve the impossible is to believe it is possible. – Charles Kingsleigh",
      "Quality is not an act, it is a habit. – Aristotle",
      "We are what we repeatedly do. Excellence, then, is not an act, but a habit. – Aristotle",
      "Invest in yourself. Your career is the engine of your wealth. – Paul Clitheroe",
      "The best investment you can make is in yourself. – Warren Buffett",
      "An investment in knowledge pays the best interest. – Benjamin Franklin",
      "What lies behind us and what lies before us are tiny matters compared to what lies within us. – Ralph Waldo Emerson",
      "The royal path to self-mastery is paved with daily rituals. – REIGN"
    ];

    // Use rotation to ensure all quotes are shown over time
    const storageKey = 'reign_quote_index';
    const lastIndexKey = 'reign_quote_last_date';
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(lastIndexKey);
    
    let index;
    if (lastDate !== today) {
      // New day - advance to next quote
      const lastIndex = parseInt(localStorage.getItem(storageKey) || '-1');
      index = (lastIndex + 1) % quotes.length;
      localStorage.setItem(storageKey, index.toString());
      localStorage.setItem(lastIndexKey, today);
    } else {
      // Same day - use stored index
      index = parseInt(localStorage.getItem(storageKey) || '0');
    }

    return quotes[index];
  },

  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type: 'success', 'danger', 'gold', 'info'
   */
  showToast(message, type = "success") {
    // Role-aware gold color
    const isQueen = document.body.classList.contains("queen-theme");
    const goldGradient = isQueen
      ? "linear-gradient(135deg, #b76e79, #9a525c)"
      : "linear-gradient(135deg, #D4AF37, #B8860B)";

    const colors = {
      success: "linear-gradient(135deg, #10b981, #059669)",
      danger: "linear-gradient(135deg, #ef4444, #dc2626)",
      gold: goldGradient,
      info: "linear-gradient(135deg, #60a5fa, #3b82f6)",
    };

    // Check if Toastify is available
    if (typeof Toastify !== "undefined") {
      Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
          background: colors[type] || colors.success,
          borderRadius: "12px",
          fontFamily: "var(--font-sans)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        },
      }).showToast();
    } else {
      // Fallback to console
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  },

  /**
   * Format date for display
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  },

  /**
   * Format time ago
   * @param {string} dateStr - ISO date string
   * @returns {string} Relative time
   */
  formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  },

  /**
   * Sanitize HTML to prevent XSS
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  sanitize(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Generate unique ID
   * @returns {string} Unique identifier
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // ==========================================
  // LOADING STATE HELPERS
  // ==========================================

  /**
   * Set button loading state
   * @param {HTMLElement|string} btn - Button element or selector
   * @param {boolean} loading - Whether to show loading state
   */
  setButtonLoading(btn, loading = true) {
    const el = typeof btn === "string" ? document.querySelector(btn) : btn;
    if (!el) return;

    if (loading) {
      el.classList.add("loading");
      el.dataset.originalText = el.innerHTML;
      el.disabled = true;
    } else {
      el.classList.remove("loading");
      if (el.dataset.originalText) {
        el.innerHTML = el.dataset.originalText;
        delete el.dataset.originalText;
      }
      el.disabled = false;
    }
  },

  /**
   * Show skeleton loader in container
   * @param {HTMLElement|string} container - Container element or selector
   * @param {string} type - Type: 'card', 'list', 'stats', 'table'
   * @param {number} count - Number of skeleton items
   */
  showSkeleton(container, type = "card", count = 3) {
    const el =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!el) return;

    let html = "";

    switch (type) {
      case "card":
        for (let i = 0; i < count; i++) {
          html += `
                        <div class="skeleton-card" style="position: relative;">
                            <div class="skeleton-icon" style="margin-bottom: 1rem;"></div>
                            <div class="skeleton-text title"></div>
                            <div class="skeleton-text medium"></div>
                            <div class="skeleton-text short"></div>
                        </div>
                    `;
        }
        break;

      case "list":
        for (let i = 0; i < count; i++) {
          html += `
                        <div class="skeleton-list-item">
                            <div class="skeleton-avatar"></div>
                            <div class="skeleton-content">
                                <div class="skeleton-text medium" style="margin-bottom: 0.5rem;"></div>
                                <div class="skeleton-text short"></div>
                            </div>
                        </div>
                    `;
        }
        break;

      case "stats":
        for (let i = 0; i < count; i++) {
          html += `
                        <div class="skeleton-stat">
                            <div class="skeleton-text"></div>
                            <div class="skeleton-text"></div>
                        </div>
                    `;
        }
        break;

      case "table":
        for (let i = 0; i < count; i++) {
          html += `
                        <div class="skeleton-table-row">
                            <div class="skeleton-text"></div>
                            <div class="skeleton-text"></div>
                            <div class="skeleton-text"></div>
                            <div class="skeleton-text short"></div>
                        </div>
                    `;
        }
        break;

      default:
        html = `
                    <div class="skeleton-card" style="position: relative;">
                        <div class="skeleton-text title"></div>
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text medium"></div>
                    </div>
                `;
    }

    el.innerHTML = html;
  },

  /**
   * Show full page loading overlay
   * @param {string} message - Optional loading message
   */
  showPageLoading(message = "Loading...") {
    // Remove existing if any
    this.hidePageLoading();

    const overlay = document.createElement("div");
    overlay.id = "page-loading-overlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = `
            <i class="ph-fill ph-crown crown-icon"></i>
            <div class="spinner"></div>
            <p class="loading-text">${this.sanitize(message)}</p>
        `;
    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add("show");
    });
  },

  /**
   * Hide full page loading overlay
   */
  hidePageLoading() {
    const overlay = document.getElementById("page-loading-overlay");
    if (overlay) {
      overlay.remove();
    }
  },

  /**
   * Add loading state to any element
   * @param {HTMLElement|string} element - Element or selector
   */
  addCardLoading(element) {
    const el =
      typeof element === "string" ? document.querySelector(element) : element;
    if (el) el.classList.add("card-loading");
  },

  /**
   * Remove loading state from element
   * @param {HTMLElement|string} element - Element or selector
   */
  removeCardLoading(element) {
    const el =
      typeof element === "string" ? document.querySelector(element) : element;
    if (el) el.classList.remove("card-loading");
  },
};

// ============================================
// AUTHENTICATION MODULE
// ============================================
const Auth = {
  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!CONFIG.getAuthToken();
  },

  /**
   * Get current user
   * @returns {Object|null}
   */
  getUser() {
    try {
      const user = localStorage.getItem(CONFIG.USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set current user
   * @param {Object} user - User data
   */
  setUser(user) {
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  /**
   * Logout user
   */
  logout() {
    CONFIG.clearAuth();
    Utils.showToast("Logged out successfully", "info");
    window.location.href = "/index.html";
  },

  /**
   * Get user initials for avatar
   * @returns {string}
   */
  getInitials() {
    const user = this.getUser();
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "K";
  },
};

// ============================================
// NAVIGATION MODULE
// ============================================
const Nav = {
  /**
   * Navigate to a page
   * @param {string} page - Page name (without .html)
   */
  goto(page) {
    const basePath = window.location.pathname.includes("/app/") ? "../" : "";
    const pagesPath = window.location.pathname.includes("/app/") ? "" : "app/";

    // Handle special cases
    if (page === "dashboard" || page === "home") {
      window.location.href = basePath + "index.html";
      return;
    }

    window.location.href = basePath + pagesPath + page + ".html";
  },

  /**
   * Get current page name
   * @returns {string}
   */
  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split("/").pop().replace(".html", "");
    return filename === "index" ? "dashboard" : filename;
  },

  /**
   * Check if on a specific page
   * @param {string} page - Page name
   * @returns {boolean}
   */
  isCurrentPage(page) {
    return this.getCurrentPage() === page;
  },
};

// ============================================
// UI COMPONENTS MODULE
// ============================================
const UI = {
  /**
   * Initialize page with common elements
   */
  init() {
    this.updateAuthUI();
    this.setActiveNav();
    this.initTheme();
  },

  /**
   * Update UI based on auth state
   */
  updateAuthUI() {
    const isLoggedIn = Auth.isLoggedIn();
    const user = Auth.getUser();

    // Update user avatar/button if exists
    const userBtn = document.getElementById("user-avatar-btn");
    if (userBtn) {
      if (isLoggedIn && user) {
        userBtn.innerHTML = `
                    <span class="user-initials">${Auth.getInitials()}</span>
                `;
        userBtn.title = user.name || user.email;
      }
    }

    // Show/hide guest prompt
    const guestPrompt = document.getElementById("guest-prompt");
    if (guestPrompt) {
      guestPrompt.style.display = isLoggedIn ? "none" : "flex";
    }

    // Show/hide user menu
    const userMenu = document.getElementById("user-menu");
    if (userMenu) {
      userMenu.style.display = isLoggedIn ? "flex" : "none";
    }
  },

  /**
   * Set active navigation state
   */
  setActiveNav() {
    const currentPage = Nav.getCurrentPage();
    document.querySelectorAll(".nav-btn, .nav-link").forEach((btn) => {
      const target =
        btn.dataset.target ||
        btn.getAttribute("href")?.replace(".html", "").replace("app/", "");
      btn.classList.toggle("active", target === currentPage);
    });
  },

  /**
   * Initialize theme and role
   */
  initTheme() {
    const data = Storage.getData();
    const theme = data.settings?.theme || "dark";
    const role = data.settings?.role || "king";

    // Apply light/dark theme
    document.documentElement.setAttribute("data-theme", theme);

    // Apply role theme (queen gets special styling)
    if (role === "queen") {
      document.body.classList.add("queen-theme");
      document.body.classList.remove("king-theme");
    } else {
      document.body.classList.add("king-theme");
      document.body.classList.remove("queen-theme");
    }
  },

  /**
   * Get current user role
   * @returns {string} 'king' or 'queen'
   */
  getRole() {
    const data = Storage.getData();
    return data.settings?.role || "king";
  },

  /**
   * Check if current user is Queen
   * @returns {boolean}
   */
  isQueen() {
    return this.getRole() === "queen";
  },

  /**
   * Get role-aware text (role-specific wording)
   * @param {string} kingText - Text for king role
   * @param {string} queenText - Text for queen role
   * @returns {string} Appropriate text based on role
   */
  getRoleText(kingText, queenText) {
    return this.isQueen() ? queenText : kingText;
  },

  /**
   * Get role title with emoji
   * @returns {string} 'King 👑' or 'Queen 👸'
   */
  getRoleTitle() {
    return this.isQueen() ? "Queen 👸" : "King 👑";
  },

  /**
   * Get role-specific pronoun object
   * @returns {Object} Pronouns for current role
   */
  getRolePronouns() {
    return this.isQueen()
      ? {
          subject: "she",
          object: "her",
          possessive: "her",
          reflexive: "herself",
        }
      : {
          subject: "he",
          object: "him",
          possessive: "his",
          reflexive: "himself",
        };
  },

  /**
   * Set user role and apply theme
   * @param {string} role - 'king' or 'queen'
   */
  setRole(role) {
    if (role !== "king" && role !== "queen") {
      console.error('Invalid role. Must be "king" or "queen"');
      return;
    }

    const data = Storage.getData();
    if (!data.settings) data.settings = {};
    data.settings.role = role;
    Storage.saveData(data);

    this.initTheme();
    Utils.showToast(`Role set to ${this.getRoleTitle()}`, "gold");

    // Trigger role change across platform
    window.dispatchEvent(new CustomEvent("roleChanged", { detail: { role } }));
  },

  /**
   * Toggle sidebar (mobile)
   */
  toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");

    if (sidebar) {
      sidebar.classList.toggle("open");
    }
    if (overlay) {
      overlay.classList.toggle("active");
    }
  },

  /**
   * Show loading spinner
   * @param {HTMLElement} container - Container element
   */
  showLoading(container) {
    container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i class="ph-duotone ph-spinner-gap"></i>
                </div>
                <p>Loading...</p>
            </div>
        `;
  },

  /**
   * Show empty state
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Empty state options
   */
  showEmptyState(container, options = {}) {
    const {
      icon = "ph-folder-open",
      title = "Nothing Here Yet",
      message = "",
      action = null,
    } = options;
    container.innerHTML = `
            <div class="empty-state glass-card">
                <i class="ph-duotone ${icon}"></i>
                <h3>${title}</h3>
                ${message ? `<p>${message}</p>` : ""}
                ${
                  action
                    ? `<button class="btn btn-primary" onclick="${action.onclick}">${action.label}</button>`
                    : ""
                }
            </div>
        `;
  },

  /**
   * Create a modal
   * @param {string} content - Modal HTML content
   */
  showModal(content) {
    let modal = document.getElementById("modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal";
      modal.className = "modal";
      modal.innerHTML = `
                <div class="modal-overlay" onclick="UI.closeModal()"></div>
                <div class="modal-container">
                    <div class="modal-content"></div>
                </div>
            `;
      document.body.appendChild(modal);
    }

    modal.querySelector(".modal-content").innerHTML = content;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  /**
   * Close modal
   */
  closeModal() {
    const modal = document.getElementById("modal");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  },
};

// ============================================
// API MODULE
// ============================================
const API = {
  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>}
   */
  async request(endpoint, options = {}) {
    const token = CONFIG.getAuthToken();

    const config = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${CONFIG.API_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  /**
   * GET request
   */
  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  /**
   * POST request
   */
  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * PUT request
   */
  put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request
   */
  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },
};

// ============================================
// SYNC MODULE - Auto-sync user data
// ============================================
const Sync = {
  // Track sync state
  isSyncing: false,
  lastSyncTime: null,
  syncTimer: null,

  /**
   * Debounced upload to prevent too many API calls
   */
  debouncedUpload() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    // Wait 2 seconds after last change before syncing
    this.syncTimer = setTimeout(() => {
      this.upload();
    }, 2000);
  },

  /**
   * Upload local data to cloud
   * @returns {Promise<boolean>}
   */
  async upload() {
    if (this.isSyncing || !Auth.isLoggedIn()) return false;

    this.isSyncing = true;
    try {
      const data = Storage.getData();
      await API.post("/sync", {
        appData: data,
        localTimestamp: data.lastUpdated,
      });
      this.lastSyncTime = new Date();
      console.log("✅ Auto-synced to cloud");
      return true;
    } catch (error) {
      console.error("Sync upload failed:", error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  },

  /**
   * Download cloud data and merge with local
   * @returns {Promise<boolean>}
   */
  async download() {
    if (this.isSyncing || !Auth.isLoggedIn()) return false;

    this.isSyncing = true;
    try {
      const response = await API.get("/sync");
      if (response.appData) {
        const localData = Storage.getData();
        const cloudTimestamp = new Date(response.appData.lastUpdated || 0);
        const localTimestamp = new Date(localData.lastUpdated || 0);

        // If cloud data is newer, use it
        if (cloudTimestamp > localTimestamp) {
          // Merge settings to preserve local preferences
          const mergedData = {
            ...response.appData,
            settings: { ...response.appData.settings, ...localData.settings },
          };
          Storage.saveData(mergedData, true); // skipSync to prevent loop
          console.log("✅ Synced from cloud");
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Sync download failed:", error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  },

  /**
   * Full sync: download first, then upload if needed
   * @param {boolean} showToast - Show toast notification
   * @returns {Promise<boolean>}
   */
  async fullSync(showToast = false) {
    if (!Auth.isLoggedIn()) {
      if (showToast) Utils.showToast("Please log in to sync", "info");
      return false;
    }

    try {
      // Download cloud data first
      const downloaded = await this.download();

      // Then upload local data
      await this.upload();

      if (showToast) {
        Utils.showToast("Data synced! ☁️", "success");
      }
      return true;
    } catch (error) {
      if (showToast) {
        Utils.showToast("Sync failed", "danger");
      }
      return false;
    }
  },

  /**
   * Initialize auto-sync on page load
   */
  init() {
    if (Auth.isLoggedIn()) {
      // Sync on page load (after short delay to not block rendering)
      setTimeout(() => {
        this.download().then((synced) => {
          if (synced) {
            // Reload page data if synced
            window.dispatchEvent(new CustomEvent("datasynced"));
          }
        });
      }, 1000);

      // Sync before page unload
      window.addEventListener("beforeunload", () => {
        if (this.syncTimer) {
          clearTimeout(this.syncTimer);
          // Use sendBeacon for reliable sync on page close
          const data = Storage.getData();
          const token = CONFIG.getAuthToken();
          if (token && navigator.sendBeacon) {
            const payload = JSON.stringify({
              appData: data,
              localTimestamp: data.lastUpdated,
            });
            navigator.sendBeacon(
              `${CONFIG.API_URL}/sync`,
              new Blob([payload], { type: "application/json" })
            );
          }
        }
      });
    }
  },
};

// ============================================
// GLOBAL FOCUS TIMER
// Persists across page navigation
// ============================================
const FocusTimer = {
  state: "idle", // idle, focusing, break, paused
  timeRemaining: 0,
  totalTime: 0,
  interval: null,
  sessionStart: null,
  settings: {
    focusDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    soundEnabled: true,
  },

  /**
   * Initialize the focus timer from storage
   */
  init() {
    // Load saved timer state from sessionStorage (persists across pages)
    const saved = sessionStorage.getItem("reign_focus_timer");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.state = data.state || "idle";
        this.timeRemaining = data.timeRemaining || 0;
        this.totalTime = data.totalTime || 0;
        this.sessionStart = data.sessionStart;

        // Resume timer if it was running
        if (this.state === "focusing" || this.state === "break") {
          // Calculate elapsed time since last save
          const elapsed = Math.floor((Date.now() - data.savedAt) / 1000);
          this.timeRemaining = Math.max(0, this.timeRemaining - elapsed);

          if (this.timeRemaining > 0) {
            this.startInterval();
          } else {
            this.complete();
          }
        }
      } catch (e) {
        console.error("Failed to restore timer state:", e);
      }
    }

    // Load settings from main storage
    const appData = Storage.getData();
    if (appData.focus?.settings) {
      this.settings = { ...this.settings, ...appData.focus.settings };
    }

    // Render header indicator
    this.renderHeaderIndicator();

    // Update every second if running
    setInterval(() => this.renderHeaderIndicator(), 1000);
  },

  /**
   * Start a focus session
   */
  start(duration = null) {
    if (this.state === "focusing" || this.state === "break") return;

    this.totalTime = (duration || this.settings.focusDuration) * 60;
    this.timeRemaining = this.totalTime;
    this.state = "focusing";
    this.sessionStart = Date.now();

    this.save();
    this.startInterval();
    this.renderHeaderIndicator();

    Utils.showToast("🎯 Focus session started!", "gold");
  },

  /**
   * Start a break
   */
  startBreak(isLong = false) {
    const duration = isLong
      ? this.settings.longBreak
      : this.settings.shortBreak;
    this.totalTime = duration * 60;
    this.timeRemaining = this.totalTime;
    this.state = "break";

    this.save();
    this.startInterval();
    this.renderHeaderIndicator();
  },

  /**
   * Pause the timer
   */
  pause() {
    if (this.state !== "focusing" && this.state !== "break") return;

    clearInterval(this.interval);
    this.state = "paused";
    this.save();
    this.renderHeaderIndicator();
  },

  /**
   * Resume the timer
   */
  resume() {
    if (this.state !== "paused") return;

    this.state = this.timeRemaining > 0 ? "focusing" : "idle";
    this.startInterval();
    this.save();
    this.renderHeaderIndicator();
  },

  /**
   * Stop/reset the timer
   */
  stop() {
    clearInterval(this.interval);
    this.state = "idle";
    this.timeRemaining = 0;
    this.totalTime = 0;
    this.sessionStart = null;

    sessionStorage.removeItem("reign_focus_timer");
    this.renderHeaderIndicator();
  },

  /**
   * Complete the session
   */
  complete() {
    clearInterval(this.interval);

    const wasBreak = this.state === "break";
    this.state = "idle";
    this.timeRemaining = 0;

    // Play completion sound
    this.playSound(wasBreak ? "break-end" : "complete");

    if (!wasBreak) {
      Utils.showToast("🎉 Focus session complete! Great work!", "success");
    } else {
      Utils.showToast("☕ Break's over! Ready for the next session?", "info");
    }

    sessionStorage.removeItem("reign_focus_timer");
    this.renderHeaderIndicator();

    // Dispatch event for pages to handle
    window.dispatchEvent(
      new CustomEvent("focuscomplete", { detail: { wasBreak } })
    );
  },

  /**
   * Start the countdown interval
   */
  startInterval() {
    clearInterval(this.interval);

    this.interval = setInterval(() => {
      this.timeRemaining--;
      this.save();
      this.renderHeaderIndicator();

      if (this.timeRemaining <= 0) {
        this.complete();
      }
    }, 1000);
  },

  /**
   * Save timer state to sessionStorage
   */
  save() {
    sessionStorage.setItem(
      "reign_focus_timer",
      JSON.stringify({
        state: this.state,
        timeRemaining: this.timeRemaining,
        totalTime: this.totalTime,
        sessionStart: this.sessionStart,
        savedAt: Date.now(),
      })
    );
  },

  /**
   * Format time as MM:SS
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  },

  /**
   * Get color based on time remaining
   */
  getTimerColor() {
    if (this.state === "break") return "#10B981"; // Green for break

    const percent = (this.timeRemaining / this.totalTime) * 100;
    const isQueen = UI.isQueen();
    const goldColor = isQueen ? "#b76e79" : "#D4AF37"; // Rose gold for queen, gold for king

    if (percent > 50) return goldColor; // Gold/Rose - plenty of time
    if (percent > 25) return "#F59E0B"; // Amber - getting low
    if (percent > 10) return "#EF4444"; // Red - urgent
    return "#DC2626"; // Dark red - critical
  },

  /**
   * Render the header timer indicator
   */
  renderHeaderIndicator() {
    let indicator = document.getElementById("focus-timer-indicator");

    if (this.state === "idle") {
      if (indicator) indicator.remove();
      return;
    }

    // Create indicator if not exists
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "focus-timer-indicator";
      indicator.className = "focus-timer-indicator";
      indicator.onclick = () => {
        // Navigate to focus page
        if (typeof app !== "undefined" && app.navigate) {
          app.navigate("focus");
        } else {
          window.location.href = "/app/focus.html";
        }
      };

      // Insert after header or at top of body
      const header = document.querySelector(".header, header");
      if (header) {
        header.appendChild(indicator);
      } else {
        document.body.prepend(indicator);
      }
    }

    const color = this.getTimerColor();
    const icon =
      this.state === "break"
        ? "ph-coffee"
        : this.state === "paused"
        ? "ph-pause"
        : "ph-timer";
    const stateText =
      this.state === "break"
        ? "Break"
        : this.state === "paused"
        ? "Paused"
        : "Focusing";

    indicator.innerHTML = `
            <div class="timer-indicator-content" style="--timer-color: ${color}">
                <i class="ph-fill ${icon}"></i>
                <span class="timer-time">${this.formatTime(
                  this.timeRemaining
                )}</span>
                <span class="timer-state">${stateText}</span>
            </div>
        `;

    indicator.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            cursor: pointer;
        `;
  },

  /**
   * Play a notification sound
   */
  playSound(type) {
    if (!this.settings.soundEnabled) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();

      // Create pleasant completion sound
      const frequencies =
        type === "complete"
          ? [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6 - triumphant
          : [440, 554.37, 659.25]; // A4, C#5, E5 - gentle

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = ctx.currentTime + i * 0.15;
        const duration = 0.3;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      console.log("Audio not supported");
    }
  },
};

// ============================================
// GLOBAL CLOSE BUTTON HANDLER
// Makes all close buttons work universally
// ============================================
const CloseHandler = {
  init() {
    // Delegate click events to document for dynamic elements
    document.addEventListener("click", (e) => {
      const closeBtn = e.target.closest(
        ".close-btn, .modal-close, [data-close], .btn-close"
      );
      if (!closeBtn) return;

      e.preventDefault();
      e.stopPropagation();

      // Find the closest closeable parent
      const modal = closeBtn.closest(
        ".modal, .modal-overlay, .slide-panel, .form-panel, .overlay, [data-closeable]"
      );
      const drawer = closeBtn.closest(".drawer, .sidebar-overlay");

      if (modal) {
        // Try to close modal
        modal.classList.remove("active", "open", "show");
        modal.style.display = "none";
        document.body.classList.remove("modal-open", "no-scroll");

        // If it's a form panel, also hide overlay
        const overlay = document.querySelector(".form-overlay, .modal-overlay");
        if (overlay) {
          overlay.classList.remove("active");
          overlay.style.display = "none";
        }
      } else if (drawer) {
        drawer.classList.remove("active", "open");
      } else {
        // Navigate back or close current view
        if (typeof app !== "undefined" && app.navigate) {
          app.navigate("dashboard");
        } else if (window.history.length > 1) {
          window.history.back();
        }
      }
    });
  },

  /**
   * Create a close button HTML
   * @param {Object} options - Button options
   * @returns {string} HTML string
   */
  createButton(options = {}) {
    const { className = "close-btn", showText = true } = options;
    return `
            <button class="${className}" data-close>
                <i class="ph-bold ph-x"></i>
                ${showText ? '<span class="close-text">Close</span>' : ""}
            </button>
        `;
  },
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  UI.init();
  Sync.init();
  CloseHandler.init();
  FocusTimer.init();
});

// Export for module usage if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CONFIG,
    Storage,
    Utils,
    Auth,
    Nav,
    UI,
    API,
    Sync,
    FocusTimer,
  };
}
