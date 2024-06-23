import {initializeSelectedTime, timeConvert} from "./utils.ts"

export let state = {
    currentMode: 'time',
    events: [],
    editedEvents: {
        "created": [],
        "deleted": [],
        "modified": []
    },
    selectedTime: initializeSelectedTime(),
    selectedEvent: null,
    checkWellFormedness: function() {
        console.assert(this.currentMode === 'time' || this.currentMode === 'event', "currentMode is not set to 'time' or 'event' but instead: " + this.currentMode);
        console.assert(this.selectedEvent !== undefined, "selectedEvent is undefined");
        console.assert(this.selectedTime !== undefined, "selectedTime is undefined");
    },
    getNextEvent(time, on_fail="return_best", comparison = ">") {
        time = timeConvert(time);
        if (comparison == ">") {
            var comparison_fn = (t0, t1) => t0 > t1;
        } else if (comparison == ">=") {
            var comparison_fn = (t0, t1) => t0 >= t1;
        } else {
            throw new Error("Invalid comparison: " + comparison);
        }
        for (var i = 0; i < this.events.length; i++) {
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
    },
    getPreviousEvent(time, on_fail="return_best", comparison = "<") {
        time = timeConvert(time);
        if (comparison == "<") {
            var comparison_fn = (t0, t1) => t0 < t1;
        } else if (comparison == "<=") {
            var comparison_fn = (t0, t1) => t0 <= t1;
        } else {
            throw new Error("Invalid comparison: " + comparison);
        }
        for (var i = this.events.length - 1; i >= 0; i--) {
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
    },
    getEventsContaining(time) {
        // Returns a list of events containing `time`, sorted in order of start time
        var eventsContaining = [];
        for (var i = 0; i < this.events.length; i++) {
            if (new Date(this.events[i].start) <= time && new Date(this.events[i].end) >= time) {
                eventsContaining.push(this.events[i]);
            }
        }
        return eventsContaining;
    },
    getEventsOverlappingRange(start, end) {
        start = timeConvert(start);
        end = timeConvert(end);
        return this.events.filter(e => (new Date(e.start) <= end) && (new Date(e.end) >= start));
    },
    getEventsWithinRange(start, end) {
        start = timeConvert(start);
        end = timeConvert(end);
        return this.events.filter(e => (new Date(e.start) >= start) && (new Date(e.end) <= end));
    },
    getClosestEvent(time, metric_fn = (event) => event.start) {
        // Gets the event whose center is closest in time to the given time
        // if type is a date, do nothing; if it's a string, convert to a date:
        if (typeof time === "string") {
            time = new Date(time);
        }
        var closestEvent = this.events[0];
        var minTimeDiff = Math.abs(new Date(metric_fn(closestEvent)) - time);
        for (var i = 1; i < this.events.length; i++) {
            var timeDiff = Math.abs(new Date(metric_fn(this.events[i])) - time);
            if (timeDiff < minTimeDiff) {
                closestEvent = this.events[i];
                minTimeDiff = timeDiff;
            }
        }
        return closestEvent;
    },
    getEventFromTime(targetTime, metric="start") {
        switch (metric) {
            case "start":
                return state.getClosestEvent(targetTime, (event) => event.start);
            case "center":
                return state.getClosestEvent(targetTime, (event) => new Date((new Date(event.start).getTime() + new Date(event.end).getTime()) / 2).toISOString());
            case "after":
                return state.getNextEvent(targetTime);
            case "before":
                return state.getPreviousEvent(targetTime);
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
    },
    getEventFromId(id) {
        return this.events.find(e => e.id === id);
    },
    _expandContiguousBlock(contiguousEvents, event, dir) {
        var time = dir == "forward" ? new Date(event.end) : new Date(event.start);
        var newEvents = this.getEventsContaining(time);
        if (dir == "forward") {
            newEvents = newEvents.sort((a, b) => new Date(b.end) - new Date(a.end));
        } // else, newEvents is already sorted in increasing order of start time
        newEvents = newEvents.filter(e => !contiguousEvents.includes(e));
        return newEvents;
    },
    getContiguousEvents(event) {
        var contiguousEvents = [event];
        var extremalEvent = event
        var newEvents = []
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
        contiguousEvents = contiguousEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
        // Now at this point, we know our events span the full range of times in this contiguous block.
        // But what if there was a small event within another event at some point?
        return this.getEventsOverlappingRange(contiguousEvents[0].start, contiguousEvents[contiguousEvents.length - 1].end);
    },
    getNextNoncontiguousEvent(event) {
        var contiguousEvents = this.getContiguousEvents(event);
        console.assert(contiguousEvents.length > 0, "contiguousEvents is empty");
        var nextEvent = this.getNextEvent(contiguousEvents[contiguousEvents.length - 1].end);
        return nextEvent;
    },
    getPreviousNoncontiguousEvent(time) {
        time = timeConvert(time);
        var event = this.getEventFromTime(time, "containing_or_before");
        var contiguousEvents = this.getContiguousEvents(event);
        var previousEvent = this.getPreviousEvent(contiguousEvents[0].start);
        return previousEvent;
    },
    addEvent(start, end, title, id=undefined) {
        if (id == undefined) {
            id = "created:" + Math.random().toString(36).substring(2, 15)
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
            title: title
        }
        this.events.push(newEvent);
        this.sortEvents()
        this.editedEvents.created.push(newEvent)
        return newEvent;
    },
    deleteEvent(event) {
        this.events.splice(this.events.indexOf(event), 1);
        if (this.editedEvents.created.some(e => e.id === event.id)) {
            this.editedEvents.created = this.editedEvents.created.filter(e => e.id !== event.id);
        } else if (this.editedEvents.modified.some(e => e.id === event.id)) {
            this.editedEvents.modified = this.editedEvents.modified.filter(e => e.id !== event.id);
            this.editedEvents.deleted.push(event);
        } else {
            this.editedEvents.deleted.push(event);
        }
        console.assert(!this.editedEvents.created.some(e => e.id === event.id), "deleted event is in editedEvents.created");
        console.assert(!this.editedEvents.modified.some(e => e.id === event.id), "deleted event is in editedEvents.modified");
    },
    sortEvents() {
        this.events.sort((a, b) => new Date(a.start) - new Date(b.start));
    },
    updateSelectedEventFromSelectedTime() {
        var eventsContainingSelectedTime = this.getEventsContaining(this.selectedTime);
        if (eventsContainingSelectedTime.length > 0) {
            this.selectedEvent = eventsContainingSelectedTime[0];
        } else {
            this.selectedEvent = this.getNextEvent(this.selectedTime);
        }
    },
    updateSelectedTimeFromSelectedEvent() {
        this.selectedTime = initializeSelectedTime(new Date(this.selectedEvent.end));
    }

};

export function initializeState(state, time) {
    state.selectedTime = initializeSelectedTime(time);
    state.selectedEvent = state.getNextEvent(state.selectedTime);
    state.checkWellFormedness();
}