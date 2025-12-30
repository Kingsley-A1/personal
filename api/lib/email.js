/**
 * REIGN API - Email Service Module
 * ============================================
 * Handles email sending for password resets, notifications, etc.
 * Uses Nodemailer with support for multiple transports.
 * 
 * Configuration via environment variables:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - EMAIL_FROM (sender address)
 * 
 * @module lib/email
 */

const nodemailer = require('nodemailer');

// ============================================
// CONFIGURATION
// ============================================

/**
 * Email configuration from environment
 * Falls back to safe defaults for development
 */
const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@reign.app'
};

/**
 * Create the nodemailer transporter
 * Returns null if not configured
 */
function createTransporter() {
    if (!config.host || !config.user || !config.pass) {
        console.warn('⚠️  Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
        return null;
    }

    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass
        }
    });
}

// Create transporter on module load
let transporter = createTransporter();

// ============================================
// EMAIL CHECKING
// ============================================

/**
 * Check if email service is configured and ready
 * @returns {boolean} Whether email can be sent
 */
function isConfigured() {
    return transporter !== null;
}

/**
 * Verify the email connection
 * @returns {Promise<boolean>} Connection status
 */
async function verifyConnection() {
    if (!transporter) return false;

    try {
        await transporter.verify();
        console.log('✅ Email service connected');
        return true;
    } catch (error) {
        console.error('❌ Email service error:', error.message);
        return false;
    }
}

// ============================================
// SEND FUNCTIONS
// ============================================

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @returns {Promise<Object>} Send result
 */
async function sendEmail({ to, subject, text, html }) {
    if (!transporter) {
        // In development without email, log and simulate success
        console.log(`📧 [DEV MODE] Email to ${to}: ${subject}`);
        console.log(`   ${text.substring(0, 100)}...`);
        return {
            success: true,
            messageId: 'dev-mode-' + Date.now(),
            simulated: true
        };
    }

    try {
        const info = await transporter.sendMail({
            from: config.from,
            to,
            subject,
            text,
            html: html || text
        });

        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Email send error:', error.message);
        throw error;
    }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Full URL for reset page
 * @returns {Promise<Object>} Send result
 */
async function sendPasswordResetEmail(to, name, resetToken, resetUrl) {
    const subject = '🔐 Reset Your REIGN Password';

    const text = `
Hello ${name},

You requested a password reset for your REIGN account.

Click this link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, you can safely ignore this email.

Best,
The REIGN Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #1a1a2e, #0f4c75); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; background: #D4AF37; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>👑 REIGN</h1>
    </div>
    <div class="content">
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You requested a password reset for your REIGN account. Click the button below to set a new password:</p>
        
        <a href="${resetUrl}" class="button">Reset Password</a>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${resetUrl}</p>
        
        <div class="warning">
            <strong>⏰ This link expires in 1 hour.</strong>
        </div>
        
        <p>If you didn't request this reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
        <p>© ${new Date().getFullYear()} REIGN. All rights reserved.</p>
        <p>This is an automated message. Please don't reply to this email.</p>
    </div>
</body>
</html>
    `.trim();

    return sendEmail({ to, subject, text, html });
}

/**
 * Send welcome email to new users
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 * @returns {Promise<Object>} Send result
 */
async function sendWelcomeEmail(to, name) {
    const subject = '👑 Welcome to REIGN!';

    const text = `
Welcome to REIGN, ${name}!

Your journey to becoming the ruler of your own life starts now.

Get started by:
1. Setting up your daily tasks
2. Creating your journal entries
3. Tracking your learning goals

Best,
The REIGN Team
    `.trim();

    return sendEmail({ to, subject, text });
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    isConfigured,
    verifyConnection,
    sendEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail
};
