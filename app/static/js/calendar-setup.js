import {state, initializeState} from "./state.js"
import {ui, initializeUi} from "./ui.js"
import {keystate, initializeKeystate} from "./keys.js"
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
                state.selectedEvent = info.event;
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
        calendar.addEvent({
            id: 'selected-time',
            start: time,
            end: new Date(time.getTime() + 60000), // 1 minute duration
            className: 'selected-time',
        });
        calendar.render()
        console.log(state)
        return calendar;
    }

    document.addEventListener('keydown', keystate.handleKeyPress.bind(keystate));

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/weekly_events?timezone=${encodeURIComponent(userTimezone)}`)
        .then(response => response.json())
        .then(eventsReceived => {
            state.events = eventsReceived; // this variable is used by createCalendar
            // sort the events by .start
            state.sortEvents()
            initializeState(state, new Date())
            calendar = createCalendar(state.selectedTime);
            initializeUi(calendar, state)
            initializeKeystate(state, ui)
        })
        .catch(error => console.error('Error loading events:', error));
});
