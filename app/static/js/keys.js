
import {moveSelectedTime, setSelectedTimeToBoundOf, moveSelectedEvent, setSelectedEventFromTime, setSelectedEventFromTimeDelta, addEventFlow, deleteEventFlow, toggleBetweenTimeAndEventMode, addEventAfterFlow, gotoNextContiguousBlockStartEvent, gotoCurrentContiguousBlockStartEvent, gotoCurrentContiguousBlockEndEvent, gotoNextContiguousBlockBound, gotoPreviousContiguousBlockBound} from "./actions.js"

class Keybind {
    constructor(keyseq, action, modecheck) {
        // if keyseq is a string, make it a list of characters:
        if (typeof keyseq === 'string') {
            this.keyseq = keyseq.split('');
        } else {
            this.keyseq = keyseq;
        }
        this.action = action;
        this.modecheck = modecheck;
    }
}


let modecheck_time = (state, ui) => state.currentMode === 'time'
let modecheck_event = (state, ui) => state.currentMode === 'event'

let keybinds = [
    new Keybind("j", (state, ui) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, 0, 15)   
        } else if (modecheck_event(state, ui)) {
            moveSelectedEvent(state, ui, 1)
        }
    }),
    new Keybind("k", (state, ui) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, 0, -15)
        } else if (modecheck_event(state, ui)) {
            moveSelectedEvent(state, ui, -1)
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
            gotoNextContiguousBlockStartEvent(state, ui, state.selectedEvent)
        }
    }),
    new Keybind("b", (state, ui) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, -1, 0)
        } else if (modecheck_event(state, ui)) {
            gotoCurrentContiguousBlockStartEvent(state, ui, state.selectedEvent)
        }
    }),
    new Keybind("e", (state, ui) => {
        if (modecheck_time(state, ui)) {
            setSelectedTimeToBoundOf(state, ui, "end", "hour")
        } else if (modecheck_event(state, ui)) {
            gotoCurrentContiguousBlockEndEvent(state, ui, state.selectedEvent)
        }
    }),
    new Keybind("}", (state, ui) => {
        if (modecheck_time(state, ui)) {
            gotoNextContiguousBlockBound(state, ui, state.selectedTime)
        } else if (modecheck_event(state, ui)) {
            gotoNextContiguousBlockStartEvent(state, ui, state.selectedEvent)
        }
    }),
    new Keybind("{", (state, ui) => {
        if (modecheck_time(state, ui)) {
            gotoPreviousContiguousBlockBound(state, ui, state.selectedTime)
        } else if (modecheck_event(state, ui)) {
            gotoCurrentContiguousBlockStartEvent(state, ui, state.selectedEvent)
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
    new Keybind("t", (state, ui) => toggleBetweenTimeAndEventMode(state, ui)),
    new Keybind("i", (state, ui) => addEventFlow(state, ui, state.selectedTime - 60 * 60 * 1000, state.selectedTime)),
    new Keybind("a", (state, ui) => addEventAfterFlow(state, ui)),
    new Keybind("d", (state, ui) => deleteEventFlow(state, ui, state.selectedEvent)),
]

export let keystate = {
    seq: [],
    ui: undefined,
    getValid: function() {
        let valid = keybinds.filter((keybind) => keybind.keyseq.length >= this.seq.length && keybind.keyseq.every((c, i) => c == this.seq[i]))
        return valid
    },
    handleKeyPress: function(event) {
        var key = event.key;
        this.seq.push(key);
        let valid_keybindings = this.getValid()
        if (valid_keybindings.length == 1) {
            valid_keybindings[0].action(state, ui)
            this.seq = []
        } else if (valid_keybindings.length == 0) {
            this.seq = []
        }
    }
}

export function initializeKeystate(state, ui) {
    keystate.ui = ui
}

// TODO:
// - keypress ui tooltip