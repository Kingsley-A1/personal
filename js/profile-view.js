/**
 * REIGN - Profile View
 * Royal profile page with view/edit modes
 */

// Define global function for rendering profile
window.renderProfileView = function (container, data) {
    const user = Auth.getUser();

    if (!user) {
        window.location.href = '../auth.html';
        return;
    }

    const streak = data.learning?.streak || 0;
    const totalEntries = Object.keys(data.logs || {}).length;
    const createdDate = new Date(user.createdAt || Date.now());
    const accountAge = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const role = localStorage.getItem('reign_persona') || 'king';

    container.innerHTML = `
        <div class="profile-container">
            <!-- Profile Header -->
            <div class="profile-header-section">
                <div class="profile-avatar-wrapper">
                    <div class="profile-avatar-large" id="profile-avatar-container">
                        ${user.avatar
            ? `<img src="${user.avatar}" alt="${Utils.sanitize(user.name)}" class="profile-avatar-img">`
            : `<div class="profile-avatar-initials-large">${Auth.getInitials()}</div>`
        }
                    </div>
                    <button class="avatar-edit-btn" onclick="app.openAvatarUpload()" title="Change Avatar">
                        <i class="ph-bold ph-camera"></i>
                    </button>
                </div>
                
                <h1 class="profile-name">${Utils.sanitize(user.name)}</h1>
                <span class="role-badge ${role}">${role === 'queen' ? '👸 Queen' : '🤴 King'}</span>
                <p class="profile-email">${Utils.sanitize(user.email)}</p>
            </div>

            <!-- Profile Stats -->
            <div class="profile-stats-grid">
                <div class="profile-stat-card">
                    <i class="ph-fill ph-fire"></i>
                    <div class="stat-info">
                        <span class="stat-value">${streak}</span>
                        <span class="stat-label">Day Streak</span>
                    </div>
                </div>
                <div class="profile-stat-card">
                    <i class="ph-fill ph-book-bookmark"></i>
                    <div class="stat-info">
                        <span class="stat-value">${totalEntries}</span>
                        <span class="stat-label">Total Entries</span>
                    </div>
                </div>
                <div class="profile-stat-card">
                    <i class="ph-fill ph-calendar"></i>
                    <div class="stat-info">
                        <span class="stat-value">${accountAge}</span>
                        <span class="stat-label">Days in Reign</span>
                    </div>
                </div>
            </div>

            <!-- Profile Information -->
            <div class="profile-section">
                <div class="section-header">
                    <h3>Personal Information</h3>
                    <button class="btn-outline-sm" id="toggle-edit-btn" onclick="app.toggleProfileEdit()">
                        <i class="ph-bold ph-pencil-simple"></i>
                        Edit Profile
                    </button>
                </div>

                <!-- View Mode -->
                <div id="profile-view-mode" class="profile-info-card">
                    <div class="info-row">
                        <span class="info-label">
                            <i class="ph-duotone ph-user"></i>
                            Full Name
                        </span>
                        <span class="info-value">${Utils.sanitize(user.name)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">
                            <i class="ph-duotone ph-envelope"></i>
                            Email
                        </span>
                        <span class="info-value">${Utils.sanitize(user.email)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">
                            <i class="ph-duotone ph-crown"></i>
                            Role
                        </span>
                        <span class="info-value">${role === 'queen' ? 'Queen' : 'King'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">
                            <i class="ph-duotone ph-calendar-check"></i>
                            Member Since
                        </span>
                        <span class="info-value">${Utils.formatDate(createdDate)}</span>
                    </div>
                </div>

                <!-- Edit Mode -->
                <div id="profile-edit-mode" class="profile-info-card hidden">
                    <form id="profile-edit-form" onsubmit="app.saveProfileChanges(event)">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="ph-duotone ph-user"></i>
                                Full Name
                            </label>
                            <input type="text" name="name" class="form-input" value="${Utils.sanitize(user.name)}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="ph-duotone ph-envelope"></i>
                                Email
                            </label>
                            <input type="email" name="email" class="form-input" value="${Utils.sanitize(user.email)}" required>
                            <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.25rem; display: block;">Changing email requires verification</small>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="app.cancelProfileEdit()">
                                <i class="ph-bold ph-x"></i>
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="ph-bold ph-check"></i>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="profile-section danger-zone">
                <h3 style="color: var(--danger);">
                    <i class="ph-bold ph-warning"></i>
                    Danger Zone
                </h3>
                <div class="profile-info-card">
                    <div class="danger-action">
                        <div>
                            <h4>Remove Avatar</h4>
                            <p>Delete your profile picture</p>
                        </div>
                        <button class="btn-danger-sm" onclick="app.confirmRemoveAvatar()" ${!user.avatar ? 'disabled' : ''}>
                            Remove
                        </button>
                    </div>
                    <div class="danger-action">
                        <div>
                            <h4>Logout</h4>
                            <p>Sign out from your account</p>
                        </div>
                        <button class="btn-danger-sm" onclick="Auth.logout()">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};
