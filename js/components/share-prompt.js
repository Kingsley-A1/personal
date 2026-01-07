/**
 * REIGN - Share Prompt Component
 * Beautiful exit-intent share modal with role-aware theming
 * Prompts users to share the app when leaving
 */

const SharePrompt = {
    // Modal state
    modalElement: null,
    isShowing: false,
    hasShownThisSession: false,

    // Configuration
    config: {
        storageKey: 'reign_share_last_shown',
        cooldownDays: 7, // Show once per week max
        shareUrl: 'https://reign-pi.vercel.app',
        shareMessage: 'REIGN App now at your finger tips. INSTALL IT AND BECOME THE BEST OF YOURSELF! 👑',
        ogImage: 'https://reign-pi.vercel.app/icons/og-cover.jpg',
        appName: 'REIGN'
    },

    /**
     * Initialize the share prompt system
     */
    init() {
        this.createModal();
        this.setupExitDetection();
    },

    /**
     * Check if we should show the modal
     */
    shouldShowModal() {
        // Don't show if already shown this session
        if (this.hasShownThisSession) return false;

        // Don't show if user is on auth page
        if (window.location.pathname.includes('auth.html')) return false;

        // Check cooldown
        const lastShown = localStorage.getItem(this.config.storageKey);
        if (lastShown) {
            const daysSinceShown = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
            if (daysSinceShown < this.config.cooldownDays) return false;
        }

        // Check if user has used the app for at least 3 days
        const firstUse = localStorage.getItem('reign_first_use_date');
        if (firstUse) {
            const daysSinceFirst = (Date.now() - parseInt(firstUse)) / (1000 * 60 * 60 * 24);
            if (daysSinceFirst < 3) return false;
        }

        return true;
    },

    /**
     * Setup exit-intent detection
     */
    setupExitDetection() {
        // Desktop: Mouse leaving viewport toward top
        document.addEventListener('mouseout', (e) => {
            if (e.clientY <= 0 && this.shouldShowModal()) {
                this.show();
            }
        });

        // Mobile: Before unload (back button, closing tab)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.shouldShowModal()) {
                // Mark to show on next visit
                sessionStorage.setItem('reign_show_share_on_return', 'true');
            }
        });

        // Show on return if marked
        window.addEventListener('focus', () => {
            if (sessionStorage.getItem('reign_show_share_on_return') === 'true') {
                sessionStorage.removeItem('reign_show_share_on_return');
                if (this.shouldShowModal()) {
                    setTimeout(() => this.show(), 1500);
                }
            }
        });
    },

    /**
     * Create the modal HTML
     */
    createModal() {
        // Check if modal already exists
        if (document.getElementById('share-prompt-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'share-prompt-modal';
        modal.className = 'share-prompt-overlay';
        modal.innerHTML = `
            <div class="share-prompt-container">
                <!-- Close Button -->
                <button class="share-prompt-close" onclick="SharePrompt.dismiss()" aria-label="Close">
                    <i class="ph-bold ph-x"></i>
                </button>

                <!-- Decorative Crown -->
                <div class="share-prompt-crown">
                    <i class="ph-fill ph-crown"></i>
                </div>

                <!-- Cover Image -->
                <div class="share-prompt-image">
                    <img src="${this.config.ogImage}" alt="REIGN App" onerror="this.parentElement.style.display='none'">
                </div>

                <!-- Content -->
                <div class="share-prompt-content">
                    <h2 class="share-prompt-title">
                        <span class="share-prompt-title-accent">Spread</span> the Reign!
                    </h2>
                    <p class="share-prompt-message">
                        ${this.config.shareMessage}
                    </p>
                </div>

                <!-- Share Actions -->
                <div class="share-prompt-actions">
                    <!-- Native Share (if available) -->
                    <button class="share-btn share-btn-primary" onclick="SharePrompt.nativeShare()">
                        <i class="ph-bold ph-share-network"></i>
                        <span>Share Now</span>
                    </button>

                    <!-- Social Share Grid -->
                    <div class="share-social-grid">
                        <button class="share-social-btn share-whatsapp" onclick="SharePrompt.shareToWhatsApp()" title="Share on WhatsApp">
                            <i class="ph-bold ph-whatsapp-logo"></i>
                        </button>
                        <button class="share-social-btn share-twitter" onclick="SharePrompt.shareToTwitter()" title="Share on X/Twitter">
                            <i class="ph-bold ph-x-logo"></i>
                        </button>
                        <button class="share-social-btn share-facebook" onclick="SharePrompt.shareToFacebook()" title="Share on Facebook">
                            <i class="ph-bold ph-facebook-logo"></i>
                        </button>
                        <button class="share-social-btn share-linkedin" onclick="SharePrompt.shareToLinkedIn()" title="Share on LinkedIn">
                            <i class="ph-bold ph-linkedin-logo"></i>
                        </button>
                        <button class="share-social-btn share-telegram" onclick="SharePrompt.shareToTelegram()" title="Share on Telegram">
                            <i class="ph-bold ph-telegram-logo"></i>
                        </button>
                        <button class="share-social-btn share-copy" onclick="SharePrompt.copyLink()" title="Copy Link">
                            <i class="ph-bold ph-copy"></i>
                        </button>
                    </div>
                </div>

                <!-- Skip Action -->
                <button class="share-prompt-skip" onclick="SharePrompt.dismiss()">
                    Maybe Later
                </button>
            </div>

            <style>
                .share-prompt-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .share-prompt-overlay.active {
                    opacity: 1;
                    visibility: visible;
                }

                .share-prompt-container {
                    background: linear-gradient(165deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
                    border: 1px solid var(--royal-gold-30, rgba(212, 175, 55, 0.3));
                    border-radius: 1.5rem;
                    padding: 2rem;
                    max-width: 420px;
                    width: 100%;
                    position: relative;
                    transform: translateY(20px) scale(0.95);
                    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 
                        0 25px 60px rgba(0, 0, 0, 0.5),
                        0 0 80px var(--royal-gold-15, rgba(212, 175, 55, 0.15)),
                        inset 0 1px 0 var(--royal-gold-15, rgba(212, 175, 55, 0.15));
                    overflow: hidden;
                }

                .share-prompt-overlay.active .share-prompt-container {
                    transform: translateY(0) scale(1);
                }

                /* Decorative gradient */
                .share-prompt-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, 
                        transparent, 
                        var(--royal-gold) 20%, 
                        var(--royal-accent) 50%, 
                        var(--royal-gold) 80%, 
                        transparent);
                }

                .share-prompt-close {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    z-index: 10;
                }

                .share-prompt-close:hover {
                    background: var(--royal-gold-15, rgba(212, 175, 55, 0.15));
                    color: var(--royal-gold);
                    transform: rotate(90deg);
                }

                .share-prompt-crown {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, var(--royal-gold), var(--royal-accent));
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 20px var(--royal-gold-30, rgba(212, 175, 55, 0.3));
                    animation: crownFloat 3s ease-in-out infinite;
                }

                @keyframes crownFloat {
                    0%, 100% { transform: translateX(-50%) translateY(0); }
                    50% { transform: translateX(-50%) translateY(-5px); }
                }

                .share-prompt-crown i {
                    font-size: 1.75rem;
                    color: var(--bg-primary);
                }

                .share-prompt-image {
                    margin-top: 2rem;
                    border-radius: 1rem;
                    overflow: hidden;
                    border: 1px solid var(--royal-gold-15, rgba(212, 175, 55, 0.15));
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }

                .share-prompt-image img {
                    width: 100%;
                    height: auto;
                    display: block;
                }

                .share-prompt-content {
                    text-align: center;
                    margin: 1.5rem 0;
                }

                .share-prompt-title {
                    font-family: var(--font-serif);
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.75rem;
                }

                .share-prompt-title-accent {
                    background: linear-gradient(135deg, var(--royal-gold), var(--royal-accent));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .share-prompt-message {
                    color: var(--text-secondary);
                    font-size: 1rem;
                    line-height: 1.6;
                    max-width: 340px;
                    margin: 0 auto;
                }

                .share-prompt-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-top: 1.5rem;
                }

                .share-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.875rem 1.5rem;
                    border-radius: 0.75rem;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                }

                .share-btn-primary {
                    background: linear-gradient(135deg, var(--royal-gold), var(--royal-accent));
                    color: var(--bg-primary);
                    box-shadow: 0 4px 15px var(--royal-gold-30, rgba(212, 175, 55, 0.3));
                }

                .share-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 25px var(--royal-gold-40, rgba(212, 175, 55, 0.4));
                }

                .share-btn-primary i {
                    font-size: 1.25rem;
                }

                .share-social-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 0.5rem;
                }

                .share-social-btn {
                    width: 100%;
                    aspect-ratio: 1;
                    border-radius: 0.75rem;
                    border: 1px solid var(--border-subtle);
                    background: var(--bg-tertiary);
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    transition: all 0.2s ease;
                }

                .share-social-btn:hover {
                    transform: translateY(-2px);
                }

                .share-whatsapp:hover {
                    background: #25D366;
                    color: white;
                    border-color: #25D366;
                }

                .share-twitter:hover {
                    background: #000000;
                    color: white;
                    border-color: #000000;
                }

                .share-facebook:hover {
                    background: #1877F2;
                    color: white;
                    border-color: #1877F2;
                }

                .share-linkedin:hover {
                    background: #0A66C2;
                    color: white;
                    border-color: #0A66C2;
                }

                .share-telegram:hover {
                    background: #0088CC;
                    color: white;
                    border-color: #0088CC;
                }

                .share-copy:hover {
                    background: var(--royal-gold);
                    color: var(--bg-primary);
                    border-color: var(--royal-gold);
                }

                .share-prompt-skip {
                    width: 100%;
                    padding: 0.75rem;
                    background: transparent;
                    border: none;
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: color 0.2s ease;
                    margin-top: 0.5rem;
                }

                .share-prompt-skip:hover {
                    color: var(--text-secondary);
                }

                /* Mobile adjustments */
                @media (max-width: 480px) {
                    .share-prompt-container {
                        padding: 1.5rem;
                        margin: 0.5rem;
                    }

                    .share-prompt-title {
                        font-size: 1.5rem;
                    }

                    .share-prompt-message {
                        font-size: 0.9rem;
                    }

                    .share-social-grid {
                        grid-template-columns: repeat(6, 1fr);
                        gap: 0.375rem;
                    }

                    .share-social-btn {
                        font-size: 1.1rem;
                    }
                }

                /* Confetti animation on share */
                @keyframes confetti {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
                }

                .confetti {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: var(--royal-gold);
                    animation: confetti 1s ease-out forwards;
                }
            </style>
        `;

        document.body.appendChild(modal);
        this.modalElement = modal;
    },

    /**
     * Show the share prompt
     */
    show() {
        if (this.isShowing || !this.modalElement) return;

        this.isShowing = true;
        this.hasShownThisSession = true;
        this.modalElement.classList.add('active');

        // Record show time
        localStorage.setItem(this.config.storageKey, Date.now().toString());

        // Trap focus
        document.body.style.overflow = 'hidden';
    },

    /**
     * Dismiss the modal
     */
    dismiss() {
        if (!this.modalElement) return;

        this.isShowing = false;
        this.modalElement.classList.remove('active');
        document.body.style.overflow = '';
    },

    /**
     * Native share API
     */
    async nativeShare() {
        const shareData = {
            title: this.config.appName,
            text: this.config.shareMessage,
            url: this.config.shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                this.showConfetti();
                this.showThankYou();
            } catch (err) {
                if (err.name !== 'AbortError') {
                    // Fall back to copy
                    this.copyLink();
                }
            }
        } else {
            // Fall back to copy
            this.copyLink();
        }
    },

    /**
     * Share to WhatsApp
     */
    shareToWhatsApp() {
        const text = encodeURIComponent(`${this.config.shareMessage}\n\n${this.config.shareUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        this.showConfetti();
    },

    /**
     * Share to Twitter/X
     */
    shareToTwitter() {
        const text = encodeURIComponent(this.config.shareMessage);
        const url = encodeURIComponent(this.config.shareUrl);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
        this.showConfetti();
    },

    /**
     * Share to Facebook
     */
    shareToFacebook() {
        const url = encodeURIComponent(this.config.shareUrl);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
        this.showConfetti();
    },

    /**
     * Share to LinkedIn
     */
    shareToLinkedIn() {
        const url = encodeURIComponent(this.config.shareUrl);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
        this.showConfetti();
    },

    /**
     * Share to Telegram
     */
    shareToTelegram() {
        const text = encodeURIComponent(this.config.shareMessage);
        const url = encodeURIComponent(this.config.shareUrl);
        window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
        this.showConfetti();
    },

    /**
     * Copy link to clipboard
     */
    async copyLink() {
        try {
            await navigator.clipboard.writeText(this.config.shareUrl);
            this.showConfetti();
            
            // Show toast
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Link copied to clipboard! 📋', 'success');
            }
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.config.shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Link copied! 📋', 'success');
            }
        }
    },

    /**
     * Show celebratory confetti
     */
    showConfetti() {
        const container = this.modalElement.querySelector('.share-prompt-container');
        if (!container) return;

        const colors = ['var(--royal-gold)', 'var(--royal-accent)', '#ffffff', 'var(--royal-gold)'];

        for (let i = 0; i < 15; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.3 + 's';
            container.appendChild(confetti);

            // Remove after animation
            setTimeout(() => confetti.remove(), 1500);
        }
    },

    /**
     * Show thank you message
     */
    showThankYou() {
        setTimeout(() => {
            this.dismiss();
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Thank you for spreading the reign! 👑', 'success');
            }
        }, 500);
    }
};

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    SharePrompt.init();
});
