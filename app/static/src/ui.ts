import { EventApi } from "@fullcalendar/core";

import { ICalendar, IDatalinkSpec, IEventObj, IKeyState, IState, IUI } from "./types";
import { IModalConfig, IModalResult, Modal } from "./modal";
import { getContrastYIQ, timeConvert, weekIDToDate } from "./utils";

const DEFAULT_CALENDAR_COLOR = "#E5E5E5";


export class UI implements IUI {
    interface: ICalendar;
    state: IState;
    customCalendarColors: { [key: string]: string };
    userTimezone: string;
    datalinkSpecs: IDatalinkSpec[];
    eventCustomClasses: Map<string, string[]>;

    constructor(calendarInterface: ICalendar, state: IState, userTimezone: string) {
        this.interface = calendarInterface;
        this.state = state;
        this.customCalendarColors = {};
        this.userTimezone = userTimezone;
        this.datalinkSpecs = [];
        this.eventCustomClasses = new Map();
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

    selectedWeekUpdate(week: string) {
        let date = weekIDToDate(week);
        this.interface.gotoDate(date);
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

    getFullcalendarEventById(id: string) {
        return this.interface.getEvents().find(event => event._def.publicId === id);
    }

    timeVisible(time: Date | string) {
        time = timeConvert(time);
        let start = this.interface.view.activeStart;
        let end = this.interface.view.activeEnd;
        return time >= start && time <= end;
    }

    renderAllEvents() {
        for (let event of this.state.events) {
            if (this.timeVisible(event.start) || this.timeVisible(event.end)) {
                this.renderEvent(event.id, true);
            }
        }
        this.interface.render();
    }

    renderEvent(eventOrId: string | EventApi, skipInterfaceRender: boolean = false) {
        let event: EventApi;
        let id: string;
        if (typeof eventOrId === 'string') {
            id = eventOrId;
            event = this.getFullcalendarEventById(eventOrId);
            if (!event) {
                console.error("Event not found: " + eventOrId);
                return;
            }
        } else {
            // @ts-ignore
            id = eventOrId._def.publicId;
            event = eventOrId;
        }
        this.colorEventByCalendar(event);
        this.styleEventByBackgroundLightness(event);
        let customClasses = this.styleEventByDatalinks(id, event);
        customClasses = customClasses.concat(this.styleEventBySyncStatus(id, event));
        this.eventCustomClasses.set(id, customClasses);
        if (!skipInterfaceRender) {
            this.interface.render();
        }
    }

    colorEventByCalendar(event: EventApi) {
        // This function does not use the custom class -setting based method, because for some reason fullcalenadr allows setting backgroundColor directly but not other style properties; also would be annoying to make classes for all the different colors
        if (event.extendedProps?.isOzycal) {
            if (event.extendedProps.calendar && this.customCalendarColors[event.extendedProps.calendar]) {
                event.setProp('backgroundColor', this.customCalendarColors[event.extendedProps.calendar]);
            } else {
                event.setProp('backgroundColor', DEFAULT_CALENDAR_COLOR);
            }
        }
    }

    styleEventByBackgroundLightness(event: EventApi) {
        var backgroundColor = event.backgroundColor 
        if (backgroundColor == null) {
            return;
        }
        var textColor = getContrastYIQ(backgroundColor);
        event.setProp('textColor', textColor);
    }
 

    styleEventBySyncStatus(eventId: string, event: EventApi) {
        const eventSynced = !(this.state.editedEvents.created.map(event => event.id).includes(eventId) || this.state.editedEvents.modified.map(event => event.id).includes(eventId) || this.state.editedEvents.deleted.map(event => event.id).includes(eventId));
        if (!eventSynced) {
            return ['event-unsynced'];
        }
        return [];
    }

    styleEventByDatalinks(eventId: string, event: EventApi) {
        const datalinkExists = Array.from(this.state.datalinks.eventDatalinks.keys()).includes(eventId);
        const datalinkUnsynced = this.state.datalinks.eventsWithNewDatalinks.has(eventId);
        
        let customClasses: string[] = [];
        
        if (datalinkExists) {
            if (datalinkUnsynced) {
                customClasses.push('datalink-unsynced');
            } else {
                customClasses.push('datalink-synced');
            }
        } else {
            if (this.state.datalinks.getApplicableDatalinks(event.extendedProps.calendar).length > 0) {
                customClasses.push('datalink-unset');
            }
        }
        
        return customClasses;
    }

    setCalendarColors(calendarColors: { [key: string]: string }) {
        // merge with existing calendar colors
        this.customCalendarColors = { ...this.customCalendarColors, ...calendarColors };
        if (this.state && this.interface) {
            let fullCalendarEvents = this.interface.getEvents();
            fullCalendarEvents.forEach((event: EventApi) => {
                this.renderEvent(event);
            });
        }
        console.assert(this.interface, "ui.interface is not initialized");
        this.interface.render();
    }

    setDatalinks(datalinkSpecs: IDatalinkSpec[]): void {
        this.datalinkSpecs = datalinkSpecs;
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
        this.renderEvent(interfaceEventObj);
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

    updateStatusBarEdits(flash=false) {
        let editscol = document.getElementById("editscol");
        if (editscol) {
            let unsyncedChanges = [];
            if (this.state.editedEvents.created.length > 0) {
                unsyncedChanges.push(this.state.editedEvents.created.length + "C");
            }
            if (this.state.editedEvents.modified.length > 0) {
                unsyncedChanges.push(this.state.editedEvents.modified.length + "M");
            }
            if (this.state.editedEvents.deleted.length > 0) {
                unsyncedChanges.push(this.state.editedEvents.deleted.length + "D");
            }
            if (this.state.datalinks.eventsWithNewDatalinks.size > 0) {
                unsyncedChanges.push(this.state.datalinks.eventsWithNewDatalinks.size + " Datalinks");
            }
            editscol.innerText = unsyncedChanges.length > 0 ? "Unsynced changes: " + unsyncedChanges.join(" | ") : "No unsynced changes";
        }
        if (flash && editscol) {
            editscol.style.backgroundColor = "green";
            setTimeout(() => {
                editscol.style.backgroundColor = "";
            }, 1000);
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