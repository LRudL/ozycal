import {state, initializeState} from "./state.ts"
import {ui, initializeUi} from "./ui.ts"
import {keystate, initializeKeystate} from "./keys.ts"
window.state = state // this is useful so that it shows up in browser console when debugging
window.ui = ui
window.keystate = keystate

var calendar;


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

    function createCalendar(time) {
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

    document.addEventListener('keydown', keystate.handleKeyPress.bind(keystate));

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventsPromise = fetch(`/api/weekly_events?timezone=${encodeURIComponent(userTimezone)}`)
        .then(response => response.json())
        .then(eventsReceived => {
            state.events = eventsReceived; // this variable is used by createCalendar
            // sort the events by .start
            state.sortEvents();
            initializeState(state, new Date());
            calendar = createCalendar(state.selectedTime);
            initializeUi(calendar, state);
            initializeKeystate(state, ui);
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
