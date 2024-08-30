import {dateToWeekID, initializeSelectedTime, timeConvert, weekIDToDate} from "./utils.ts"
import { IState, IUI, IEventObj, IEventDatalink } from "./types.ts";
import { NoEventsFound } from "./state.ts";
import { IModalResult } from "./modal.ts";
import { fetchEventDatalinks, fetchWeeklyEvents, pushToDatalink, syncEditedEvents } from "./backendService.ts";
import { syncDatalinks } from "./datalinks.ts";

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
        ui.renderAllEvents();
    }
    var time = new Date(state.selected.time);
    time.setDate(time.getDate() + weeks * 7);
    loadForWeek(state, ui, time, changeWeek);
    // if (state.loadedWeeks.get(dateToWeekID(time)) == false) {
    //     fetchWeeklyEvents(ui.userTimezone, time).then((eventsReceived) => {
    //         importEvents(state, ui, eventsReceived);
    //         state.loadedWeeks.set(dateToWeekID(time), true);
    //         changeWeek(time);
    //     });
    // } else {
    //     changeWeek(time);
    // }
}

export function loadForWeek(state: IState, ui: IUI, timeOrWeek: Date | string, callback?: (time: Date) => void) {
    let week: string;
    let time: Date;
    if (typeof timeOrWeek !== "string") {
        week = dateToWeekID(timeOrWeek);
        time = timeOrWeek;
    } else {
        week = timeOrWeek;
        time = weekIDToDate(timeOrWeek);
    }
    
    const fetchEvents = state.loadedWeeks.get(week) === false
        ? fetchWeeklyEvents(ui.userTimezone, time)
        : Promise.resolve(null);
    
    const fetchDatalinks = state.datalinks.loadedWeeks.get(week) === false
        ? fetchEventDatalinks(ui.userTimezone, time)
        : Promise.resolve(null);

    Promise.all([fetchEvents, fetchDatalinks]).then(([eventsReceived, datalinksReceived]) => {
        if (eventsReceived) {
            importEvents(state, ui, eventsReceived);
            state.loadedWeeks.set(week, true);
        }
        if (datalinksReceived) {
            importDatalinks(state, ui, datalinksReceived);
            state.datalinks.loadedWeeks.set(week, true);
        }
        if (callback) {
            callback(time);
        }
    });
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
    let newEvent: IEventObj;
    const calendar = state.selected.calendar;
    const applicableDatalinks = state.datalinks.getApplicableDatalinks(calendar);

    if (applicableDatalinks.length > 0 && applicableDatalinks[0].eventTitleSourceProperty) {
        const datalinkSpec = applicableDatalinks[0];
        const modalOptionSets = Object.entries(datalinkSpec.properties)
            .filter(([key, _]) => key === datalinkSpec.eventTitleSourceProperty)
            .map(([key, value]) => ({
                titleText: key,
                value: key,
                allowFreeText: value.freeform,
                options: Array.isArray(value.options) 
                    ? value.options.map(option => ({...option, value: `${option.bigText} - ${option.smallText}`}))
                    : [{bigText: value.options, smallText: "", value: `${value.options} - `}]
            }));

        const modalConfig = {
            "title": "Add new event properties for datalink " + datalinkSpec.name,
            "modalOptionSet": modalOptionSets,
        };

        ui.showModal(modalConfig).then(results => {
            if (results) {
                const eventName = datalinkSpec.eventTitleSourceProperty 
                    ? results[datalinkSpec.eventTitleSourceProperty] 
                    : ui.promptUserForEventName();
                newEvent = state.addEvent(start, end, eventName.toString());
                ui.addEvent(newEvent);
                updateSelection(state);
            }
        });
    } else {
        const eventName = ui.promptUserForEventName();
        newEvent = state.addEvent(start, end, eventName);
        ui.addEvent(newEvent);
        updateSelection(state);
    }

    function updateSelection(state: IState) {
        if (state.selected.mode == "event") {
            state.selected.event = newEvent;
        } else if (state.selected.mode == "time") {
            state.selected.time = initializeSelectedTime(new Date(newEvent.end));
        }
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
    state.selected.calendar = result.calendarName.toString();
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

function syncCheck(state: IState) {
    let success = true
    if (state.editedEvents.created.length > 0) {
        alert("Sync anomaly: the following events were supposed to be created but were not present in the response from the server: " + state.editedEvents.created.map(e => e.title).join(", "));
        success = false
    }

    if (state.editedEvents.deleted.length > 0) {
        alert("Sync anomaly: the following events were supposed to be deleted but were not present in the response from the server: " + state.editedEvents.deleted.map(e => e.title).join(", "));
        success = false
    } 

    if (state.editedEvents.modified.length > 0) {
        alert("Sync anomaly: the following events were supposed to be modified but were not present in the response from the server: " + state.editedEvents.modified.map(e => e.title).join(", "));
        success = false
    }

    if (state.editedEvents.created.length != 0 || state.editedEvents.deleted.length != 0 || state.editedEvents.modified.length != 0) {
        console.assert(false, "Sync anomaly: there are still events in state.editedEvents after the sync");
        success = false
    }
    return success
}


export let eventSyncFlow = async function(state: IState, ui: IUI) {
    const result = await syncEditedEvents(state.editedEvents);
    
    for (let idMapping of result["created"]) {
        let old_id = idMapping["old_id"];
        let new_id = idMapping["new_id"];
        let event = state.getEventFromId(old_id);
        if (event != null) {
            // change the event id in state.eventDatalinks map if it exists:
            if (state.datalinks.getEventDatalink(event)) {
                const datalink = state.datalinks.getEventDatalink(event);
                if (datalink) {
                    state.datalinks.updateEventId(old_id, new_id);
                }
            }
            // THEN, update the event id
            event.id = new_id;
            // now, also change the event id in the calendar interface
            let interfaceEventObj = ui.getFullcalendarEventById(old_id);
            if (interfaceEventObj) {
                // @ts-ignore
                interfaceEventObj._def.publicId = new_id;
                // this weird ._def.publicId is apparently how non-Fullcalendar IDs are represented in Fullcalendar, and they need to be updated manually
            }
            // remove all successfully-created events from state.editedEvents.created
            state.editedEvents.created = state.editedEvents.created.filter(e => e.id != new_id);
        } else {
            alert("Sync anomaly: event with id " + old_id + " not found");
        }
    }

    for (let id of result["deleted"]) {
        state.editedEvents.deleted = state.editedEvents.deleted.filter(e => e.id != id);
    }

    for (let id of result["modified"]) {
        state.editedEvents.modified = state.editedEvents.modified.filter(e => e.id != id);
    }

    let success = syncCheck(state);
    if (success) {
        success = await syncDatalinks(state);
    }

    if (success) {
        ui.updateStatusBarEdits(true);
    } else {
        ui.updateStatusBarEdits();
    }
    ui.renderAllEvents();
}

export function importEvents(state: IState, ui: IUI, events: IEventObj[]) {
    let newEvents = events.filter(e => state.getEventFromId(e.id) == null);
    state.importEvents(newEvents);
    ui.interface.addEventSource(newEvents);
    newEvents.map(e => ui.interface.getEventById(e.id)).map(eventObj => ui.renderEvent(eventObj));
}

export function importDatalinks(state: IState, ui: IUI, rawDatalink: {[key: string]: any[]}) {
    let newDatalinks = [];
    for (let [datalink_name, datalinks] of Object.entries(rawDatalink)) {
        for (let rawEventDatalink of datalinks) {
            if (!rawEventDatalink.event || !rawEventDatalink.event.id) {
                console.error("importDatalinks received an invalid datalink structure:", rawEventDatalink);
                continue;
            }
            let event = state.getEventFromId(rawEventDatalink.event.id);
            if (event == null) {
                console.error("importDatalinks received a datalink for event " + rawEventDatalink.event.id + " but that event does not exist");
                continue;
            }
            let eventDatalink = {
                datalink_name: datalink_name,
                event: event,
                properties: rawEventDatalink.properties || {}
            }
            newDatalinks.push(eventDatalink);
        }
    }
    state.datalinks.importEventDatalinks(newDatalinks);
}


export function markEventFlow(state: IState, ui: IUI, event: IEventObj | null) {
    if (event == null) {
        alert("No event selected");
        return;
    }
    let applicableDatalinks = state.datalinks.getApplicableDatalinks(event.extendedProps?.calendar || "");
    if (applicableDatalinks.length == 0) {
        alert("No datalinks are configured for calendar " + event.extendedProps?.calendar + ".");
        return;
    }
    let datalinkSpec = applicableDatalinks[0];
    let modalOptionSets = [];
    for (let [key, value] of Object.entries(datalinkSpec.properties)) {
        // if the datalinkSpec.eventTitleSourceProperty is set to key, then we don't need to show this option
        if (datalinkSpec.eventTitleSourceProperty == key) {
            continue;
        }
        modalOptionSets.push({
            titleText: key,
            value: key,
            allowFreeText: value.freeform,
            // if value.options is a string s, convert it into {bigText: s, smallText: "", value: "s"}, otherwise use value.options as is
            options: Array.isArray(value.options) ? value.options : [{bigText: value.options, smallText: "", value: value.options}]
        });
    }
    let modalConfig = {
        "title": "Mark event '" + event.title + "' properties for datalink " + datalinkSpec.name,
        "modalOptionSet": modalOptionSets,
    }
    let results = ui.showModal(modalConfig);
    // await results and then log them
    results.then(results => {
        console.log(results);
        if (results == undefined) return;
        // If the datalinkSpec.eventTitleSourceProperty is set, set that property on results to be whatever the event title is
        if (datalinkSpec.eventTitleSourceProperty) {
            results[datalinkSpec.eventTitleSourceProperty] = event.title;
        }
        let datalink: IEventDatalink = {
            datalink_name: datalinkSpec.name,
            event: event,
            properties: results
        }
        state.datalinks.setEventDatalink(event, datalink);
        ui.updateStatusBarEdits();
        ui.renderEvent(event.id);
    });
}