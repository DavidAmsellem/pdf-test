/**
 * Formats a date into a relative time string (e.g., "2 hours ago", "3 days ago")
 * @param {Date|string|number} date - The date to format
 * @returns {string} A human-readable relative time string
 */
export const formatRelativeTime = (date) => {
    const now = new Date();
    const timeStamp = new Date(date).getTime();
    const diff = now.getTime() - timeStamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) {
        return 'Just now';
    } else if (minutes < 60) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (hours < 24) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (days < 30) {
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else {
        return new Date(timeStamp).toLocaleDateString();
    }
};
