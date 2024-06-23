import { Calendar, EventContentArg, EventClickArg } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';

import {State} from "./state.ts"
import {UI} from "./ui.ts"
import {KeyState} from "./keys.ts"
import { ICalendar, IEventObj, IState, IUI } from "./types.ts";

interface EventClassNamesArg {
    event: IEventObj;
}

document.addEventListener('DOMContentLoaded', function() {
    function createCalendar(time: Date, state: IState) {
        function eventClassNames(arg: EventContentArg) {
            var event = arg.event;
            var classNames = [];
            if (state.currentMode === 'event' && state.selectedEvent && event.id === state.selectedEvent.id) {
                classNames.push('fc-event-selected');
            }
            return classNames;
        }
        var calendarEl = document.getElementById('calendar');
        if (calendarEl == null) {
            throw new Error("Calendar element not found");
        }
        let calendar = new Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            plugins: [timeGridPlugin],
            firstDay: 1,
            // eventClick: null, // this is set below
            eventClassNames: eventClassNames,
            nowIndicator: true,
            now: time,
            height: "auto",
            headerToolbar: false
        });
        calendar.addEventSource(state.events);
        calendar.render()
        return calendar;
    }

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventsPromise = fetch(`/api/weekly_events?timezone=${encodeURIComponent(userTimezone)}`)
        .then(response => response.json());

    const colorsPromise = fetch(`/api/calendar_colors`)
        .then(response => response.json())
        .catch(error => console.error('Error loading calendar colors:', error));

    Promise.all([eventsPromise, colorsPromise])
        .then(([eventsReceived, calendarColors]) => {
            let state = new State(new Date());
            state.importEvents(eventsReceived);
            let calendar = createCalendar(state.selectedTime, state);
            let ui = new UI(calendar, state);
            calendar.setOption("eventClick", function(info: EventClickArg) {
                state.selectedEvent = state.getEventFromId(info.event.id);
                if (state.selectedEvent != null) {
                    state.selectedTime = new Date(state.selectedEvent.end);
                }
                ui.updateSelectedTimeLine(state.selectedTime);
                calendar.render();
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
                ui.setCalendarColors(calendarColors);
            }
        })
        .catch(error => console.error('Error loading data:', error));
});
