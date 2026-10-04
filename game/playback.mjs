// Shared presentation timing only. Combat is resolved once by the pure engine.
export const TURN_TIMING = Object.freeze({ player: 0, actionDuration: 700, bossDamage: 750,
  enemy: 1700, heroDamage: 2450, popupDuration: 850, finish: 3400, victoryFinish: 1700,
  knightDuration: 2200 });
export function turnPlayback(state) {
  const event = state.recent[0];
  if (!event || event.action === 'restart' || event.revision !== state.revision) return null;
  const enemyActs = state.status !== 'victory';
  const enemyDuration = enemyActs && event.enemyAction === 'attack' ? TURN_TIMING.knightDuration : TURN_TIMING.actionDuration;
  const heroDamageAt = TURN_TIMING.heroDamage + enemyDuration - TURN_TIMING.actionDuration;
  return { event, enemyActs, enemyDuration, heroDamageAt,
    duration: enemyActs ? heroDamageAt + TURN_TIMING.popupDuration + 100 : TURN_TIMING.victoryFinish,
    playerPose: { attack: 'attacking', ultimate: 'ultimate', guard: 'guarding', charge: 'charged' }[event.action],
    enemyPose: event.enemyAction };
}
