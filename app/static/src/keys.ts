import {moveSelectedTime, setSelectedTimeToBoundOf, changeSelectedEvent, setSelectedEventFromTime, setSelectedEventFromTimeDelta, addEventFlow, deleteEventFlow, toggleBetweenTimeAndEventMode, addEventAfterFlow, gotoNextContiguousBlockStartEvent, gotoCurrentContiguousBlockStartEvent, gotoCurrentContiguousBlockEndEvent, gotoNextContiguousBlockBound, gotoPreviousContiguousBlockBound, setSelectedEventFromTimeSet, selectedCalendarSwitchFlow, jumpToTimeFromNum, eventSyncFlow, moveWeek, markEventFlow} from "./actions.ts"
import { NoEventsFound } from "./state.ts";
import { IKeySeqParse, IKeyState, IKeybind, IState, IUI } from "./types.ts";
import { MODAL_OPEN } from "./modal.ts";

class Keybind implements IKeybind {
    keyseq: string[];
    action: (state: IState, ui: IUI, num?: number) => void;

    constructor(keyseq: string | string[], action: (state: IState, ui: IUI, num?: number) => void) {
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
    new Keybind("j", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, 0, num * 15)   
        } else if (modecheck_event(state, ui)) {
            changeSelectedEvent(state, ui, state.selected.event, num)
        }
    }),
    new Keybind("k", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, 0, -15 * num)
        } else if (modecheck_event(state, ui)) {
            changeSelectedEvent(state, ui, state.selected.event, -num)
        }
    }),
    new Keybind("h", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, -1 * num, 0, 0)
        } else if (modecheck_event(state, ui)) {
            setSelectedEventFromTimeDelta(state, ui, -1 * num, 0, 0, "center")
        }
    }),
    new Keybind("l", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 1 * num, 0, 0)
        } else if (modecheck_event(state, ui)) {
            setSelectedEventFromTimeDelta(state, ui, 1 * num, 0, 0, "center")
        }
    }),
    new Keybind("w", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, 1 * num, 0)
        } else if (modecheck_event(state, ui)) {
            gotoNextContiguousBlockStartEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("b", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            moveSelectedTime(state, ui, 0, -1 * num, 0)
        } else if (modecheck_event(state, ui)) {
            gotoCurrentContiguousBlockStartEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("e", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            setSelectedTimeToBoundOf(state, ui, "end", "hour")
        } else if (modecheck_event(state, ui)) {
            gotoCurrentContiguousBlockEndEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("}", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            gotoNextContiguousBlockBound(state, ui, state.selected.time)
        } else if (modecheck_event(state, ui)) {
            gotoNextContiguousBlockStartEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("{", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            gotoPreviousContiguousBlockBound(state, ui, state.selected.time)
        } else if (modecheck_event(state, ui)) {
            gotoCurrentContiguousBlockStartEvent(state, ui, state.selected.event)
        }
    }),
    new Keybind("0", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            setSelectedTimeToBoundOf(state, ui, "start", "day")
        } else if (modecheck_event(state, ui)) {
            setSelectedEventFromTimeSet(state, ui, undefined, 0, 0, "after")
        }
    }),
    new Keybind("$", (state, ui, num = 1) => {
        if (modecheck_time(state, ui)) {
            setSelectedTimeToBoundOf(state, ui, "end", "day")
        } else if (modecheck_event(state, ui)) {
            setSelectedEventFromTimeSet(state, ui, undefined, 23, 59, "before")
        }
    }),
    new Keybind("n", (state, ui, num=1) => moveWeek(state, ui, num)),
    new Keybind("p", (state, ui, num=1) => moveWeek(state, ui, -1 * num)),
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
    new Keybind("i", (state, ui, duration_in_minutes = 60) => {
        if (state.selected.time instanceof Date) {
            const oneHourBefore = new Date(state.selected.time.getTime() - duration_in_minutes * 60 * 1000);
            addEventFlow(state, ui, oneHourBefore, state.selected.time);
        }
    }),
    new Keybind("a", (state, ui, duration_in_minutes = 60) => addEventAfterFlow(state, ui, duration_in_minutes)),
    new Keybind("d", (state, ui, num=1) => deleteEventFlow(state, ui, state.selected.event)),
    new Keybind("g", (state, ui, num=9) => jumpToTimeFromNum(state, ui, num)),
    new Keybind("s", (state, ui, quick_switch_idx=-1) => selectedCalendarSwitchFlow(state, ui, quick_switch_idx)),
    new Keybind("S", (state, ui, num=1) => eventSyncFlow(state, ui)),
    new Keybind("m", (state, ui, num=1) => markEventFlow(state, ui, state.selected.event))
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

    parseSeq(seq: string): IKeySeqParse {
        // Takes a sequence of key presses `seq`, and parses it into an IKeySeqParse.
        // Any numbers at the start are interpreted as a number
        // After stripping leading digits, the `keybinds` array is searched for all that match the remaining string.
        
        // Find first number:
        let numberStr = '';
        for (let i = 0; i < seq.length; i++) {
            if (seq[i].match(/[0-9]/)) {
                numberStr += seq[i];
            } else {
                break;
            }
        }

        let number = numberStr ? parseInt(numberStr) : false;
        let remainingSeq = number !== false ? seq.slice(numberStr.length) : seq;

        let valid = keybinds.filter((keybind) => 
            remainingSeq.length === 0 || // Allow all keybinds if only numbers are entered
            (keybind.keyseq.length >= remainingSeq.length && 
             keybind.keyseq.every((c, i) => c === remainingSeq[i]))
        );
        return {
            number: number,
            validKeybinds: valid
        }
    }

    handleKeyPress(event: KeyboardEvent) {
        if (MODAL_OPEN) {
            return;
        }
        var key = event.key;
        this.seq.push(key);
        let parsedSeq = this.parseSeq(this.seq.join(""));
        if (parsedSeq.validKeybinds.length == 1) {
            event.preventDefault()
            if (parsedSeq.number !== false) {
                parsedSeq.validKeybinds[0].action(this.state, this.ui, parsedSeq.number as number);
            } else {
                parsedSeq.validKeybinds[0].action(this.state, this.ui);
            }
            this.seq = [];
        } else if (parsedSeq.validKeybinds.length == 0) {
            this.seq = [];
        }
        this.ui.updateStatusBarKey(this);
    }
}