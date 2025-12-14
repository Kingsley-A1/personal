/**
 * Reign Admin - Application Controller
 * Manages admin dashboard, user management, analytics, and personal tools
 */

const AdminApp = {
    currentView: 'dashboard',
    users: [],
    stats: {},
    isImpersonating: false,
    impersonatedUser: null,
    adminUser: null,

    /**
     * Initialize Admin Application
     */
    init() {
        // Check admin authentication
        const user = this.getAdminUser();
        if (!user || !['admin', 'super_admin', 'moderator'].includes(user.role)) {
            window.location.href = 'auth.html';
            return;
        }

        this.adminUser = user;
        this.updateAdminInfo();
        this.updateTime();
        setInterval(() => this.updateTime(), 60000);

        // Load initial view
        this.navigate('dashboard');

        console.log('Reign Admin initialized');
    },

    /**
     * Get admin user from storage
     */
    getAdminUser() {
        const userStr = localStorage.getItem('kingdaily_user');
        if (!userStr) {
            // For demo, create a default super admin
            const demoAdmin = {
                id: 'admin-1',
                name: 'Super Admin',
                email: 'admin@reign.app',
                role: 'super_admin',
                initials: 'SA'
            };
            localStorage.setItem('kingdaily_user', JSON.stringify(demoAdmin));
            return demoAdmin;
        }
        return JSON.parse(userStr);
    },

    /**
     * Update admin info in sidebar
     */
    updateAdminInfo() {
        const nameEl = document.getElementById('admin-name');
        const roleEl = document.getElementById('admin-role');
        const initialsEl = document.getElementById('admin-initials');

        if (this.adminUser) {
            nameEl.textContent = this.adminUser.name;
            roleEl.textContent = this.formatRole(this.adminUser.role);
            initialsEl.textContent = this.adminUser.initials || this.adminUser.name.charAt(0);
        }
    },

    /**
     * Format role for display
     */
    formatRole(role) {
        const roles = {
            'super_admin': 'Super Admin',
            'admin': 'Admin',
            'moderator': 'Moderator'
        };
        return roles[role] || 'Admin';
    },

    /**
     * Update time display
     */
    updateTime() {
        const dateEl = document.getElementById('admin-date');
        const timeEl = document.getElementById('admin-time');

        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
        if (timeEl) {
            timeEl.textContent = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    },

    /**
     * Toggle sidebar on mobile
     */
    toggleSidebar() {
        const sidebar = document.querySelector('.admin-sidebar');
        sidebar.classList.toggle('open');
    },

    /**
     * Navigate to view
     */
    navigate(view) {
        this.currentView = view;
        this.updateNavigation(view);
        this.updatePageTitle(view);
        this.renderView(view);

        // Close sidebar on mobile
        const sidebar = document.querySelector('.admin-sidebar');
        sidebar.classList.remove('open');
    },

    /**
     * Update navigation active state
     */
    updateNavigation(view) {
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
    },

    /**
     * Update page title
     */
    updatePageTitle(view) {
        const titles = {
            'dashboard': 'Command Center',
            'users': 'User Management',
            'analytics': 'Analytics',
            'heatmap': 'Activity Heatmap',
            'announcements': 'Announcements',
            'my-tasks': 'My Tasks',
            'my-journal': 'My Journal',
            'my-learning': 'My Learning',
            'settings': 'Platform Settings',
            'audit': 'Audit Log'
        };
        document.getElementById('page-title').textContent = titles[view] || 'Admin';
    },

    /**
     * Render view content
     */
    renderView(view) {
        const container = document.getElementById('admin-view');

        switch (view) {
            case 'dashboard':
                this.renderDashboard(container);
                break;
            case 'users':
                this.renderUsers(container);
                break;
            case 'analytics':
                this.renderAnalytics(container);
                break;
            case 'heatmap':
                this.renderHeatmap(container);
                break;
            case 'announcements':
                this.renderAnnouncements(container);
                break;
            case 'my-tasks':
                this.renderMyTasks(container);
                break;
            case 'my-journal':
                this.renderMyJournal(container);
                break;
            case 'my-learning':
                this.renderMyLearning(container);
                break;
            case 'settings':
                this.renderSettings(container);
                break;
            case 'audit':
                this.renderAuditLog(container);
                break;
            default:
                this.renderDashboard(container);
        }
    },

    /**
     * Render Dashboard / Command Center
     */
    renderDashboard(container) {
        const stats = this.getMockStats();

        container.innerHTML = `
            <!-- Quick Stats -->
            <div class="stats-grid">
                <div class="stat-card-admin">
                    <i class="ph-fill ph-users stat-icon"></i>
                    <p class="stat-label">Total Users</p>
                    <p class="stat-value">${stats.totalUsers.toLocaleString()}</p>
                    <div class="stat-change up">
                        <i class="ph-bold ph-trend-up"></i>
                        <span>+${stats.newUsersToday} today</span>
                    </div>
                </div>
                <div class="stat-card-admin success">
                    <i class="ph-fill ph-user-check stat-icon" style="color: var(--admin-success);"></i>
                    <p class="stat-label">Active Today</p>
                    <p class="stat-value">${stats.activeToday}</p>
                    <div class="stat-change up">
                        <i class="ph-bold ph-trend-up"></i>
                        <span>${stats.activePercent}% of users</span>
                    </div>
                </div>
                <div class="stat-card-admin warning">
                    <i class="ph-fill ph-fire stat-icon" style="color: var(--admin-warning);"></i>
                    <p class="stat-label">Streak Leaders</p>
                    <p class="stat-value">${stats.streakLeaders}</p>
                    <div class="stat-change">
                        <span>7+ day streaks</span>
                    </div>
                </div>
                <div class="stat-card-admin">
                    <i class="ph-fill ph-chart-line-up stat-icon"></i>
                    <p class="stat-label">Tasks Today</p>
                    <p class="stat-value">${stats.tasksToday}</p>
                    <div class="stat-change up">
                        <i class="ph-bold ph-trend-up"></i>
                        <span>${stats.completionRate}% completed</span>
                    </div>
                </div>
            </div>

            <!-- Dashboard Grid -->
            <div class="dashboard-grid">
                <!-- System Health -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">
                            <i class="ph-duotone ph-heartbeat"></i>
                            System Health
                        </h3>
                    </div>
                    <div class="health-grid">
                        <div class="health-item">
                            <div class="health-indicator"></div>
                            <span class="health-label">API Status</span>
                            <span class="health-value">Healthy</span>
                        </div>
                        <div class="health-item">
                            <div class="health-indicator"></div>
                            <span class="health-label">Database</span>
                            <span class="health-value">Connected</span>
                        </div>
                        <div class="health-item">
                            <div class="health-indicator"></div>
                            <span class="health-label">Sync Service</span>
                            <span class="health-value">Running</span>
                        </div>
                        <div class="health-item">
                            <div class="health-indicator warning"></div>
                            <span class="health-label">Storage</span>
                            <span class="health-value">72% used</span>
                        </div>
                    </div>
                </div>

                <!-- Alerts -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">
                            <i class="ph-duotone ph-warning"></i>
                            Alerts
                        </h3>
                    </div>
                    <div class="alert-item">
                        <i class="ph-bold ph-warning-circle"></i>
                        <span class="alert-text">Storage usage above 70%</span>
                        <button class="alert-dismiss"><i class="ph-bold ph-x"></i></button>
                    </div>
                    <div class="alert-item">
                        <i class="ph-bold ph-info"></i>
                        <span class="alert-text">3 users pending verification</span>
                        <button class="alert-dismiss"><i class="ph-bold ph-x"></i></button>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="dashboard-card" style="margin-top: 1.5rem;">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-activity"></i>
                        Recent Activity
                    </h3>
                </div>
                <div class="activity-list">
                    ${this.getMockActivity().map(a => `
                        <div class="activity-item">
                            <div class="activity-icon">
                                <i class="${a.icon}"></i>
                            </div>
                            <div class="activity-content">
                                <p class="activity-text">${a.text}</p>
                                <p class="activity-time">${a.time}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render Users Management
     */
    renderUsers(container) {
        const users = this.getMockUsers();

        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-users"></i>
                        All Users (${users.length})
                    </h3>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" placeholder="Search users..." class="admin-search-input" 
                               style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: white; font-size: 0.875rem;">
                        <select style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: white; font-size: 0.875rem;">
                            <option value="">All Roles</option>
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Streak</th>
                            <th>Last Active</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <div class="admin-user-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">
                                            ${user.initials}
                                        </div>
                                        <span>${user.name}</span>
                                    </div>
                                </td>
                                <td>${user.email}</td>
                                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                                <td><span class="status-badge ${user.status}">${user.status}</span></td>
                                <td><span class="streak-badge">${user.streak} 🔥</span></td>
                                <td>${user.lastActive}</td>
                                <td>
                                    <div class="action-btns">
                                        <button onclick="AdminApp.viewUser('${user.id}')" title="View">
                                            <i class="ph-bold ph-eye"></i>
                                        </button>
                                        <button onclick="AdminApp.impersonateUser('${user.id}')" title="Impersonate">
                                            <i class="ph-bold ph-user-switch"></i>
                                        </button>
                                        <button onclick="AdminApp.suspendUser('${user.id}')" title="Suspend" class="danger">
                                            <i class="ph-bold ph-prohibit"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Render Analytics
     */
    renderAnalytics(container) {
        container.innerHTML = `
            <div class="stats-grid" style="margin-bottom: 1.5rem;">
                <div class="stat-card-admin">
                    <p class="stat-label">Daily Active Users</p>
                    <p class="stat-value">847</p>
                </div>
                <div class="stat-card-admin">
                    <p class="stat-label">Weekly Active</p>
                    <p class="stat-value">2,341</p>
                </div>
                <div class="stat-card-admin">
                    <p class="stat-label">Monthly Active</p>
                    <p class="stat-value">5,892</p>
                </div>
                <div class="stat-card-admin">
                    <p class="stat-label">Avg Session</p>
                    <p class="stat-value">8.2m</p>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">
                            <i class="ph-duotone ph-chart-line-up"></i>
                            User Activity (30 Days)
                        </h3>
                    </div>
                    <div style="height: 300px;">
                        <canvas id="activityChart"></canvas>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">
                            <i class="ph-duotone ph-chart-pie"></i>
                            Feature Usage
                        </h3>
                    </div>
                    <div style="height: 300px;">
                        <canvas id="featureChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Initialize charts
        setTimeout(() => this.initAnalyticsCharts(), 100);
    },

    /**
     * Render Heatmap
     */
    renderHeatmap(container) {
        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-fire"></i>
                        Platform Activity Heatmap - Hourly View
                    </h3>
                    <select style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: white;">
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>
                <div class="heatmap-container">
                    ${this.generateHeatmap()}
                </div>
                <div class="heatmap-legend">
                    <span>Less</span>
                    <div class="legend-scale">
                        <div class="scale-0"></div>
                        <div class="scale-1"></div>
                        <div class="scale-2"></div>
                        <div class="scale-3"></div>
                        <div class="scale-4"></div>
                    </div>
                    <span>More</span>
                </div>
            </div>
        `;
    },

    /**
     * Generate heatmap grid
     */
    generateHeatmap() {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const hours = Array.from({ length: 24 }, (_, i) => i);

        let html = '<div class="heatmap-grid">';

        // Header row with hours
        html += '<div class="heatmap-row header"><div class="heatmap-label"></div>';
        hours.forEach(h => {
            if (h % 3 === 0) {
                html += `<div class="heatmap-hour">${h}:00</div>`;
            } else {
                html += `<div class="heatmap-hour"></div>`;
            }
        });
        html += '</div>';

        // Data rows
        days.forEach(day => {
            html += `<div class="heatmap-row"><div class="heatmap-label">${day}</div>`;
            hours.forEach(() => {
                const intensity = Math.floor(Math.random() * 5);
                html += `<div class="heatmap-cell level-${intensity}" title="${day}"></div>`;
            });
            html += '</div>';
        });

        html += '</div>';
        return html;
    },

    /**
     * Render Announcements
     */
    renderAnnouncements(container) {
        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-megaphone"></i>
                        Create Announcement
                    </h3>
                </div>
                <form class="announcement-form">
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <input type="text" class="form-input" placeholder="Announcement title..." style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem; border-radius: 0.5rem; width: 100%;">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Message</label>
                        <textarea class="form-input" rows="4" placeholder="Write your announcement..." style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem; border-radius: 0.5rem; width: 100%; resize: vertical;"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Target Audience</label>
                        <select style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.75rem; border-radius: 0.5rem; width: 100%;">
                            <option value="all">All Users</option>
                            <option value="active">Active Users Only</option>
                            <option value="inactive">Inactive Users</option>
                        </select>
                    </div>
                    <button type="button" class="btn-primary" onclick="AdminApp.sendAnnouncement()" style="padding: 0.75rem 1.5rem;">
                        <i class="ph-bold ph-paper-plane-tilt"></i>
                        Send Announcement
                    </button>
                </form>
            </div>

            <div class="dashboard-card" style="margin-top: 1.5rem;">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">Recent Announcements</h3>
                </div>
                <div class="activity-list">
                    <div class="activity-item">
                        <div class="activity-icon"><i class="ph-bold ph-megaphone"></i></div>
                        <div class="activity-content">
                            <p class="activity-text"><strong>New Feature: Royal Chronicle</strong> - Track all your activities in one place!</p>
                            <p class="activity-time">2 days ago • Sent to all users</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render My Tasks (Personal)
     */
    renderMyTasks(container) {
        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-list-checks"></i>
                        Admin Personal Tasks
                    </h3>
                    <button class="btn-primary" style="padding: 0.5rem 1rem;" onclick="AdminApp.addTask()">
                        <i class="ph-bold ph-plus"></i> Add Task
                    </button>
                </div>
                <p style="color: #64748b; text-align: center; padding: 3rem;">
                    Use the main Reign app for full task management features.
                    <br><br>
                    <a href="index.html" style="color: var(--admin-accent);">Open Reign App →</a>
                </p>
            </div>
        `;
    },

    /**
     * Render My Journal (Personal)
     */
    renderMyJournal(container) {
        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-book-bookmark"></i>
                        Admin Journal
                    </h3>
                </div>
                <p style="color: #64748b; text-align: center; padding: 3rem;">
                    Use the main Reign app for journaling features.
                    <br><br>
                    <a href="index.html" style="color: var(--admin-accent);">Open Reign App →</a>
                </p>
            </div>
        `;
    },

    /**
     * Render My Learning (Personal)
     */
    renderMyLearning(container) {
        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-graduation-cap"></i>
                        Admin Learning
                    </h3>
                </div>
                <p style="color: #64748b; text-align: center; padding: 3rem;">
                    Use the main Reign app for learning features.
                    <br><br>
                    <a href="index.html" style="color: var(--admin-accent);">Open Reign App →</a>
                </p>
            </div>
        `;
    },

    /**
     * Render Platform Settings
     */
    renderSettings(container) {
        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-gear-six"></i>
                        Platform Settings
                    </h3>
                </div>
                <div class="settings-section">
                    <h4 style="color: white; margin-bottom: 1rem;">General</h4>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">Platform Name</span>
                            <span class="setting-desc">Displayed in header and title</span>
                        </div>
                        <input type="text" value="Reign" style="padding: 0.5rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: white;">
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">Maintenance Mode</span>
                            <span class="setting-desc">Disable access for non-admins</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">User Registration</span>
                            <span class="setting-desc">Allow new users to register</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render Audit Log
     */
    renderAuditLog(container) {
        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-clipboard-text"></i>
                        Audit Log
                    </h3>
                </div>
                <div class="activity-list">
                    ${this.getMockAuditLog().map(log => `
                        <div class="activity-item">
                            <div class="activity-icon" style="background: ${log.type === 'danger' ? 'rgba(239,68,68,0.1)' : 'var(--admin-accent-10)'}; color: ${log.type === 'danger' ? 'var(--admin-danger)' : 'var(--admin-accent)'};">
                                <i class="${log.icon}"></i>
                            </div>
                            <div class="activity-content">
                                <p class="activity-text">${log.text}</p>
                                <p class="activity-time">${log.time} • ${log.user}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Initialize analytics charts
     */
    initAnalyticsCharts() {
        // Activity Chart
        const actCtx = document.getElementById('activityChart');
        if (actCtx) {
            new Chart(actCtx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                        label: 'Active Users',
                        data: [650, 780, 820, 847],
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Feature Chart
        const featCtx = document.getElementById('featureChart');
        if (featCtx) {
            new Chart(featCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Tasks', 'Journal', 'Learning', 'Calendar'],
                    datasets: [{
                        data: [40, 25, 20, 15],
                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    },

    // Mock data generators
    getMockStats() {
        return {
            totalUsers: 1247,
            newUsersToday: 23,
            activeToday: 342,
            activePercent: 27,
            streakLeaders: 89,
            tasksToday: 1456,
            completionRate: 73
        };
    },

    getMockUsers() {
        return [
            { id: '1', name: 'John Doe', email: 'john@example.com', initials: 'JD', role: 'user', status: 'active', streak: 15, lastActive: '2 mins ago' },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com', initials: 'JS', role: 'moderator', status: 'active', streak: 32, lastActive: '1 hour ago' },
            { id: '3', name: 'Bob Wilson', email: 'bob@example.com', initials: 'BW', role: 'user', status: 'inactive', streak: 0, lastActive: '3 days ago' },
        ];
    },

    getMockActivity() {
        return [
            { icon: 'ph-bold ph-user-plus', text: 'New user registered: sarah@email.com', time: '5 mins ago' },
            { icon: 'ph-bold ph-check-circle', text: 'John Doe completed 5 tasks', time: '12 mins ago' },
            { icon: 'ph-bold ph-fire', text: 'Jane Smith reached a 30-day streak!', time: '1 hour ago' },
            { icon: 'ph-bold ph-book-open', text: 'New course started: JavaScript Mastery', time: '2 hours ago' },
        ];
    },

    getMockAuditLog() {
        return [
            { icon: 'ph-bold ph-user-switch', text: 'Admin impersonated user: john@example.com', time: '10 mins ago', user: 'Super Admin', type: 'info' },
            { icon: 'ph-bold ph-prohibit', text: 'User suspended: spam@bot.com', time: '1 hour ago', user: 'Moderator', type: 'danger' },
            { icon: 'ph-bold ph-gear-six', text: 'Platform settings updated', time: '3 hours ago', user: 'Super Admin', type: 'info' },
        ];
    },

    // User actions
    viewUser(userId) {
        Utils.showToast(`Viewing user ${userId}`, 'indigo');
    },

    impersonateUser(userId) {
        const user = this.getMockUsers().find(u => u.id === userId);
        if (user) {
            this.isImpersonating = true;
            this.impersonatedUser = user;
            document.getElementById('impersonation-banner').classList.remove('hidden');
            document.getElementById('impersonated-user').textContent = user.name;
            Utils.showToast(`Now viewing as ${user.name}`, 'indigo');
        }
    },

    stopImpersonation() {
        this.isImpersonating = false;
        this.impersonatedUser = null;
        document.getElementById('impersonation-banner').classList.add('hidden');
        Utils.showToast('Exited impersonation mode', 'gold');
    },

    suspendUser(userId) {
        if (confirm('Are you sure you want to suspend this user?')) {
            Utils.showToast(`User ${userId} suspended`, 'danger');
        }
    },

    sendAnnouncement() {
        Utils.showToast('Announcement sent to all users!', 'success');
    },

    logout() {
        localStorage.removeItem('kingdaily_token');
        localStorage.removeItem('kingdaily_user');
        window.location.href = 'auth.html';
    }
};

// Make available globally
window.AdminApp = AdminApp;
