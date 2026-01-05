/**
 * King Daily API - Cloudflare R2 Client
 * S3-compatible storage for user data and avatars
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Initialize R2 Client
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});

const BUCKET = process.env.R2_BUCKET_NAME;

/**
 * Upload user data to R2
 * @param {string} userId - User ID
 * @param {Object} data - User data object
 */
async function uploadUserData(userId, data) {
    const key = `users/${userId}/data.json`;
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: JSON.stringify(data),
        ContentType: 'application/json'
    });

    await r2Client.send(command);
    return { success: true, key };
}

/**
 * Download user data from R2
 * @param {string} userId - User ID
 * @returns {Object|null} User data or null if not found
 */
async function downloadUserData(userId) {
    const key = `users/${userId}/data.json`;

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key
        });

        const response = await r2Client.send(command);
        const bodyString = await response.Body.transformToString();
        return JSON.parse(bodyString);
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return null;
        }
        throw error;
    }
}

/**
 * Upload avatar to R2
 * @param {string} userId - User ID
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimeType - Image mime type
 * @returns {string} Avatar URL
 */
async function uploadAvatar(userId, buffer, mimeType) {
    const ext = mimeType.split('/')[1] || 'png';
    const key = `users/${userId}/avatar.${ext}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType
    });

    await r2Client.send(command);

    // Return the key (frontend will construct URL)
    return key;
}

/**
 * Delete user data from R2
 * @param {string} userId - User ID
 */
async function deleteUserData(userId) {
    const keys = [
        `users/${userId}/data.json`,
        `users/${userId}/avatar.png`,
        `users/${userId}/avatar.jpg`,
        `users/${userId}/avatar.webp`
    ];

    for (const key of keys) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: key
            });
            await r2Client.send(command);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    }
}

/**
 * Check if R2 is configured
 */
function isConfigured() {
    return !!(
        process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME
    );
}

module.exports = {
    uploadUserData,
    downloadUserData,
    uploadAvatar,
    deleteUserData,
    isConfigured
};
