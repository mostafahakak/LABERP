export function getPhaseInfo(caseData) {
  const status = caseData?.status || '';
  const caseType = caseData?.caseType || '';

  const map = {
    'Pending delivery': { currentPhase: 'Phase 1', nextPhase: 'Phase 2', nextStatus: 'Room1', requiresUser: caseType === 'Physical' },
    Room1: { currentPhase: 'Phase 2', nextPhase: 'Phase 3', nextStatus: 'Production', requiresUser: true },
    Production: { currentPhase: 'Phase 3', nextPhase: 'Phase 4', nextStatus: 'Finishing', requiresUser: true },
    Finishing: { currentPhase: 'Phase 4', nextPhase: 'Phase 5', nextStatus: 'Ready to be delivered', requiresUser: true },
    'Ready to be delivered': { currentPhase: 'Phase 5', nextPhase: 'Phase 6', nextStatus: 'Ready to get invoice', requiresUser: false },
    'Ready to get invoice': { currentPhase: 'Phase 6', nextPhase: null, nextStatus: null, requiresUser: false },
    Done: { currentPhase: 'Phase 7', nextPhase: null, nextStatus: null, requiresUser: false },
  };

  return map[status] || { currentPhase: 'Phase 1', nextPhase: 'Phase 2', nextStatus: 'Room1', requiresUser: false };
}

export function getStatusBadgeColor(status) {
  if (status === 'Pending delivery') return 'bg-orange-100 text-orange-800';
  if (status === 'Room1') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
}
