import {moveSelectedTime, setSelectedTimeToBoundOf, changeSelectedEvent, setSelectedEventFromTime, setSelectedEventFromTimeDelta, addEventFlow, deleteEventFlow, toggleBetweenTimeAndEventMode, addEventAfterFlow, gotoNextContiguousBlockStartEvent, gotoCurrentContiguousBlockStartEvent, gotoCurrentContiguousBlockEndEvent, gotoNextContiguousBlockBound, gotoPreviousContiguousBlockBound, setSelectedEventFromTimeSet, selectedCalendarSwitchFlow} from "./actions.ts"
import { NoEventsFound } from "./state.ts";
import { IKeyState, IKeybind, IState, IUI } from "./types.ts";
import { MODAL_OPEN } from "./modal.ts";

class Keybind implements IKeybind {
    keyseq: string[];
    action: (state: IState, ui: IUI) => void;

    constructor(keyseq: string | string[], action: (state: IState, ui: IUI) => void) {
        // if keyseq is a string, make it a list of characters:
        if (typeof keyseq === 'string') {
            this.keyseq = keyseq.split('');
        } else {
            this.keyseq = keyseq;
        }
        this.action = action;
    }
}


const modecheck_time = (state: IState, ui: IUI) => state.selected.mode === 'time'
const modecheck_event = (state: IState, ui: IUI) => state.selected.mode === 'event'

let keybinds = [
    new Keybind("j", (state, ui) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, 0, 15)   
        } else if (modecheck_event(state, ui)) {
            changeSelectedEvent(state, ui, state.selected.event, 1)
        }
    }),
    new Keybind("k", (state, ui) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, 0, -15)
        } else if (modecheck_event(state, ui)) {
            changeSelectedEvent(state, ui, state.selected.event, -1)
        }
    }),
    new Keybind("h", (state, ui) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, -1, 0, 0)
        } else if (modecheck_event(state, ui)) {
            setSelectedEventFromTimeDelta(state, ui, -1, 0, 0, "center")
        }
    }),
    new Keybind("l", (state, ui) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 1, 0, 0)
        } else if (modecheck_event(state, ui)) {
            setSelectedEventFromTimeDelta(state, ui, 1, 0, 0, "center")
        }
    }),
    new Keybind("w", (state, ui) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, 1, 0)
        } else if (modecheck_event(state, ui)) {
            gotoNextContiguousBlockStartEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("b", (state, ui) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, -1, 0)
        } else if (modecheck_event(state, ui)) {
            gotoCurrentContiguousBlockStartEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("e", (state, ui) => {
        if (modecheck_time(state, ui)) {
            setSelectedTimeToBoundOf(state, ui, "end", "hour")
        } else if (modecheck_event(state, ui)) {
            gotoCurrentContiguousBlockEndEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("}", (state, ui) => {
        if (modecheck_time(state, ui)) {
            gotoNextContiguousBlockBound(state, ui, state.selected.time)
        } else if (modecheck_event(state, ui)) {
            gotoNextContiguousBlockStartEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("{", (state, ui) => {
        if (modecheck_time(state, ui)) {
            gotoPreviousContiguousBlockBound(state, ui, state.selected.time)
        } else if (modecheck_event(state, ui)) {
            gotoCurrentContiguousBlockStartEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("0", (state, ui) => {
        if (modecheck_time(state, ui)) {
            setSelectedTimeToBoundOf(state, ui, "start", "day")
        } else if (modecheck_event(state, ui)) {
            setSelectedEventFromTimeSet(state, ui, undefined, 0, 0, "after")
        }
    }),
    new Keybind("$", (state, ui) => {
        if (modecheck_time(state, ui)) {
            setSelectedTimeToBoundOf(state, ui, "end", "day")
        } else if (modecheck_event(state, ui)) {
            setSelectedEventFromTimeSet(state, ui, undefined, 23, 59, "before")
        }
    }),
    new Keybind("t", (state, ui) => {
        try {
            toggleBetweenTimeAndEventMode(state, ui)
        } catch (e) {
            if (e instanceof NoEventsFound) {
                alert("Cannot switch to events mode because no events are loaded!")
            }
            // otherwise display error normally:
            console.error(e);
        }
    }),
    new Keybind("i", (state, ui) => {
        if (state.selected.time instanceof Date) {
            const oneHourBefore = new Date(state.selected.time.getTime() - 60 * 60 * 1000);
            addEventFlow(state, ui, oneHourBefore, state.selected.time);
        }
    }),
    new Keybind("a", (state, ui) => addEventAfterFlow(state, ui)),
    new Keybind("d", (state, ui) => deleteEventFlow(state, ui, state.selected.event)),
    new Keybind("g", (state, ui) => selectedCalendarSwitchFlow(state, ui))
]

export class KeyState implements IKeyState {
    seq: string[];
    ui: IUI;
    state: IState;

    constructor(state: IState, ui: IUI) {
        this.seq = [];
        this.ui = ui;
        this.state = state;
    }

    getValid() {
        let valid = keybinds.filter((keybind) => keybind.keyseq.length >= this.seq.length && keybind.keyseq.every((c, i) => c == this.seq[i]));
        return valid;
    }

    handleKeyPress(event: KeyboardEvent) {
        if (MODAL_OPEN) {
            return;
        }
        var key = event.key;
        this.seq.push(key);
        let valid_keybindings = this.getValid();
        if (valid_keybindings.length == 1) {
            event.preventDefault()
            valid_keybindings[0].action(this.state, this.ui);
            this.seq = [];
        } else if (valid_keybindings.length == 0) {
            this.seq = [];
        }
        this.ui.updateStatusBarKey(this);
    }
}