import {createReactiveArray, createReactiveState, initializeSelectedTime, timeConvert} from "./utils.ts"
import {IState, IEventObj} from "./types.ts"

export class NoEventsFound extends Error {
    constructor(message = "No events found") {
        super(message);
        this.name = "NoEventsFound";
    }
}

export class State implements IState {
    selected: {
        mode: string;
        time: Date;
        event: IEventObj | null;
        calendar: string;
    };
    calendarNames: string[];
    uiUpdateTriggers: {
        selectedModeUpdate: (mode: string) => void;
        selectedTimeUpdate: (time: Date) => void;
        selectedEventUpdate: (event: IEventObj | null) => void;
        selectedCalendarUpdate: (calendar: string) => void;
        editedEventsUpdate: (editedEvents: {created: IEventObj[], deleted: IEventObj[], modified: IEventObj[]}) => void;
    };
    events: IEventObj[];
    editedEvents: {
        created: IEventObj[];
        deleted: IEventObj[];
        modified: IEventObj[];
    };

    constructor(time: Date, ) {
        this.events = [];
        this.uiUpdateTriggers = {
            selectedModeUpdate: () => {},
            selectedTimeUpdate: () => {},
            selectedEventUpdate: () => {},
            selectedCalendarUpdate: () => {},
            editedEventsUpdate: () => {}
        };
        this.selected = createReactiveState({
            mode: 'time',
            time: initializeSelectedTime(time),
            event: null,
            calendar: "primary"
        }, (property, value) => {
            switch (property) {
                case "mode":
                    this.uiUpdateTriggers.selectedModeUpdate(value as string);
                    break;
                case "time":
                    this.uiUpdateTriggers.selectedTimeUpdate(value as Date);
                    break;
                case "event":
                    this.uiUpdateTriggers.selectedEventUpdate(value as IEventObj | null);
                    break;
                case "calendar":
                    this.uiUpdateTriggers.selectedCalendarUpdate(value as string);
                    break;
            }
        });
        this.calendarNames = ["primary"];

        this.editedEvents = {
            created: createReactiveArray([], (newArray) => {
                this.uiUpdateTriggers.editedEventsUpdate({...this.editedEvents, created: newArray});
            }),
            deleted: createReactiveArray([], (newArray) => {
                this.uiUpdateTriggers.editedEventsUpdate({...this.editedEvents, deleted: newArray});
            }),
            modified: createReactiveArray([], (newArray) => {
                this.uiUpdateTriggers.editedEventsUpdate({...this.editedEvents, modified: newArray});
            })
        };
    }

    connectUI(selectedModeUpdate: (mode: string) => void, selectedTimeUpdate: (time: Date) => void, selectedEventUpdate: (event: IEventObj | null) => void, selectedCalendarUpdate: (calendar: string) => void, editedEventsUpdate: (editedEvents: {created: IEventObj[], deleted: IEventObj[], modified: IEventObj[]}) => void) {
        this.uiUpdateTriggers.selectedModeUpdate = selectedModeUpdate;
        this.uiUpdateTriggers.selectedTimeUpdate = selectedTimeUpdate;
        this.uiUpdateTriggers.selectedEventUpdate = selectedEventUpdate;
        this.uiUpdateTriggers.selectedCalendarUpdate = selectedCalendarUpdate;
        this.uiUpdateTriggers.editedEventsUpdate = editedEventsUpdate;
    }

    setCalendarNameOptions(calendarNames: string[]) {
        this.calendarNames = calendarNames;
        if (!this.calendarNames.includes("primary")) {
            this.calendarNames.unshift("primary");
        }
    }

    getNextEvent(time: Date | string, on_fail="return_best", comparison = ">") {
        time = timeConvert(time);
        let comparison_fn;
        if (comparison == ">") {
            comparison_fn = (t0: Date, t1: Date) => t0 > t1;
        } else if (comparison == ">=") {
            comparison_fn = (t0: Date, t1: Date) => t0 >= t1;
        } else {
            throw new Error("Invalid comparison: " + comparison);
        }
        for (let i = 0; i < this.events.length; i++) {
            if (comparison_fn(new Date(this.events[i].start), time)) {
                return this.events[i];
            }
        }
        if (on_fail == "return_best") {
            return this.events[this.events.length - 1];
        } else if (on_fail == "return_none") {
            return null;
        } else {
            throw new Error("Invalid on_fail in state.getNextEvent: " + on_fail);
        }
    }

