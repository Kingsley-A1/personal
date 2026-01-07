/**
 * REIGN - Storage Module
 * Handles all data persistence with localStorage
 * NOTE: Uses Config.STORAGE_KEYS.DATA key for data consistency
 */

const Storage = {
    // Use same key as Config for data consistency
    STORAGE_KEY: 'reignData',

    // Default data structure (consolidated with core.js)
    defaultData: {
        logs: {},      // Daily logs keyed by date "YYYY-MM-DD"
        events: [],    // Calendar events
        ideas: [],
        lessons: [],
        dailyGood: [],
        relationships: [],
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
            theme: 'dark',
            role: 'king',
            username: '',  // User's display name (empty = use role title)
            notifications: true,
            soundEnabled: false
        },
        lastUpdated: null,
        // Learning Module Data
        learning: {
            courses: [],           // Learning courses
            streak: 0,             // Consecutive learning days
            lastLogDate: null,     // Last learning log date (YYYY-MM-DD)
            activityLog: {}        // Daily minutes for heatmap { "YYYY-MM-DD": minutes }
        }
    },

    /**
     * Load data from localStorage
     * @returns {Object} The stored data or default structure
     */
    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // Merge with defaults to ensure all keys exist
                return this.mergeWithDefaults(data);
            }
            return { ...this.defaultData };
        } catch (e) {
            console.error('Storage load error:', e);
            return { ...this.defaultData };
        }
    },

    /**
     * Deep merge data with defaults to ensure all keys exist
     * @param {Object} data - User data
     * @returns {Object} Merged data
     */
    mergeWithDefaults(data) {
        const merged = { ...this.defaultData };
        
        // Copy top-level arrays/objects
        for (const key of Object.keys(data)) {
            if (key === 'settings') {
                // Deep merge settings
                merged.settings = { ...this.defaultData.settings, ...data.settings };
                // Handle legacy userName -> username migration
                if (data.settings?.userName && !data.settings?.username) {
                    merged.settings.username = data.settings.userName;
                }
            } else if (key === 'learning') {
                merged.learning = { ...this.defaultData.learning, ...data.learning };
            } else if (key === 'focus') {
                merged.focus = { 
                    ...this.defaultData.focus, 
                    ...data.focus,
                    settings: { ...this.defaultData.focus.settings, ...(data.focus?.settings || {}) },
                    stats: { ...this.defaultData.focus.stats, ...(data.focus?.stats || {}) }
                };
            } else if (key === 'goals') {
                merged.goals = { ...this.defaultData.goals, ...data.goals };
            } else if (key === 'savings') {
                merged.savings = { ...this.defaultData.savings, ...data.savings };
            } else {
                merged[key] = data[key];
            }
        }
        
        return merged;
    },;
        }
    },

    /**
     * Save data to localStorage
     * @param {Object} data - The data to save
     * @returns {boolean} Success status
     */
    save(data) {
        try {
            data.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage save error:', e);
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Storage full! Export data then clear.', 'danger');
            }
            return false;
        }
    },

    /**
     * Alias for load() - compatibility with core.js API
     * @returns {Object} The stored data or default structure
     */
    getData() {
        return this.load();
    },

    /**
     * Alias for save() - compatibility with core.js API
     * @param {Object} data - The data to save
     * @returns {boolean} Success status
     */
    saveData(data) {
        return this.save(data);
    },

    /**
     * Get default data structure - compatibility with core.js
     * @returns {Object} Default data structure
     */
    getDefaultData() {
        return { ...this.defaultData };
    },

    /**
     * Clear all stored data
     */
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * Get today's date in ISO format
     * @returns {string} Date string "YYYY-MM-DD"
     */
    getToday() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Get or create today's log entry
     * @param {Object} data - The app data object
     * @returns {Object} Today's log
     */
    getTodayLog(data) {
        const today = this.getToday();
        if (!data.logs[today]) {
            data.logs[today] = {
                morning: null,
                evening: null
            };
        }
        return data.logs[today];
    },

    /**
     * Save morning data
     * @param {Object} data - App data
     * @param {Object} morningData - Morning log data
     */
    saveMorning(data, morningData) {
        const today = this.getToday();
        if (!data.logs[today]) {
            data.logs[today] = { morning: null, evening: null };
        }
        data.logs[today].morning = morningData;
        this.save(data);
    },

    /**
     * Save evening data
     * @param {Object} data - App data
     * @param {Object} eveningData - Evening log data
     */
    saveEvening(data, eveningData) {
        const today = this.getToday();
        if (!data.logs[today]) {
            data.logs[today] = { morning: null, evening: null };
        }
        data.logs[today].evening = eveningData;
        this.save(data);
    },

    /**
     * Add a new task to today's morning
     * @param {Object} data - App data
     * @param {Object} task - Task object
     */
    addTask(data, task) {
        const log = this.getTodayLog(data);
        if (!log.morning) {
            log.morning = {
                sessionName: '',
                location: '',
                startTime: '',
                tasks: []
            };
        }
        if (!log.morning.tasks) {
            log.morning.tasks = [];
        }
        log.morning.tasks.push(task);
        this.save(data);
    },

    /**
     * Update a task
     * @param {Object} data - App data
     * @param {string} taskId - Task ID
     * @param {Object} updates - Fields to update
     */
    updateTask(data, taskId, updates) {
        const log = this.getTodayLog(data);
        if (log.morning && log.morning.tasks) {
            const taskIndex = log.morning.tasks.findIndex(t => t.id === taskId);
            if (taskIndex > -1) {
                log.morning.tasks[taskIndex] = { ...log.morning.tasks[taskIndex], ...updates };
                this.save(data);
            }
        }
    },

    /**
     * Delete a task
     * @param {Object} data - App data
     * @param {string} taskId - Task ID
     */
    deleteTask(data, taskId) {
        const log = this.getTodayLog(data);
        if (log.morning && log.morning.tasks) {
            log.morning.tasks = log.morning.tasks.filter(t => t.id !== taskId);
            this.save(data);
        }
    },

    /**
     * Toggle task status
     * @param {Object} data - App data
     * @param {string} taskId - Task ID
     */
    toggleTaskStatus(data, taskId) {
        const log = this.getTodayLog(data);
        if (log.morning && log.morning.tasks) {
            const task = log.morning.tasks.find(t => t.id === taskId);
            if (task) {
                // Cycle: pending -> in-progress -> completed -> pending
                const statusCycle = ['pending', 'in-progress', 'completed'];
                const currentIndex = statusCycle.indexOf(task.status);
                task.status = statusCycle[(currentIndex + 1) % statusCycle.length];
                this.save(data);
            }
        }
    },

    /**
     * Add an event
     * @param {Object} data - App data
     * @param {Object} event - Event object
     */
    addEvent(data, event) {
        data.events.push(event);
        this.save(data);
    },

    /**
     * Update an event
     * @param {Object} data - App data
     * @param {number} index - Event index
     * @param {Object} eventData - Updated event data
     */
    updateEvent(data, index, eventData) {
        if (data.events[index]) {
            data.events[index] = eventData;
            this.save(data);
        }
    },

    /**
     * Delete an event
     * @param {Object} data - App data
     * @param {number} index - Event index
     */
    deleteEvent(data, index) {
        data.events.splice(index, 1);
        this.save(data);
    },

    /**
     * Export data as JSON file
     * @param {Object} data - App data
     */
    exportData(data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `king_daily_backup_${this.getToday()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        Utils.showToast('Backup exported successfully.', 'gold');
    },

    /**
     * Import data from JSON file
     * @param {File} file - The JSON file
     * @param {Function} callback - Callback on success
     */
    importData(file, callback) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.logs && imported.events !== undefined) {
                    this.save(imported);
                    Utils.showToast('Data restored successfully!', 'gold');
                    if (callback) callback(imported);
                } else {
                    throw new Error('Invalid format');
                }
            } catch (err) {
                Utils.showToast('Invalid backup file format.', 'danger');
            }
        };
        reader.readAsText(file);
    },

    /**
     * Calculate analytics from stored data
     * @param {Object} data - App data
     * @returns {Object} Analytics summary
     */
    getAnalytics(data) {
        const logs = Object.entries(data.logs);
        const totalDays = logs.length;

        let morningCount = 0;
        let eveningCount = 0;
        let totalTasks = 0;
        let completedTasks = 0;
        let totalHours = 0;
        let hoursCount = 0;

        const categoryHours = {};

        logs.forEach(([date, log]) => {
            if (log.morning) {
                morningCount++;

                if (log.morning.tasks) {
                    log.morning.tasks.forEach(task => {
                        totalTasks++;
                        if (task.status === 'completed') {
                            completedTasks++;
                        }
                        if (task.estimatedTime) {
                            const hours = parseFloat(task.estimatedTime);
                            if (!isNaN(hours)) {
                                totalHours += hours;
                                hoursCount++;

                                const cat = task.category || 'Uncategorized';
                                categoryHours[cat] = (categoryHours[cat] || 0) + hours;
                            }
                        }
                    });
                }
            }
            if (log.evening) {
                eveningCount++;
            }
        });

        return {
            totalDays,
            morningCount,
            eveningCount,
            totalTasks,
            completedTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            avgHours: hoursCount > 0 ? (totalHours / hoursCount).toFixed(1) : 0,
            totalHours: totalHours.toFixed(1),
            categoryHours
        };
    },

    /**
     * Get last 7 days of task data
     * @param {Object} data - App data
     * @returns {Array} Array of daily stats
     */
    getLast7Days(data) {
        const stats = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const iso = d.toISOString().split('T')[0];
            const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

            const log = data.logs[iso];
            let hours = 0;
            let completed = 0;
            let total = 0;

            if (log && log.morning && log.morning.tasks) {
                log.morning.tasks.forEach(task => {
                    total++;
                    if (task.status === 'completed') completed++;
                    if (task.estimatedTime) {
                        hours += parseFloat(task.estimatedTime) || 0;
                    }
                });
            }

            stats.push({
                date: iso,
                label: dayLabel,
                hours,
                completed,
                total
            });
        }

        return stats;
    },

    // ==========================================
    // LEARNING MODULE FUNCTIONS
    // ==========================================

    /**
     * Get a random wisdom quote
     * @returns {Object} Quote object with text and author
     */
    getRandomQuote() {
        return this.WISDOM_QUOTES[Math.floor(Math.random() * this.WISDOM_QUOTES.length)];
    },

    /**
     * Ensure learning data structure exists
     * @param {Object} data - App data
     */
    ensureLearningData(data) {
        if (!data.learning) {
            data.learning = {
                courses: [],
                streak: 0,
                lastLogDate: null,
                activityLog: {}
            };
        }
        // Ensure courses have logs array
        data.learning.courses.forEach(c => {
            if (!c.logs) c.logs = [];
        });
    },

    /**
     * Add a new course
     * @param {Object} data - App data
     * @param {Object} course - Course data
     */
    addCourse(data, course) {
        this.ensureLearningData(data);
        const newCourse = {
            id: Date.now(),
            title: course.title,
            platform: course.platform || 'Self-Study',
            duration: course.duration || null,
            dailyGoal: parseInt(course.dailyGoal) || 60,
            endDate: course.endDate || null,
            pledge: course.pledge || '',
            status: 'active',
            startDate: new Date().toISOString(),
            logs: [],
            certificate: null
        };
        data.learning.courses.unshift(newCourse);
        this.save(data);
        return newCourse;
    },

    /**
     * Get a course by ID
     * @param {Object} data - App data
     * @param {number} courseId - Course ID
     */
    getCourse(data, courseId) {
        this.ensureLearningData(data);
        return data.learning.courses.find(c => c.id === parseInt(courseId));
    },

    /**
     * Update a course
     * @param {Object} data - App data
     * @param {number} courseId - Course ID
     * @param {Object} updates - Fields to update
     */
    updateCourse(data, courseId, updates) {
        const course = this.getCourse(data, courseId);
        if (course) {
            Object.assign(course, updates);
            this.save(data);
        }
    },

    /**
     * Delete a course
     * @param {Object} data - App data
     * @param {number} courseId - Course ID
     */
    deleteCourse(data, courseId) {
        this.ensureLearningData(data);
        data.learning.courses = data.learning.courses.filter(c => c.id !== parseInt(courseId));
        this.save(data);
    },

    /**
     * Add a learning log entry to a course
     * @param {Object} data - App data
     * @param {number} courseId - Course ID
     * @param {Object} log - Log entry data
     */
    addLearningLog(data, courseId, log) {
        const course = this.getCourse(data, courseId);
        if (course) {
            const newLog = {
                id: Date.now(),
                date: new Date().toISOString(),
                learned: log.learned,
                challenge: log.challenge || '',
                solution: log.solution || '',
                timeSpent: parseInt(log.timeSpent) || 60,
                milestone: log.milestone || false
            };
            if (!course.logs) course.logs = [];
            course.logs.unshift(newLog);

            // Update activity log for heatmap
            const today = this.getToday();
            if (!data.learning.activityLog) data.learning.activityLog = {};
            data.learning.activityLog[today] = (data.learning.activityLog[today] || 0) + newLog.timeSpent;

            // Update streak
            this.updateLearningStreak(data);

            this.save(data);
        }
    },

    /**
     * Update learning streak
     * @param {Object} data - App data
     */
    updateLearningStreak(data) {
        this.ensureLearningData(data);
        const today = this.getToday();

        if (data.learning.lastLogDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (data.learning.lastLogDate === yesterdayStr) {
                data.learning.streak++;
            } else {
                data.learning.streak = 1;
            }
            data.learning.lastLogDate = today;
        }
    },

    /**
     * Check and reset streak if broken
     * @param {Object} data - App data
     */
    checkLearningStreakIntegrity(data) {
        this.ensureLearningData(data);
        if (!data.learning.lastLogDate) return;

        const today = this.getToday();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (data.learning.lastLogDate !== today && data.learning.lastLogDate !== yesterdayStr) {
            data.learning.streak = 0;
            this.save(data);
        }
    },

    /**
     * Get activity heatmap data (last 12 weeks)
     * @param {Object} data - App data
     * @returns {Array} Array of { date, minutes, level }
     */
    getActivityHeatmap(data) {
        this.ensureLearningData(data);
        const heatmapData = [];
        const today = new Date();
        const numDays = 84; // 12 weeks

        for (let i = numDays - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const isoDate = d.toISOString().split('T')[0];
            const minutes = data.learning.activityLog[isoDate] || 0;

            // Determine intensity level (0-4)
            let level = 0;
            if (minutes > 0) level = 1;
            if (minutes >= 30) level = 2;
            if (minutes >= 60) level = 3;
            if (minutes >= 120) level = 4;

            heatmapData.push({
                date: isoDate,
                dayOfWeek: d.getDay(),
                minutes,
                level
            });
        }

        return heatmapData;
    },

    /**
     * Get learning analytics
     * @param {Object} data - App data
     * @returns {Object} Learning stats
     */
    getLearningAnalytics(data) {
        this.ensureLearningData(data);
        const courses = data.learning.courses;

        const activeCourses = courses.filter(c => c.status === 'active');
        const completedCourses = courses.filter(c => c.status === 'completed');

        let totalMinutes = 0;
        let totalLogs = 0;
        const platformMinutes = {};

        courses.forEach(course => {
            const courseMinutes = (course.logs || []).reduce((sum, log) => sum + log.timeSpent, 0);
            totalMinutes += courseMinutes;
            totalLogs += (course.logs || []).length;

            const platform = course.platform || 'Other';
            platformMinutes[platform] = (platformMinutes[platform] || 0) + courseMinutes;
        });

        // Last 7 days activity
        const last7Days = [];
        const last7DaysLabels = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const isoDate = d.toISOString().split('T')[0];
            const minutes = data.learning.activityLog[isoDate] || 0;

            last7Days.push(minutes);
            last7DaysLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        }

        return {
            activeCourses: activeCourses.length,
            completedCourses: completedCourses.length,
            totalCourses: courses.length,
            totalMinutes,
            totalHours: (totalMinutes / 60).toFixed(1),
            totalLogs,
            streak: data.learning.streak,
            platformMinutes,
            last7Days,
            last7DaysLabels
        };
    },

    /**
     * Complete a course
     * @param {Object} data - App data
     * @param {number} courseId - Course ID
     */
    completeCourse(data, courseId) {
        const course = this.getCourse(data, courseId);
        if (course) {
            course.status = 'completed';
            course.completedDate = new Date().toISOString();
            this.save(data);
        }
    },

    /**
     * Save certificate to course
     * @param {Object} data - App data
     * @param {number} courseId - Course ID
     * @param {string} certificateData - Base64 certificate data
     */
    saveCertificate(data, courseId, certificateData) {
        const course = this.getCourse(data, courseId);
        if (course) {
            course.certificate = certificateData;
            this.save(data);
        }
    },

    /**
     * Remove certificate from course
     * @param {Object} data - App data
     * @param {number} courseId - Course ID
     */
    removeCertificate(data, courseId) {
        const course = this.getCourse(data, courseId);
        if (course) {
            course.certificate = null;
            this.save(data);
        }
    },

    /**
     * Calculate course progress
     * @param {Object} course - Course object
     * @returns {Object} { percentage, hoursSpent, daysLeft, isOnTrack }
     */
    getCourseProgress(course) {
        if (!course) return { percentage: 0, hoursSpent: 0, daysLeft: null, isOnTrack: true };

        const logs = course.logs || [];
        const totalMinutes = logs.reduce((sum, log) => sum + (log.timeSpent || 0), 0);
        const hoursSpent = totalMinutes / 60;

        // If completed, 100%
        if (course.status === 'completed') {
            return { percentage: 100, hoursSpent, daysLeft: 0, isOnTrack: true };
        }

        // Calculate progress based on duration goal
        let percentage = 0;
        if (course.duration) {
            // Parse duration (e.g., "40 hours", "20h", "3 weeks")
            const durationMatch = course.duration.match(/(\d+)\s*(hours?|h|weeks?|w|days?|d)?/i);
            if (durationMatch) {
                let targetHours = parseInt(durationMatch[1]);
                const unit = (durationMatch[2] || 'h').toLowerCase();

                if (unit.startsWith('w')) targetHours *= 40; // weeks
                else if (unit.startsWith('d')) targetHours *= 2; // days (2h/day estimate)

                percentage = Math.min(100, Math.round((hoursSpent / targetHours) * 100));
            }
        } else if (logs.length > 0) {
            // No duration set - use log count as rough estimate
            percentage = Math.min(95, logs.length * 5);
        }

        // Days left calculation
        let daysLeft = null;
        let isOnTrack = true;
        if (course.endDate) {
            const endDate = new Date(course.endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

            // Check if on track (should be X% done based on time elapsed)
            if (course.startDate) {
                const startDate = new Date(course.startDate);
                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                const elapsedDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
                const expectedProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
                isOnTrack = percentage >= expectedProgress - 10; // 10% buffer
            }
        }

        return { percentage, hoursSpent: hoursSpent.toFixed(1), daysLeft, isOnTrack };
    },

    /**
     * Search and filter courses
     * @param {Object} data - App data
     * @param {Object} filters - { query, status, platform, sortBy }
     * @returns {Array} Filtered courses
     */
    searchCourses(data, filters = {}) {
        this.ensureLearningData(data);
        let courses = [...data.learning.courses];

        // Text search
        if (filters.query && filters.query.trim()) {
            const q = filters.query.toLowerCase().trim();
            courses = courses.filter(c =>
                c.title.toLowerCase().includes(q) ||
                (c.platform || '').toLowerCase().includes(q) ||
                (c.pledge || '').toLowerCase().includes(q)
            );
        }

        // Status filter
        if (filters.status && filters.status !== 'all') {
            courses = courses.filter(c => c.status === filters.status);
        }

        // Platform filter
        if (filters.platform && filters.platform !== 'all') {
            courses = courses.filter(c => c.platform === filters.platform);
        }

        // Sorting
        if (filters.sortBy) {
            switch (filters.sortBy) {
                case 'name':
                    courses.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'progress':
                    courses.sort((a, b) => {
                        const progA = this.getCourseProgress(a).percentage;
                        const progB = this.getCourseProgress(b).percentage;
                        return progB - progA;
                    });
                    break;
                case 'recent':
                    courses.sort((a, b) => {
                        const aDate = a.logs?.[0]?.date || a.startDate || 0;
                        const bDate = b.logs?.[0]?.date || b.startDate || 0;
                        return new Date(bDate) - new Date(aDate);
                    });
                    break;
                case 'oldest':
                    courses.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                    break;
            }
        }

        return courses;
    },

    /**
     * Get unique platforms from courses
     * @param {Object} data - App data
     * @returns {Array} List of platforms
     */
    getUniquePlatforms(data) {
        this.ensureLearningData(data);
        const platforms = new Set();
        data.learning.courses.forEach(c => {
            if (c.platform) platforms.add(c.platform);
        });
        return Array.from(platforms).sort();
    },

    // ==========================================
    // STREAK MANAGEMENT
    // ==========================================

    /**
     * Get current streak data
     * @returns {Object} Streak info { current, longest, lastDate }
     */
    getStreak() {
        const stored = localStorage.getItem('king-daily-streak');
        if (stored) {
            return JSON.parse(stored);
        }
        return { current: 0, longest: 0, lastDate: null };
    },

    /**
     * Update streak based on learning activity
     * @param {Object} data - App data
     */
    updateStreak(data) {
        const streak = this.getStreak();
        const today = this.getToday();

        // Check if user has done learning today
        this.ensureLearningData(data);
        let hasLearningToday = false;

        data.learning.courses.forEach(course => {
            if (course.logs) {
                course.logs.forEach(log => {
                    if (log.date === today) {
                        hasLearningToday = true;
                    }
                });
            }
        });

        if (hasLearningToday) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (streak.lastDate === today) {
                // Already counted today
                return streak;
            } else if (streak.lastDate === yesterdayStr) {
                // Consecutive day
                streak.current++;
            } else {
                // Streak broken, start new
                streak.current = 1;
            }

            streak.lastDate = today;
            if (streak.current > streak.longest) {
                streak.longest = streak.current;
            }

            localStorage.setItem('king-daily-streak', JSON.stringify(streak));

            // Add notification for milestones
            if ([7, 14, 30, 50, 100].includes(streak.current)) {
                this.addNotification({
                    type: 'streak',
                    title: `🔥 ${streak.current} Day Streak!`,
                    message: streak.current >= 30 ? "You're on fire! Keep up the amazing consistency!" : "Great job maintaining your learning streak!"
                });
            }
        }

        return streak;
    },

    // ==========================================
    // NOTIFICATIONS MANAGEMENT
    // ==========================================

    /**
     * Get all notifications
     * @returns {Array} List of notifications
     */
    getNotifications() {
        const stored = localStorage.getItem('king-daily-notifications');
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    },

    /**
     * Add a new notification
     * @param {Object} notification - { type, title, message }
     */
    addNotification(notification) {
        const notifications = this.getNotifications();
        notifications.unshift({
            id: Date.now().toString(),
            ...notification,
            read: false,
            createdAt: new Date().toISOString()
        });
        // Keep only last 50 notifications
        if (notifications.length > 50) {
            notifications.pop();
        }
        localStorage.setItem('king-daily-notifications', JSON.stringify(notifications));
        this.updateNotificationBadge();
    },

    /**
     * Mark notification as read
     * @param {string} id - Notification ID
     */
    markNotificationRead(id) {
        const notifications = this.getNotifications();
        const notification = notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            localStorage.setItem('king-daily-notifications', JSON.stringify(notifications));
            this.updateNotificationBadge();
        }
    },

    /**
     * Clear all notifications
     */
    clearNotifications() {
        const notifications = this.getNotifications();
        notifications.forEach(n => n.read = true);
        localStorage.setItem('king-daily-notifications', JSON.stringify(notifications));
        this.updateNotificationBadge();
    },

    /**
     * Update notification badge visibility
     */
    updateNotificationBadge() {
        const notifications = this.getNotifications();
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        const btn = document.getElementById('notifications-btn');

        if (badge) {
            badge.classList.toggle('hidden', unreadCount === 0);
        }
        if (btn) {
            btn.classList.remove('hidden');
        }
    },

    // ==========================================
    // SETTINGS MANAGEMENT
    // ==========================================

    /**
     * Get app settings
     * @returns {Object} Settings
     */
    getSettings() {
        const stored = localStorage.getItem('king-daily-settings');
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            theme: 'dark',
            notifications: {
                streakReminders: true,
                morningReminder: true,
                eveningReminder: true
            }
        };
    },

    /**
     * Save settings
     * @param {Object} settings - Settings object
     */
    saveSettings(settings) {
        localStorage.setItem('king-daily-settings', JSON.stringify(settings));
    },

    /**
     * Update a specific setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     */
    updateSetting(key, value) {
        const settings = this.getSettings();
        if (key.includes('.')) {
            const [parent, child] = key.split('.');
            if (!settings[parent]) settings[parent] = {};
            settings[parent][child] = value;
        } else {
            settings[key] = value;
        }
        this.saveSettings(settings);
        return settings;
    },

    // ==========================================
    // IDEAS MANAGEMENT
    // ==========================================

    /**
     * Get all ideas
     * @returns {Array} List of ideas
     */
    getIdeas() {
        const stored = localStorage.getItem('king-daily-ideas');
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    },

    /**
     * Add a new idea
     * @param {Object} idea - Idea object
     */
    addIdea(idea) {
        const ideas = this.getIdeas();
        ideas.unshift({
            id: Date.now(),
            ...idea,
            status: 'pending',
            createdAt: new Date().toISOString(),
            completedAt: null
        });
        localStorage.setItem('king-daily-ideas', JSON.stringify(ideas));
        return ideas[0];
    },

    /**
     * Update idea status
     * @param {number} id - Idea ID
     * @param {string} status - New status
     */
    updateIdeaStatus(id, status) {
        const ideas = this.getIdeas();
        const idea = ideas.find(i => i.id === id);
        if (idea) {
            idea.status = status;
            if (status === 'completed') {
                idea.completedAt = new Date().toISOString();
            }
            localStorage.setItem('king-daily-ideas', JSON.stringify(ideas));
        }
    },

    /**
     * Filter ideas by status
     * @param {string} status - Status to filter
     * @returns {Array} Filtered ideas
     */
    filterIdeasByStatus(status) {
        return this.getIdeas().filter(i => i.status === status);
    },

    // ==========================================
    // DAILY GOODS MANAGEMENT
    // ==========================================

    /**
     * Get all daily goods
     * @returns {Array} List of daily goods
     */
    getDailyGoods() {
        const stored = localStorage.getItem('king-daily-goods');
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    },

    /**
     * Add a new daily good
     * @param {Object} good - Good moment object
     */
    addDailyGood(good) {
        const goods = this.getDailyGoods();
        goods.unshift({
            id: Date.now(),
            ...good,
            date: new Date().toISOString()
        });
        localStorage.setItem('king-daily-goods', JSON.stringify(goods));
        return goods[0];
    },

    /**
     * Get daily goods by date
     * @param {string} date - Date string
     * @returns {Array} Goods from that date
     */
    getDailyGoodsByDate(date) {
        return this.getDailyGoods().filter(g => g.date.split('T')[0] === date);
    },

    // ==========================================
    // DAILY LESSONS MANAGEMENT
    // ==========================================

    /**
     * Get all lessons
     * @returns {Array} List of lessons
     */
    getLessons() {
        const stored = localStorage.getItem('king-daily-lessons');
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    },

    /**
     * Add a new lesson
     * @param {Object} lesson - Lesson object
     */
    addLesson(lesson) {
        const lessons = this.getLessons();
        lessons.unshift({
            id: Date.now(),
            ...lesson,
            date: new Date().toISOString()
        });
        localStorage.setItem('king-daily-lessons', JSON.stringify(lessons));
        return lessons[0];
    },

    /**
     * Search lessons by query
     * @param {string} query - Search query
     * @returns {Array} Matching lessons
     */
    searchLessons(query) {
        const q = query.toLowerCase();
        return this.getLessons().filter(l =>
            l.content.toLowerCase().includes(q) ||
            (l.tags && l.tags.some(t => t.toLowerCase().includes(q)))
        );
    }
};

// Make available globally
window.Storage = Storage;
