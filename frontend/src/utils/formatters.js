export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatCoords = (lat, lng) => {
  if (lat === undefined || lng === undefined || lat === null || lng === null) return 'N/A';
  return `${Number(lat).toFixed(6)}°, ${Number(lng).toFixed(6)}°`;
};

export const formatConfidence = (val) => {
  if (val === undefined || val === null) return '0%';
  const num = Number(val);
  return `${Math.round(num > 1 ? num : num * 100)}%`;
};

export const formatScore = (val) => {
  if (val === undefined || val === null) return '0/100';
  return `${Math.round(Number(val))}/100`;
};
