/**
 * King Daily - Views Module
 * All UI rendering templates
 */

const Views = {
    /**
     * Render Dashboard View
     * @param {HTMLElement} container - Container element
     * @param {Object} data - App data
     */
    renderDashboard(container, data) {
        const today = Storage.getToday();
        const todayLog = data.logs[today] || { morning: null, evening: null };
        const quote = Utils.getRandomQuote();
        const analytics = Storage.getAnalytics(data);
        const last7Days = Storage.getLast7Days(data);

        // Calculate today's progress
        let todayTasks = 0;
        let todayCompleted = 0;
        if (todayLog.morning && todayLog.morning.tasks) {
            todayTasks = todayLog.morning.tasks.length;
            todayCompleted = todayLog.morning.tasks.filter(t => t.status === 'completed').length;
        }
        const progressPercent = todayTasks > 0 ? Math.round((todayCompleted / todayTasks) * 100) : 0;

        container.innerHTML = `
            <!-- Personalized Greeting -->
            <div class="greeting-section">
                <h2 class="greeting-text">${Utils.getGreeting()}, <span class="text-gold">${Utils.getUserName()}</span></h2>
            </div>

            <div class="page-header mb-8">
                <h2 class="page-title">The Kingdom at a Glance</h2>
                <p class="quote-block">"${quote}"</p>
            </div>

            <!-- Today's Progress -->
            ${todayTasks > 0 ? `
                <div class="glass-card p-6 mb-6">
                    <div class="progress-container">
                        <div class="progress-header">
                            <span class="progress-label">Today's Conquest</span>
                            <span class="progress-value">${todayCompleted}/${todayTasks} Tasks (${progressPercent}%)</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Status Cards -->
            <div class="grid grid-1 grid-3 mb-8">
                <div class="glass-card stat-card">
                    <div class="stat-icon" style="position: absolute; right: 1rem; top: 1rem; opacity: 0.1;">
                        <i class="ph-fill ph-sun text-gold" style="font-size: 3rem;"></i>
                    </div>
                    <p class="stat-label">Morning Protocol</p>
                    ${todayLog.morning
                ? `<p class="text-success" style="font-weight: bold; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="ph-bold ph-check-circle"></i> ${todayTasks} Tasks Set
                           </p>`
                : `<button onclick="app.navigate('morning')" class="text-gold" style="background: none; border: none; padding: 0; cursor: pointer; font-size: 0.875rem;">
                            Begin Protocol →
                           </button>`
            }
                </div>

                <div class="glass-card stat-card">
                    <div class="stat-icon" style="position: absolute; right: 1rem; top: 1rem; opacity: 0.1;">
                        <i class="ph-fill ph-moon text-gold" style="font-size: 3rem;"></i>
                    </div>
                    <p class="stat-label">Evening Report</p>
                    ${todayLog.evening
                ? `<p class="text-success" style="font-weight: bold; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="ph-bold ph-check-circle"></i> Submitted
                           </p>`
                : `<button onclick="app.navigate('evening')" class="text-gold" style="background: none; border: none; padding: 0; cursor: pointer; font-size: 0.875rem;">
                            Submit Report →
                           </button>`
            }
                </div>

                <div class="glass-card stat-card">
                    <p class="stat-label">Total Entries</p>
                    <div style="display: flex; align-items: baseline; gap: 0.5rem;">
                        <span class="stat-value">${analytics.totalDays}</span>
                        <span class="stat-sublabel">Days Logged</span>
                    </div>
                </div>
            </div>

            <!-- Today's Tasks Quick View -->
            ${todayLog.morning && todayLog.morning.tasks && todayLog.morning.tasks.length > 0 ? `
                <div class="glass-card p-6 mb-8">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="font-family: var(--font-serif); font-weight: 700; color: white;">Today's Battles</h3>
                        ${todayLog.morning.sessionName ? `
                            <span class="session-name">
                                <i class="ph-bold ph-flag-banner"></i>
                                ${Utils.sanitize(todayLog.morning.sessionName)}
                            </span>
                        ` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${todayLog.morning.tasks.slice(0, 5).map(task => this.renderTaskCard(task, true)).join('')}
                        ${todayLog.morning.tasks.length > 5 ? `
                            <button onclick="app.navigate('morning')" class="btn btn-outline btn-sm" style="margin-top: 0.5rem;">
                                View All ${todayLog.morning.tasks.length} Tasks
                            </button>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Charts -->
            <div class="grid grid-1 grid-lg-2 mb-8">
                <div class="glass-card p-6">
                    <h3 style="font-family: var(--font-serif); font-weight: 700; color: white; margin-bottom: 1rem;">Focus Intensity (Hours)</h3>
                    <div class="chart-container">
                        <canvas id="focusChart"></canvas>
                    </div>
                </div>
                <div class="glass-card p-6">
                    <h3 style="font-family: var(--font-serif); font-weight: 700; color: white; margin-bottom: 1rem;">Discipline Ratio</h3>
                    <div class="chart-container">
                        <canvas id="disciplineChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Category Breakdown -->
            ${Object.keys(analytics.categoryHours).length > 0 ? `
                <div class="glass-card p-6 mb-8">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="font-family: var(--font-serif); font-weight: 700; color: white;">Time Allocation by Category</h3>
                        <span class="text-muted" style="font-size: 0.75rem;">Avg: ${analytics.avgHours} hrs/session</span>
                    </div>
                    <div class="chart-container" style="height: 280px;">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>
            ` : ''}

            <!-- Upcoming Events -->
            <div class="glass-card p-6">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="font-family: var(--font-serif); font-weight: 700; color: white;">Impending Decrees</h3>
                    <button onclick="app.navigate('events')" class="text-gold" style="background: none; border: none; cursor: pointer; font-size: 0.75rem;">
                        View All
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${this.renderUpcomingEvents(data.events)}
                </div>
            </div>
        `;

        // Initialize charts after render
        setTimeout(() => {
            Charts.destroyAll();
            Charts.createFocusChart('focusChart', last7Days);
            Charts.createDisciplineChart('disciplineChart', analytics);
            if (Object.keys(analytics.categoryHours).length > 0) {
                Charts.createCategoryChart('categoryChart', analytics.categoryHours);
            }
        }, 0);
    },

    /**
     * Render a single task card
     * @param {Object} task - Task object
     * @param {boolean} compact - Whether to show compact version
     * @returns {string} HTML string
     */
    renderTaskCard(task, compact = false) {
        const priorityInfo = Utils.getPriorityInfo(task.priority);
        const statusInfo = Utils.getStatusInfo(task.status);

        const checkboxClass = task.status === 'completed' ? 'checked' :
            task.status === 'in-progress' ? 'in-progress' : '';

        return `
            <div class="task-card ${task.status === 'completed' ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-checkbox ${checkboxClass}" onclick="app.toggleTaskStatus('${task.id}')">
                    ${task.status === 'completed' ? '<i class="ph-bold ph-check" style="color: white;"></i>' : ''}
                </div>
                <div class="task-content">
                    <div class="task-header">
                        <span class="task-title">${Utils.sanitize(task.title)}</span>
                    </div>
                    <div class="task-meta">
                        <span class="task-badge ${priorityInfo.class}">${priorityInfo.label}</span>
                        <span class="task-badge">${Utils.sanitize(task.category)}</span>
                        ${task.estimatedTime ? `
                            <span class="task-time">
                                <i class="ph-bold ph-clock"></i>
                                ${task.estimatedTime}h
                            </span>
                        ` : ''}
                    </div>
                </div>
                ${!compact ? `
                    <div class="task-actions">
                        <button class="task-action-btn" onclick="app.editTask('${task.id}')" title="Edit">
                            <i class="ph-bold ph-pencil-simple"></i>
                        </button>
                        <button class="task-action-btn delete" onclick="app.deleteTask('${task.id}')" title="Delete">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Render upcoming events preview
     * @param {Array} events - Events array
     * @returns {string} HTML string
     */
    renderUpcomingEvents(events) {
        const upcoming = events
            .filter(e => !Utils.isPast(e.date))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3);

        if (upcoming.length === 0) {
            return '<p class="text-muted" style="font-style: italic;">The schedule is clear, my King.</p>';
        }

        return upcoming.map(e => {
            const dateParts = Utils.formatDateParts(e.date);
            return `
                <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="text-align: center; background: var(--royal-gold-10); padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid var(--royal-gold-20);">
                        <span style="display: block; font-size: 0.875rem; font-weight: 700; color: var(--royal-gold);">${dateParts.day}</span>
                        <span style="display: block; font-size: 0.625rem; color: #64748b; text-transform: uppercase;">${dateParts.month}</span>
                    </div>
                    <div>
                        <p style="font-size: 0.875rem; font-weight: 700; color: white;">${Utils.sanitize(e.title)}</p>
                        <span class="event-type">${Utils.sanitize(e.type)}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render Morning Protocol View
     * @param {HTMLElement} container - Container element
     * @param {Object} data - App data
     */
    renderMorning(container, data) {
        const today = Storage.getToday();
        const log = data.logs[today] && data.logs[today].morning ? data.logs[today].morning : null;
        const tasks = log && log.tasks ? log.tasks : [];

        const completedCount = tasks.filter(t => t.status === 'completed').length;
        const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

        container.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">Morning Protocol</h2>
                <p class="page-subtitle">Set the coordinates for conquest.</p>
            </div>

            <div style="max-width: 800px; margin: 0 auto;">
                <!-- Session Info -->
                <div class="glass-card p-6 mb-6" style="border-top: 4px solid var(--royal-gold);">
                    <div class="grid grid-1 grid-2 gap-4 mb-4">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Session Name (Optional)</label>
                            <div class="form-input-icon">
                                <i class="ph-bold ph-flag-banner"></i>
                                <input type="text" 
                                       id="session-name" 
                                       class="form-input" 
                                       placeholder="e.g., Product Launch Day"
                                       value="${log ? Utils.sanitize(log.sessionName || '') : ''}"
                                       onchange="app.updateSessionInfo()">
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Location</label>
                            <div class="form-input-icon">
                                <i class="ph-bold ph-map-pin"></i>
                                <input type="text" 
                                       id="session-location" 
                                       class="form-input" 
                                       placeholder="Home Office, Cafe..."
                                       value="${log ? Utils.sanitize(log.location || '') : ''}"
                                       onchange="app.updateSessionInfo()">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Progress Bar -->
                ${tasks.length > 0 ? `
                    <div class="progress-container mb-6">
                        <div class="progress-header">
                            <span class="progress-label">Battle Progress</span>
                            <span class="progress-value">${completedCount}/${tasks.length} Complete (${progressPercent}%)</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                ` : ''}

                <!-- Tasks List -->
                <div class="glass-card p-6 mb-6">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="font-family: var(--font-serif); font-weight: 700; color: white;">Today's Tasks</h3>
                        <button onclick="app.openTaskModal()" class="btn btn-primary btn-sm">
                            <i class="ph-bold ph-plus"></i> Add Task
                        </button>
                    </div>

                    ${tasks.length === 0 ? `
                        <div class="empty-state">
                            <i class="ph-duotone ph-sword"></i>
                            <h3>No battles planned</h3>
                            <p>Add your first task to begin the conquest.</p>
                        </div>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            ${tasks.map(task => this.renderTaskCard(task, false)).join('')}
                        </div>
                    `}
                </div>

                <!-- Quick Actions -->
                <div class="grid grid-1 grid-2 gap-4">
                    <button onclick="app.navigate('dashboard')" class="btn btn-outline btn-block">
                        <i class="ph-bold ph-arrow-left"></i> Back to Throne
                    </button>
                    ${tasks.length > 0 ? `
                        <button onclick="app.navigate('evening')" class="btn btn-secondary btn-block">
                            <i class="ph-bold ph-moon"></i> Evening Report
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Floating Add Button (Mobile) -->
            <button class="fab" onclick="app.openTaskModal()">
                <i class="ph-bold ph-plus"></i>
            </button>
        `;
    },

    /**
     * Render Evening Report View
     * @param {HTMLElement} container - Container element
     * @param {Object} data - App data
     */
    renderEvening(container, data) {
        const today = Storage.getToday();
        const log = data.logs[today] || { morning: null, evening: null };
        const morningTasks = log.morning && log.morning.tasks ? log.morning.tasks : [];
        const eveningData = log.evening || {};

        const completedCount = morningTasks.filter(t => t.status === 'completed').length;
        const totalTasks = morningTasks.length;
        const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

        container.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">Evening Report</h2>
                <p class="page-subtitle">Review the battlefield.</p>
            </div>

            <div style="max-width: 800px; margin: 0 auto;">
                <!-- Task Review Summary -->
                ${morningTasks.length > 0 ? `
                    <div class="glass-card p-6 mb-6" style="border-top: 4px solid var(--indigo);">
                        <h3 style="font-family: var(--font-serif); font-weight: 700; color: white; margin-bottom: 1rem;">Task Review</h3>
                        <div class="progress-container mb-4">
                            <div class="progress-header">
                                <span class="progress-label">Completion Rate</span>
                                <span class="progress-value">${completedCount}/${totalTasks} (${completionRate}%)</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${completionRate}%; background: linear-gradient(90deg, #4f46e5, #6366f1);"></div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            ${morningTasks.map(task => `
                                <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.375rem;">
                                    ${task.status === 'completed'
                ? '<i class="ph-fill ph-check-circle" style="color: var(--success);"></i>'
                : task.status === 'in-progress'
                    ? '<i class="ph-fill ph-clock" style="color: var(--warning);"></i>'
                    : '<i class="ph-fill ph-circle" style="color: #475569;"></i>'
            }
                                    <span style="font-size: 0.875rem; color: ${task.status === 'completed' ? '#64748b' : 'white'}; ${task.status === 'completed' ? 'text-decoration: line-through;' : ''}">${Utils.sanitize(task.title)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Reflection Form -->
                <form onsubmit="app.saveEvening(event)" class="glass-card p-6 mb-6" style="border-top: 4px solid var(--indigo);">
                    <!-- Mood & Energy -->
                    <div class="grid grid-1 grid-2 gap-6 mb-6">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" style="color: #fbbf24;">
                                <i class="ph-fill ph-smiley"></i> Mood Level
                            </label>
                            <div class="rating-slider">
                                ${[1, 2, 3, 4, 5].map(n => `
                                    <button type="button" 
                                            class="rating-btn ${eveningData.mood === n ? 'active' : ''}" 
                                            onclick="app.setRating('mood', ${n})"
                                            data-rating="mood-${n}">
                                        ${n}
                                    </button>
                                `).join('')}
                            </div>
                            <input type="hidden" name="mood" id="mood-input" value="${eveningData.mood || ''}">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" style="color: #60a5fa;">
                                <i class="ph-fill ph-lightning"></i> Energy Level
                            </label>
                            <div class="rating-slider">
                                ${[1, 2, 3, 4, 5].map(n => `
                                    <button type="button" 
                                            class="rating-btn ${eveningData.energyLevel === n ? 'active' : ''}" 
                                            onclick="app.setRating('energy', ${n})"
                                            data-rating="energy-${n}">
                                        ${n}
                                    </button>
                                `).join('')}
                            </div>
                            <input type="hidden" name="energyLevel" id="energy-input" value="${eveningData.energyLevel || ''}">
                        </div>
                    </div>

                    <!-- Text Reflections -->
                    <div class="form-group">
                        <label class="form-label" style="color: var(--success);">
                            <i class="ph-fill ph-trophy"></i> Major Successes
                        </label>
                        <textarea name="success" class="form-textarea" rows="3" required placeholder="What went well?">${Utils.sanitize(eveningData.success || '')}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label" style="color: var(--danger);">
                            <i class="ph-fill ph-warning-octagon"></i> Challenges / Blockers
                        </label>
                        <textarea name="challenges" class="form-textarea" rows="3" required placeholder="What stood in the way?">${Utils.sanitize(eveningData.challenges || '')}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label" style="color: var(--info);">
                            <i class="ph-fill ph-strategy"></i> Strategy for Tomorrow
                        </label>
                        <textarea name="strategy" class="form-textarea" rows="3" required placeholder="How do we improve?">${Utils.sanitize(eveningData.strategy || '')}</textarea>
                    </div>

                    <button type="submit" class="btn btn-secondary btn-lg btn-block">
                        <i class="ph-bold ph-paper-plane-right"></i> Submit Report
                    </button>
                </form>

                <button onclick="app.navigate('dashboard')" class="btn btn-outline btn-block">
                    <i class="ph-bold ph-arrow-left"></i> Back to Throne
                </button>
            </div>
        `;
    },

    /**
     * Render Royal Chronicle - Unified Activity History
     * @param {HTMLElement} container - Container element
     * @param {Object} data - App data
     */
    renderArchive(container, data) {
        // Gather all activities from different sources
        const ideas = Storage.getIdeas ? Storage.getIdeas() : [];
        const goods = Storage.getDailyGoods ? Storage.getDailyGoods() : [];
        const lessons = Storage.getLessons ? Storage.getLessons() : [];
        const logs = Object.entries(data.logs || {});

        // Combine all activities with type markers
        const allActivities = [
            ...ideas.map(i => ({ ...i, activityType: 'idea', date: i.createdAt })),
            ...goods.map(g => ({ ...g, activityType: 'good' })),
            ...lessons.map(l => ({ ...l, activityType: 'lesson' })),
            ...logs.map(([date, log]) => ({ date, log, activityType: 'journal' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Group by date
        const groupByDate = (activities) => {
            const groups = {};
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            activities.forEach(a => {
                const d = new Date(a.date).toDateString();
                let label;
                if (d === today) label = 'Today';
                else if (d === yesterday) label = 'Yesterday';
                else label = Utils.formatDate(a.date, { month: 'short', day: 'numeric' });

                if (!groups[label]) groups[label] = [];
                groups[label].push(a);
            });
            return groups;
        };

        const grouped = groupByDate(allActivities);
        const totalCount = allActivities.length;

        container.innerHTML = `
            <div class="view-header">
                <div>
                    <h2 class="view-title">
                        <i class="ph-duotone ph-scroll" style="color: var(--royal-gold);"></i>
                        The Royal Chronicle
                    </h2>
                    <p class="view-subtitle">Your complete journey of growth • ${totalCount} entries</p>
                </div>
            </div>

            <!-- Filter Tabs -->
            <div class="history-tabs" style="margin-bottom: 1.5rem;">
                <button class="history-tab active" onclick="app.filterChronicle('all')">
                    <i class="ph-bold ph-list"></i> All
                </button>
                <button class="history-tab" onclick="app.filterChronicle('idea')">
                    <i class="ph-bold ph-lightbulb"></i> Ideas
                </button>
                <button class="history-tab" onclick="app.filterChronicle('good')">
                    <i class="ph-bold ph-heart"></i> Good
                </button>
                <button class="history-tab" onclick="app.filterChronicle('lesson')">
                    <i class="ph-bold ph-book-open-text"></i> Lessons
                </button>
                <button class="history-tab" onclick="app.filterChronicle('journal')">
                    <i class="ph-bold ph-notebook"></i> Journal
                </button>
            </div>

            <!-- Activities List -->
            <div id="chronicle-list" style="display: flex; flex-direction: column; gap: 1.5rem;">
                ${totalCount === 0 ? `
                    <div class="glass-card empty-state">
                        <i class="ph-duotone ph-scroll"></i>
                        <h3>No history recorded yet</h3>
                        <p>Start your journey by logging an idea, good moment, or lesson.</p>
                    </div>
                ` : Object.entries(grouped).map(([dateLabel, activities]) => `
                    <div class="chronicle-date-group">
                        <h4 class="chronicle-date-label">${dateLabel}</h4>
                        <div class="chronicle-cards">
                            ${activities.map(activity => this.renderActivityCard(activity)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Render a single activity card
     * @param {Object} activity - Activity object
     * @returns {string} HTML string
     */
    renderActivityCard(activity) {
        const icons = {
            idea: { icon: 'ph-lightbulb', color: '#f59e0b', label: 'Idea' },
            good: { icon: 'ph-heart', color: '#ef4444', label: 'Good Moment' },
            lesson: { icon: 'ph-book-open-text', color: 'var(--info)', label: 'Lesson' },
            journal: { icon: 'ph-notebook', color: 'var(--royal-gold)', label: 'Journal' }
        };
        const config = icons[activity.activityType] || icons.journal;

        if (activity.activityType === 'journal') {
            const log = activity.log;
            const tasks = log.morning?.tasks || [];
            const completedCount = tasks.filter(t => t.status === 'completed').length;

            return `
                <div class="chronicle-card" data-type="journal">
                    <div class="chronicle-card-icon" style="background: rgba(212, 175, 55, 0.15); color: ${config.color};">
                        <i class="ph-bold ${config.icon}"></i>
                    </div>
                    <div class="chronicle-card-content">
                        <div class="chronicle-card-header">
                            <span class="chronicle-card-type">${config.label}</span>
                            <span class="chronicle-card-time">${Utils.formatTimeAgo(activity.date)}</span>
                        </div>
                        <p class="chronicle-card-title">${log.morning?.sessionName || 'Daily Entry'}</p>
                        <p class="chronicle-card-meta">
                            ${tasks.length > 0 ? `<span><i class="ph-bold ph-check-circle"></i> ${completedCount}/${tasks.length} tasks</span>` : ''}
                            ${log.evening ? `<span><i class="ph-bold ph-moon"></i> Evening logged</span>` : ''}
                        </p>
                    </div>
                </div>
            `;
        }

        // For ideas, goods, and lessons
        let title = '';
        let subtitle = '';
        let statusBadge = '';

        if (activity.activityType === 'idea') {
            title = activity.title || 'Untitled Idea';
            subtitle = activity.description ? activity.description.substring(0, 60) + '...' : '';
            statusBadge = `<span class="recent-item-status ${activity.status}">${activity.status}</span>`;
        } else if (activity.activityType === 'good') {
            title = activity.description ? activity.description.substring(0, 50) : 'Good moment';
            subtitle = activity.category || '';
        } else if (activity.activityType === 'lesson') {
            title = activity.content ? activity.content.substring(0, 60) : 'Life lesson';
            subtitle = activity.tags?.join(', ') || activity.source || '';
        }

        return `
            <div class="chronicle-card" data-type="${activity.activityType}">
                <div class="chronicle-card-icon" style="background: rgba(${activity.activityType === 'idea' ? '245, 158, 11' : activity.activityType === 'good' ? '239, 68, 68' : '59, 130, 246'}, 0.15); color: ${config.color};">
                    <i class="ph-bold ${config.icon}"></i>
                </div>
                <div class="chronicle-card-content">
                    <div class="chronicle-card-header">
                        <span class="chronicle-card-type">${config.label}</span>
                        <span class="chronicle-card-time">${Utils.formatTimeAgo(activity.date)}</span>
                    </div>
                    <p class="chronicle-card-title">${Utils.sanitize(title)}</p>
                    ${subtitle ? `<p class="chronicle-card-subtitle">${Utils.sanitize(subtitle)}</p>` : ''}
                </div>
                ${statusBadge}
            </div>
        `;
    },

    /**
     * Render Events View
     * @param {HTMLElement} container - Container element
     * @param {Object} data - App data
     */
    renderEvents(container, data) {
        const sortedEvents = data.events.sort((a, b) => new Date(a.date) - new Date(b.date));

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem;">
                <div class="page-header" style="margin-bottom: 0;">
                    <h2 class="page-title">Royal Calendar</h2>
                    <p class="page-subtitle">Events, Birthdays, and Alliances.</p>
                </div>
                <button onclick="app.openEventModal()" class="btn btn-primary">
                    <i class="ph-bold ph-plus"></i> Add Event
                </button>
            </div>

            ${sortedEvents.length === 0 ? `
                <div class="glass-card empty-state" style="border-style: dashed;">
                    <i class="ph-duotone ph-calendar-blank"></i>
                    <h3>The royal agenda is empty</h3>
                    <p>Add events to track important dates.</p>
                </div>
            ` : `
                <div class="grid grid-1 grid-2 grid-3">
                    ${sortedEvents.map((evt, index) => {
            const isPast = Utils.isPast(evt.date);
            const colorClass = Utils.getEventColor(evt.type);

            return `
                            <div class="glass-card event-card ${colorClass} ${isPast ? 'past' : ''}">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div>
                                        <p class="event-date">${new Date(evt.date).toDateString()}</p>
                                        <h3 class="event-title">${Utils.sanitize(evt.title)}</h3>
                                        <span class="event-type">${Utils.sanitize(evt.type)}</span>
                                    </div>
                                    <div class="event-actions">
                                        <button class="task-action-btn" onclick="app.editEvent(${index})" title="Edit">
                                            <i class="ph-bold ph-pencil-simple"></i>
                                        </button>
                                        <button class="task-action-btn delete" onclick="app.deleteEvent(${index})" title="Delete">
                                            <i class="ph-bold ph-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            `}

            <!-- Floating Add Button (Mobile) -->
            <button class="fab" onclick="app.openEventModal()">
                <i class="ph-bold ph-plus"></i>
            </button>
        `;
    },

    /**
     * Get Task Modal HTML
     * @param {Object} task - Task to edit (null for new)
     * @returns {string} HTML string
     */
    getTaskModalHTML(task = null) {
        const isEdit = task !== null;

        return `
            <div class="modal-header">
                <h2 class="modal-title">${isEdit ? 'Edit Task' : 'Add New Task'}</h2>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x" style="font-size: 1.25rem;"></i>
                </button>
            </div>
            <div class="modal-body">
                <form onsubmit="app.saveTask(event)" style="display: flex; flex-direction: column; gap: 1rem;">
                    <input type="hidden" name="taskId" value="${isEdit ? task.id : ''}">
                    
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Task Title</label>
                        <input type="text" name="title" class="form-input" required 
                               placeholder="What needs to be done?"
                               value="${isEdit ? Utils.sanitize(task.title) : ''}">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Category</label>
                            <select name="category" class="form-select">
                                <option value="Deep Work" ${isEdit && task.category === 'Deep Work' ? 'selected' : ''}>Deep Work</option>
                                <option value="Strategy" ${isEdit && task.category === 'Strategy' ? 'selected' : ''}>Strategy</option>
                                <option value="Meeting" ${isEdit && task.category === 'Meeting' ? 'selected' : ''}>Meeting</option>
                                <option value="Learning" ${isEdit && task.category === 'Learning' ? 'selected' : ''}>Learning</option>
                                <option value="Health" ${isEdit && task.category === 'Health' ? 'selected' : ''}>Health</option>
                                <option value="Admin" ${isEdit && task.category === 'Admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Priority</label>
                            <select name="priority" class="form-select">
                                <option value="high" ${isEdit && task.priority === 'high' ? 'selected' : ''}>🔴 High</option>
                                <option value="medium" ${isEdit && task.priority === 'medium' ? 'selected' : ''} ${!isEdit ? 'selected' : ''}>🟡 Medium</option>
                                <option value="low" ${isEdit && task.priority === 'low' ? 'selected' : ''}>⚪ Low</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Estimated Time (Hours)</label>
                        <input type="number" name="estimatedTime" class="form-input" 
                               step="0.5" min="0.5" max="12"
                               placeholder="e.g., 2"
                               value="${isEdit && task.estimatedTime ? task.estimatedTime : ''}">
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Notes (Optional)</label>
                        <textarea name="notes" class="form-textarea" rows="2" 
                                  placeholder="Additional details...">${isEdit && task.notes ? Utils.sanitize(task.notes) : ''}</textarea>
                    </div>

                    <button type="submit" class="btn btn-primary btn-lg btn-block" style="margin-top: 0.5rem;">
                        <i class="ph-bold ph-check"></i> ${isEdit ? 'Update Task' : 'Add Task'}
                    </button>
                </form>
            </div>
        `;
    },

    /**
     * Get Event Modal HTML
     * @param {Object} event - Event to edit (null for new)  
     * @param {number} index - Event index (-1 for new)
     * @returns {string} HTML string
     */
    getEventModalHTML(event = null, index = -1) {
        const isEdit = event !== null;
        const today = Storage.getToday();

        return `
            <div class="modal-header">
                <h2 class="modal-title">${isEdit ? 'Edit Decree' : 'Declare Event'}</h2>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x" style="font-size: 1.25rem;"></i>
                </button>
            </div>
            <div class="modal-body">
                <form onsubmit="app.saveEvent(event)" style="display: flex; flex-direction: column; gap: 1rem;">
                    <input type="hidden" name="eventIndex" value="${index}">
                    
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Title</label>
                        <input type="text" name="title" class="form-input" required 
                               placeholder="Meeting with Investors..."
                               value="${isEdit ? Utils.sanitize(event.title) : ''}">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Date</label>
                            <input type="date" name="date" class="form-input" required 
                                   value="${isEdit ? event.date : today}">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">Type</label>
                            <select name="type" class="form-select">
                                <option value="Meeting" ${isEdit && event.type === 'Meeting' ? 'selected' : ''}>Meeting</option>
                                <option value="Birthday" ${isEdit && event.type === 'Birthday' ? 'selected' : ''}>Birthday</option>
                                <option value="Deadline" ${isEdit && event.type === 'Deadline' ? 'selected' : ''}>Deadline</option>
                                <option value="Social" ${isEdit && event.type === 'Social' ? 'selected' : ''}>Social</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary btn-lg btn-block" style="margin-top: 0.5rem;">
                        <i class="ph-bold ph-seal-check"></i> ${isEdit ? 'Update Decree' : 'Record Decree'}
        </form>
            </div>
        `;
    },

    // ==========================================
    // LEARNING MODULE VIEWS
    // ==========================================

    /**
     * Render Learning Dashboard View
     * @param {HTMLElement} container - Container element
     * @param {Object} data - App data
     */
    renderLearning(container, data) {
        Storage.ensureLearningData(data);
        Storage.checkLearningStreakIntegrity(data);

        const quote = Storage.getRandomQuote();
        const analytics = Storage.getLearningAnalytics(data);
        const heatmapData = Storage.getActivityHeatmap(data);
        const activeCourses = data.learning.courses.filter(c => c.status === 'active');
        const completedCourses = data.learning.courses.filter(c => c.status === 'completed');

        container.innerHTML = `
            <div class="page-header mb-6">
                <h2 class="page-title">
                    <i class="ph-duotone ph-graduation-cap text-gold" style="margin-right: 0.5rem;"></i>
                    The Learning Forge
                </h2>
                <div class="quote-block" style="margin-top: 0.5rem;">
                    "${quote.text}"
                    <span class="text-muted" style="display: block; font-size: 0.75rem; margin-top: 0.25rem;">— ${quote.author}</span>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-1 grid-3 mb-6">
                <div class="glass-card stat-card" style="border-left: 4px solid var(--royal-gold);">
                    <div class="stat-icon" style="position: absolute; right: 1rem; top: 1rem; opacity: 0.1;">
                        <i class="ph-fill ph-fire text-gold" style="font-size: 3rem;"></i>
                    </div>
                    <p class="stat-label">Learning Streak</p>
                    <div style="display: flex; align-items: baseline; gap: 0.5rem;">
                        <span class="stat-value" style="color: var(--royal-gold);">${analytics.streak}</span>
                        <span class="stat-sublabel">Days</span>
                    </div>
                </div>
                <div class="glass-card stat-card" style="border-left: 4px solid var(--success);">
                    <p class="stat-label">Active Courses</p>
                    <div style="display: flex; align-items: baseline; gap: 0.5rem;">
                        <span class="stat-value">${analytics.activeCourses}</span>
                        <span class="stat-sublabel" style="color: var(--success);">+${analytics.completedCourses} Completed</span>
                    </div>
                </div>
                <div class="glass-card stat-card" style="border-left: 4px solid var(--indigo);">
                    <p class="stat-label">Hours Invested</p>
                    <div style="display: flex; align-items: baseline; gap: 0.5rem;">
                        <span class="stat-value" style="color: var(--indigo);">${analytics.totalHours}</span>
                        <span class="stat-sublabel">${analytics.totalLogs} Log Entries</span>
                    </div>
                </div>
            </div>

            <!-- Activity Heatmap -->
            <div class="glass-card p-6 mb-6">
                <h3 style="font-family: var(--font-serif); font-weight: 700; color: white; margin-bottom: 1rem;">
                    <i class="ph-duotone ph-calendar-dots" style="color: var(--royal-gold);"></i>
                    Activity Heatmap (12 Weeks)
                </h3>
                <div class="heatmap-container">
                    <div class="heatmap-grid" id="activity-heatmap">
                        ${this.renderHeatmap(heatmapData)}
                    </div>
                    <div class="heatmap-legend">
                        <span class="text-muted" style="font-size: 0.625rem;">Less</span>
                        <div class="heatmap-cell level-0"></div>
                        <div class="heatmap-cell level-1"></div>
                        <div class="heatmap-cell level-2"></div>
                        <div class="heatmap-cell level-3"></div>
                        <div class="heatmap-cell level-4"></div>
                        <span class="text-muted" style="font-size: 0.625rem;">More</span>
                    </div>
                </div>
            </div>

            <!-- Active Courses -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="font-family: var(--font-serif); font-weight: 700; color: white;">
                    <i class="ph-duotone ph-books" style="color: var(--success);"></i>
                    Active Campaigns
                </h3>
                <button onclick="app.openCourseModal()" class="btn btn-primary btn-sm">
                    <i class="ph-bold ph-plus"></i> New Course
                </button>
            </div>

            ${activeCourses.length === 0 ? `
                <div class="glass-card empty-state" style="border-style: dashed; margin-bottom: 2rem;">
                    <i class="ph-duotone ph-student"></i>
                    <h3>No active courses</h3>
                    <p>Start your learning journey by adding a course.</p>
                    <button onclick="app.openCourseModal()" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="ph-bold ph-plus"></i> Add Course
                    </button>
                </div>
            ` : `
                <div class="grid grid-1 grid-2 mb-6">
                    ${activeCourses.map(course => this.renderCourseCard(course)).join('')}
                </div>
            `}

            <!-- Completed Courses -->
            ${completedCourses.length > 0 ? `
                <h3 style="font-family: var(--font-serif); font-weight: 700; color: white; margin-bottom: 1rem; margin-top: 2rem;">
                    <i class="ph-fill ph-medal" style="color: var(--royal-gold);"></i>
                    Conquered Territories
                </h3>
                <div class="grid grid-1 grid-2 mb-6">
                    ${completedCourses.map(course => this.renderCourseCard(course)).join('')}
                </div>
            ` : ''}

            <!-- Analytics Preview -->
            <div class="glass-card p-6 mb-6">
                <h3 style="font-family: var(--font-serif); font-weight: 700; color: white; margin-bottom: 1rem;">
                    <i class="ph-duotone ph-chart-line-up" style="color: var(--indigo);"></i>
                    Weekly Momentum
                </h3>
                <div class="chart-container">
                    <canvas id="learningMomentumChart"></canvas>
                </div>
            </div>

            <!-- Platform Distribution -->
            ${Object.keys(analytics.platformMinutes).length > 0 ? `
                <div class="glass-card p-6">
                    <h3 style="font-family: var(--font-serif); font-weight: 700; color: white; margin-bottom: 1rem;">
                        <i class="ph-duotone ph-pie-chart" style="color: var(--royal-gold);"></i>
                        Time by Platform
                    </h3>
                    <div class="chart-container" style="height: 280px;">
                        <canvas id="platformChart"></canvas>
                    </div>
                </div>
            ` : ''}

            <!-- FAB -->
            <button class="fab" onclick="app.openCourseModal()">
                <i class="ph-bold ph-plus"></i>
            </button>
        `;

        // Initialize charts
        setTimeout(() => {
            this.initLearningCharts(analytics);
        }, 100);
    },

    /**
     * Render Activity Heatmap Grid
     * @param {Array} heatmapData - Heatmap data from Storage
     * @returns {string} HTML string
     */
    renderHeatmap(heatmapData) {
        // Group by week (7 columns)
        let html = '';
        const weeks = {};

        heatmapData.forEach((day, index) => {
            const weekIndex = Math.floor(index / 7);
            if (!weeks[weekIndex]) weeks[weekIndex] = [];
            weeks[weekIndex].push(day);
        });

        Object.values(weeks).forEach(week => {
            html += '<div class="heatmap-week">';
            week.forEach(day => {
                html += `<div class="heatmap-cell level-${day.level}" 
                             title="${day.date}: ${day.minutes}m spent learning"></div>`;
            });
            html += '</div>';
        });

        return html;
    },

    /**
     * Render Course Card with Progress
     * @param {Object} course - Course object
     * @returns {string} HTML string
     */
    renderCourseCard(course) {
        const progress = Storage.getCourseProgress(course);
        const logsCount = (course.logs || []).length;
        const isCompleted = course.status === 'completed';
        const lastLog = course.logs && course.logs.length > 0 ? course.logs[0] : null;

        // Progress bar color based on status
        let progressClass = 'indigo';
        if (isCompleted) progressClass = 'success';
        else if (!progress.isOnTrack && progress.percentage > 0) progressClass = '';

        return `
            <div class="glass-card course-card hover-lift ${isCompleted ? 'completed' : ''}" onclick="app.navigateToCourse(${course.id})">
                <div class="course-card-indicator" style="background: ${isCompleted ? 'var(--success)' : 'var(--indigo)'};"></div>
                <div class="course-card-header">
                    <span class="course-platform">${Utils.sanitize(course.platform)}</span>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${progress.daysLeft !== null && !isCompleted ? `
                            <span class="badge ${progress.daysLeft <= 3 ? 'badge-danger' : 'badge-muted'}" style="font-size: 0.625rem;">
                                ${progress.daysLeft > 0 ? progress.daysLeft + 'd left' : 'Due!'}
                            </span>
                        ` : ''}
                        ${isCompleted ? '<i class="ph-fill ph-check-circle" style="color: var(--success); font-size: 1.25rem;"></i>' : ''}
                        <button class="icon-btn sm" onclick="event.stopPropagation(); app.openEditCourseModal(${course.id})" title="Edit">
                            <i class="ph-bold ph-pencil-simple"></i>
                        </button>
                    </div>
                </div>
                <h4 class="course-title">${Utils.sanitize(course.title)}</h4>
                
                <!-- Progress Bar -->
                <div class="progress-bar" style="margin: 0.75rem 0;">
                    <div class="progress-bar-fill ${progressClass}" style="width: ${progress.percentage}%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.6875rem; color: #64748b; margin-bottom: 0.5rem;">
                    <span>${progress.percentage}% complete</span>
                    <span>${progress.hoursSpent}h invested</span>
                </div>
                
                ${course.pledge ? `<p class="course-pledge">"${Utils.sanitize(course.pledge).substring(0, 80)}${course.pledge.length > 80 ? '...' : ''}"</p>` : ''}
                <div class="course-stats">
                    <span><i class="ph-bold ph-notebook"></i> ${logsCount} Logs</span>
                    ${!progress.isOnTrack && !isCompleted ? '<span style="color: #f59e0b;"><i class="ph-bold ph-warning"></i> Behind</span>' : ''}
                </div>
                ${lastLog ? `
                    <div class="course-last-log">
                        <span class="text-muted" style="font-size: 0.625rem;">Last:</span>
                        <span>${Utils.sanitize(lastLog.learned).substring(0, 50)}${lastLog.learned.length > 50 ? '...' : ''}</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Render Course Detail View
     * @param {HTMLElement} container - Container element
     * @param {Object} data - App data
     * @param {number} courseId - Course ID
     */
    renderCourseDetail(container, data, courseId) {
        const course = Storage.getCourse(data, courseId);
        if (!course) {
            app.navigate('learning');
            return;
        }

        const totalMinutes = (course.logs || []).reduce((sum, log) => sum + log.timeSpent, 0);
        const hoursSpent = (totalMinutes / 60).toFixed(1);
        const isCompleted = course.status === 'completed';

        container.innerHTML = `
            < div class="course-detail-header" >
                <button onclick="app.navigate('learning')" class="btn-back">
                    <i class="ph-bold ph-arrow-left"></i> Back
                </button>
                <div class="course-detail-title">
                    <h1>${Utils.sanitize(course.title)}</h1>
                    <p class="course-detail-meta">
                        <span class="course-platform">${Utils.sanitize(course.platform)}</span>
                        <span>•</span>
                        <span>${hoursSpent} Hours Logged</span>
                    </p>
                </div>
                <div class="course-detail-actions">
                    ${!isCompleted ? `
                        <button onclick="app.openLogModal(${course.id})" class="btn btn-primary">
                            <i class="ph-bold ph-pencil-simple"></i> Log
                        </button>
                        <button onclick="app.completeCourse(${course.id})" class="btn btn-outline">
                            <i class="ph-bold ph-check"></i> Finish
                        </button>
                    ` : `
                        <div class="status-badge status-completed" style="padding: 0.75rem 1rem;">
                            <i class="ph-fill ph-medal"></i> Completed
                        </div>
                    `}
                    <button onclick="app.deleteCourse(${course.id})" class="btn-icon-danger">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
            </div >

    <div class="course-detail-layout">
        <!-- Main: Logs -->
        <div class="course-logs-section">
            <h3>
                <i class="ph-duotone ph-notebook" style="color: var(--royal-gold);"></i>
                Learning Log
            </h3>

            ${(!course.logs || course.logs.length === 0) ? `
                        <div class="glass-card empty-state" style="border-style: dashed;">
                            <i class="ph-duotone ph-note-pencil"></i>
                            <h3>No logs yet</h3>
                            <p>Start your streak today by logging what you learned.</p>
                        </div>
                    ` : `
                        <div class="logs-list">
                            ${course.logs.map(log => `
                                <div class="glass-card log-entry ${log.milestone ? 'milestone' : ''}">
                                    <div class="log-header">
                                        <div class="log-date">
                                            <span>${new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            ${log.milestone ? '<span class="milestone-badge"><i class="ph-fill ph-star"></i> Milestone</span>' : ''}
                                        </div>
                                        <span class="log-time">${log.timeSpent}m</span>
                                    </div>
                                    <div class="log-content">
                                        <div class="log-learned">
                                            <h4><i class="ph-bold ph-lightbulb" style="color: var(--indigo);"></i> Learned</h4>
                                            <p>${Utils.sanitize(log.learned)}</p>
                                        </div>
                                        ${log.challenge || log.solution ? `
                                            <div class="log-challenge-solution">
                                                ${log.challenge ? `
                                                    <div class="log-challenge">
                                                        <h5><i class="ph-bold ph-warning" style="color: var(--danger);"></i> Challenge</h5>
                                                        <p>${Utils.sanitize(log.challenge)}</p>
                                                    </div>
                                                ` : ''}
                                                ${log.solution ? `
                                                    <div class="log-solution">
                                                        <h5><i class="ph-bold ph-check-circle" style="color: var(--success);"></i> Solution</h5>
                                                        <p>${Utils.sanitize(log.solution)}</p>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
        </div>

        <!-- Sidebar -->
        <div class="course-sidebar">
            <!-- Pledge Card -->
            <div class="glass-card pledge-card">
                <h3><i class="ph-fill ph-target" style="color: var(--royal-gold);"></i> The Pledge</h3>
                <p class="pledge-text">"${Utils.sanitize(course.pledge) || 'No pledge set.'}"</p>
                <div class="pledge-details">
                    <div class="pledge-item">
                        <span>Daily Goal</span>
                        <span class="pledge-value">${course.dailyGoal}m</span>
                    </div>
                    <div class="pledge-item">
                        <span>Target End</span>
                        <span class="pledge-value">${course.endDate || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Certificate Card -->
            <div class="glass-card cert-card">
                <h3><i class="ph-fill ph-certificate" style="color: var(--royal-gold);"></i> Certificate</h3>
                ${course.certificate ? `
                            <div class="cert-preview">
                                <img src="${course.certificate}" alt="Certificate" onclick="app.showImage('${course.certificate}')">
                                <div class="cert-overlay">
                                    <i class="ph-bold ph-magnifying-glass-plus"></i>
                                </div>
                            </div>
                            <p class="cert-status earned"><i class="ph-bold ph-check-circle"></i> Earned</p>
                            <button onclick="app.removeCertificate(${course.id})" class="btn-text-danger">Remove Certificate</button>
                        ` : `
                            <div class="cert-placeholder">
                                <i class="ph-duotone ph-lock-key"></i>
                                <p>${isCompleted ? 'Click to upload your certificate' : 'Complete the course to upload'}</p>
                                ${isCompleted ? `
                                    <button onclick="app.openCertModal(${course.id})" class="btn btn-outline btn-sm" style="margin-top: 0.5rem;">
                                        <i class="ph-bold ph-upload-simple"></i> Upload
                                    </button>
                                ` : ''}
                            </div>
                        `}
            </div>
        </div>
    </div>

            ${!isCompleted ? `
                <button class="fab" onclick="app.openLogModal(${course.id})">
                    <i class="ph-bold ph-pencil-simple"></i>
                </button>
            ` : ''
            }
`;
    },

    /**
     * Initialize Learning Charts
     * @param {Object} analytics - Analytics data
     */
    initLearningCharts(analytics) {
        // Momentum Chart
        const momentumCtx = document.getElementById('learningMomentumChart');
        if (momentumCtx) {
            new Chart(momentumCtx, {
                type: 'bar',
                data: {
                    labels: analytics.last7DaysLabels,
                    datasets: [{
                        label: 'Minutes',
                        data: analytics.last7Days,
                        backgroundColor: '#6366f1',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                    }
                }
            });
        }

        // Platform Chart
        const platformCtx = document.getElementById('platformChart');
        if (platformCtx && Object.keys(analytics.platformMinutes).length > 0) {
            new Chart(platformCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(analytics.platformMinutes),
                    datasets: [{
                        data: Object.values(analytics.platformMinutes),
                        backgroundColor: ['#D4AF37', '#6366f1', '#10b981', '#f97316', '#ef4444', '#8b5cf6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#cbd5e1' } }
                    }
                }
            });
        }
    },

    /**
     * Get Add Course Modal HTML
     * @returns {string} HTML string
     */
    getAddCourseModalHTML() {
        return `
    < div class="modal-header" >
                <h2 class="modal-title">
                    <i class="ph-duotone ph-books" style="color: var(--royal-gold);"></i>
                    Register New Course
                </h2>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x" style="font-size: 1.25rem;"></i>
                </button>
            </div >
    <div class="modal-body">
        <form onsubmit="app.saveCourse(event)" style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Course Title</label>
                <input type="text" name="title" class="form-input" required
                    placeholder="e.g., Google Cloud ML Engineer">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Platform/Source</label>
                    <input type="text" name="platform" class="form-input"
                        placeholder="Coursera, Udemy...">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">Duration (Hours)</label>
                    <input type="number" name="duration" class="form-input"
                        placeholder="e.g., 40">
                </div>
            </div>

            <div class="glass-card" style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 1rem; border-radius: 0.75rem;">
                <h3 style="color: var(--indigo); font-size: 0.875rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="ph-fill ph-target"></i> Your Commitment
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.6875rem;">Daily Goal (Mins)</label>
                        <input type="number" name="dailyGoal" class="form-input" value="60" style="font-size: 0.875rem;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="font-size: 0.6875rem;">End Date Goal</label>
                        <input type="date" name="endDate" class="form-input" style="font-size: 0.875rem;">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 0; margin-top: 0.75rem;">
                    <label class="form-label" style="font-size: 0.6875rem;">Why are you learning this?</label>
                    <textarea name="pledge" class="form-textarea" rows="2"
                        placeholder="I commit to finish this because..." style="font-size: 0.875rem;"></textarea>
                </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg btn-block" style="margin-top: 0.5rem;">
                <i class="ph-bold ph-rocket-launch"></i> Start Journey
            </button>
        </form>
    </div>
`;
    },

    /**
     * Get Learning Log Modal HTML
     * @param {Object} course - Course object
     * @returns {string} HTML string
     */
    getLogModalHTML(course) {
        return `
    < div class="modal-header" >
                <div>
                    <h2 class="modal-title">Daily Learning Log</h2>
                    <p class="text-muted" style="font-size: 0.75rem;">${Utils.sanitize(course.title)}</p>
                </div>
                <button class="modal-close" onclick="app.closeModal()">
                    <i class="ph-bold ph-x" style="font-size: 1.25rem;"></i>
                </button>
            </div >
    <div class="modal-body">
        <form onsubmit="app.saveLog(event)" style="display: flex; flex-direction: column; gap: 1rem;">
            <input type="hidden" name="courseId" value="${course.id}">

                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">What did you learn today?</label>
                    <textarea name="learned" class="form-textarea" rows="3" required
                        placeholder="Key concepts, new syntax, architectural patterns..."></textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="color: var(--danger);">The Challenge</label>
                        <textarea name="challenge" class="form-textarea" rows="3"
                            placeholder="What blocked you?..." style="background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.3);"></textarea>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="color: var(--success);">The Solution</label>
                        <textarea name="solution" class="form-textarea" rows="3"
                            placeholder="How did you fix it?..." style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.3);"></textarea>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 1rem; background: rgba(15, 23, 42, 0.5); padding: 1rem; border-radius: 0.75rem;">
                    <label class="form-label" style="margin: 0;">Time Spent:</label>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button type="button" onclick="app.adjustLogTime(-15)" class="btn-time-adjust">-</button>
                        <input type="number" name="timeSpent" id="log-time-input" value="${course.dailyGoal || 60}"
                            class="time-input" style="width: 60px; text-align: center;">
                            <span class="text-muted">mins</span>
                            <button type="button" onclick="app.adjustLogTime(15)" class="btn-time-adjust">+</button>
                    </div>
                    <div style="flex: 1;"></div>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" name="milestone" style="width: 1.25rem; height: 1.25rem;">
                            <span class="text-gold" style="font-size: 0.875rem; font-weight: 600;">Milestone?</span>
                    </label>
                </div>

                <button type="submit" class="btn btn-lg btn-block" style="background: var(--success); color: white;">
                    <i class="ph-bold ph-floppy-disk"></i> Save Log Entry
                </button>
        </form>
    </div>
`;
    },

    /**
     * Get Certificate Upload Modal HTML
     * @param {Object} course - Course object
     * @returns {string} HTML string
     */
    getCertModalHTML(course) {
        return `
    < div class="modal-header" style = "text-align: center; display: block;" >
                <div style="width: 64px; height: 64px; background: rgba(245, 158, 11, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <i class="ph-fill ph-medal" style="font-size: 2rem; color: #f59e0b;"></i>
                </div>
                <h2 class="modal-title">Congratulations!</h2>
                <p class="text-muted">Attach your certificate for <span style="color: white; font-weight: 600;">${Utils.sanitize(course.title)}</span></p>
            </div >
    <div class="modal-body">
        <form onsubmit="app.uploadCertificate(event)">
            <input type="hidden" name="courseId" value="${course.id}">
                <div class="cert-upload-zone" onclick="document.getElementById('cert-file-input').click()">
                    <input type="file" id="cert-file-input" name="certificate" accept="image/jpeg,image/png,image/webp" style="display: none;" required>
                        <i class="ph-duotone ph-file-arrow-up" style="font-size: 3rem; color: #64748b;"></i>
                        <p class="text-muted" style="font-size: 0.875rem;">Click to upload image (Max 500KB)</p>
                </div>
                <p id="cert-error" class="text-danger" style="display: none; font-size: 0.75rem; margin-top: 0.5rem;"></p>
                <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem;">
                    <i class="ph-bold ph-upload-simple"></i> Save Certificate
                </button>
        </form>
    </div>
`;
    },

    /**
     * Render Settings View
     * @param {HTMLElement} container - Container element
     */
    renderSettings(container) {
        const user = Auth.getUser();
        const lastSync = Sync.getLastSync();

        if (!user) {
            container.innerHTML = `
                <div class="view-header">
                    <div>
                        <h2 class="view-title">
                            <i class="ph-duotone ph-gear" style="color: var(--royal-gold);"></i>
                            Settings
                        </h2>
                        <p class="view-subtitle">Manage your account and preferences</p>
                    </div>
                </div>
                <div class="glass-card empty-state" style="border-style: dashed;">
        <i class="ph-duotone ph-user-circle"></i>
        <h3>Not Signed In</h3>
        <p>Sign in to sync your data across devices and access your profile.</p>
        <a href="auth.html" class="btn btn-primary" style="margin-top: 1rem;">
            <i class="ph-bold ph-sign-in"></i> Sign In
        </a>
    </div>
`;
            return;
        }

        container.innerHTML = `
            <div class="view-header">
                <div>
                    <h2 class="view-title">
                        <i class="ph-duotone ph-gear" style="color: var(--royal-gold);"></i>
                        Settings
                    </h2>
                    <p class="view-subtitle">Manage your account and preferences</p>
                </div>
            </div>

            <!-- User Profile Header -->
            <div class="glass-card settings-header">
                <div class="settings-avatar">
                    <div class="settings-avatar-img">
                        ${user.avatar
                ? `<img src="${user.avatar.startsWith('data:') ? user.avatar : ''}" alt="${user.name}">`
                : `<span>${user.initials || 'U'}</span>`
            }
                    </div>
                    <label class="settings-avatar-upload">
                        <i class="ph-bold ph-camera"></i>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onchange="app.handleAvatarUpload(this)">
                    </label>
                </div>
                <div class="settings-user-info">
                    <h3 class="settings-user-name">${Utils.sanitize(user.name)}</h3>
                    <p class="settings-user-email">${Utils.sanitize(user.email)}</p>
                </div>
            </div>

            <!--Cloud Sync Section-- >
            <div class="settings-section">
                <h4 class="settings-section-title">Cloud Sync</h4>
                <div class="settings-list">
                    <div class="settings-item" onclick="Sync.manualSync()">
                        <div class="settings-item-icon sync">
                            <i class="ph-bold ph-cloud-arrow-up"></i>
                        </div>
                        <div class="settings-item-content">
                            <p class="settings-item-title">Sync Now</p>
                            <p class="settings-item-desc">
                                ${lastSync ? 'Last synced: ' + new Date(lastSync).toLocaleString() : 'Never synced'}
                            </p>
                        </div>
                        <i class="ph-bold ph-arrow-right settings-item-arrow"></i>
                    </div>
                </div>
            </div>

            <!-- Account Section -->
            <div class="settings-section">
                <h4 class="settings-section-title">Account</h4>
                <div class="settings-list">
                    <div class="settings-item" onclick="app.openEditNameModal()">
                        <div class="settings-item-icon name">
                            <i class="ph-bold ph-pencil-simple"></i>
                        </div>
                        <div class="settings-item-content">
                            <p class="settings-item-title">Edit Name</p>
                            <p class="settings-item-desc">Change your display name</p>
                        </div>
                        <i class="ph-bold ph-arrow-right settings-item-arrow"></i>
                    </div>
                    <div class="settings-item" onclick="app.openChangePasswordModal()">
                        <div class="settings-item-icon" style="background: rgba(99, 102, 241, 0.15); color: var(--indigo);">
                            <i class="ph-bold ph-lock-key"></i>
                        </div>
                        <div class="settings-item-content">
                            <p class="settings-item-title">Change Password</p>
                            <p class="settings-item-desc">Update your account password</p>
                        </div>
                        <i class="ph-bold ph-arrow-right settings-item-arrow"></i>
                    </div>
                    <div class="settings-item" onclick="app.logout()">
                        <div class="settings-item-icon logout">
                            <i class="ph-bold ph-sign-out"></i>
                        </div>
                        <div class="settings-item-content">
                            <p class="settings-item-title">Sign Out</p>
                            <p class="settings-item-desc">Log out of your account</p>
                        </div>
                        <i class="ph-bold ph-arrow-right settings-item-arrow"></i>
                    </div>
                </div>
            </div>

            <!-- Data Section -->
            <div class="settings-section">
                <h4 class="settings-section-title">Data</h4>
                <div class="settings-list">
                    <div class="settings-item" onclick="app.exportData()">
                        <div class="settings-item-icon" style="background: rgba(16, 185, 129, 0.15); color: var(--success);">
                            <i class="ph-bold ph-download-simple"></i>
                        </div>
                        <div class="settings-item-content">
                            <p class="settings-item-title">Export Backup</p>
                            <p class="settings-item-desc">Download your data as JSON</p>
                        </div>
                        <i class="ph-bold ph-arrow-right settings-item-arrow"></i>
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="settings-section">
                <h4 class="settings-section-title" style="color: var(--danger);">Danger Zone</h4>
                <div class="settings-list">
                    <div class="settings-item" onclick="app.confirmDeleteAccount()">
                        <div class="settings-item-icon" style="background: rgba(239, 68, 68, 0.15); color: var(--danger);">
                            <i class="ph-bold ph-trash"></i>
                        </div>
                        <div class="settings-item-content">
                            <p class="settings-item-title" style="color: var(--danger);">Delete Account</p>
                            <p class="settings-item-desc">Permanently delete your account and data</p>
                        </div>
                        <i class="ph-bold ph-arrow-right settings-item-arrow"></i>
                    </div>
                </div>
            </div>

            <!-- Appearance Section -->
            <div class="settings-section">
                <h4 class="settings-section-title">Appearance</h4>
                <div class="settings-toggle-row">
                    <div class="settings-toggle-info">
                        <h4>Light Theme</h4>
                        <p>Switch to a brighter royal theme</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="theme-toggle" onchange="app.toggleTheme(this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <!-- Notification Preferences Section -->
            <div class="settings-section">
                <h4 class="settings-section-title">Notifications</h4>
                <div class="settings-toggle-row">
                    <div class="settings-toggle-info">
                        <h4>Streak Reminders</h4>
                        <p>Daily reminder to maintain your streak</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="streak-notify" checked onchange="app.updateNotificationSetting('streakReminders', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-toggle-row">
                    <div class="settings-toggle-info">
                        <h4>Morning Protocol</h4>
                        <p>Remind me to complete morning planning</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="morning-notify" checked onchange="app.updateNotificationSetting('morningReminder', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-toggle-row">
                    <div class="settings-toggle-info">
                        <h4>Evening Report</h4>
                        <p>Remind me to complete evening reflection</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="evening-notify" checked onchange="app.updateNotificationSetting('eveningReminder', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    },

    /**
     * Render notifications page
     * @param {HTMLElement} container - Container element
     */
    renderNotifications(container) {
        const notifications = Storage.getNotifications ? Storage.getNotifications() : [];
        const streak = Storage.getStreak ? Storage.getStreak() : { current: 0, longest: 0, lastDate: null };

        container.innerHTML = `
            <div class="view-header">
                <div>
                    <h2 class="view-title">
                        <i class="ph-duotone ph-bell" style="color: var(--indigo);"></i>
                        Notifications
                    </h2>
                    <p class="view-subtitle">Stay updated on your progress</p>
                </div>
                ${notifications.length > 0 ? `
                    <button class="btn btn-secondary" onclick="app.clearNotifications()">
                        <i class="ph-bold ph-checks"></i> Mark All Read
                    </button>
                ` : ''}
            </div>

            <!-- Streak Achievement Card -->
            <div class="streak-card glass-card" style="margin-bottom: 1.5rem;">
                <div class="streak-card-content">
                    <div class="streak-number">${streak.current}</div>
                    <div class="streak-label">Day Streak</div>
                    ${streak.current >= 7 ? `<div class="streak-milestone">🔥 One week warrior!</div>` : ''}
                    ${streak.current >= 30 ? `<div class="streak-milestone">👑 Monthly Monarch!</div>` : ''}
                    ${streak.current >= 100 ? `<div class="streak-milestone">🏆 Century Legend!</div>` : ''}
                    ${streak.current > 0 && streak.current < 7 ? `
                        <div class="streak-milestone">${7 - streak.current} days until Week Warrior!</div>
                    ` : ''}
                    ${streak.current === 0 ? `
                        <div class="streak-milestone">Start learning to build your streak!</div>
                    ` : ''}
                </div>
            </div>

            <div class="notification-list">
                ${notifications.length > 0 ? notifications.map(n => `
                    <div class="notification-item ${n.read ? '' : 'unread'}" onclick="app.markNotificationRead('${n.id}')">
                        <div class="notification-icon ${n.type || 'info'}">
                            <i class="ph-bold ${this.getNotificationIcon(n.type)}"></i>
                        </div>
                        <div class="notification-content">
                            <p class="notification-title">${Utils.sanitize(n.title)}</p>
                            <p class="notification-message">${Utils.sanitize(n.message)}</p>
                            <p class="notification-time">${Utils.formatTimeAgo(n.createdAt)}</p>
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-notifications">
                        <i class="ph-duotone ph-bell-slash"></i>
                        <h3>No notifications</h3>
                        <p>You're all caught up!</p>
                    </div>
                `}
            </div>
        `;
    },

    getNotificationIcon(type) {
        const icons = {
            success: 'ph-check-circle',
            warning: 'ph-warning',
            streak: 'ph-fire',
            info: 'ph-info'
        };
        return icons[type] || icons.info;
    },

    // ==========================================
    // TODAY'S IDEA VIEW
    // ==========================================

    renderIdea(container, data) {
        const ideas = Storage.getIdeas ? Storage.getIdeas() : [];
        const recentIdeas = ideas.slice(0, 3);

        container.innerHTML = `
            <div class="view-header">
                <div>
                    <h2 class="view-title">
                        <i class="ph-duotone ph-lightbulb" style="color: #f59e0b;"></i>
                        Today's Idea
                    </h2>
                    <p class="view-subtitle">Capture your brilliant thoughts and plan their implementation</p>
                </div>
            </div>

            <div class="glass-card">
                <form id="idea-form" onsubmit="app.saveIdea(event)">
                    <!-- Idea Type Selector -->
                    <div class="idea-type-selector">
                        <label class="idea-type-btn active" data-type="project">
                            <input type="radio" name="ideaType" value="project" checked hidden>
                            <i class="ph-duotone ph-rocket-launch"></i>
                            <span>Project</span>
                        </label>
                        <label class="idea-type-btn" data-type="quote">
                            <input type="radio" name="ideaType" value="quote" hidden>
                            <i class="ph-duotone ph-quotes"></i>
                            <span>Quote</span>
                        </label>
                        <label class="idea-type-btn" data-type="thought">
                            <input type="radio" name="ideaType" value="thought" hidden>
                            <i class="ph-duotone ph-brain"></i>
                            <span>New Thought</span>
                        </label>
                    </div>

                    <!-- Idea Content -->
                    <div class="form-group">
                        <label class="form-label">What's your idea?</label>
                        <input type="text" name="ideaTitle" class="form-input" placeholder="Give it a title..." required>
                    </div>
                    <div class="form-group">
                        <textarea name="ideaDescription" class="form-input" rows="3" placeholder="Describe your idea in detail..."></textarea>
                    </div>

                    <!-- Implementation Details -->
                    <h4 style="font-family: var(--font-sans); font-size: 0.875rem; color: #94a3b8; margin: 1.5rem 0 1rem; text-transform: uppercase; letter-spacing: 0.05em;">
                        <i class="ph-bold ph-strategy" style="color: var(--royal-gold);"></i> Implementation Plan
                    </h4>
                    
                    <div class="implementation-grid">
                        <div class="implementation-field">
                            <label><i class="ph-bold ph-calendar"></i> When</label>
                            <input type="date" name="ideaWhen" class="form-input">
                        </div>
                        <div class="implementation-field">
                            <label><i class="ph-bold ph-map-pin"></i> Where</label>
                            <input type="text" name="ideaWhere" class="form-input" placeholder="Location or context">
                        </div>
                        <div class="implementation-field">
                            <label><i class="ph-bold ph-users"></i> With Who</label>
                            <input type="text" name="ideaWithWho" class="form-input" placeholder="Collaborators or people involved">
                        </div>
                        <div class="implementation-field">
                            <label><i class="ph-bold ph-target"></i> Why</label>
                            <input type="text" name="ideaWhy" class="form-input" placeholder="Purpose or motivation">
                        </div>
                        <div class="implementation-field full-width">
                            <label><i class="ph-bold ph-list-checks"></i> How (Optional)</label>
                            <textarea name="ideaHow" class="form-input" rows="2" placeholder="Steps to implement..."></textarea>
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="ph-bold ph-lightbulb"></i> Save Idea
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="app.openIdeaHistory()">
                            <i class="ph-bold ph-clock-counter-clockwise"></i> History
                        </button>
                    </div>
                </form>

                ${recentIdeas.length > 0 ? `
                    <div class="recent-items-preview">
                        <h4>Recent Ideas</h4>
                        ${recentIdeas.map(idea => `
                            <div class="recent-item">
                                <div class="recent-item-icon ${idea.type}">
                                    <i class="ph-bold ${idea.type === 'project' ? 'ph-rocket-launch' : idea.type === 'quote' ? 'ph-quotes' : 'ph-brain'}"></i>
                                </div>
                                <div class="recent-item-content">
                                    <p class="recent-item-title">${Utils.sanitize(idea.title)}</p>
                                    <p class="recent-item-date">${Utils.formatTimeAgo(idea.createdAt)}</p>
                                </div>
                                <span class="recent-item-status ${idea.status}">${idea.status}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Add click handlers for idea type buttons
        container.querySelectorAll('.idea-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.idea-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                btn.querySelector('input').checked = true;
            });
        });
    },

    // ==========================================
    // THE GOOD IN TODAY VIEW
    // ==========================================

    renderDailyGood(container, data) {
        const goods = Storage.getDailyGoods ? Storage.getDailyGoods() : [];
        const recentGoods = goods.slice(0, 3);

        container.innerHTML = `
            <div class="view-header">
                <div>
                    <h2 class="view-title">
                        <i class="ph-duotone ph-heart" style="color: #ef4444;"></i>
                        The Good in Today
                    </h2>
                    <p class="view-subtitle">Capture the blessings and good moments of your day</p>
                </div>
            </div>

            <div class="glass-card">
                <form id="daily-good-form" onsubmit="app.saveDailyGood(event)">
                    <!-- Category Selector -->
                    <div class="idea-type-selector">
                        <label class="idea-type-btn active" data-type="person">
                            <input type="radio" name="goodCategory" value="person" checked hidden>
                            <i class="ph-duotone ph-user"></i>
                            <span>Person</span>
                        </label>
                        <label class="idea-type-btn" data-type="place">
                            <input type="radio" name="goodCategory" value="place" hidden>
                            <i class="ph-duotone ph-map-pin"></i>
                            <span>Place</span>
                        </label>
                        <label class="idea-type-btn" data-type="event">
                            <input type="radio" name="goodCategory" value="event" hidden>
                            <i class="ph-duotone ph-star"></i>
                            <span>Event</span>
                        </label>
                        <label class="idea-type-btn" data-type="moment">
                            <input type="radio" name="goodCategory" value="moment" hidden>
                            <i class="ph-duotone ph-sparkle"></i>
                            <span>Moment</span>
                        </label>
                    </div>

                    <div class="form-group">
                        <label class="form-label">What good thing happened?</label>
                        <textarea name="goodDescription" class="form-input" rows="4" placeholder="Describe the good thing that happened today..." required></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Additional details (optional)</label>
                        <input type="text" name="goodDetails" class="form-input" placeholder="Who, where, or any other details...">
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="ph-bold ph-heart"></i> Save Good Moment
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="app.openDailyGoodHistory()">
                            <i class="ph-bold ph-clock-counter-clockwise"></i> History
                        </button>
                    </div>
                </form>

                ${recentGoods.length > 0 ? `
                    <div class="recent-items-preview">
                        <h4>Recent Good Moments</h4>
                        ${recentGoods.map(good => `
                            <div class="recent-item">
                                <div class="recent-item-icon good">
                                    <i class="ph-bold ph-heart"></i>
                                </div>
                                <div class="recent-item-content">
                                    <p class="recent-item-title">${Utils.sanitize(good.description.substring(0, 50))}${good.description.length > 50 ? '...' : ''}</p>
                                    <p class="recent-item-date">${Utils.formatTimeAgo(good.date)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Add click handlers
        container.querySelectorAll('.idea-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.idea-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                btn.querySelector('input').checked = true;
            });
        });
    },

    // ==========================================
    // DAILY LESSONS VIEW
    // ==========================================

    renderDailyLessons(container, data) {
        const lessons = Storage.getLessons ? Storage.getLessons() : [];
        const recentLessons = lessons.slice(0, 3);

        container.innerHTML = `
            <div class="view-header">
                <div>
                    <h2 class="view-title">
                        <i class="ph-duotone ph-book-open-text" style="color: var(--info);"></i>
                        Daily Lessons
                    </h2>
                    <p class="view-subtitle">Capture life lessons and wisdom from your daily experiences</p>
                </div>
            </div>

            <div class="glass-card">
                <form id="lesson-form" onsubmit="app.saveLesson(event)">
                    <div class="form-group">
                        <label class="form-label">What did you learn today?</label>
                        <textarea name="lessonContent" class="form-input" rows="5" placeholder="Describe the lesson you learned..." required style="font-size: 1rem; line-height: 1.7;"></textarea>
                    </div>

                    <div class="implementation-grid" style="margin-top: 0;">
                        <div class="implementation-field">
                            <label><i class="ph-bold ph-tag"></i> Tags</label>
                            <input type="text" name="lessonTags" class="form-input" placeholder="e.g., patience, leadership, faith">
                        </div>
                        <div class="implementation-field">
                            <label><i class="ph-bold ph-book-open"></i> Source</label>
                            <input type="text" name="lessonSource" class="form-input" placeholder="Book, person, or experience">
                        </div>
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class="ph-bold ph-book-open-text"></i> Save Lesson
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="app.openLessonsHistory()">
                            <i class="ph-bold ph-clock-counter-clockwise"></i> History
                        </button>
                    </div>
                </form>

                ${recentLessons.length > 0 ? `
                    <div class="recent-items-preview">
                        <h4>Recent Lessons</h4>
                        ${recentLessons.map(lesson => `
                            <div class="recent-item">
                                <div class="recent-item-icon lesson">
                                    <i class="ph-bold ph-book-open-text"></i>
                                </div>
                                <div class="recent-item-content">
                                    <p class="recent-item-title">${Utils.sanitize(lesson.content.substring(0, 60))}${lesson.content.length > 60 ? '...' : ''}</p>
                                    <p class="recent-item-date">${Utils.formatTimeAgo(lesson.date)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // ==========================================
    // DAILY SAVINGS VIEW (COMING SOON)
    // ==========================================

    renderDailySavings(container) {
        container.innerHTML = `
            <div class="view-header">
                <div>
                    <h2 class="view-title">
                        <i class="ph-duotone ph-piggy-bank" style="color: var(--royal-gold);"></i>
                        Daily Savings
                    </h2>
                    <p class="view-subtitle">Build wealth through daily micro-saving habits</p>
                </div>
            </div>

            <div class="glass-card coming-soon-card">
                <i class="ph-duotone ph-piggy-bank coming-soon-icon"></i>
                <span class="coming-soon-badge">Coming Soon</span>
                <h3 class="coming-soon-title">Your Financial Kingdom Awaits</h3>
                <p class="coming-soon-message">
                    "Small daily deposits build extraordinary wealth. The journey to financial freedom starts with a single saved coin."
                </p>
                
                <div class="coming-soon-features">
                    <div class="coming-soon-feature">
                        <i class="ph-bold ph-target"></i>
                        <span>Daily Savings Goals</span>
                    </div>
                    <div class="coming-soon-feature">
                        <i class="ph-bold ph-receipt"></i>
                        <span>Expense Tracking</span>
                    </div>
                    <div class="coming-soon-feature">
                        <i class="ph-bold ph-trophy"></i>
                        <span>Savings Milestones</span>
                    </div>
                    <div class="coming-soon-feature">
                        <i class="ph-bold ph-chart-line-up"></i>
                        <span>Progress Reports</span>
                    </div>
                    <div class="coming-soon-feature">
                        <i class="ph-bold ph-bell-ringing"></i>
                        <span>Smart Reminders</span>
                    </div>
                </div>

                <button class="btn btn-primary" onclick="Utils.showToast('We will notify you when Daily Savings launches! 💰', 'gold')">
                    <i class="ph-bold ph-bell"></i> Notify Me When Available
                </button>
            </div>
        `;
    }
};

// Make available globally
window.Views = Views;