    getPreviousEvent(time : Date | string, on_fail="return_best", comparison = "<") {
        time = timeConvert(time);
        let comparison_fn;
        if (comparison == "<") {
            comparison_fn = (t0: Date, t1: Date) => t0 < t1;
        } else if (comparison == "<=") {
            comparison_fn = (t0: Date, t1: Date) => t0 <= t1;
        } else {
            throw new Error("Invalid comparison: " + comparison);
        }
        for (let i = this.events.length - 1; i >= 0; i--) {
            if (comparison_fn(new Date(this.events[i].end), time)) {
                return this.events[i];
            }
        }
        if (on_fail == "return_best") {
            return this.events[0];
        } else if (on_fail == "return_none") {
            return null;
        } else {
            throw new Error("Invalid on_fail in state.getPreviousEvent: " + on_fail);
        }
    }

    getEventsContaining(time: Date | string) {
        // Returns a list of events containing `time`, sorted in order of start time
        let t = timeConvert(time);
        let eventsContaining = [];
        for (let i = 0; i < this.events.length; i++) {
            if (new Date(this.events[i].start) <= t && new Date(this.events[i].end) >= t) {
                eventsContaining.push(this.events[i]);
            }
        }
        return eventsContaining;
    }

    getEventsOverlappingRange(start: Date | string, end: Date | string) {
        let tstart = timeConvert(start);
        let tend = timeConvert(end);
        return this.events.filter(e => (new Date(e.start) <= tend) && (new Date(e.end) >= tstart));
    }

    getEventsWithinRange(start: Date | string, end: Date | string) {
        let tstart = timeConvert(start);
        let tend = timeConvert(end);
        return this.events.filter(e => (new Date(e.start) >= tstart) && (new Date(e.end) <= tend));
    }

    getClosestEvent(time: Date | string, metric_fn = (event: IEventObj) => event.start) {
        // Gets the event whose center is closest in time to the given time
        // if type is a date, do nothing; if it's a string, convert to a date:
        let t = timeConvert(time);
        let closestEvent = this.events[0];
        let minTimeDiff = Math.abs(new Date(metric_fn(closestEvent)).getTime() - t.getTime());
        for (let i = 1; i < this.events.length; i++) {
            let timeDiff = Math.abs(new Date(metric_fn(this.events[i])).getTime() - t.getTime());
            if (timeDiff < minTimeDiff) {
                closestEvent = this.events[i];
                minTimeDiff = timeDiff;
            }
        }
        return closestEvent;
    }

    getEventFromTime(targetTimeArg: Date | string, metric="start") {
        let targetTime = timeConvert(targetTimeArg);
        switch (metric) {
            case "start":
                return this.getClosestEvent(targetTime, (event) => event.start);
            case "center":
                return this.getClosestEvent(targetTime, (event) => new Date((new Date(event.start).getTime() + new Date(event.end).getTime()) / 2).toISOString());
            case "after":
                return this.getNextEvent(targetTime);
            case "before":
                return this.getPreviousEvent(targetTime);
            case "containing_or_after":
                if (this.getEventsContaining(targetTime).length > 0) {
                    return this.getEventsContaining(targetTime)[0];
                } else {
                    return this.getNextEvent(targetTime);
                }
            case "containing_or_before":
                if (this.getEventsContaining(targetTime).length > 0) {
                    return this.getEventsContaining(targetTime)[0];
                } else {
                    return this.getPreviousEvent(targetTime);
                }
            default:
                throw new Error("Invalid metric: " + metric);
        }
    }

    getEventFromId(id: string) {
        let event = this.events.find(e => e.id === id);
        if (event == undefined) {
            return null;
        }
        return event;
    }

    _expandContiguousBlock(contiguousEvents: IEventObj[], event: IEventObj, dir: string) {
        let time = dir == "forward" ? new Date(event.end) : new Date(event.start);
        let newEvents = this.getEventsContaining(time);
        if (dir == "forward") {
            newEvents = newEvents.sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
        } // else, newEvents is already sorted in increasing order of start time
        newEvents = newEvents.filter(e => !contiguousEvents.includes(e));
        return newEvents;
    }

    getContiguousEvents(event: IEventObj) {
        let contiguousEvents = [event];
        let extremalEvent = event;
        let newEvents = [];
        do {
            newEvents = this._expandContiguousBlock(contiguousEvents, extremalEvent, "forward");
            if (newEvents.length > 0) {
                extremalEvent = newEvents[0];
                contiguousEvents = contiguousEvents.concat(newEvents);
            }
        } while (newEvents.length > 0);
        extremalEvent = event;
        newEvents = [];
        do {
            newEvents = this._expandContiguousBlock(contiguousEvents, extremalEvent, "backward");
            if (newEvents.length > 0) {
                extremalEvent = newEvents[0];
                contiguousEvents = newEvents.concat(contiguousEvents);
            }
        } while (newEvents.length > 0);
        contiguousEvents = contiguousEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        // Now at this point, we know our events span the full range of times in this contiguous block.
        // But what if there was a small event within another event at some point?
        return this.getEventsOverlappingRange(contiguousEvents[0].start, contiguousEvents[contiguousEvents.length - 1].end);
    }

