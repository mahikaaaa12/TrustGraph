const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Create a notification record for a user.
   */
  static async createNotification({ userId, type, title, message, severity = 'info', entityId = null }) {
    try {
      return await Notification.create({
        userId,
        type,
        title,
        message,
        severity,
        entityId,
      });
    } catch (err) {
      console.error('[NotificationService] Error creating notification:', err.message);
      return null;
    }
  }

  /**
   * Get user notifications with optional unread filter & pagination.
   */
  static async getUserNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
    const query = { userId };
    if (unreadOnly) query.read = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ userId, read: false });

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read for a user.
   */
  static async markAllAsRead(userId) {
    return await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );
  }
}

module.exports = NotificationService;
