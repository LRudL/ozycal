import {dateToWeekID, initializeSelectedTime, timeConvert} from "./utils.ts"
import { IState, IUI, IEventObj } from "./types.ts";
import { NoEventsFound } from "./state.ts";
import { IModalResult } from "./modal.ts";
import { fetchWeeklyEvents, syncEditedEvents } from "./backendService.ts";

function eventChangeWrapper(func: (state: IState, ui: IUI, event: IEventObj, ...args: any[]) => void) {
    return function (state: IState, ui: IUI, event: IEventObj | null, ...args: any[]) {
        if (event == null) {
            console.error("eventChangeWrapper received a null event (this should not be possible)");
            return;
        }
        func(state, ui, event, ...args);
        state.updateSelectedTimeFromSelectedEvent();
    }
}

function timeChangeWrapper(func: (state: IState, ui: IUI, ...args: any[]) => void) {
    return function (state: IState, ui: IUI, ...args: any[]) {
        func(state, ui, ...args);
        state.updateSelectedEventFromSelectedTime();
    }
}

export let moveSelectedTime = timeChangeWrapper(function(state: IState, ui: IUI, days=0, hours=0, minutes=0) {
    var time = new Date(state.selected.time);
    time.setDate(time.getDate() + days);
    time.setHours(time.getHours() + hours);
    time.setMinutes(time.getMinutes() + minutes);
    state.selected.time = time;
});

export function moveWeek(state: IState, ui: IUI, weeks=1) {
    function changeWeek(time: Date) {
        state.selected.week = dateToWeekID(time);
        if (state.selected.mode == "time") {
            timeChangeWrapper(() => {
                state.selected.time = time;
            })(state, ui);
        } else if (state.selected.mode == "event") {
            setSelectedEventFromTime(state, ui, state.selected.event, time, "start");
        }
    }
    var time = new Date(state.selected.time);
    time.setDate(time.getDate() + weeks * 7);
    if (state.loadedWeeks.get(dateToWeekID(time)) == false) {
        fetchWeeklyEvents(ui.userTimezone, time).then((eventsReceived) => {
            importEvents(state, ui, eventsReceived);
            state.loadedWeeks.set(dateToWeekID(time), true);
            changeWeek(time);
        });
    } else {
        changeWeek(time);
    }
}

export let setSelectedTimeToBoundOf = timeChangeWrapper(function(state: IState, ui: IUI, bound="start", time="day") {
    console.assert(bound == "start" || bound == "end", "bound must be start or end");
    console.assert(time == "day" || time == "hour")
    switch (time) {
        case "day":
            if (bound == "start") {
                state.selected.time.setHours(0);
                state.selected.time.setMinutes(0);
            } else {
                state.selected.time.setHours(0);
                state.selected.time.setMinutes(0);
                state.selected.time.setDate(state.selected.time.getDate() + 1);
            } 
            break;
        case "hour":
            if (bound == "start") {
                state.selected.time.setMinutes(0);
            } else {
                state.selected.time.setMinutes(0);
                state.selected.time.setHours(state.selected.time.getHours() + 1);
            }
            break;
    }
});

export let gotoNextContiguousBlockStartEvent = eventChangeWrapper(function(state: IState, ui: IUI, event: IEventObj) {
    // analogous to "w" in vim
    state.selected.event = state.getNextNoncontiguousEvent(event);
});

export let gotoCurrentContiguousBlockStartEvent = eventChangeWrapper(function(state: IState, ui: IUI, event: IEventObj) {
    // analogous to "b" in vim
    // (if already at the first event in the contiguous block, then jump to the first in the previous block)
    var contiguousEvents = state.getContiguousEvents(event);
    if (contiguousEvents[0].id == event.id) {
        var previousNoncontiguous = state.getPreviousNoncontiguousEvent(event.start);
        state.selected.event = state.getContiguousEvents(previousNoncontiguous)[0];
    } else {
        state.selected.event = contiguousEvents[0];
    }

});

export let gotoCurrentContiguousBlockEndEvent = eventChangeWrapper(function(state: IState, ui: IUI, event: IEventObj) {
    // analogous to "e" in vim
    var contiguousEvents = state.getContiguousEvents(event);
    if (contiguousEvents[contiguousEvents.length - 1].id == event.id) {
        var nextNoncontiguous = state.getNextNoncontiguousEvent(event);
        state.selected.event = state.getContiguousEvents(nextNoncontiguous)[0];
    } else {
        state.selected.event = contiguousEvents[contiguousEvents.length - 1];
    }

});

