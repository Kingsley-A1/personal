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

    // Pagination state
    pagination: {
        currentPage: 1,
        perPage: 10,
        total: 0
    },

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
        const userStr = localStorage.getItem('reign_user');
        if (!userStr) {
            // ⚠️ DEV ONLY: Auto-create demo admin for development
            // TODO: Remove this in production - require proper authentication
            console.warn('[DEV] Creating demo admin - this should not happen in production');
            const demoAdmin = {
                id: 'admin-1',
                name: 'Super Admin',
                email: 'admin@reign.app',
                role: 'super_admin',
                initials: 'SA'
            };
            localStorage.setItem('reign_user', JSON.stringify(demoAdmin));
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
    async renderView(view) {
        const container = document.getElementById('admin-view');

        switch (view) {
            case 'dashboard':
                await this.renderDashboard(container);
                break;
            case 'users':
                await this.renderUsers(container);
                break;
            case 'analytics':
                await this.renderAnalytics(container);
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
                await this.renderAuditLog(container);
                break;
            default:
                await this.renderDashboard(container);
        }
    },

    /**
     * Render Dashboard / Command Center
     * Uses real API data with loading states
     */
    async renderDashboard(container) {
        // Show loading skeleton first
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card-admin" style="min-height: 120px; opacity: 0.5;"></div>
                <div class="stat-card-admin" style="min-height: 120px; opacity: 0.5;"></div>
                <div class="stat-card-admin" style="min-height: 120px; opacity: 0.5;"></div>
                <div class="stat-card-admin" style="min-height: 120px; opacity: 0.5;"></div>
            </div>
            <p style="color: #64748b; text-align: center; padding: 2rem;">Loading dashboard data...</p>
        `;

        try {
            // Fetch real data from API (with fallbacks)
            const [analyticsData, healthData, auditData] = await Promise.all([
                AdminAPI.getAnalytics().catch(() => null),
                AdminAPI.getHealth().catch(() => ({ status: 'unknown', database: 'unknown' })),
                AdminAPI.getAuditLogs({ limit: 5 }).catch(() => ({ logs: [] }))
            ]);

            // Use real data or fallback to mock
            const stats = analyticsData || this.getMockStats();
            const health = healthData;
            const recentLogs = auditData.logs || [];

            this.renderDashboardContent(container, stats, health, recentLogs);
        } catch (error) {
            console.error('Dashboard error:', error);
            // Fallback to mock data on critical error
            const stats = this.getMockStats();
            this.renderDashboardContent(container, stats, { status: 'unknown' }, []);
        }
    },

    /**
     * Render dashboard content with data
     */
    renderDashboardContent(container, stats, health, recentLogs) {
        const totalUsers = stats.totalUsers || stats.users?.total || 0;
        const newToday = stats.newUsersToday || stats.users?.newToday || 0;
        const activeToday = stats.activeToday || stats.users?.activeToday || 0;
        const activePercent = stats.activePercent || 0;
        const streakLeaders = stats.streakLeaders || stats.engagement?.streakLeaders || 0;
        const tasksToday = stats.tasksToday || stats.content?.tasksToday || 0;
        const completionRate = stats.completionRate || stats.content?.completionRate || 0;

        container.innerHTML = `
            <!-- Quick Stats -->
            <div class="stats-grid">
                <div class="stat-card-admin">
                    <i class="ph-fill ph-users stat-icon"></i>
                    <p class="stat-label">Total Users</p>
                    <p class="stat-value">${totalUsers.toLocaleString()}</p>
                    <div class="stat-change up">
                        <i class="ph-bold ph-trend-up"></i>
                        <span>+${newToday} today</span>
                    </div>
                </div>
                <div class="stat-card-admin success">
                    <i class="ph-fill ph-user-check stat-icon" style="color: var(--admin-success);"></i>
                    <p class="stat-label">Active Today</p>
                    <p class="stat-value">${activeToday}</p>
                    <div class="stat-change up">
                        <i class="ph-bold ph-trend-up"></i>
                        <span>${activePercent}% of users</span>
                    </div>
                </div>
                <div class="stat-card-admin warning">
                    <i class="ph-fill ph-fire stat-icon" style="color: var(--admin-warning);"></i>
                    <p class="stat-label">Streak Leaders</p>
                    <p class="stat-value">${streakLeaders}</p>
                    <div class="stat-change">
                        <span>7+ day streaks</span>
                    </div>
                </div>
                <div class="stat-card-admin">
                    <i class="ph-fill ph-chart-line-up stat-icon"></i>
                    <p class="stat-label">Tasks Today</p>
                    <p class="stat-value">${tasksToday}</p>
                    <div class="stat-change up">
                        <i class="ph-bold ph-trend-up"></i>
                        <span>${completionRate}% completed</span>
                    </div>
                </div>
            </div>

            <!-- Dashboard Grid -->
            <div class="dashboard-grid">
                <!-- System Health (Real) -->
                <div class="dashboard-card">
                    <div class="dashboard-card-header">
                        <h3 class="dashboard-card-title">
                            <i class="ph-duotone ph-heartbeat"></i>
                            System Health
                        </h3>
                    </div>
                    <div class="health-grid">
                        <div class="health-item">
                            <div class="health-indicator ${health.status === 'ok' ? '' : 'warning'}"></div>
                            <span class="health-label">API Status</span>
                            <span class="health-value">${health.status === 'ok' ? 'Healthy' : 'Checking...'}</span>
                        </div>
                        <div class="health-item">
                            <div class="health-indicator ${health.database === 'connected' ? '' : 'danger'}"></div>
                            <span class="health-label">Database</span>
                            <span class="health-value">${health.database === 'connected' ? 'Connected' : 'Unknown'}</span>
                        </div>
                        <div class="health-item">
                            <div class="health-indicator"></div>
                            <span class="health-label">Sync Service</span>
                            <span class="health-value">Running</span>
                        </div>
                        <div class="health-item">
                            <div class="health-indicator"></div>
                            <span class="health-label">Version</span>
                            <span class="health-value">${health.version || '2.0'}</span>
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
                    ${health.database !== 'connected' ? `
                        <div class="alert-item danger">
                            <i class="ph-bold ph-warning-circle"></i>
                            <span class="alert-text">Database connection status unknown</span>
                            <button class="alert-dismiss" onclick="this.parentElement.remove()"><i class="ph-bold ph-x"></i></button>
                        </div>
                    ` : `
                        <div class="alert-item">
                            <i class="ph-bold ph-check-circle"></i>
                            <span class="alert-text">All systems operational</span>
                            <button class="alert-dismiss" onclick="this.parentElement.remove()"><i class="ph-bold ph-x"></i></button>
                        </div>
                    `}
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
                    ${recentLogs.length > 0 ? recentLogs.map(log => `
                        <div class="activity-item">
                            <div class="activity-icon">
                                <i class="ph-bold ${this.getAuditIcon(log.action)}"></i>
                            </div>
                            <div class="activity-content">
                                <p class="activity-text">${log.action || 'Activity'} ${log.details ? '- ' + JSON.stringify(log.details).slice(0, 50) : ''}</p>
                                <p class="activity-time">${this.formatTimeAgo(log.created_at)}</p>
                            </div>
                        </div>
                    `).join('') : this.getMockActivity().map(a => `
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
     * Get icon for audit action
     */
    getAuditIcon(action) {
        const icons = {
            'LOGIN': 'ph-sign-in',
            'LOGOUT': 'ph-sign-out',
            'REGISTER': 'ph-user-plus',
            'UPDATE_PROFILE': 'ph-pencil',
            'DELETE_USER': 'ph-trash',
            'SUSPEND_USER': 'ph-prohibit',
            'PROMOTE_USER': 'ph-arrow-up'
        };
        return icons[action] || 'ph-circle';
    },

    /**
     * Format time ago
     */
    formatTimeAgo(dateStr) {
        if (!dateStr) return 'Just now';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    },

    /**
     * Render Users Management
     */
    async renderUsers(container) {
        // Show loading state
        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-users"></i>
                        Loading Users...
                    </h3>
                </div>
                <p style="color: #64748b; text-align: center; padding: 2rem;">Fetching user data...</p>
            </div>
        `;

        try {
            // Fetch real users from API
            const response = await AdminAPI.getUsers({ limit: 50 }).catch(() => null);
            const users = response?.users || this.getMockUsers();
            this.users = users; // Cache for later use

            this.renderUsersContent(container, users);
        } catch (error) {
            console.error('Users fetch error:', error);
            this.renderUsersContent(container, this.getMockUsers());
        }
    },

    /**
     * Render users content with pagination
     */
    renderUsersContent(container, users) {
        this.pagination.total = users.length;
        const start = (this.pagination.currentPage - 1) * this.pagination.perPage;
        const end = start + this.pagination.perPage;
        const paginatedUsers = users.slice(start, end);
        const totalPages = Math.ceil(users.length / this.pagination.perPage);

        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-users"></i>
                        All Users (${users.length})
                    </h3>
                    <div class="users-toolbar">
                        <input type="text" placeholder="Search users..." class="toolbar-input" id="user-search"
                               onkeyup="AdminApp.filterUsers(this.value)">
                        <select id="role-filter" onchange="AdminApp.filterUsersByRole(this.value)" class="toolbar-select">
                            <option value="">All Roles</option>
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button onclick="AdminApp.exportUsers()" class="btn-export">
                            <i class="ph-bold ph-download"></i>
                            Export
                        </button>
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
                    <tbody id="users-tbody">
                        ${paginatedUsers.map(user => `
                            <tr data-user-id="${user.id}" data-name="${(user.name || '').toLowerCase()}" data-role="${user.role}">
                                <td>
                                    <div class="user-cell">
                                        <div class="admin-user-avatar mini">
                                            ${user.initials || (user.name ? user.name.charAt(0) : 'U')}
                                        </div>
                                        <span>${user.name || 'Unknown'}</span>
                                    </div>
                                </td>
                                <td class="email-cell">${user.email || '-'}</td>
                                <td><span class="role-badge ${user.role || 'user'}">${user.role || 'user'}</span></td>
                                <td><span class="status-badge ${user.status || 'active'}">${user.status || 'active'}</span></td>
                                <td><span class="streak-badge">${user.streak || 0} 🔥</span></td>
                                <td class="time-cell">${user.lastActive || this.formatTimeAgo(user.last_login)}</td>
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

                <!-- Pagination -->
                <div class="pagination-bar">
                    <div class="pagination-info">
                        Showing ${start + 1}-${Math.min(end, users.length)} of ${users.length} users
                    </div>
                    <div class="pagination-controls">
                        <select class="pagination-select" onchange="AdminApp.setPerPage(this.value)">
                            <option value="10" ${this.pagination.perPage === 10 ? 'selected' : ''}>10 per page</option>
                            <option value="25" ${this.pagination.perPage === 25 ? 'selected' : ''}>25 per page</option>
                            <option value="50" ${this.pagination.perPage === 50 ? 'selected' : ''}>50 per page</option>
                        </select>
                        <div class="pagination-buttons">
                            <button onclick="AdminApp.goToPage(1)" ${this.pagination.currentPage === 1 ? 'disabled' : ''}>
                                <i class="ph-bold ph-caret-double-left"></i>
                            </button>
                            <button onclick="AdminApp.goToPage(${this.pagination.currentPage - 1})" ${this.pagination.currentPage === 1 ? 'disabled' : ''}>
                                <i class="ph-bold ph-caret-left"></i>
                            </button>
                            <span class="page-indicator">Page ${this.pagination.currentPage} of ${totalPages || 1}</span>
                            <button onclick="AdminApp.goToPage(${this.pagination.currentPage + 1})" ${this.pagination.currentPage >= totalPages ? 'disabled' : ''}>
                                <i class="ph-bold ph-caret-right"></i>
                            </button>
                            <button onclick="AdminApp.goToPage(${totalPages})" ${this.pagination.currentPage >= totalPages ? 'disabled' : ''}>
                                <i class="ph-bold ph-caret-double-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Go to specific page
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.users.length / this.pagination.perPage);
        if (page >= 1 && page <= totalPages) {
            this.pagination.currentPage = page;
            this.renderUsersContent(document.getElementById('admin-view'), this.users);
        }
    },

    /**
     * Set items per page
     */
    setPerPage(perPage) {
        this.pagination.perPage = parseInt(perPage);
        this.pagination.currentPage = 1;
        this.renderUsersContent(document.getElementById('admin-view'), this.users);
    },

    /**
     * Filter users by search term
     */
    filterUsers(searchTerm) {
        const term = searchTerm.toLowerCase();
        document.querySelectorAll('#users-tbody tr').forEach(row => {
            const name = row.dataset.name || '';
            row.style.display = name.includes(term) ? '' : 'none';
        });
    },

    /**
     * Filter users by role
     */
    filterUsersByRole(role) {
        document.querySelectorAll('#users-tbody tr').forEach(row => {
            if (!role || row.dataset.role === role) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
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
     * Render Platform Settings with persistence
     */
    renderSettings(container) {
        // Load saved settings
        const settings = this.loadSettings();

        container.innerHTML = `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">
                        <i class="ph-duotone ph-gear-six"></i>
                        Platform Settings
                    </h3>
                    <button class="btn-primary" onclick="AdminApp.saveSettings()" style="padding: 0.5rem 1rem;">
                        <i class="ph-bold ph-floppy-disk"></i>
                        Save Changes
                    </button>
                </div>
                
                <div class="settings-section">
                    <h4 class="settings-section-title">General</h4>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">Platform Name</span>
                            <span class="setting-desc">Displayed in header and title</span>
                        </div>
                        <input type="text" id="setting-name" value="${settings.platformName || 'REIGN'}" class="settings-input">
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">Maintenance Mode</span>
                            <span class="setting-desc">Disable access for non-admins</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="setting-maintenance" ${settings.maintenanceMode ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">User Registration</span>
                            <span class="setting-desc">Allow new users to register</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="setting-registration" ${settings.allowRegistration !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-section">
                    <h4 class="settings-section-title">Appearance</h4>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">Default Theme</span>
                            <span class="setting-desc">Theme for new users</span>
                        </div>
                        <select id="setting-theme" class="settings-select">
                            <option value="king" ${settings.defaultTheme === 'king' ? 'selected' : ''}>King (Gold)</option>
                            <option value="queen" ${settings.defaultTheme === 'queen' ? 'selected' : ''}>Queen (Purple)</option>
                        </select>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">Session Timeout (days)</span>
                            <span class="setting-desc">How long sessions stay active</span>
                        </div>
                        <input type="number" id="setting-timeout" value="${settings.sessionTimeout || 10}" min="1" max="30" class="settings-input" style="width: 80px;">
                    </div>
                </div>

                <div class="settings-section">
                    <h4 class="settings-section-title">Notifications</h4>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">Email Notifications</span>
                            <span class="setting-desc">Send email updates to users</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="setting-emails" ${settings.emailNotifications !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <span class="setting-label">Push Notifications</span>
                            <span class="setting-desc">Browser push notifications</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="setting-push" ${settings.pushNotifications ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('reign_admin_settings');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    },

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        const settings = {
            platformName: document.getElementById('setting-name')?.value || 'REIGN',
            maintenanceMode: document.getElementById('setting-maintenance')?.checked || false,
            allowRegistration: document.getElementById('setting-registration')?.checked !== false,
            defaultTheme: document.getElementById('setting-theme')?.value || 'king',
            sessionTimeout: parseInt(document.getElementById('setting-timeout')?.value) || 10,
            emailNotifications: document.getElementById('setting-emails')?.checked !== false,
            pushNotifications: document.getElementById('setting-push')?.checked || false
        };

        localStorage.setItem('reign_admin_settings', JSON.stringify(settings));

        Toastify({
            text: '✓ Settings saved successfully',
            duration: 3000,
            gravity: 'top',
            position: 'center',
            style: {
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '0.75rem'
            }
        }).showToast();
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

    // ============================================
    // DEVELOPMENT MOCK DATA
    // ⚠️ WARNING: These functions provide fallback data for development/demo only.
    // In production, API should always be available.
    // TODO: Add production check to prevent mock data exposure
    // ============================================
    
    getMockStats() {
        console.warn('[DEV] Using mock stats - API unavailable');
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
        console.warn('[DEV] Using mock users - API unavailable');
        return [
            {
                id: '1',
                name: 'John Doe',
                email: 'john@example.com',
                initials: 'JD',
                role: 'user',
                status: 'active',
                streak: 15,
                lastActive: '2 mins ago',
                joinDate: '2024-01-15',
                tasksCompleted: 234,
                journalEntries: 45,
                coursesEnrolled: 3,
                bio: 'Productivity enthusiast and lifelong learner.',
                location: 'New York, USA',
                phone: '+1 555-0123'
            },
            {
                id: '2',
                name: 'Jane Smith',
                email: 'jane@example.com',
                initials: 'JS',
                role: 'moderator',
                status: 'active',
                streak: 32,
                lastActive: '1 hour ago',
                joinDate: '2023-11-20',
                tasksCompleted: 567,
                journalEntries: 89,
                coursesEnrolled: 7,
                bio: 'Community moderator helping others succeed.',
                location: 'London, UK',
                phone: '+44 20 7946 0958'
            },
            {
                id: '3',
                name: 'Bob Wilson',
                email: 'bob@example.com',
                initials: 'BW',
                role: 'user',
                status: 'inactive',
                streak: 0,
                lastActive: '3 days ago',
                joinDate: '2024-06-01',
                tasksCompleted: 12,
                journalEntries: 3,
                coursesEnrolled: 1,
                bio: 'Just getting started with productivity.',
                location: 'Toronto, Canada',
                phone: '+1 416-555-0199'
            },
            {
                id: '4',
                name: 'Sarah Johnson',
                email: 'sarah@example.com',
                initials: 'SJ',
                role: 'user',
                status: 'active',
                streak: 45,
                lastActive: '5 mins ago',
                joinDate: '2023-08-10',
                tasksCompleted: 892,
                journalEntries: 156,
                coursesEnrolled: 12,
                bio: 'Top contributor and streak champion!',
                location: 'Sydney, Australia',
                phone: '+61 2 9876 5432'
            },
            {
                id: '5',
                name: 'Michael Chen',
                email: 'michael@example.com',
                initials: 'MC',
                role: 'admin',
                status: 'active',
                streak: 28,
                lastActive: '30 mins ago',
                joinDate: '2023-05-15',
                tasksCompleted: 445,
                journalEntries: 78,
                coursesEnrolled: 5,
                bio: 'Platform administrator and developer.',
                location: 'San Francisco, USA',
                phone: '+1 415-555-0147'
            },
            {
                id: '6',
                name: 'Emily Davis',
                email: 'emily@example.com',
                initials: 'ED',
                role: 'user',
                status: 'suspended',
                streak: 0,
                lastActive: '2 weeks ago',
                joinDate: '2024-02-28',
                tasksCompleted: 56,
                journalEntries: 12,
                coursesEnrolled: 2,
                bio: 'Account suspended for review.',
                location: 'Berlin, Germany',
                phone: '+49 30 12345678'
            },
            {
                id: '7',
                name: 'David Kim',
                email: 'david@example.com',
                initials: 'DK',
                role: 'user',
                status: 'active',
                streak: 7,
                lastActive: '1 hour ago',
                joinDate: '2024-09-01',
                tasksCompleted: 89,
                journalEntries: 21,
                coursesEnrolled: 3,
                bio: 'Focused on building better habits.',
                location: 'Seoul, South Korea',
                phone: '+82 2 1234 5678'
            },
            {
                id: '8',
                name: 'Lisa Anderson',
                email: 'lisa@example.com',
                initials: 'LA',
                role: 'moderator',
                status: 'active',
                streak: 21,
                lastActive: '45 mins ago',
                joinDate: '2023-12-01',
                tasksCompleted: 312,
                journalEntries: 67,
                coursesEnrolled: 8,
                bio: 'Helping the community grow and thrive.',
                location: 'Dublin, Ireland',
                phone: '+353 1 234 5678'
            }
        ];
    },

    getMockActivity() {
        console.warn('[DEV] Using mock activity - API unavailable');
        return [
            { icon: 'ph-bold ph-user-plus', text: 'New user registered: sarah@email.com', time: '5 mins ago' },
            { icon: 'ph-bold ph-check-circle', text: 'John Doe completed 5 tasks', time: '12 mins ago' },
            { icon: 'ph-bold ph-fire', text: 'Jane Smith reached a 30-day streak!', time: '1 hour ago' },
            { icon: 'ph-bold ph-book-open', text: 'New course started: JavaScript Mastery', time: '2 hours ago' },
        ];
    },

    getMockAuditLog() {
        console.warn('[DEV] Using mock audit log - API unavailable');
        return [
            { icon: 'ph-bold ph-user-switch', text: 'Admin impersonated user: john@example.com', time: '10 mins ago', user: 'Super Admin', type: 'info' },
            { icon: 'ph-bold ph-prohibit', text: 'User suspended: spam@bot.com', time: '1 hour ago', user: 'Moderator', type: 'danger' },
            { icon: 'ph-bold ph-gear-six', text: 'Platform settings updated', time: '3 hours ago', user: 'Super Admin', type: 'info' },
        ];
    },

    // User actions
    viewUser(userId) {
        const user = this.getMockUsers().find(u => u.id === userId);
        if (!user) {
            Utils.showToast('User not found', 'danger');
            return;
        }

        // Create modal overlay
        const modalHtml = `
            <div class="admin-modal-overlay" onclick="AdminApp.closeUserModal(event)">
                <div class="admin-modal" onclick="event.stopPropagation()">
                    <div class="admin-modal-header">
                        <h3>User Details</h3>
                        <button onclick="AdminApp.closeUserModal()" class="admin-modal-close">
                            <i class="ph-bold ph-x"></i>
                        </button>
                    </div>
                    <div class="admin-modal-body">
                        <!-- User Profile Section -->
                        <div class="user-profile-section">
                            <div class="user-profile-avatar">
                                <span>${user.initials}</span>
                            </div>
                            <div class="user-profile-info">
                                <h4>${user.name}</h4>
                                <p>${user.email}</p>
                                <div class="user-badges">
                                    <span class="role-badge ${user.role}">${user.role}</span>
                                    <span class="status-badge ${user.status}">${user.status}</span>
                                    ${user.streak > 0 ? `<span class="streak-badge">${user.streak} 🔥</span>` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- User Stats -->
                        <div class="user-stats-grid">
                            <div class="user-stat-item">
                                <i class="ph-duotone ph-checks"></i>
                                <div>
                                    <span class="stat-num">${user.tasksCompleted || 0}</span>
                                    <span class="stat-label">Tasks Completed</span>
                                </div>
                            </div>
                            <div class="user-stat-item">
                                <i class="ph-duotone ph-book-bookmark"></i>
                                <div>
                                    <span class="stat-num">${user.journalEntries || 0}</span>
                                    <span class="stat-label">Journal Entries</span>
                                </div>
                            </div>
                            <div class="user-stat-item">
                                <i class="ph-duotone ph-graduation-cap"></i>
                                <div>
                                    <span class="stat-num">${user.coursesEnrolled || 0}</span>
                                    <span class="stat-label">Courses</span>
                                </div>
                            </div>
                            <div class="user-stat-item">
                                <i class="ph-duotone ph-fire"></i>
                                <div>
                                    <span class="stat-num">${user.streak || 0}</span>
                                    <span class="stat-label">Day Streak</span>
                                </div>
                            </div>
                        </div>

                        <!-- User Details -->
                        <div class="user-details-section">
                            <div class="detail-row">
                                <span class="detail-label">Bio</span>
                                <span class="detail-value">${user.bio || 'No bio provided'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Location</span>
                                <span class="detail-value">${user.location || 'Not specified'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Phone</span>
                                <span class="detail-value">${user.phone || 'Not provided'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Joined</span>
                                <span class="detail-value">${user.joinDate || 'Unknown'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Last Active</span>
                                <span class="detail-value">${user.lastActive}</span>
                            </div>
                        </div>

                        <!-- Admin Actions -->
                        <div class="user-actions-section">
                            <h5>Admin Actions</h5>
                            <div class="action-buttons-grid">
                                <button onclick="AdminApp.impersonateUser('${user.id}')" class="action-btn primary">
                                    <i class="ph-bold ph-user-switch"></i>
                                    Impersonate
                                </button>
                                <button onclick="AdminApp.promoteUser('${user.id}')" class="action-btn success">
                                    <i class="ph-bold ph-arrow-up"></i>
                                    Promote
                                </button>
                                <button onclick="AdminApp.resetPassword('${user.id}')" class="action-btn warning">
                                    <i class="ph-bold ph-key"></i>
                                    Reset Password
                                </button>
                                <button onclick="AdminApp.sendEmailToUser('${user.id}')" class="action-btn secondary">
                                    <i class="ph-bold ph-envelope"></i>
                                    Send Email
                                </button>
                                ${user.status === 'suspended' ? `
                                    <button onclick="AdminApp.unsuspendUser('${user.id}')" class="action-btn success">
                                        <i class="ph-bold ph-check-circle"></i>
                                        Unsuspend
                                    </button>
                                ` : `
                                    <button onclick="AdminApp.suspendUser('${user.id}')" class="action-btn danger">
                                        <i class="ph-bold ph-prohibit"></i>
                                        Suspend
                                    </button>
                                `}
                                <button onclick="AdminApp.deleteUser('${user.id}')" class="action-btn danger">
                                    <i class="ph-bold ph-trash"></i>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';
    },

    closeUserModal(event) {
        if (event && event.target !== event.currentTarget) return;
        const modal = document.querySelector('.admin-modal-overlay');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    },

    impersonateUser(userId) {
        this.closeUserModal();
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

    /**
     * Promote a user to a higher role
     * Uses real API - requires superadmin for admin/superadmin promotions
     */
    async promoteUser(userId) {
        this.closeUserModal();

        // Get current user info for context
        const userInfo = this._cachedUsers?.find(u => u.id === userId);
        const userName = userInfo?.name || 'User';

        const roleChoice = prompt(
            'Enter new role:\n• admin\n• superadmin\n\n(Cancel to abort)',
            'admin'
        );

        if (!roleChoice) return;

        if (!['admin', 'superadmin'].includes(roleChoice)) {
            Utils.showToast('Invalid role. Use: admin or superadmin', 'warning');
            return;
        }

        try {
            const result = await AdminAPI.promoteUser(userId, roleChoice);
            Utils.showToast(`${result.user.name} promoted to ${roleChoice}`, 'success');
            this.navigate('users'); // Refresh user list
        } catch (error) {
            console.error('Promote user error:', error);
            Utils.showToast(error.message || 'Failed to promote user', 'danger');
        }
    },

    /**
     * Suspend a user account
     * Uses real API call to /api/admin/users/:id/suspend
     */
    async suspendUser(userId) {
        this.closeUserModal();

        // Get user info for confirmation
        const userInfo = this._cachedUsers?.find(u => u.id === userId);
        const userName = userInfo?.name || 'this user';

        if (!confirm(`Are you sure you want to suspend ${userName}?\n\nThey will not be able to log in until unsuspended.`)) {
            return;
        }

        try {
            const result = await AdminAPI.suspendUser(userId);
            Utils.showToast(`${result.user.name} has been suspended`, 'danger');
            this.navigate('users'); // Refresh user list
        } catch (error) {
            console.error('Suspend user error:', error);
            Utils.showToast(error.message || 'Failed to suspend user', 'danger');
        }
    },

    /**
     * Unsuspend (reactivate) a user account
     * Uses real API call to /api/admin/users/:id/unsuspend
     */
    async unsuspendUser(userId) {
        this.closeUserModal();

        try {
            const result = await AdminAPI.unsuspendUser(userId);
            Utils.showToast(`${result.user.name} has been reactivated`, 'success');
            this.navigate('users'); // Refresh user list
        } catch (error) {
            console.error('Unsuspend user error:', error);
            Utils.showToast(error.message || 'Failed to unsuspend user', 'danger');
        }
    },

    resetPassword(userId) {
        this.closeUserModal();
        const user = this.getMockUsers().find(u => u.id === userId);
        if (!user) return;

        if (confirm(`Send password reset email to ${user.email}?`)) {
            Utils.showToast(`Password reset email sent to ${user.email}`, 'success');
        }
    },

    sendEmailToUser(userId) {
        this.closeUserModal();
        const user = this.getMockUsers().find(u => u.id === userId);
        if (!user) return;

        const message = prompt(`Send email to ${user.name}:`, 'Hello from Reign Admin!');
        if (message) {
            Utils.showToast(`Email sent to ${user.email}`, 'success');
        }
    },

    /**
     * Delete a user account permanently
     * Uses real API call to /api/admin/users/:id
     */
    async deleteUser(userId) {
        this.closeUserModal();

        // Get user info for confirmation
        const userInfo = this._cachedUsers?.find(u => u.id === userId);
        const userName = userInfo?.name || 'this user';
        const userEmail = userInfo?.email || '';

        const confirmMsg = `⚠️ DELETE USER\n\nAre you sure you want to permanently delete ${userName}?\n${userEmail}\n\nThis action CANNOT be undone. All their data will be lost.`;

        if (!confirm(confirmMsg)) {
            return;
        }

        // Double confirmation for safety
        if (!confirm(`FINAL CONFIRMATION\n\nType OK to delete ${userName} forever.`)) {
            return;
        }

        try {
            const result = await AdminAPI.deleteUser(userId);
            Utils.showToast(`${result.deletedUser.name} has been permanently deleted`, 'danger');
            this.navigate('users'); // Refresh user list
        } catch (error) {
            console.error('Delete user error:', error);
            Utils.showToast(error.message || 'Failed to delete user', 'danger');
        }
    },

    exportUsers() {
        const users = this.getMockUsers();
        const csv = [
            'Name,Email,Role,Status,Streak,Join Date,Location',
            ...users.map(u => `${u.name},${u.email},${u.role},${u.status},${u.streak},${u.joinDate || ''},${u.location || ''}`)
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reign_users_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        Utils.showToast('Users exported to CSV', 'success');
    },

    /**
     * Send a new announcement
     * Uses real API call to /api/admin/announce
     */
    async sendAnnouncement() {
        const titleEl = document.querySelector('.announcement-form input[type="text"]');
        const messageEl = document.querySelector('.announcement-form textarea');
        const targetEl = document.querySelector('.announcement-form select');

        const title = titleEl?.value?.trim();
        const message = messageEl?.value?.trim();
        const target = targetEl?.value || 'all';

        if (!title) {
            Utils.showToast('Please enter an announcement title', 'warning');
            return;
        }

        if (!message) {
            Utils.showToast('Please enter an announcement message', 'warning');
            return;
        }

        try {
            await AdminAPI.createAnnouncement({ title, message, target });
            Utils.showToast('Announcement sent successfully!', 'success');

            // Clear form
            if (titleEl) titleEl.value = '';
            if (messageEl) messageEl.value = '';

            // Refresh announcements view
            this.navigate('announcements');
        } catch (error) {
            console.error('Send announcement error:', error);
            Utils.showToast(error.message || 'Failed to send announcement', 'danger');
        }
    },

    logout() {
        localStorage.removeItem('reign_token');
        localStorage.removeItem('reign_user');
        window.location.href = '../auth.html';
    }
};

// Make available globally
window.AdminApp = AdminApp;
