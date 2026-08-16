export const INFRASTRUCTURE_TYPES = [
  { id: 'road', name: 'Road', icon: 'Milestone', color: 'bg-blue-500', borderColor: 'border-blue-500', text: 'text-blue-600' },
  { id: 'bridge', name: 'Bridge', icon: 'Arch', color: 'bg-purple-500', borderColor: 'border-purple-500', text: 'text-purple-600' },
  { id: 'flyover', name: 'Flyover', icon: 'GitCommit', color: 'bg-indigo-500', borderColor: 'border-indigo-500', text: 'text-indigo-600' },
  { id: 'streetlight', name: 'Streetlight', icon: 'Lamp', color: 'bg-amber-500', borderColor: 'border-amber-500', text: 'text-amber-600' },
  { id: 'footpath', name: 'Footpath', icon: 'Footprints', color: 'bg-emerald-500', borderColor: 'border-emerald-500', text: 'text-emerald-600' },
];

export const getInfraTypeConfig = (type) => {
  const normalized = (type || 'road').toLowerCase();
  return INFRASTRUCTURE_TYPES.find(t => t.id === normalized) || INFRASTRUCTURE_TYPES[0];
};
