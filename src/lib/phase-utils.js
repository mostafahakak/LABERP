export const WORKFLOW_USER_TYPE = 'Workflow';

export const USER_TYPES = ['Admin', 'Moderator', 'Receptionist', 'Workflow'];

export const WORKFLOW_ROLES = ['Physical', 'Design', 'Production', 'Finishing'];

export const WORKFLOW_ROLE_LABELS = {
  Physical: 'Physical technician',
  Design: 'Designer',
  Production: 'Production technician',
  Finishing: 'Ceramist (Finishing)',
};

const STATUS_ALIASES = {
  'pending delivery': 'Physical',
  physical: 'Physical',
  room1: 'Design',
  design: 'Design',
  production: 'Production',
  'try in': 'Try in order',
  'try in order': 'Try in order',
  'final order': 'Final order',
  finalized: 'Finishing',
  finishing: 'Finishing',
  'try in delivery': 'Try in delivery',
  'back from try in': 'Back from try in',
  'ready to be delivered': 'Ready to be delivered',
  'ready to invoice': 'Ready to get invoice',
  'ready to get invoice': 'Ready to get invoice',
  done: 'Done',
};

export function normalizeCaseStatus(status) {
  const key = String(status || '').trim().toLowerCase();
  return STATUS_ALIASES[key] || status || '';
}

export function isLockedCaseStatus(status) {
  const normalized = normalizeCaseStatus(status);
  return (
    normalized === 'Ready to be delivered' ||
    normalized === 'Ready to get invoice' ||
    normalized === 'Done'
  );
}

export function canEditLockedCase(userType, status) {
  if (!isLockedCaseStatus(status)) return true;
  return userType === 'Admin' || userType === 'Moderator';
}

export function filterUsersForRole(users, role) {
  if (!role) return [];
  const target = String(role).toLowerCase();
  return (users || [])
    .filter((user) => {
      const userRole = String(user.role || '').toLowerCase();
      const userType = String(user.type || '').toLowerCase();
      if (userRole === target) return true;
      if (userType === 'workflow' && userRole === target) return true;
      return false;
    })
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

function info({
  currentPhase,
  currentStatus,
  nextPhase = null,
  nextStatus = null,
  requiresUser = false,
  assignRole = null,
  chooseOrderPath = false,
}) {
  return {
    currentPhase,
    currentStatus,
    nextPhase,
    nextStatus,
    requiresUser,
    assignRole,
    chooseOrderPath,
  };
}

export function getPhaseInfo(caseData, options = {}) {
  const status = normalizeCaseStatus(caseData?.status);
  const orderPath = options.selectedOrderPath || caseData?.orderPath || null;

  switch (status) {
    case 'Physical':
      return info({
        currentPhase: 'P1',
        currentStatus: 'Physical',
        nextPhase: 'P2',
        nextStatus: 'Design',
        requiresUser: true,
        assignRole: 'Design',
      });
    case 'Design':
      return info({
        currentPhase: 'P2',
        currentStatus: 'Design',
        nextPhase: 'P3',
        nextStatus: 'Production',
        requiresUser: true,
        assignRole: 'Production',
      });
    case 'Production':
      if (orderPath === 'Final') {
        return info({
          currentPhase: 'P3',
          currentStatus: 'Production',
          nextPhase: 'P4',
          nextStatus: 'Final order',
          requiresUser: true,
          assignRole: 'Production',
          chooseOrderPath: true,
        });
      }
      if (orderPath === 'Try in') {
        return info({
          currentPhase: 'P3',
          currentStatus: 'Production',
          nextPhase: 'P4',
          nextStatus: 'Try in order',
          requiresUser: true,
          assignRole: 'Production',
          chooseOrderPath: true,
        });
      }
      return info({
        currentPhase: 'P3',
        currentStatus: 'Production',
        chooseOrderPath: true,
      });
    case 'Final order':
      return info({
        currentPhase: 'P4',
        currentStatus: 'Final order',
        nextPhase: 'P5',
        nextStatus: 'Finishing',
        requiresUser: true,
        assignRole: 'Finishing',
      });
    case 'Try in order':
      return info({
        currentPhase: 'P4',
        currentStatus: 'Try in order',
        nextPhase: 'P5',
        nextStatus: 'Try in delivery',
      });
    case 'Finishing':
      return info({
        currentPhase: orderPath === 'Try in' ? 'P7' : 'P5',
        currentStatus: 'Finishing',
        nextPhase: orderPath === 'Try in' ? 'Ready' : 'P6',
        nextStatus: 'Ready to be delivered',
      });
    case 'Try in delivery':
      return info({
        currentPhase: 'P5',
        currentStatus: 'Try in delivery',
        nextPhase: 'P6',
        nextStatus: 'Back from try in',
        requiresUser: true,
        assignRole: 'Finishing',
      });
    case 'Back from try in':
      return info({
        currentPhase: 'P6',
        currentStatus: 'Back from try in',
        nextPhase: 'P7',
        nextStatus: 'Finishing',
        requiresUser: true,
        assignRole: 'Finishing',
      });
    case 'Ready to be delivered':
      return info({
        currentPhase: orderPath === 'Try in' ? 'Ready' : 'P6',
        currentStatus: 'Ready to be delivered',
        nextPhase: orderPath === 'Try in' ? 'Invoice' : 'P7',
        nextStatus: 'Ready to get invoice',
      });
    case 'Ready to get invoice':
      return info({
        currentPhase: 'P7',
        currentStatus: 'Ready to get invoice',
      });
    case 'Done':
      return info({
        currentPhase: 'P7',
        currentStatus: 'Done',
      });
    default:
      return info({
        currentPhase: caseData?.caseType === 'Digital' ? 'P2' : 'P1',
        currentStatus: caseData?.caseType === 'Digital' ? 'Design' : 'Physical',
        nextPhase: caseData?.caseType === 'Digital' ? 'P3' : 'P2',
        nextStatus: caseData?.caseType === 'Digital' ? 'Production' : 'Design',
        requiresUser: true,
        assignRole: caseData?.caseType === 'Digital' ? 'Production' : 'Design',
      });
  }
}

export function getStatusBadgeColor(status) {
  const normalized = normalizeCaseStatus(status);
  if (normalized === 'Physical') return 'bg-orange-100 text-orange-800';
  if (normalized === 'Design') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
  if (normalized === 'Production') return 'bg-violet-100 text-violet-800';
  if (normalized === 'Try in order' || normalized === 'Try in delivery' || normalized === 'Back from try in') {
    return 'bg-purple-100 text-purple-800';
  }
  if (normalized === 'Final order' || normalized === 'Finishing') return 'bg-green-100 text-green-800';
  if (normalized === 'Ready to be delivered') return 'bg-cyan-100 text-cyan-800';
  if (normalized === 'Ready to get invoice') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-800';
}