    getNextNoncontiguousEvent(event: IEventObj) {
        let contiguousEvents = this.getContiguousEvents(event);
        console.assert(contiguousEvents.length > 0, "contiguousEvents is empty");
        let nextEvent = this.getNextEvent(contiguousEvents[contiguousEvents.length - 1].end);
        return nextEvent;
    }

    getPreviousNoncontiguousEvent(time: Date | string) {
        let t = timeConvert(time);
        let event = this.getEventFromTime(t, "containing_or_before");
        if (event == null) {
            return null;
        }
        let contiguousEvents = this.getContiguousEvents(event);
        let previousEvent = this.getPreviousEvent(contiguousEvents[0].start);
        return previousEvent;
    }

    importEvents(events: IEventObj[]) {
        this.events = this.events.concat(events);
        this.sortEvents();
    }
    addEvent(start: Date | string, end: Date | string, title: string, id?: string) {
        if (id == undefined) {
            id = "created:" + Math.random().toString(36).substring(2, 15);
        }
        // if start and end are Dates rather than strings, convert to isoformat string:
        if (start instanceof Date) {
            start = start.toISOString();
        }
        if (end instanceof Date) {
            end = end.toISOString();
        }
        let newEvent = {
            id: id,
            start: start,
            end: end,
            title: title,
            extendedProps: {
                isOzycal: true,
                calendar: this.selected.calendar
            }
        };
        this.events.push(newEvent);
        this.sortEvents();
        this.editedEvents.created.push(newEvent);
        return newEvent;
    }

    modifyEvent(id: string, props: Partial<IEventObj>) {
        let event = this.getEventFromId(id);
        if (event == null) {
            throw new Error("Event not found");
        }
        Object.assign(event, props);
        this.sortEvents();
        // if this event is in the created events, then we don't need to add it to the modified events list:
        if (this.editedEvents.created.some(e => e.id === id)) {
            return;
        }

        // if an event with this id exists in this.editedEvents.modified, then delete that from modified:
        const index = this.editedEvents.modified.findIndex(e => e.id === id);
        if (index !== -1) { // IMPORTANT: these are in-place updates, since we need any bound UI update function to trigger (see constructor)
            // If the event is already in modified, update it in place
            this.editedEvents.modified.splice(index, 1, event);
        } else {
            // If the event is not in modified, add it
            this.editedEvents.modified.push(event);
        }
    }

    deleteEvent(event: IEventObj) {
        this.events.splice(this.events.indexOf(event), 1);
        // Next, we want to update editedEvents (which has .created, .modified, and .deleted arrays)
        if (this.editedEvents.created.some(e => e.id === event.id)) {
            // NB: need to do edits in-place to trigger UI update functions:
            const index = this.editedEvents.created.findIndex(e => e.id === event.id);
            if (index !== -1) {
                // We no longer need to create this event when syncing, so remove it from the created arary
                this.editedEvents.created.splice(index, 1);
            }
        } else if (this.editedEvents.modified.some(e => e.id === event.id)) {
            const index = this.editedEvents.modified.findIndex(e => e.id === event.id);
            if (index !== -1) {
                // We no longer need to modify this event when syncing, so remove it from the modified array
                this.editedEvents.modified.splice(index, 1);
            }
            this.editedEvents.deleted.push(event);
        } else {
            this.editedEvents.deleted.push(event);
        }
        console.assert(!this.editedEvents.created.some(e => e.id === event.id), "deleted event is in editedEvents.created");
        console.assert(!this.editedEvents.modified.some(e => e.id === event.id), "deleted event is in editedEvents.modified");

        // update selected event:
        if (this.selected.event !== null && this.selected.event.id == event.id) {
            this.updateSelectedEventFromSelectedTime();
        }
    }

    sortEvents() {
        this.events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }

    updateSelectedEventFromSelectedTime() {
        let eventsContainingSelectedTime = this.getEventsContaining(this.selected.time);
        if (eventsContainingSelectedTime.length > 0) {
            this.selected.event = eventsContainingSelectedTime[0];
        } else {
            this.selected.event = this.getNextEvent(this.selected.time);
        }
    }

    updateSelectedTimeFromSelectedEvent() {
        if (this.selected.event !== null) {
            this.selected.time = initializeSelectedTime(new Date(this.selected.event.end));
        }
    }
};