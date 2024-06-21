import {initializeSelectedTime} from "./utils.js"

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
    getNextEvent(time) {
        var nextEvent = this.events[0];
        for (var i = 1; i < this.events.length; i++) {
            if (new Date(this.events[i].start) > time) {
                nextEvent = this.events[i];
                break;
        }
    }
        return nextEvent;
    },
    getEventsContaining(time) {
        var eventsContaining = [];
        for (var i = 0; i < this.events.length; i++) {
            if (new Date(this.events[i].start) <= time && new Date(this.events[i].end) >= time) {
                eventsContaining.push(this.events[i]);
            }
        }
        return eventsContaining;
    },
    getClosestEvent(time) {
        var closestEvent = this.events[0];
        var minTimeDiff = Math.abs(new Date(closestEvent.start) - time);
        for (var i = 1; i < this.events.length; i++) {
            var timeDiff = Math.abs(new Date(this.events[i].start) - time);
            if (timeDiff < minTimeDiff) {
            closestEvent = this.events[i];
            minTimeDiff = timeDiff;
            }
        }
        return closestEvent;
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
        calendar.getEventById(event.id).remove();
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
        this.selectedTime = new Date(this.selectedEvent.end);
    }

};

export function initializeState(state, time) {
    state.selectedTime = initializeSelectedTime(time);
    state.selectedEvent = state.getNextEvent(state.selectedTime);
    state.checkWellFormedness();
}