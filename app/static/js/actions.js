import {initializeSelectedTime} from "./utils.js"

export function moveSelectedTime(state, ui, days=0, hours=0, minutes=0) {
    state.selectedTime.setDate(state.selectedTime.getDate() + days);
    state.selectedTime.setHours(state.selectedTime.getHours() + hours);
    state.selectedTime.setMinutes(state.selectedTime.getMinutes() + minutes);

    state.updateSelectedEventFromSelectedTime();
    ui.updateSelectedTimeLine(state.selectedTime);
}

export function setSelectedTimeToBoundOf(state, ui, bound="start", time="day") {
    console.assert(bound == "start" || bound == "end", "bound must be start or end");
    console.assert(time == "day" || time == "hour")
    switch (time) {
        case "day":
            if (bound == "start") {
                state.selectedTime.setHours(0);
                state.selectedTime.setMinutes(0);
            } else {
                state.selectedTime.setHours(0);
                state.selectedTime.setMinutes(0);
                state.selectedTime.setDate(state.selectedTime.getDate() + 1);
            } 
            break;
        case "hour":
            if (bound == "start") {
                state.selectedTime.setMinutes(0);
            } else {
                state.selectedTime.setMinutes(0);
                state.selectedTime.setHours(state.selectedTime.getHours() + 1);
            }
            break;
    }

    state.updateSelectedEventFromSelectedTime();
    ui.updateSelectedTimeLine(state.selectedTime);
}

export function moveSelectedEvent(state, ui, jump=1) {
    var currentIndex = state.events.findIndex(event => event.id === state.selectedEvent.id);
    var newIndex = currentIndex + jump;
    newIndex = Math.min(newIndex, state.events.length - 1);
    newIndex = Math.max(newIndex, 0);
    state.selectedEvent = state.events[newIndex];

    state.updateSelectedTimeFromSelectedEvent();
    ui.updateSelectedEvent(state.selectedEvent);
}

export function setSelectedEventFromTime(state, ui, time) {
    var targetTime = new Date(time);
    state.selectedEvent = state.getClosestEvent(targetTime);

    state.updateSelectedTimeFromSelectedEvent();
    ui.updateSelectedEvent(state.selectedEvent);
}

export function selectFirstEventStartingAfter(state, ui, time) {
    eventsAfter = state.events.filter(event => event.start > time);
    if (eventsAfter.length > 0) {
        state.selectedEvent = eventsAfter[0];
    }
    state.updateSelectedTimeFromSelectedEvent();
    ui.updateSelectedEvent(state.selectedEvent);
}

export function selectFirstEventBefore(state, ui, time) {
    eventsBefore = state.events.filter(event => event.start < time);
    if (eventsBefore.length > 0) {
        state.selectedEvent = eventsBefore[eventsBefore.length - 1];
    }
    state.updateSelectedTimeFromSelectedEvent();
    ui.updateSelectedEvent(state.selectedEvent);
}
        

export function setSelectedEventFromTimeSet(state, ui, date=undefined, hour=undefined, minute=undefined, metric="closest") {
    if (date === undefined) {
        date = state.selectedTime.getDate();
    }
    if (hour === undefined) {
        hour = state.selectedTime.getHours();
    }
    if (minute === undefined) {
        minute = state.selectedTime.getMinutes();
    }
    if (metric == "closest") {
        var targetTime = new Date(date, hour, minute);
        setSelectedEventFromTime(state, ui, targetTime);
    } else if (metric == "after") {
        var targetTime = new Date(date, hour, minute);
        selectFirstEventStartingAfter(state, ui, targetTime);
    }
}

export function setSelectedEventFromTimeDelta(state, ui, days=0, hours=0, minutes=0) {
    var targetTime = new Date(state.selectedTime);
    targetTime.setDate(targetTime.getDate() + days);
    targetTime.setHours(targetTime.getHours() + hours);
    targetTime.setMinutes(targetTime.getMinutes() + minutes);
    setSelectedEventFromTime(state, ui, targetTime);
}

export function enableTimeMode(state, ui) {
    state.selectedTime = initializeSelectedTime(new Date(state.selectedEvent.end));
    ui.enableSelectedTimeLine();
    ui.updateSelectedTimeLine(state.selectedTime);
}

export function enableEventMode(state, ui) {
    var containingEvents = state.getEventsContaining(state.selectedTime)
    if (containingEvents.length > 0) {
        state.selectedEvent = containingEvents[0];
    } else {
        state.selectedEvent = state.getNextEvent(state.selectedTime);
    }
    state.updateSelectedTimeFromSelectedEvent();
    ui.disableSelectedTimeLine();
}

export function toggleBetweenTimeAndEventMode(state, ui) {
    console.assert(state.currentMode === 'time' || state.currentMode === 'event', "currentMode is not set to 'time' or 'event' but instead: " + state.currentMode);

    state.currentMode = state.currentMode === 'time' ? 'event' : 'time';

    console.assert(state.selectedTime, "selectedTime is: " + state.selectedTime)
    console.assert(state.selectedEvent, "selectedEvent is: " + state.selectedEvent)

    if (state.currentMode === 'event') {
        enableEventMode(state, ui)
    } else if (state.currentMode === 'time') {
        enableTimeMode(state, ui)
    }
}

export function addEventFlow(state, ui, start, end) {
    var eventName = ui.promptUserForEventName();
    var newEvent = state.addEvent(start, end, eventName);
    ui.addEvent(newEvent);
}

export function addEventAfterFlow(state, ui) {
    var endTime = new Date(state.selectedTime);
    endTime.setHours(endTime.getHours() + 1);
    addEventFlow(state, ui, state.selectedTime, endTime);
    state.selectedTime = endTime;
    ui.updateSelectedTimeLine(state.selectedTime);
}

export function deleteEventFlow(state, ui, event) {
    let yes = ui.promptUser("Do you want to delete the event with title " + event.title + "?\n'y' to confirm, anything else to cancel.");
    if (yes && yes.length > 0 && yes[0] == "y") {
        state.deleteEvent(event);
        return true;
    } else {
        return false;
    }
}
 