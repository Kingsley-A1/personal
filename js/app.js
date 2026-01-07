/**
 * REIGN - Main Application Controller
 * Coordinates all modules and handles user interactions
 */

// ==========================================
// GLOBAL ERROR BOUNDARY
// ==========================================
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', { message, source, lineno, colno, error });
    
    // Show user-friendly error message
    if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('Something went wrong. Please refresh the page.', 'danger');
    }
    
    // Don't prevent default error handling in development
    return false;
};

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Show user-friendly error message
    if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('An operation failed. Please try again.', 'warning');
    }
});

// ==========================================
// APPLICATION CONTROLLER
// ==========================================
const app = {
    data: null,

    /**
     * Initialize the application
     */
    init() {
        try {
            // Load stored data
            this.data = Storage.getData();

            // Apply saved settings (theme, etc.)
            this.applySettings();

            // Initialize time display
            Utils.updateHeaderTime();
            setInterval(() => Utils.updateHeaderTime(), 60000);

            // Initialize Chart.js defaults
            Charts.init();

            // Update streak badge
            this.updateStreakBadge();
            Storage.updateNotificationBadge();

            // Navigate to dashboard
            this.navigate('dashboard');

            // Restore sidebar state
            this.restoreSidebarState();

            // Validate session if logged in
            if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                Auth.isSessionValid().then(isValid => {
                    if (!isValid) {
                        Utils.showToast('Session expired. Please log in again.', 'warning');
                        Auth.logout();
                    }
                }).catch(() => {
                    // Silently fail - user can continue offline
                });
            }
        } catch (error) {
            console.error('App initialization error:', error);
            Utils.showToast('Failed to initialize app. Please refresh.', 'danger');
        }
    },

    /**
     * Restore sidebar collapsed state from localStorage
     */
    restoreSidebarState() {
        const isCollapsed = localStorage.getItem('reign_sidebar_collapsed') === 'true';
        const sidebar = document.querySelector('.sidebar');

        if (sidebar && isCollapsed) {
            sidebar.classList.add('collapsed');
        }
    },

    /**
     * Toggle mobile sidebar
     */
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');

            // Prevent body scroll when sidebar is open
            if (sidebar.classList.contains('open')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
    },

    /**
     * Toggle desktop sidebar (collapsed state)
     */
    toggleSidebarDesktop() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');

            // Save state to localStorage
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('reign_sidebar_collapsed', isCollapsed);
        }
    },

    /**
     * Navigate to a view
     * @param {string} view - View name
     */
    navigate(view) {
        // Destroy existing charts before switching
        Charts.destroyAll();

        Router.navigate(view, () => {
            const container = document.getElementById('main-view');

            switch (view) {
                case 'dashboard':
                    Views.renderDashboard(container, this.data);
                    break;
                case 'morning':
                    Views.renderMorning(container, this.data);
                    break;
                case 'evening':
                    Views.renderEvening(container, this.data);
                    break;
                case 'archive':
                    Views.renderArchive(container, this.data);
                    break;
                case 'events':
                    Views.renderEvents(container, this.data);
                    break;
                case 'learning':
                    Views.renderLearning(container, this.data);
                    break;
                case 'notifications':
                    Views.renderNotifications(container);
                    break;
                case 'settings':
                    Views.renderSettings(container);
                    // Apply current theme toggle state
                    const settings = Storage.getSettings();
                    const themeToggle = document.getElementById('theme-toggle');
                    if (themeToggle) {
                        themeToggle.checked = settings.theme === 'light';
                    }
                    break;
                case 'idea':
                    Views.renderIdea(container, this.data);
                    break;
                case 'dailygood':
                    Views.renderDailyGood(container, this.data);
                    break;
                case 'lessons':
                    Views.renderDailyLessons(container, this.data);
                    break;
                case 'savings':
                    Views.renderDailySavings(container);
                    break;
                case 'relationships':
                    Views.renderRelationships(container, this.data);
                    break;
                case 'profile':
                    Views.renderProfile(container, this.data);
                    break;
                default:
                    // Check if it's a course detail view
                    if (view.startsWith('course-')) {
                        const courseId = parseInt(view.split('-')[1]);
                        Views.renderCourseDetail(container, this.data, courseId);
                    } else {
                        Views.renderDashboard(container, this.data);
                    }
            }
        });
    },

    // ==========================================
    // TASK MANAGEMENT
    // ==========================================

    /**
     * Open task modal for add/edit
     * @param {string} taskId - Task ID to edit (optional)
     */
    openTaskModal(taskId = null) {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');

        let task = null;
        if (taskId) {
            const todayLog = Storage.getTodayLog(this.data);
            if (todayLog.morning && todayLog.morning.tasks) {
                task = todayLog.morning.tasks.find(t => t.id === taskId);
            }
        }

        modalContent.innerHTML = Views.getTaskModalHTML(task);
        modal.classList.add('active');
    },

    /**
     * Edit a task
     * @param {string} taskId - Task ID
     */
    editTask(taskId) {
        this.openTaskModal(taskId);
    },

    /**
     * Save task from modal form
     * @param {Event} e - Form submit event
     */
    saveTask(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const taskId = formData.get('taskId');

        const taskData = {
            id: taskId || Utils.generateId(),
            title: formData.get('title'),
            category: formData.get('category'),
            priority: formData.get('priority'),
            estimatedTime: formData.get('estimatedTime') ? parseFloat(formData.get('estimatedTime')) : null,
            notes: formData.get('notes'),
            status: 'pending'
        };

        if (taskId) {
            // Update existing task
            Storage.updateTask(this.data, taskId, taskData);
            Utils.showToast('Task updated successfully.', 'gold');
        } else {
            // Add new task
            Storage.addTask(this.data, taskData);
            Utils.showToast('New task added!', 'gold');
        }

        this.closeModal();
        this.navigate('morning');
    },

    /**
     * Toggle task status (pending -> in-progress -> completed)
     * @param {string} taskId - Task ID
     */
    toggleTaskStatus(taskId) {
        Storage.toggleTaskStatus(this.data, taskId);

        // Re-render current view
        const currentView = Router.getCurrentView();
        this.navigate(currentView);
    },

    /**
     * Delete a task
     * @param {string} taskId - Task ID
     */
    deleteTask(taskId) {
        if (confirm('Remove this task from the battle plan?')) {
            Storage.deleteTask(this.data, taskId);
            Utils.showToast('Task removed.', 'indigo');
            this.navigate('morning');
        }
    },

    /**
     * Update session info (location, session name)
     */
    updateSessionInfo() {
        const sessionName = document.getElementById('session-name')?.value || '';
        const location = document.getElementById('session-location')?.value || '';

        const log = Storage.getTodayLog(this.data);
        if (!log.morning) {
            log.morning = { sessionName: '', location: '', tasks: [] };
        }

        log.morning.sessionName = sessionName;
        log.morning.location = location;
        Storage.save(this.data);
    },

    // ==========================================
    // EVENING REPORT
    // ==========================================

    /**
     * Set rating value (mood or energy)
     * @param {string} type - 'mood' or 'energy'
     * @param {number} value - Rating value 1-5
     */
    setRating(type, value) {
        // Update hidden input
        const inputId = type === 'mood' ? 'mood-input' : 'energy-input';
        const input = document.getElementById(inputId);
        if (input) input.value = value;

        // Update button states
        for (let i = 1; i <= 5; i++) {
            const btn = document.querySelector(`[data-rating="${type}-${i}"]`);
            if (btn) {
                btn.classList.toggle('active', i === value);
            }
        }
    },

    /**
     * Save evening report
     * @param {Event} e - Form submit event
     */
    saveEvening(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const eveningData = {
            mood: parseInt(formData.get('mood')) || null,
            energyLevel: parseInt(formData.get('energyLevel')) || null,
            success: formData.get('success'),
            challenges: formData.get('challenges'),
            strategy: formData.get('strategy')
        };

        Storage.saveEvening(this.data, eveningData);
        Utils.showToast('Evening report filed. Rest well, King.', 'indigo');
        this.navigate('dashboard');
    },

    // ==========================================
    // EVENT MANAGEMENT
    // ==========================================

    /**
     * Open event modal for add/edit
     * @param {number} index - Event index to edit (-1 for new)
     */
    openEventModal(index = -1) {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');

        let event = null;
        if (index > -1 && this.data.events[index]) {
            event = this.data.events[index];
        }

        modalContent.innerHTML = Views.getEventModalHTML(event, index);
        modal.classList.add('active');
    },

    /**
     * Edit an event
     * @param {number} index - Event index
     */
    editEvent(index) {
        this.openEventModal(index);
    },

    /**
     * Save event from modal form
     * @param {Event} e - Form submit event
     */
    saveEvent(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const index = parseInt(formData.get('eventIndex'));

        const eventData = {
            title: formData.get('title'),
            date: formData.get('date'),
            type: formData.get('type')
        };

        if (index > -1) {
            Storage.updateEvent(this.data, index, eventData);
            Utils.showToast('Decree updated.', 'gold');
        } else {
            Storage.addEvent(this.data, eventData);
            Utils.showToast('Decree declared.', 'gold');
        }

        this.closeModal();
        this.navigate('events');
    },

    /**
     * Delete an event
     * @param {number} index - Event index
     */
    deleteEvent(index) {
        if (confirm('Revoke this decree?')) {
            Storage.deleteEvent(this.data, index);
            Utils.showToast('Decree revoked.', 'indigo');
            this.navigate('events');
        }
    },

    // ==========================================
    // MODAL MANAGEMENT
    // ==========================================

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('modal');
        modal.classList.remove('active');
    },

    // ==========================================
    // DATA MANAGEMENT
    // ==========================================

    /**
     * Export data backup
     */
    exportData() {
        Storage.exportData(this.data);
    },

    /**
     * Import data from file
     * @param {HTMLInputElement} input - File input element
     */
    importData(input) {
        const file = input.files[0];
        Storage.importData(file, (importedData) => {
            this.data = importedData;
            this.navigate('dashboard');
        });
        input.value = ''; // Reset file input
    },

    /**
     * Reset all data
     */
    resetData() {
        if (confirm('Abdicate the throne? This clears ALL records irrecoverably.')) {
            Storage.clear();
            location.reload();
        }
    },

    // ==========================================
    // LEARNING MODULE
    // ==========================================

    /**
     * Navigate to course detail
     * @param {number} courseId - Course ID
     */
    navigateToCourse(courseId) {
        Charts.destroyAll();
        Router.currentView = `course-${courseId}`;
        Router.animateTransition(() => {
            const container = document.getElementById('main-view');
            Views.renderCourseDetail(container, this.data, courseId);
        });
    },

    /**
     * Open course modal for adding new course
     */
    openCourseModal() {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = Views.getAddCourseModalHTML();
        modal.classList.add('active');
    },

    /**
     * Save course from modal form
     * @param {Event} e - Form submit event
     */
    saveCourse(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const courseData = {
            title: formData.get('title'),
            platform: formData.get('platform') || 'Self-Study',
            duration: formData.get('duration'),
            dailyGoal: formData.get('dailyGoal'),
            endDate: formData.get('endDate'),
            pledge: formData.get('pledge')
        };

        Storage.addCourse(this.data, courseData);
        Utils.showToast('New learning journey begins!', 'gold');
        this.closeModal();
        this.navigate('learning');
    },

    /**
     * Open edit course modal
     * @param {number} courseId - Course ID
     */
    openEditCourseModal(courseId) {
        const course = Storage.getCourse(this.data, courseId);
        if (!course) return;

        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="ph-duotone ph-pencil-simple" style="color: var(--royal-gold);"></i>
                    Edit Course
                </h2>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x" style="font-size: 1.25rem;"></i>
                </button>
            </div>
            <div class="modal-body">
                <form onsubmit="app.updateCourse(event, ${course.id})">
                    <div class="form-group">
                        <label class="form-label">Course Title *</label>
                        <input type="text" name="title" class="form-input" value="${Utils.sanitize(course.title)}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Platform</label>
                            <input type="text" name="platform" class="form-input" value="${Utils.sanitize(course.platform || '')}" placeholder="Coursera, Udemy...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Duration</label>
                            <input type="text" name="duration" class="form-input" value="${Utils.sanitize(course.duration || '')}" placeholder="40 hours">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Daily Goal (min)</label>
                            <input type="number" name="dailyGoal" class="form-input" value="${course.dailyGoal || 60}" min="15" max="480">
                        </div>
                        <div class="form-group">
                            <label class="form-label">End Date</label>
                            <input type="date" name="endDate" class="form-input" value="${course.endDate ? course.endDate.split('T')[0] : ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pledge / Commitment</label>
                        <textarea name="pledge" class="form-input" rows="2" placeholder="Why are you learning this?">${Utils.sanitize(course.pledge || '')}</textarea>
                    </div>
                    <div class="btn-row" style="margin-top: 1.5rem;">
                        <button type="button" class="btn btn-outline" onclick="app.deleteCourse(${course.id})" style="color: var(--danger); border-color: var(--danger);">
                            <i class="ph-bold ph-trash"></i> Delete
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="ph-bold ph-check"></i> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.classList.add('active');
    },

    /**
     * Update existing course
     * @param {Event} e - Form submit event
     * @param {number} courseId - Course ID
     */
    updateCourse(e, courseId) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const updates = {
            title: formData.get('title'),
            platform: formData.get('platform') || 'Self-Study',
            duration: formData.get('duration'),
            dailyGoal: parseInt(formData.get('dailyGoal')) || 60,
            endDate: formData.get('endDate') || null,
            pledge: formData.get('pledge')
        };

        Storage.updateCourse(this.data, courseId, updates);
        Utils.showToast('Course updated!', 'gold');
        this.closeModal();
        this.navigateToCourse(courseId);
    },

    /**
     * Open log modal for course
     * @param {number} courseId - Course ID
     */
    openLogModal(courseId) {
        const course = Storage.getCourse(this.data, courseId);
        if (!course) return;

        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = Views.getLogModalHTML(course);
        modal.classList.add('active');
    },

    /**
     * Save learning log
     * @param {Event} e - Form submit event
     */
    saveLog(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const courseId = parseInt(formData.get('courseId'));

        const logData = {
            learned: formData.get('learned'),
            challenge: formData.get('challenge'),
            solution: formData.get('solution'),
            timeSpent: parseInt(formData.get('timeSpent')) || 60,
            milestone: formData.get('milestone') === 'on'
        };

        Storage.addLearningLog(this.data, courseId, logData);

        // Update streak
        const streak = Storage.updateStreak(this.data);
        this.updateStreakBadge();

        Utils.showToast(`Learning logged! Streak: ${streak.current} day${streak.current !== 1 ? 's' : ''} 🔥`, 'gold');
        this.closeModal();
        this.navigateToCourse(courseId);
    },

    /**
     * Adjust log time by increment
     * @param {number} increment - Minutes to add/remove
     */
    adjustLogTime(increment) {
        const input = document.getElementById('log-time-input');
        if (input) {
            let value = parseInt(input.value) || 60;
            value = Math.max(5, value + increment);
            input.value = value;
        }
    },

    /**
     * Complete a course
     * @param {number} courseId - Course ID
     */
    completeCourse(courseId) {
        if (!confirm('Mark this course as completed? This is a great achievement!')) return;

        Storage.completeCourse(this.data, courseId);
        Utils.showToast('Course Completed! 👑 Upload your certificate to seal the victory.', 'gold');

        // Open certificate upload modal
        this.openCertModal(courseId);
    },

    /**
     * Delete a course
     * @param {number} courseId - Course ID
     */
    deleteCourse(courseId) {
        if (!confirm('Delete this course and all its logs? This cannot be undone.')) return;

        Storage.deleteCourse(this.data, courseId);
        Utils.showToast('Course deleted.', 'indigo');
        this.navigate('learning');
    },

    /**
     * Open certificate upload modal
     * @param {number} courseId - Course ID
     */
    openCertModal(courseId) {
        const course = Storage.getCourse(this.data, courseId);
        if (!course) return;

        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = Views.getCertModalHTML(course);
        modal.classList.add('active');
    },

    /**
     * Upload certificate from form
     * @param {Event} e - Form submit event
     */
    uploadCertificate(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const courseId = parseInt(formData.get('courseId'));
        const fileInput = document.getElementById('cert-file-input');
        const errorEl = document.getElementById('cert-error');
        const file = fileInput?.files[0];

        if (!file) {
            errorEl.textContent = 'Please select a file.';
            errorEl.style.display = 'block';
            return;
        }

        // Validate size (500KB)
        if (file.size > 500 * 1024) {
            errorEl.textContent = 'File too large! Max 500KB. Please compress it.';
            errorEl.style.display = 'block';
            return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                Storage.saveCertificate(this.data, courseId, evt.target.result);
                Utils.showToast('Certificate uploaded successfully!', 'gold');
                this.closeModal();
                this.navigateToCourse(courseId);
            } catch (err) {
                errorEl.textContent = 'Storage full. Cannot save image.';
                errorEl.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    },

    /**
     * Remove certificate from course
     * @param {number} courseId - Course ID
     */
    removeCertificate(courseId) {
        if (!confirm('Remove this certificate?')) return;
        Storage.removeCertificate(this.data, courseId);
        Utils.showToast('Certificate removed.', 'indigo');
        this.navigateToCourse(courseId);
    },

    /**
     * Show image in new window
     * @param {string} src - Image source
     */
    showImage(src) {
        const w = window.open('');
        w.document.write(`<html><head><title>Certificate</title><style>body{margin:0;background:#0a0a0a;display:flex;justify-content:center;align-items:center;min-height:100vh;}</style></head><body><img src="${src}" style="max-width:100%;max-height:100vh;object-fit:contain;"></body></html>`);
    },

    // ==========================================
    // SETTINGS & AUTH
    // ==========================================

    /**
     * Open settings view
     */
    openSettings() {
        this.navigate('settings');
    },

    /**
     * Logout user
     */
    logout() {
        if (!confirm('Sign out of your account?')) return;
        Auth.logout();
    },

    /**
     * Handle avatar upload
     * @param {HTMLInputElement} input - File input element
     */
    async handleAvatarUpload(input) {
        const file = input.files[0];
        if (!file) return;

        // Validate size
        if (file.size > 500 * 1024) {
            Utils.showToast('Image too large! Max 500KB.', 'danger');
            return;
        }

        try {
            Utils.showToast('Uploading avatar...', 'indigo');
            await Auth.uploadAvatar(file);
            Utils.showToast('Avatar updated!', 'gold');
            this.navigate('settings');

            // Update header avatar
            const user = Auth.getUser();
            if (user && user.avatar) {
                const avatarImg = document.getElementById('user-avatar-img');
                const initials = document.getElementById('user-initials');
                if (avatarImg && user.avatar.startsWith('data:')) {
                    avatarImg.src = user.avatar;
                    avatarImg.style.display = 'block';
                    if (initials) initials.style.display = 'none';
                }
            }
        } catch (error) {
            Utils.showToast('Failed to upload avatar: ' + error.message, 'danger');
        }
    },

    /**
     * Open edit name modal
     */
    openEditNameModal() {
        const user = Auth.getUser();
        if (!user) return;

        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="ph-duotone ph-pencil-simple" style="color: var(--royal-gold);"></i>
                    Edit Name
                </h2>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x" style="font-size: 1.25rem;"></i>
                </button>
            </div>
            <div class="modal-body">
                <form onsubmit="app.updateName(event)">
                    <div class="form-group">
                        <label class="form-label">Your Name</label>
                        <input type="text" name="name" class="form-input" value="${Utils.sanitize(user.name)}" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem;">
                        <i class="ph-bold ph-check"></i> Save
                    </button>
                </form>
            </div>
        `;

        modal.classList.add('active');
    },

    /**
     * Update user name
     * @param {Event} e - Form submit event
     */
    async updateName(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');

        try {
            await Auth.updateProfile({ name });
            Utils.showToast('Name updated!', 'gold');
            this.closeModal();
            this.navigate('settings');

            // Update header
            const initialsEl = document.getElementById('user-initials');
            if (initialsEl) {
                const user = Auth.getUser();
                initialsEl.textContent = user.initials || 'U';
            }
        } catch (error) {
            Utils.showToast('Failed to update name: ' + error.message, 'danger');
        }
    },

    /**
     * Open change password modal
     */
    openChangePasswordModal() {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="ph-duotone ph-lock-key" style="color: var(--indigo);"></i>
                    Change Password
                </h2>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x" style="font-size: 1.25rem;"></i>
                </button>
            </div>
            <div class="modal-body">
                <form onsubmit="app.changePassword(event)">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <input type="password" name="currentPassword" class="form-input" placeholder="••••••••" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" name="newPassword" class="form-input" placeholder="Minimum 6 characters" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" name="confirmPassword" class="form-input" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem;">
                        <i class="ph-bold ph-check"></i> Update Password
                    </button>
                </form>
            </div>
        `;

        modal.classList.add('active');
    },

    /**
     * Change password
     * @param {Event} e - Form submit event
     */
    async changePassword(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword !== confirmPassword) {
            Utils.showToast('New passwords do not match!', 'danger');
            return;
        }

        try {
            // Call API to change password
            const response = await fetch(`${Config.API_URL}/auth/password`, {
                method: 'PUT',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to change password');
            }

            Utils.showToast('Password updated successfully!', 'gold');
            this.closeModal();
        } catch (error) {
            Utils.showToast(error.message, 'danger');
        }
    },

    /**
     * Confirm delete account
     */
    confirmDeleteAccount() {
        if (!confirm('⚠️ This will permanently delete your account and all cloud data. This action cannot be undone. Are you sure?')) {
            return;
        }

        // Double confirmation
        const email = Auth.getUser()?.email;
        const confirmation = prompt(`Type your email "${email}" to confirm deletion:`);

        if (confirmation !== email) {
            Utils.showToast('Email did not match. Account not deleted.', 'danger');
            return;
        }

        this.deleteAccount();
    },

    // ==========================================
    // PROFILE MANAGEMENT
    // ==========================================

    /**
     * Toggle profile edit mode
     */
    toggleProfileEdit() {
        const viewMode = document.getElementById('profile-view-mode');
        const editMode = document.getElementById('profile-edit-mode');
        const toggleBtn = document.getElementById('toggle-edit-btn');

        if (viewMode && editMode) {
            viewMode.classList.toggle('hidden');
            editMode.classList.toggle('hidden');

            if (editMode.classList.contains('hidden')) {
                toggleBtn.innerHTML = '<i class="ph-bold ph-pencil-simple"></i> Edit Profile';
            } else {
                toggleBtn.innerHTML = '<i class="ph-bold ph-x"></i> Cancel';
            }
        }
    },

    /**
     * Cancel profile edit
     */
    cancelProfileEdit() {
        this.toggleProfileEdit();
    },

    /**
     * Save profile changes
     * @param {Event} e - Form submit event
     */
    async saveProfileChanges(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const updates = {
            name: formData.get('name'),
            email: formData.get('email')
        };

        try {
            LoadingComponent.show('spinner', 'Saving changes...');
            await Auth.updateProfile(updates);
            LoadingComponent.hide();

            Utils.showToast('Profile updated successfully!', 'gold');
            this.toggleProfileEdit();

            // Refresh profile view
            setTimeout(() => {
                this.navigate('profile');
            }, 500);

            // Update header if name changed
            const user = Auth.getUser();
            const initialsEl = document.getElementById('user-initials');
            if (initialsEl && user) {
                initialsEl.textContent = user.initials || user.name?.charAt(0) || 'U';
            }
        } catch (error) {
            LoadingComponent.hide();
            Utils.showToast('Failed to update profile: ' + error.message, 'danger');
        }
    },

    /**
     * Open avatar upload dialog
     */
    openAvatarUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/jpg,image/webp';
        input.onchange = (e) => this.handleAvatarUpload(e);
        input.click();
    },

    /**
     * Handle avatar file upload
     * @param {Event} e - Change event
     */
    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            Utils.showToast('Please select a valid image file (JPEG, PNG, WebP)', 'danger');
            return;
        }

        // Validate file size (500KB max)
        if (file.size > 500 * 1024) {
            Utils.showToast('Image too large! Maximum size is 500KB', 'danger');
            return;
        }

        try {
            LoadingComponent.show('spinner', 'Uploading avatar...');
            const updatedUser = await Auth.uploadAvatar(file);
            LoadingComponent.hide();

            Utils.showToast('Avatar updated successfully!', 'gold');

            // Update profile view
            const avatarContainer = document.getElementById('profile-avatar-container');
            if (avatarContainer && updatedUser.avatar) {
                avatarContainer.innerHTML = `<img src="${updatedUser.avatar}" alt="${updatedUser.name}" class="profile-avatar-img">`;
            }

            // Update header avatar
            const headerAvatar = document.getElementById('user-avatar-img');
            const headerInitials = document.getElementById('user-initials');
            if (headerAvatar && headerInitials && updatedUser.avatar) {
                headerAvatar.src = updatedUser.avatar;
                headerAvatar.style.display = 'block';
                headerInitials.style.display = 'none';
            }
        } catch (error) {
            LoadingComponent.hide();
            Utils.showToast('Failed to upload avatar: ' + error.message, 'danger');
        }
    },

    /**
     * Confirm and remove avatar
     */
    async confirmRemoveAvatar() {
        if (!confirm('Are you sure you want to remove your profile picture?')) {
            return;
        }

        try {
            LoadingComponent.show('spinner', 'Removing avatar...');
            const updatedUser = await Auth.removeAvatar();
            LoadingComponent.hide();

            Utils.showToast('Avatar removed', 'indigo');

            // Update profile view
            const avatarContainer = document.getElementById('profile-avatar-container');
            if (avatarContainer) {
                const initials = Auth.getInitials();
                avatarContainer.innerHTML = `<div class="profile-avatar-initials-large">${initials}</div>`;
            }

            // Update header
            const headerAvatar = document.getElementById('user-avatar-img');
            const headerInitials = document.getElementById('user-initials');
            if (headerAvatar && headerInitials) {
                headerAvatar.style.display = 'none';
                headerInitials.style.display = 'block';
                headerInitials.textContent = updatedUser.initials || updatedUser.name?.charAt(0) || 'U';
            }
        } catch (error) {
            LoadingComponent.hide();
            Utils.showToast('Failed to remove avatar: ' + error.message, 'danger');
        }
    },

    /**
     * Delete account
     */
    async deleteAccount() {
        try {
            const response = await fetch(`${Config.API_URL}/auth/account`, {
                method: 'DELETE',
                headers: Auth.getHeaders()
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete account');
            }

            Utils.showToast('Account deleted. Goodbye!', 'gold');
            Auth.logout();
        } catch (error) {
            Utils.showToast(error.message, 'danger');
        }
    },

    /**
     * Export data as JSON backup
     */
    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            appData: this.data,
            user: Auth.getUser()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `king-daily-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Utils.showToast('Data exported successfully!', 'gold');
    },

    // ==========================================
    // THEME AND SETTINGS
    // ==========================================

    /**
     * Toggle between light and dark theme
     * @param {boolean} isLight - Whether to use light theme
     */
    toggleTheme(isLight) {
        document.body.classList.toggle('light-theme', isLight);
        Storage.updateSetting('theme', isLight ? 'light' : 'dark');
        Utils.showToast(isLight ? 'Light theme activated' : 'Dark theme activated', 'gold');
    },

    /**
     * Update notification setting
     * @param {string} key - Setting key
     * @param {boolean} value - Setting value
     */
    updateNotificationSetting(key, value) {
        Storage.updateSetting(`notifications.${key}`, value);
    },

    /**
     * Apply saved settings on init
     */
    applySettings() {
        const settings = Storage.getSettings();

        // Apply theme
        if (settings.theme === 'light') {
            document.body.classList.add('light-theme');
        }
    },

    // ==========================================
    // STREAK AND NOTIFICATIONS
    // ==========================================

    /**
     * Update streak badge in header
     */
    updateStreakBadge() {
        const streak = Storage.getStreak();
        const badge = document.getElementById('streak-badge');
        const count = document.getElementById('streak-count');

        if (badge && count) {
            if (streak.current > 0) {
                badge.classList.remove('hidden');
                count.textContent = streak.current;
            } else {
                badge.classList.add('hidden');
            }
        }
    },

    /**
     * Mark notification as read
     * @param {string} id - Notification ID
     */
    markNotificationRead(id) {
        Storage.markNotificationRead(id);
        this.navigate('notifications');
    },

    /**
     * Clear all notifications
     */
    clearNotifications() {
        Storage.clearNotifications();
        this.navigate('notifications');
        Utils.showToast('All notifications marked as read', 'gold');
    },

    // ==========================================
    // IDEAS, GOODS, LESSONS HANDLERS
    // ==========================================

    /**
     * Save a new idea
     * @param {Event} e - Form submit event
     */
    saveIdea(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const idea = {
            type: formData.get('ideaType'),
            title: formData.get('ideaTitle'),
            description: formData.get('ideaDescription'),
            implementation: {
                when: formData.get('ideaWhen'),
                where: formData.get('ideaWhere'),
                how: formData.get('ideaHow'),
                withWho: formData.get('ideaWithWho'),
                why: formData.get('ideaWhy')
            }
        };

        Storage.addIdea(idea);
        Utils.showToast('💡 Idea saved! Great thinking!', 'gold');
        e.target.reset();
        this.navigate('idea');
    },

    /**
     * Save a daily good moment
     * @param {Event} e - Form submit event
     */
    saveDailyGood(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const good = {
            category: formData.get('goodCategory'),
            description: formData.get('goodDescription'),
            details: formData.get('goodDetails')
        };

        Storage.addDailyGood(good);
        Utils.showToast('❤️ Good moment captured!', 'gold');
        e.target.reset();
        this.navigate('dailygood');
    },

    /**
     * Save a lesson
     * @param {Event} e - Form submit event
     */
    saveLesson(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        const lesson = {
            content: formData.get('lessonContent'),
            tags: formData.get('lessonTags') ? formData.get('lessonTags').split(',').map(t => t.trim()) : [],
            source: formData.get('lessonSource')
        };

        Storage.addLesson(lesson);
        Utils.showToast('📚 Lesson recorded! Wisdom grows.', 'gold');
        e.target.reset();
        this.navigate('lessons');
    },

    /**
     * Open idea history modal
     */
    openIdeaHistory() {
        const ideas = Storage.getIdeas();
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title"><i class="ph-bold ph-lightbulb" style="color: #f59e0b;"></i> Idea History</h3>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
            <div class="history-tabs">
                <button class="history-tab active" onclick="app.filterIdeaHistory('all')">All</button>
                <button class="history-tab" onclick="app.filterIdeaHistory('pending')">Pending</button>
                <button class="history-tab" onclick="app.filterIdeaHistory('completed')">Completed</button>
                <button class="history-tab" onclick="app.filterIdeaHistory('abandoned')">Abandoned</button>
            </div>
            <div id="idea-history-list">
                ${ideas.length > 0 ? ideas.map(idea => `
                    <div class="recent-item" style="margin-bottom: 0.75rem;">
                        <div class="recent-item-icon ${idea.type}">
                            <i class="ph-bold ${idea.type === 'project' ? 'ph-rocket-launch' : idea.type === 'quote' ? 'ph-quotes' : 'ph-brain'}"></i>
                        </div>
                        <div class="recent-item-content">
                            <p class="recent-item-title">${Utils.sanitize(idea.title)}</p>
                            <p class="recent-item-date">${Utils.formatTimeAgo(idea.createdAt)}</p>
                        </div>
                        <span class="recent-item-status ${idea.status}">${idea.status}</span>
                    </div>
                `).join('') : '<p style="text-align: center; color: #64748b; padding: 2rem;">No ideas yet. Start capturing your brilliant thoughts!</p>'}
            </div>
        `;
        modal.classList.add('active');
    },

    /**
     * Open daily good history modal
     */
    openDailyGoodHistory() {
        const goods = Storage.getDailyGoods();
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title"><i class="ph-bold ph-heart" style="color: #ef4444;"></i> Daily Good History</h3>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
            <div id="good-history-list" style="max-height: 400px; overflow-y: auto;">
                ${goods.length > 0 ? goods.map(good => `
                    <div class="recent-item" style="margin-bottom: 0.75rem;">
                        <div class="recent-item-icon good">
                            <i class="ph-bold ph-heart"></i>
                        </div>
                        <div class="recent-item-content">
                            <p class="recent-item-title">${Utils.sanitize(good.description.substring(0, 60))}${good.description.length > 60 ? '...' : ''}</p>
                            <p class="recent-item-date">${Utils.formatTimeAgo(good.date)} • ${good.category}</p>
                        </div>
                    </div>
                `).join('') : '<p style="text-align: center; color: #64748b; padding: 2rem;">No good moments logged yet. Start appreciating the good in your life!</p>'}
            </div>
        `;
        modal.classList.add('active');
    },

    /**
     * Open lessons history modal
     */
    openLessonsHistory() {
        const lessons = Storage.getLessons();
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title"><i class="ph-bold ph-book-open-text" style="color: var(--info);"></i> Lessons History</h3>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
            <div id="lessons-history-list" style="max-height: 400px; overflow-y: auto;">
                ${lessons.length > 0 ? lessons.map(lesson => `
                    <div class="recent-item" style="margin-bottom: 0.75rem;">
                        <div class="recent-item-icon lesson">
                            <i class="ph-bold ph-book-open-text"></i>
                        </div>
                        <div class="recent-item-content">
                            <p class="recent-item-title">${Utils.sanitize(lesson.content.substring(0, 80))}${lesson.content.length > 80 ? '...' : ''}</p>
                            <p class="recent-item-date">${Utils.formatTimeAgo(lesson.date)}${lesson.source ? ' • ' + lesson.source : ''}</p>
                        </div>
                    </div>
                `).join('') : '<p style="text-align: center; color: #64748b; padding: 2rem;">No lessons captured yet. Start learning and growing!</p>'}
            </div>
        `;
        modal.classList.add('active');
    },

    /**
     * Filter Royal Chronicle activities
     * @param {string} type - Activity type to filter
     */
    filterChronicle(type) {
        const cards = document.querySelectorAll('.chronicle-card');
        const tabs = document.querySelectorAll('.history-tab');

        // Update active tab
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.toLowerCase().includes(type === 'all' ? 'all' : type)) {
                tab.classList.add('active');
            }
        });

        // Filter cards
        cards.forEach(card => {
            if (type === 'all' || card.dataset.type === type) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });

        // Update date groups visibility
        document.querySelectorAll('.chronicle-date-group').forEach(group => {
            const visibleCards = group.querySelectorAll('.chronicle-card[style*="display: flex"]');
            const hiddenCards = group.querySelectorAll('.chronicle-card[style*="display: none"]');

            // Show group if any cards are visible, or hide if all are hidden
            if (type === 'all') {
                group.style.display = 'block';
            } else {
                const hasVisibleCards = Array.from(group.querySelectorAll('.chronicle-card'))
                    .some(c => c.dataset.type === type);
                group.style.display = hasVisibleCards ? 'block' : 'none';
            }
        });
    },

    // ==========================================
    // RELATIONSHIPS MANAGEMENT
    // ==========================================

    /**
     * Load relationships from API
     */
    async loadRelationships() {
        const user = Auth.getUser();
        if (!user) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/relationships`, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.getAuthToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to load relationships');

            const data = await response.json();
            window.relationshipsData = {
                relationships: data.relationships,
                grouped: data.grouped,
                loading: false,
                filter: 'all'
            };

            // Update stats
            const stats = data.relationships.reduce((acc, r) => {
                acc.total++;
                if (r.isFavorite) acc.favorites++;
                if (r.purpose === 'partner') acc.partners++;
                if (r.purpose === 'friend') acc.friends++;
                return acc;
            }, { total: 0, favorites: 0, partners: 0, friends: 0 });

            document.getElementById('rel-total').textContent = stats.total;
            document.getElementById('rel-partners').textContent = stats.partners;
            document.getElementById('rel-friends').textContent = stats.friends;
            document.getElementById('rel-favorites').textContent = stats.favorites;

            Views.renderRelationshipsList(data.relationships, 'all');
        } catch (error) {
            console.error('Load relationships error:', error);
            document.getElementById('relationships-list').innerHTML = `
                <div class="empty-state glass-card" style="text-align: center; padding: 2rem;">
                    <i class="ph-duotone ph-warning" style="font-size: 3rem; color: #f59e0b;"></i>
                    <h3 style="color: white;">Connection Error</h3>
                    <p style="color: #94a3b8;">Could not load relationships. Make sure you're connected and try again.</p>
                    <button class="btn btn-primary" onclick="app.loadRelationships()" style="margin-top: 1rem;">
                        <i class="ph-bold ph-arrow-clockwise"></i> Retry
                    </button>
                </div>
            `;
        }
    },

    /**
     * Filter relationships by purpose or classification
     * @param {string} filter - Purpose or classification to filter by
     * @param {string} type - Filter type: 'purpose' or 'classification'
     */
    filterRelationships(filter, type = 'purpose') {
        if (!window.relationshipsData) return;

        // Update button states
        document.querySelectorAll('.rel-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Filter relationships based on type
        let filtered = window.relationshipsData.relationships;
        if (filter !== 'all') {
            if (type === 'classification') {
                filtered = window.relationshipsData.relationships.filter(r => r.classification === filter);
            } else if (filter === 'favorite') {
                filtered = window.relationshipsData.relationships.filter(r => r.isFavorite);
            } else {
                filtered = window.relationshipsData.relationships.filter(r => r.purpose === filter);
            }
        }

        window.relationshipsData.filter = filter;
        window.relationshipsData.filterType = type;
        Views.renderRelationshipsList(filtered, filter === 'all' ? 'all' : 'filtered');
    },

    /**
     * Open relationship modal for add/edit
     * @param {Object} relationship - Relationship to edit (optional)
     */
    openRelationshipModal(relationship = null) {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = Views.getRelationshipModalHTML(relationship);
        modal.classList.add('active');
    },

    /**
     * Save relationship from form
     * @param {Event} e - Form submit event
     */
    async saveRelationship(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const relationshipId = formData.get('relationshipId');
        const isEdit = !!relationshipId;

        const data = {
            name: formData.get('name'),
            gender: formData.get('gender'),
            purpose: formData.get('purpose'),
            classification: formData.get('classification') || null,
            customPurpose: formData.get('customPurpose'),
            whatTheyDid: formData.get('whatTheyDid'),
            contactInfo: formData.get('contactInfo'),
            birthday: formData.get('birthday') || null,
            notes: formData.get('notes'),
            isFavorite: formData.get('isFavorite') === 'on'
        };

        try {
            const url = isEdit
                ? `${CONFIG.API_URL}/relationships/${relationshipId}`
                : `${CONFIG.API_URL}/relationships`;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.getAuthToken()}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to save');
            }

            Utils.showToast(isEdit ? 'Person updated!' : 'Person added to your rainy day people! 💜', 'gold');
            this.closeModal();
            this.navigate('relationships');
        } catch (error) {
            Utils.showToast(error.message, 'danger');
        }
    },

    /**
     * View relationship details
     * @param {string} id - Relationship ID
     */
    async viewRelationship(id) {
        if (!window.relationshipsData) return;
        const rel = window.relationshipsData.relationships.find(r => r.id === id);
        if (!rel) return;

        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');
        modalContent.innerHTML = Views.getRelationshipDetailModalHTML(rel);
        modal.classList.add('active');
    },

    /**
     * Edit a relationship
     * @param {string} id - Relationship ID
     */
    editRelationship(id) {
        if (!window.relationshipsData) return;
        const rel = window.relationshipsData.relationships.find(r => r.id === id);
        if (!rel) return;
        this.openRelationshipModal(rel);
    },

    /**
     * Toggle relationship favorite status
     * @param {string} id - Relationship ID
     */
    async toggleRelationshipFavorite(id) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/relationships/${id}/favorite`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${CONFIG.getAuthToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to update');

            const data = await response.json();
            Utils.showToast(data.message, 'gold');

            // Reload relationships
            this.loadRelationships();
            this.closeModal();
        } catch (error) {
            Utils.showToast('Failed to update favorite status', 'danger');
        }
    },

    /**
     * Delete a relationship
     * @param {string} id - Relationship ID
     */
    async deleteRelationship(id) {
        if (!confirm('Remove this person from your rainy day people?')) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/relationships/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${CONFIG.getAuthToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete');

            Utils.showToast('Person removed', 'indigo');
            this.navigate('relationships');
        } catch (error) {
            Utils.showToast('Failed to remove person', 'danger');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        app.closeModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close modal
    if (e.key === 'Escape') {
        app.closeModal();
    }
});

// Make app globally available
window.app = app;
