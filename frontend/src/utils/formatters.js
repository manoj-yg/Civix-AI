export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  
  try {
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
    return `${formatted} IST`;
  } catch (e) {
    return d.toLocaleString('en-IN') + ' IST';
  }
};

export const formatCoords = (lat, lng) => {
  if (lat === undefined || lng === undefined || lat === null || lng === null) return 'N/A';
  return `${Number(lat).toFixed(5)}° N, ${Number(lng).toFixed(5)}° E`;
};

export const formatAddress = (address, lat, lng) => {
  if (address && !address.startsWith('GPS:')) return address;
  if (lat && lng) return `Road Corridor at (${Number(lat).toFixed(5)}° N, ${Number(lng).toFixed(5)}° E), Bengaluru Urban`;
  return 'Bengaluru Urban Corridor, Karnataka';
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
