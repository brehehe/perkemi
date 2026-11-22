export const PANITERA_TIMER_EVENT = '.panitera.match-state.updated';

export function listenForPaniteraTimerState(channel, handler) {
    channel.listen(PANITERA_TIMER_EVENT, handler);

    return () => channel.stopListening(PANITERA_TIMER_EVENT, handler);
}