export let gotoNextContiguousBlockBound = timeChangeWrapper(function(state: IState, ui: IUI, time: Date) {
    // analogous to "}" in vim
    let eventsContaining = state.getEventsContaining(time);
    let nextEvent = state.getNextEvent(time)
    if (nextEvent == null) {
        console.error("Cannot gotoNextContiguousBlockBound when no next event is found. This should imply that there are no events loaded.");
        return;
    }
    if (eventsContaining.length > 0) {
        var contiguousEvents = state.getContiguousEvents(eventsContaining[0]);
        if (time.getTime() == timeConvert(contiguousEvents[contiguousEvents.length - 1].end).getTime()) {
            state.selected.time = timeConvert(nextEvent.start);
        } else {
            state.selected.time = timeConvert(contiguousEvents[contiguousEvents.length - 1].end);
        }
    } else {
        state.selected.time = timeConvert(nextEvent.start);
    }

});

export let gotoPreviousContiguousBlockBound = timeChangeWrapper(function(state: IState, ui: IUI, time: Date) {
    // analogous to "{" in vim
    let eventsContaining = state.getEventsContaining(time);
    let previousEvent = state.getPreviousEvent(time);
    if (previousEvent == null) {
        console.error("Cannot gotoPreviousContiguousBlockBound when no previous event is found. This should imply that there are no events loaded.");
        return;
    }
    if (eventsContaining.length > 0) {
        var contiguousEvents = state.getContiguousEvents(eventsContaining[0]);
        if (time.getTime() == timeConvert(contiguousEvents[0].start).getTime()) {
            state.selected.time = timeConvert(previousEvent.end);
        } else {
            state.selected.time = timeConvert(contiguousEvents[0].start);
        }
    } else {
        state.selected.time = timeConvert(previousEvent.end);
    }

});

export let changeSelectedEvent = eventChangeWrapper(function(state: IState, ui: IUI, event: IEventObj, jump=1) {
    var currentIndex = state.events.findIndex(event => event.id === state.selected.event?.id);
    var newIndex = currentIndex + jump;
    newIndex = Math.min(newIndex, state.events.length - 1);
    newIndex = Math.max(newIndex, 0);
    state.selected.event = state.events[newIndex];
});

export let setSelectedEventFromTime = eventChangeWrapper(function(state: IState, ui: IUI, event: IEventObj, time: Date, metric="start") {
    var targetTime = new Date(time);
    state.selected.event = state.getEventFromTime(targetTime, metric);
});

export function setSelectedEventFromTimeSet(state: IState, ui: IUI, date : number | null = null, hour : number | null = null, minute : number | null = null, metric = "start") {
    let date_ = date == null ? state.selected.time.getDate() : date;
    let hour_ = hour == null ? state.selected.time.getHours() : hour;
    let minute_ = minute == null ? state.selected.time.getMinutes() : minute;
    var targetTime = new Date(state.selected.time);
    targetTime.setDate(date_);
    targetTime.setHours(hour_);
    targetTime.setMinutes(minute_);
    setSelectedEventFromTime(state, ui, state.selected.event, targetTime, metric);
}

export function setSelectedEventFromTimeDelta(state: IState, ui: IUI, days=0, hours=0, minutes=0, metric="start") {
    var targetTime = new Date(state.selected.time);
    targetTime.setDate(targetTime.getDate() + days);
    targetTime.setHours(targetTime.getHours() + hours);
    targetTime.setMinutes(targetTime.getMinutes() + minutes);
    setSelectedEventFromTime(state, ui, state.selected.event, targetTime, metric);
}

export function enableTimeMode(state: IState, ui: IUI) {
    if (state.selected.event == null) {
        console.error("Cannot enableTimeMode when no event is selected");
        return;
    }
    state.selected.time = initializeSelectedTime(new Date(state.selected.event.end));
    state.selected.mode = "time";
}

export function enableEventMode(state: IState, ui: IUI) {
    var containingEvents = state.getEventsContaining(state.selected.time)
    let foundEvent : IEventObj | null;
    if (containingEvents.length > 0) {
        foundEvent = containingEvents[0];
    } else {
        // If there is no next event, this will still return an event
        // (it is only empty if no events exist)
        foundEvent = state.getNextEvent(state.selected.time);
    }
    if (foundEvent == null) {
        throw new NoEventsFound();
    }
    state.selected.event = foundEvent;
    state.selected.mode = "event";
    state.updateSelectedTimeFromSelectedEvent(); // it makes more sense to keep this than to wrap the function in an eventChangeWrapper
}

export function toggleBetweenTimeAndEventMode(state: IState, ui: IUI) {
    console.assert(state.selected.mode === 'time' || state.selected.mode === 'event', "currentMode is not set to 'time' or 'event' but instead: " + state.selected.mode);

    let currentMode = state.selected.mode;
    if (currentMode === 'time') {
        enableEventMode(state, ui)
    } else if (currentMode === 'event') {
        enableTimeMode(state, ui)
    }

    if (currentMode == state.selected.mode) {
        console.error("toggleBetweenTimeAndEventMode failed to toggle the mode; mode stuck at: " + state.selected.mode);
    }

}

