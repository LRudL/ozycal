import {initializeSelectedTime, timeConvert} from "./utils.ts"
import { IState, IUI, IEventObj } from "./types.ts";

export function moveSelectedTime(state: IState, ui: IUI, days=0, hours=0, minutes=0) {
    state.selectedTime.setDate(state.selectedTime.getDate() + days);
    state.selectedTime.setHours(state.selectedTime.getHours() + hours);
    state.selectedTime.setMinutes(state.selectedTime.getMinutes() + minutes);

    state.updateSelectedEventFromSelectedTime();
    ui.updateSelectedTimeLine(state.selectedTime);
}

export function setSelectedTimeToBoundOf(state: IState, ui: IUI, bound="start", time="day") {
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

export function gotoNextContiguousBlockStartEvent(state: IState, ui: IUI, event: IEventObj) {
    // analogous to "w" in vim
    state.selectedEvent = state.getNextNoncontiguousEvent(event);

    state.updateSelectedTimeFromSelectedEvent();
    ui.updateSelectedEvent(state.selectedEvent);
}

export function gotoCurrentContiguousBlockStartEvent(state: IState, ui: IUI, event: IEventObj) {
    // analogous to "b" in vim
    // (if already at the first event in the contiguous block, then jump to the first in the previous block)
    var contiguousEvents = state.getContiguousEvents(event);
    if (contiguousEvents[0].id == event.id) {
        var previousNoncontiguous = state.getPreviousNoncontiguousEvent(event.start);
        state.selectedEvent = state.getContiguousEvents(previousNoncontiguous)[0];
    } else {
        state.selectedEvent = contiguousEvents[0];
    }

    state.updateSelectedTimeFromSelectedEvent();
    ui.updateSelectedEvent(state.selectedEvent);
}

export function gotoCurrentContiguousBlockEndEvent(state: IState, ui: IUI, event: IEventObj) {
    // analogous to "e" in vim
    var contiguousEvents = state.getContiguousEvents(event);
    if (contiguousEvents[contiguousEvents.length - 1].id == event.id) {
        var nextNoncontiguous = state.getNextNoncontiguousEvent(event);
        console.log(nextNoncontiguous)
        state.selectedEvent = state.getContiguousEvents(nextNoncontiguous)[0];
    } else {
        state.selectedEvent = contiguousEvents[contiguousEvents.length - 1];
    }

    state.updateSelectedTimeFromSelectedEvent();
    ui.updateSelectedEvent(state.selectedEvent);
}

export function gotoNextContiguousBlockBound(state: IState, ui: IUI, time: Date) {
    // analogous to "}" in vim
    var eventsContaining = state.getEventsContaining(time);
    if (eventsContaining.length > 0) {
        var contiguousEvents = state.getContiguousEvents(eventsContaining[0]);
        if (time.getTime() == timeConvert(contiguousEvents[contiguousEvents.length - 1].end).getTime()) {
            state.selectedTime = timeConvert(state.getNextEvent(time).start);
        } else {
            state.selectedTime = timeConvert(contiguousEvents[contiguousEvents.length - 1].end);
        }
    } else {
        state.selectedTime = timeConvert(state.getNextEvent(time).start);
    }

    state.updateSelectedEventFromSelectedTime();
    ui.updateSelectedTimeLine(state.selectedTime);
}

export function gotoPreviousContiguousBlockBound(state: IState, ui: IUI, time: Date) {
    // analogous to "{" in vim
    var eventsContaining = state.getEventsContaining(time);
    if (eventsContaining.length > 0) {
        var contiguousEvents = state.getContiguousEvents(eventsContaining[0]);
        if (time.getTime() == timeConvert(contiguousEvents[0].start).getTime()) {
            state.selectedTime = timeConvert(state.getPreviousEvent(time).end);
        } else {
            state.selectedTime = timeConvert(contiguousEvents[0].start);
        }
    } else {
        state.selectedTime = timeConvert(state.getPreviousEvent(time).end);
    }

    state.updateSelectedEventFromSelectedTime();
    ui.updateSelectedTimeLine(state.selectedTime);
}

export function moveSelectedEvent(state: IState, ui: IUI, jump=1) {
    var currentIndex = state.events.findIndex(event => event.id === state.selectedEvent.id);
    var newIndex = currentIndex + jump;
    newIndex = Math.min(newIndex, state.events.length - 1);
    newIndex = Math.max(newIndex, 0);
    state.selectedEvent = state.events[newIndex];

    state.updateSelectedTimeFromSelectedEvent();
    ui.updateSelectedEvent(state.selectedEvent);
}

export function setSelectedEventFromTime(state: IState, ui: IUI, time: Date, metric="start") {
    var targetTime = new Date(time);
    state.selectedEvent = state.getEventFromTime(targetTime, metric);
    state.updateSelectedTimeFromSelectedEvent();
    ui.updateSelectedEvent(state.selectedEvent);
}

export function setSelectedEventFromTimeSet(state: IState, ui: IUI, date : number | null = null, hour : number | null = null, minute : number | null = null, metric = "start") {
    let date_ = date == null ? state.selectedTime.getDate() : date;
    let hour_ = hour == null ? state.selectedTime.getHours() : hour;
    let minute_ = minute == null ? state.selectedTime.getMinutes() : minute;
    var targetTime = new Date(state.selectedTime);
    targetTime.setDate(date_);
    targetTime.setHours(hour_);
    targetTime.setMinutes(minute_);
    setSelectedEventFromTime(state, ui, targetTime, metric);
}

export function setSelectedEventFromTimeDelta(state: IState, ui: IUI, days=0, hours=0, minutes=0, metric="start") {
    var targetTime = new Date(state.selectedTime);
    targetTime.setDate(targetTime.getDate() + days);
    targetTime.setHours(targetTime.getHours() + hours);
    targetTime.setMinutes(targetTime.getMinutes() + minutes);
    setSelectedEventFromTime(state, ui, targetTime, metric);
}

export function enableTimeMode(state: IState, ui: IUI) {
    state.selectedTime = initializeSelectedTime(new Date(state.selectedEvent.end));
    ui.enableSelectedTimeLine();
    ui.updateSelectedTimeLine(state.selectedTime);
}

export function enableEventMode(state: IState, ui: IUI) {
    var containingEvents = state.getEventsContaining(state.selectedTime)
    if (containingEvents.length > 0) {
        state.selectedEvent = containingEvents[0];
    } else {
        state.selectedEvent = state.getNextEvent(state.selectedTime);
    }
    state.updateSelectedTimeFromSelectedEvent();
    ui.disableSelectedTimeLine();
}

export function toggleBetweenTimeAndEventMode(state: IState, ui: IUI) {
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

export function addEventFlow(state: IState, ui: IUI, start: Date, end: Date) {
    var eventName = ui.promptUserForEventName();
    var newEvent = state.addEvent(start, end, eventName);
    ui.addEvent(newEvent);
}

export function addEventAfterFlow(state: IState, ui: IUI) {
    var endTime = new Date(state.selectedTime);
    endTime.setHours(endTime.getHours() + 1);
    addEventFlow(state, ui, state.selectedTime, endTime);
    state.selectedTime = endTime;
    ui.updateSelectedTimeLine(state.selectedTime);
}

export function deleteEventFlow(state: IState, ui: IUI, event: IEventObj) {
    let yes = ui.promptUser("Do you want to delete the event with title " + event.title + "?\n'y' to confirm, anything else to cancel.");
    if (yes && yes.length > 0 && yes[0] == "y") {
        state.deleteEvent(event);
        ui.interface.getEventById(event.id).remove();
        return true;
    } else {
        return false;
    }
}
 