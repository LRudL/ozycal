import {EventApi} from "@fullcalendar/core";

import {ICalendar, IEventObj, IKeyState, IState, IUI} from "./types";
import {IModalConfig, IModalResult, Modal} from "./modal";


export class UI implements IUI {
    interface: ICalendar;
    state: IState;
    customCalendarColors: { [key: string]: string };

    constructor(calendarInterface: ICalendar, state: IState) {
        this.interface = calendarInterface;
        this.state = state;
        this.customCalendarColors = {};
    }

    selectedTimeUpdate(time: Date) {
        this.updateSelectedTimeLine(time);
        this.updateStatusBarSelected();
    }

    selectedEventUpdate(event: IEventObj | null) {
        this.updateSelectedEvent(event);
        this.updateStatusBarSelected();
    }

    selectedCalendarUpdate(calendar: string) {
        this.updateStatusBarCalendar();
    }

    selectedModeUpdate(mode: string) {
        this.updateStatusBarMode();
        if (mode == "time") {
            this.enableSelectedTimeLine();
        } else if (mode == "event") {
            this.disableSelectedTimeLine();
        } else {
            throw new Error("UI cannot handle the mode: " + mode);
        }
        this.updateStatusBarSelected();
    }

    editedEventsUpdate(editedEvents: { created: IEventObj[], modified: IEventObj[], deleted: IEventObj[] }) {
        this.updateStatusBarEdits();
    }

    colorEvent(event: EventApi) {
        if (event.extendedProps.isOzycal) {
            if (event.extendedProps.calendar && this.customCalendarColors[event.extendedProps.calendar]) {
                event.setProp('backgroundColor', this.customCalendarColors[event.extendedProps.calendar]);
            } else {
                event.setProp('backgroundColor', "#0000ff");
            }
        }
    }

    setCalendarColors(calendarColors: { [key: string]: string }) {
        // merge with existing calendar colors
        this.customCalendarColors = { ...this.customCalendarColors, ...calendarColors };
        if (this.state && this.interface) {
            let fullCalendarEvents = this.interface.getEvents();
            fullCalendarEvents.forEach((event: EventApi) => {
                this.colorEvent(event);
            });
        }
        console.assert(this.interface, "ui.interface is not initialized");
        this.interface.render();
    }

    promptUser(promptText: string) {
        return prompt(promptText);
    }

    showModal(modalConfig: IModalConfig) {
        let modal = new Modal(modalConfig);
        return modal.show();
    }

    updateSelectedTimeLine(time: Date) {
        if (this.state.selected.mode !== "time") {
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
            start: this.state?.selected.time,
            end: new Date(this.state?.selected.time.getTime() + 60000), // 1 minute duration
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

    updateSelectedEvent(event: IEventObj | null) {
        // this does nothing because currently handled by fullcalendar magic
        this.interface.render();
        return;
    }

    promptUserForEventName() {
        var eventName = this.promptUser("Enter the name of the event:");
        if (eventName == null) {
            return ""
        }
        return eventName;
    }

    promptUserForSelectedCalendar(): Promise<IModalResult | undefined> {
        let modalOptions = this.state.calendarNames.map(calendarName => ({
            bigText: calendarName,
            smallText: "",
            value: calendarName
        }));
        let modalResult = this.showModal({
            modalOptionSet: [{
                titleText: "Calendar",
                helpText: "Select a calendar to switch to",
                value: "calendarName",
                allowFreeText: false,
                options: modalOptions
            }]
        });
        return modalResult;
    }

    addEvent(newEvent: IEventObj) {
        if (!newEvent.extendedProps) {
            newEvent.extendedProps = {};
        }
        newEvent.extendedProps.isOzycal = true;
        let interfaceEventObj: EventApi | void = this.interface?.addEvent(newEvent);
        // if interfaceEventObj is void, return
        if (interfaceEventObj === undefined) return;
        this.colorEvent(interfaceEventObj);
    }

    updateStatusBarMode() {
        // get td element with id "modecol"
        let modecol = document.getElementById("modecol");
        if (modecol) {
            modecol.innerText = "Mode: " + this.state.selected.mode;
        }
    }

    updateStatusBarKey(keystate: IKeyState) {
        let keycol = document.getElementById("keycol");
        if (keycol) {
            keycol.innerText = keystate.seq.join("");
        }
    }

    updateStatusBarSelected() {
        let timecol = document.getElementById("selectedcol");
        if (timecol) {
            let selectedTimeText = this.state.selected.time.toISOString().split("T")[0] + " " + this.state.selected.time.toLocaleTimeString().slice(0, 5);
            let selectedEventText = this.state.selected.event ? this.state.selected.event.title : "(NO EVENT SELECTED)";
            if (this.state.selected.mode == "time") {
                selectedTimeText = "<b>" + selectedTimeText + "</b>";
            } else if (this.state.selected.mode == "event") {
                selectedEventText = "<b>" + selectedEventText + "</b>";
            }
            timecol.innerHTML = "Selected: " + selectedTimeText + " | " + selectedEventText;
        }
    }

    updateStatusBarEdits() {
        let editscol = document.getElementById("editscol");
        if (editscol) {
            editscol.innerText = "Unsynced changes: " + this.state.editedEvents.created.length + "C | " + this.state.editedEvents.modified.length + "M | " + this.state.editedEvents.deleted.length + "D";
        }
    }

    updateStatusBarCalendar() {
        let calendarcol = document.getElementById("calendarcol");
        if (calendarcol) {
            calendarcol.innerText = "Calendar: " + this.state.selected.calendar;
        }
    }

    updateStatusBar(keystate: IKeyState | null = null) {
        this.updateStatusBarMode();
        if (keystate !== null) {
            this.updateStatusBarKey(keystate);
        }
        this.updateStatusBarSelected();
        this.updateStatusBarEdits();
        this.updateStatusBarCalendar();
    }
}