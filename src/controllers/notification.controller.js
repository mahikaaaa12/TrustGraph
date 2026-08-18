const NotificationService = require('../services/notification.service');
const { HTTP_STATUS } = require('../constants');

class NotificationController {
  static async getNotifications(req, res, next) {
    try {
      const userId = req.user._id;
      const { limit, unreadOnly } = req.query;

      const result = await NotificationService.getUserNotifications(userId, {
        limit: limit ? parseInt(limit, 10) : 20,
        unreadOnly: unreadOnly === 'true',
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      const updated = await NotificationService.markAsRead(id, userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      const userId = req.user._id;

      await NotificationService.markAllAsRead(userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'All notifications marked as read.',
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = NotificationController;