export function addEventFlow(state: IState, ui: IUI, start: Date, end: Date) {
    var eventName = ui.promptUserForEventName();
    var newEvent = state.addEvent(start, end, eventName);
    ui.addEvent(newEvent);
    if (state.selected.mode == "event") {
        state.selected.event = newEvent;
    } else if (state.selected.mode == "time") {
        state.selected.time = initializeSelectedTime(new Date(newEvent.end));
    }
}

export function addEventAfterFlow(state: IState, ui: IUI, duration_in_minutes = 60) {
    var endTime = new Date(state.selected.time);
    endTime.setMinutes(endTime.getMinutes() + duration_in_minutes);
    addEventFlow(state, ui, state.selected.time, endTime);
    state.selected.time = endTime;
}

export function deleteEventFlow(state: IState, ui: IUI, event: IEventObj | null) {
    if (event == null) {
        console.error("deleteEventFlow received a null event (this should not be possible)");
        return;
    }
    let yes = ui.promptUser("Do you want to delete the event with title " + event.title + "?\n'y' to confirm, anything else to cancel.");
    if (yes && yes.length > 0 && yes[0] == "y") {
        state.deleteEvent(event);
        ui.interface.getEventById(event.id).remove();
        return true;
    } else {
        return false;
    }
}
 
export async function selectedCalendarSwitchFlow(state: IState, ui: IUI, quick_switch_idx=-1) {
    if (quick_switch_idx !== -1) {
        if (quick_switch_idx >= state.calendarNames.length) {
            alert("You tried to quick-switch to calendar id " + quick_switch_idx + " but there are only " + state.calendarNames.length + " calendars loaded.");
            return;
        }
        state.selected.calendar = state.calendarNames[quick_switch_idx];
        return;
    }
    let result: IModalResult | undefined = await ui.promptUserForSelectedCalendar();
    if (result == undefined) {
        return;
    }
    state.selected.calendar = result.calendarName;
}


export let jumpToTimeFromNum = timeChangeWrapper(function(state: IState, ui: IUI, jump_to: number) {
    // interpret small numbers as hours
    if (jump_to <= 24) {
        let new_time = new Date(state.selected.time);
        new_time.setHours(jump_to);
        // special trigger logic only happens if we directly set state.selected.time (so can't use .setHours/.setMinutes/.setSeconds/.setMilliseconds)
        state.selected.time = new_time;
    }
    // interpret larger numbers as hhmm
    else if (jump_to <= 2400) {
        let new_time = new Date(state.selected.time);
        new_time.setHours(Math.floor(jump_to / 100));
        new_time.setMinutes(jump_to % 100);
        state.selected.time = new_time;
    }
});

export let eventSyncFlow = async function(state: IState, ui: IUI) {
    // const response = await fetch('/api/update_events', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(state.editedEvents),
    // });

    // const result = await response.json() as SyncResult;
    const result = await syncEditedEvents(state.editedEvents);
    
    for (let idMapping of result["created"]) {
        let old_id = idMapping["old_id"];
        let new_id = idMapping["new_id"];
        let event = state.getEventFromId(old_id);
        if (event != null) {
            event.id = new_id;
            state.editedEvents.created = state.editedEvents.created.filter(e => e.id != new_id);
        } else {
            alert("Sync anomaly: event with id " + old_id + " not found");
        }
    }

    if (state.editedEvents.created.length > 0) {
        alert("Sync anomaly: the following events were supposed to be created but were not present in the response from the server: " + state.editedEvents.created.map(e => e.title).join(", "));
    }

    for (let id of result["deleted"]) {
        state.editedEvents.deleted = state.editedEvents.deleted.filter(e => e.id != id);
    }

    if (state.editedEvents.deleted.length > 0) {
        alert("Sync anomaly: the following events were supposed to be deleted but were not present in the response from the server: " + state.editedEvents.deleted.map(e => e.title).join(", "));
    } 

    for (let id of result["modified"]) {
        state.editedEvents.modified = state.editedEvents.modified.filter(e => e.id != id);
    }

    if (state.editedEvents.modified.length > 0) {
        alert("Sync anomaly: the following events were supposed to be modified but were not present in the response from the server: " + state.editedEvents.modified.map(e => e.title).join(", "));
    }

    if (state.editedEvents.created.length != 0 || state.editedEvents.deleted.length != 0 || state.editedEvents.modified.length != 0) {
        console.assert(false, "Sync anomaly: there are still events in state.editedEvents after the sync");
        ui.updateStatusBarEdits();
    } else{
        ui.updateStatusBarEdits(true);
    }
}

export function importEvents(state: IState, ui: IUI, events: IEventObj[]) {
    let newEvents = events.filter(e => state.getEventFromId(e.id) == null);
    state.importEvents(newEvents);
    ui.interface.addEventSource(newEvents);
    newEvents.map(e => ui.interface.getEventById(e.id)).map(ui.colorEvent.bind(ui));
}