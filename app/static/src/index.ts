import {State} from "./state.ts"
import {UI} from "./ui.ts"
import {KeyState} from "./keys.ts"
import { ICalendar, IState, IUI } from "./types.ts";

let calendar : ICalendar;
let state : IState;
let ui : IUI;
let keystate : KeyState;
window.state = state // this is useful so that it shows up in browser console when debugging
window.ui = ui
window.keystate = keystate

function eventClassNames(arg) {
    var event = arg.event;
    var classNames = [];
    if (state.currentMode === 'event' && state.selectedEvent && event.id === state.selectedEvent.id) {
        classNames.push('fc-event-selected');
    }
    return classNames;
}

document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');

    function createCalendar(time: Date) {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            firstDay: 1,
            eventClick: function(info) {
                state.selectedEvent = state.getEventFromId(info.event._def.publicId);
                // ^ this is some fullcalendar randomness; info.event is not the same as the event object
                state.selectedTime = new Date(state.selectedEvent.end);
                ui.updateSelectedTimeLine(state.selectedTime);
                calendar.render();
            },
            eventClassNames: eventClassNames,
            nowIndicator: true,
            now: new Date(),
            height: "auto",
            headerToolbar: false
        });
        calendar.addEventSource(state.events);
        calendar.render()
        return calendar;
    }

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventsPromise = fetch(`/api/weekly_events?timezone=${encodeURIComponent(userTimezone)}`)
        .then(response => response.json())
        .then(eventsReceived => {
            state = new State(new Date());
            state.importEvents(eventsReceived);
            calendar = createCalendar(state.selectedTime);
            ui = new UI(calendar, state);
            keystate = new KeyState(state, ui);
            document.addEventListener('keydown', keystate.handleKeyPress.bind(keystate));
            ui.enableSelectedTimeLine();
        })
        .catch(error => console.error('Error loading events:', error));

    const colorsPromise = fetch(`/api/calendar_colors`)
        .then(response => response.json())
        .catch(error => console.error('Error loading calendar colors:', error));

    eventsPromise.then(() => {
        colorsPromise.then(calendarColors => {
            ui.setCalendarColors(calendarColors);
        });
    });
});
