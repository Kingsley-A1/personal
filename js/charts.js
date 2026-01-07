/**
 * King Daily - Charts Module
 * Chart.js configurations and analytics visualizations
 */

const Charts = {
    instances: {},

    /**
     * Get theme-aware gold color
     * @returns {string} Gold color based on current theme
     */
    getGoldColor() {
        return document.body.classList.contains('queen-theme') ? '#b76e79' : '#D4AF37';
    },

    /**
     * Get theme-aware gold RGBA
     * @param {number} opacity - Opacity value 0-1
     * @returns {string} RGBA color
     */
    getGoldRGBA(opacity = 0.1) {
        return document.body.classList.contains('queen-theme') 
            ? `rgba(183, 110, 121, ${opacity})` 
            : `rgba(212, 175, 55, ${opacity})`;
    },

    /**
     * Initialize Chart.js defaults
     */
    init() {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = '#334155';
        Chart.defaults.font.family = "'Manrope', sans-serif";
    },

    /**
     * Destroy all chart instances
     */
    destroyAll() {
        Object.keys(this.instances).forEach(key => {
            if (this.instances[key]) {
                this.instances[key].destroy();
                this.instances[key] = null;
            }
        });
    },

    /**
     * Create Focus Intensity Line Chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} data - Array of daily stats
     */
    createFocusChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const labels = data.map(d => d.label);
        const hours = data.map(d => d.hours);

        const goldColor = this.getGoldColor();
        const goldBg = this.getGoldRGBA(0.1);

        this.instances.focus = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Planned Hours',
                    data: hours,
                    borderColor: goldColor,
                    backgroundColor: goldBg,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: goldColor,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: goldColor,
                        bodyColor: '#e2e8f0',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    },

    /**
     * Create Discipline Ratio Doughnut Chart
     * @param {string} canvasId - Canvas element ID
     * @param {Object} analytics - Analytics data
     */
    createDisciplineChart(canvasId, analytics) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const data = [
            analytics.morningCount,
            analytics.eveningCount,
            Math.max(0, (analytics.totalDays * 2) - analytics.morningCount - analytics.eveningCount)
        ];

        const goldColor = this.getGoldColor();

        this.instances.discipline = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Morning', 'Evening', 'Missed'],
                datasets: [{
                    data,
                    backgroundColor: [goldColor, '#4f46e5', '#1e293b'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#94a3b8',
                            padding: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    }
                }
            }
        });
    },

    /**
     * Create Task Completion Chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} data - Array of daily stats
     */
    createCompletionChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const labels = data.map(d => d.label);
        const completed = data.map(d => d.completed);
        const total = data.map(d => d.total);

        this.instances.completion = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Completed',
                        data: completed,
                        backgroundColor: '#10b981',
                        borderRadius: 4,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Total',
                        data: total,
                        backgroundColor: '#334155',
                        borderRadius: 4,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    },

    /**
     * Create Category Breakdown Horizontal Bar Chart
     * @param {string} canvasId - Canvas element ID
     * @param {Object} categoryHours - Category: Hours mapping
     */
    createCategoryChart(canvasId, categoryHours) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const labels = Object.keys(categoryHours).filter(k => categoryHours[k] > 0);
        const data = labels.map(k => categoryHours[k]);

        const goldColor = this.getGoldColor();
        const colors = [
            goldColor, // Deep Work
            '#10b981', // Strategy
            '#3b82f6', // Meeting
            '#8b5cf6', // Learning
            '#f43f5e', // Health
            '#64748b', // Admin
            '#94a3b8'  // Other
        ];

        this.instances.category = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Hours',
                    data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderRadius: 6,
                    barThickness: 24
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.x} hours planned`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        title: {
                            display: true,
                            text: 'Total Hours',
                            color: '#64748b'
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: '#e2e8f0',
                            font: { weight: 'bold' }
                        }
                    }
                }
            }
        });
    }
};

// Make available globally
window.Charts = Charts;
