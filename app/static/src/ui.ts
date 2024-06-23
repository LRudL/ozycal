import {ICalendar, IState, IUI} from "./types";


export class UI implements IUI {
    interface: ICalendar;
    state: IState;
    customCalendarColors: { [key: string]: string };

    constructor(calendarInterface: ICalendar, state: IState) {
        this.interface = calendarInterface;
        this.state = state;
        this.customCalendarColors = {};
    }

    setCalendarColors(calendarColors: { [key: string]: string }) {
        // merge with existing calendar colors
        this.customCalendarColors = { ...this.customCalendarColors, ...calendarColors };
        if (this.state && this.interface) {
            let fullCalendarEvents = this.interface.getEvents();
            fullCalendarEvents.forEach(event => {
                if (event.extendedProps.isOzycal) {
                    if (event.extendedProps.calendar && this.customCalendarColors[event.extendedProps.calendar]) {
                        event.setProp('backgroundColor', this.customCalendarColors[event.extendedProps.calendar]);
                    } else {
                        event.setProp('backgroundColor', "#0000ff");
                    }
                }
            });
        }
        console.assert(this.interface, "ui.interface is not initialized");
        this.interface.render();
    }

    promptUser(promptText: string) {
        return prompt(promptText);
    }

    updateSelectedTimeLine(time: Date) {
        if (this.state?.currentMode !== "time") {
            return;
        }
        var nowLineEvent = this.interface?.getEventById('selected-time');

        if (nowLineEvent) {
            nowLineEvent.setStart(time);
            nowLineEvent.setEnd(new Date(time.getTime() + 60000)); // Ensure the end time is updated to maintain 1 minute duration
        } else {
            this.enableSelectedTimeLine();
        }
        this.interface?.render();
    }

    enableSelectedTimeLine() {
        console.assert(this.interface?.getEventById("selected-time") == null, "selected-time event should not exist");
        this.interface?.addEvent({
            id: 'selected-time',
            start: this.state?.selectedTime,
            end: new Date(this.state?.selectedTime.getTime() + 60000), // 1 minute duration
            className: 'selected-time',
        });
        this.interface?.render();
    }

    disableSelectedTimeLine() {
        var nowLineEvent = this.interface?.getEventById("selected-time");
        if (nowLineEvent) {
            nowLineEvent.remove();
        }
        this.interface?.render();
    }

    updateSelectedEvent() {
        // this does nothing because currently handled by fullcalendar magic
        this.interface?.render();
        return;
    }

    promptUserForEventName() {
        var eventName = this.promptUser("Enter the name of the event:");
        if (eventName == null) {
            return ""
        }
        return eventName;
    }

    addEvent(newEvent: any) {
        this.interface?.addEvent(newEvent);
    }
}