import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Notifications = () => {
  const { notifications, dispatch } = useApp();

  const removeNotification = (id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      default:
        return Info;
    }
  };

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-900 border-green-700 text-green-100';
      case 'error':
        return 'bg-red-900 border-red-700 text-red-100';
      case 'warning':
        return 'bg-yellow-900 border-yellow-700 text-yellow-100';
      default:
        return 'bg-blue-900 border-blue-700 text-blue-100';
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-blue-400';
    }
  };

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => {
        const Icon = getNotificationIcon(notification.type);
        const notificationStyles = getNotificationStyles(notification.type);
        const iconColor = getIconColor(notification.type);

        return (
          <div
            key={notification.id}
            className={`${notificationStyles} border rounded-lg p-4 shadow-lg animate-slide-in-right`}
          >
            <div className="flex items-start space-x-3">
              <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium break-words">
                  {notification.message}
                </p>
                {notification.timestamp && (
                  <p className="text-xs opacity-75 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
              
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Auto-dismiss progress bar */}
            <div className="mt-3 h-1 bg-black bg-opacity-20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white bg-opacity-30 rounded-full animate-progress-bar"
                style={{ animationDuration: '5s' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Notifications;
