import { Calendar, EventContentArg, EventClickArg, EventChangeArg } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { EventDragStopArg } from '@fullcalendar/interaction';

import { State } from "./state.ts"
import { UI } from "./ui.ts"
import { KeyState } from "./keys.ts"
import { IEventObj, IState } from "./types.ts";
import { fetchWeeklyEvents, fetchColors, fetchDatalinks } from "./backendService.ts";
import { importEvents, loadForWeek } from './actions.ts';

document.addEventListener('DOMContentLoaded', function() {
    function createCalendar(time: Date, state: IState) {
        function eventClassNames(arg: EventContentArg) {
            var event = arg.event;
            var classNames = [];
            if (state.selected.mode === 'event' && state.selected.event && event.id === state.selected.event.id) {
                classNames.push('fc-event-selected');
            }

            if (state.ui != null) {
                const customClasses = state.ui.eventCustomClasses.get(event.id);
                if (customClasses != null) {
                    classNames.push(...customClasses);
                }
            }

            return classNames;
        }
        var calendarEl = document.getElementById('calendar');
        if (calendarEl == null) {
            throw new Error("Calendar element not found");
        }
        let calendar = new Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            weekNumbers: true,
            plugins: [timeGridPlugin, interactionPlugin],
            firstDay: 1,
            // eventClick: null, // this is set below
            eventClassNames: eventClassNames,
            dayHeaderClassNames: function(arg) {
                if (arg.isToday) {
                return ['current-day-header'];
                }
                return [];
            },
            nowIndicator: true,
            now: time,
            height: "auto",
            headerToolbar: false,
            editable: true,
            eventStartEditable: true,
            eventResizableFromStart: true,
            eventDurationEditable: true,
            snapDuration: "00:15:00"
        });
        calendar.addEventSource(state.events);
        calendar.render()
        return calendar;
    }

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const colorsPromise = fetchColors();
    const datalinksPromise = fetchDatalinks();

    let time = new Date();
    let state = new State(time, []);
    let calendar = createCalendar(time, state);
    let ui = new UI(calendar, state, userTimezone);

    // Create a promise for loadForWeek
    const loadForWeekPromise = new Promise<void>((resolve) => {
        loadForWeek(state, ui, time, () => resolve());
    });

    // Wait for all promises to resolve
    Promise.all([loadForWeekPromise, colorsPromise, datalinksPromise])
        .then(([_, calendarColors, datalinksReceived]) => {
            let isInitialLoad = true;
            state.datalinks.addDatalinkSpecs(datalinksReceived);
            state.connectUI(
                ui,
                ui.selectedModeUpdate.bind(ui),
                ui.selectedTimeUpdate.bind(ui),
                ui.selectedEventUpdate.bind(ui),
                ui.selectedCalendarUpdate.bind(ui),
                ui.editedEventsUpdate.bind(ui),
                ui.selectedWeekUpdate.bind(ui)
            );
            calendar.setOption("eventClick", function(info: EventClickArg) {
                state.selected.event = state.getEventFromId(info.event.id);
                if (state.selected.event != null) {
                    state.selected.time = new Date(state.selected.event.end);
                }
                ui.updateSelectedTimeLine(state.selected.time);
                calendar.render();
            });
            calendar.setOption("eventChange", function(info: EventChangeArg) {
                if (isInitialLoad) {
                    // otherwise, eventChange will be triggered during event import for each event
                    return;
                }
                const updatedEvent = info.event;
                const stateEvent = state.getEventFromId(updatedEvent.id);
                let props : Partial<IEventObj> = {}
                if (stateEvent != null) {
                    if (updatedEvent.start != null && updatedEvent.start.getTime() != new Date(stateEvent.start).getTime()) {
                        props["start"] = updatedEvent.start.toISOString();
                    }
                    if (updatedEvent.end != null && updatedEvent.end.getTime() != new Date(stateEvent.end).getTime()) {
                        props["end"] = updatedEvent.end.toISOString();
                    }
                }
                if (Object.keys(props).length > 0) {
                    state.modifyEvent(updatedEvent.id, props);
                }
            });
            let keystate = new KeyState(state, ui);
            document.addEventListener('keydown', keystate.handleKeyPress.bind(keystate));
            ui.enableSelectedTimeLine();
            // This is useful so that these variables show up in the browser console when debugging
            (window as any).state = state; 
            (window as any).ui = ui;
            (window as any).keystate = keystate;
            (window as any).calendar = calendar;

            if (calendarColors) {
                (window as any).calendarColors = calendarColors;
                ui.setCalendarColors(calendarColors);
                state.setCalendarNameOptions(Object.keys(calendarColors));
            }
            ui.updateStatusBar(keystate);
            isInitialLoad = false;
        })
        .catch(error => console.error('Error loading data:', error));
});