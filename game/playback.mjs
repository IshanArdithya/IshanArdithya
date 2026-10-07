export const TURN_TIMING = Object.freeze({ player: 0, actionDuration: 700, bossDamage: 750,
  enemy: 1700, heroDamage: 2450, popupDuration: 850, finish: 3400, victoryFinish: 1700,
  assaultDuration: 4000, knightDuration: 3400, knightWalkDuration: 2200 });
export function turnPlayback(state) {
  const event = state.recent[0];
  if (!event || event.action === 'restart' || event.revision !== state.revision) return null;
  const enemyActs = state.status !== 'victory';
  const enemyDuration = !enemyActs ? TURN_TIMING.actionDuration
    : event.enemyAction === 'attack' ? TURN_TIMING.knightDuration
    : event.enemyAction === 'cast' ? TURN_TIMING.assaultDuration : TURN_TIMING.actionDuration;
  const heroDamageAt = TURN_TIMING.heroDamage + enemyDuration - TURN_TIMING.actionDuration;
  return { event, enemyActs, enemyDuration, heroDamageAt,
    duration: enemyActs ? heroDamageAt + TURN_TIMING.popupDuration + 100 : TURN_TIMING.victoryFinish,
    playerPose: event.ultimatePhase === 'prepare' ? 'preparing' : { attack: 'attacking', ultimate: 'ultimate', guard: 'guarding', focus: 'charged', charge: 'charged' }[event.action],
    enemyPose: event.enemyAction };
}
