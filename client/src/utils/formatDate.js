// Simple date formatting utility
export const formatDate = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const messageDate = new Date(date);
  const diffInMs = now - messageDate;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;

  // Less than 1 hour
  if (diffInHours < 1) {
    const minutes = Math.floor(diffInMs / (1000 * 60));
    return minutes < 1 ? 'Just now' : `${minutes}m ago`;
  }

  // Less than 24 hours
  if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  }

  // Less than 7 days
  if (diffInDays < 7) {
    return `${Math.floor(diffInDays)}d ago`;
  }

  // More than 7 days - show full date
  return messageDate.toLocaleDateString();
};

export const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const formatFullDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};