export function getPhaseInfo(caseData) {
  const status = caseData?.status || "";
  const caseType = caseData?.caseType || "";

  const map = {
    "Pending delivery": {
      currentPhase: "Phase 1",
      nextPhase: "Phase 2",
      nextStatus: "Design",
      requiresUser: caseType === "Physical",
    },
    Design: {
      currentPhase: "Phase 2",
      nextPhase: "Phase 3",
      nextStatus: "Try in",
      requiresUser: true,
    },
    "Try in": {
      currentPhase: "Phase 3",
      nextPhase: "Phase 4",
      nextStatus: "Finalized",
      requiresUser: true,
    },
    Finalized: {
      currentPhase: "Phase 4",
      nextPhase: "Phase 5",
      nextStatus: "Ready to be delivered",
      requiresUser: true,
    },
    "Ready to be delivered": {
      currentPhase: "Phase 5",
      nextPhase: "Phase 6",
      nextStatus: "Ready to Invoice",
      requiresUser: false,
    },
    "Ready to Invoice": {
      currentPhase: "Phase 6",
      nextPhase: null,
      nextStatus: null,
      requiresUser: false,
    },
    Done: {
      currentPhase: "Phase 7",
      nextPhase: null,
      nextStatus: null,
      requiresUser: false,
    },
  };

  return (
    map[status] || {
      currentPhase: "Phase 1",
      nextPhase: "Phase 2",
      nextStatus: "Design",
      requiresUser: false,
    }
  );
}

export function getStatusBadgeColor(status) {
  if (status === "Pending delivery") return "bg-orange-100 text-orange-800";
  if (status === "Design") return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  if (status === "Try in") return "bg-purple-100 text-purple-800";
  if (status === "Finalized") return "bg-green-100 text-green-800";
  return "bg-gray-100 text-gray-800";
}
