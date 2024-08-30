import { EventApi } from "@fullcalendar/core";
import { IModalOption, IModalResult, IModalConfig } from "./modal";
import { DefaultMap } from "./utils";

export interface IEventObj {
    start:  string;
    end:  string;
    title: string;
    id: string;
    extendedProps?: {
        isOzycal?: boolean;
        calendar?: string;
    };
}


export interface ICalendar {
    getEvents: () => any[];
    getEventById: (id: string) => any;
    addEvent: (event: any) => void;
    render: () => void;
    addEventSource: (source: IEventObj[]) => void;
    removeAllEventSources: () => void;
    gotoDate: (date: Date | string) => void;
    view: {
        activeStart: Date;
        activeEnd: Date;
    };
}

export interface IStateEditedEvents {
    created: IEventObj[];
    deleted: IEventObj[];
    modified: IEventObj[];
}

export interface IState {
    events: IEventObj[];
    selected: {
        mode: string,
        time: Date,
        event: null | IEventObj,
        calendar: string,
        week: string,
    };
    ui: IUI | null;
    datalinks: IDatalinks;
    loadedWeeks: DefaultMap<string, boolean>,
    calendarNames: string[];
    editedEvents: IStateEditedEvents;
    uiUpdateTriggers: {
        selectedModeUpdate: (mode: string) => void;
        selectedTimeUpdate: (time: Date) => void;
        selectedEventUpdate: (event: IEventObj | null) => void;
        editedEventsUpdate: (editedEvents: {created: IEventObj[], deleted: IEventObj[], modified: IEventObj[]}) => void;
        selectedWeekUpdate: (week: string) => void;
    };
    importEvents: (events: IEventObj[]) => void;
    getNextEvent: (time: Date | string, on_fail?: string, comparison?: string) => IEventObj | null;
    getPreviousEvent: (time: Date | string, on_fail?: string, comparison?: string) => IEventObj | null;
    getEventsContaining: (time: Date | string) => IEventObj[];
    getEventsOverlappingRange: (start: Date | string, end: Date | string) => IEventObj[];
    getEventsWithinRange: (start: Date | string, end: Date | string) => IEventObj[];
    getClosestEvent: (time: Date | string, metric_fn?: (event: any) => string) => IEventObj | null;
    getEventFromTime: (targetTime: Date | string, metric?: string) => IEventObj | null;
    getEventFromId: (id: string) => IEventObj | null;
    getContiguousEvents: (event: any) => IEventObj[];
    getNextNoncontiguousEvent: (event: any) => IEventObj | null;
    getPreviousNoncontiguousEvent: (time: Date | string) => IEventObj | null;
    addEvent: (start: Date | string, end: Date | string, title: string, id?: string) => IEventObj;
    deleteEvent: (event: any) => void;
    sortEvents: () => void;
    updateSelectedEventFromSelectedTime: () => void;
    updateSelectedTimeFromSelectedEvent: () => void;
}

export interface IDatalinks {
    datalinkSpecs: IDatalinkSpec[];
    eventDatalinks: Map<string, IEventDatalink>;
    eventsWithNewDatalinks: Set<string>;
    loadedWeeks: DefaultMap<string, boolean>;
    addDatalinkSpecs: (datalinkSpecs: IDatalinkSpec[]) => void;
    getApplicableDatalinks: (calendarName: string) => IDatalinkSpec[];
    getEventDatalink: (event: IEventObj) => IEventDatalink | null;
    updateEventId: (old_id: string, new_id: string) => void;
    importEventDatalinks: (datalinks: IEventDatalink[]) => void;
    setEventDatalink: (event: IEventObj, datalink: IEventDatalink) => void;
    getEventDatalinkName: (eventID: string) => string | null;
    toEventDatalinkPushes: () => IEventDatalink[];
}

export interface IUI {
    interface: ICalendar;
    state: IState;
    userTimezone: string;
    customCalendarColors: { [key: string]: string };
    eventCustomClasses: Map<string, string[]>;
    timeVisible(time: Date): boolean;
    renderEvent(eventOrId: string | EventApi, skipInterfaceRender?: boolean): void;
    colorEventByCalendar(event: EventApi): void;
    getFullcalendarEventById(id: string): EventApi | null;
    styleEventByDatalinks(eventId: string, event: EventApi): void;
    setCalendarColors(calendarColors: { [key: string]: string }): void;
    renderAllEvents(): void;
    showModal(modalConfig: IModalConfig): Promise<IModalResult | undefined>;
    promptUser(promptText: string): string | null;
    promptUserForSelectedCalendar(): Promise<IModalResult | undefined>;
    updateSelectedTimeLine(time: Date): void;
    enableSelectedTimeLine(): void;
    disableSelectedTimeLine(): void;
    updateSelectedEvent(event: IEventObj | null): void;
    promptUserForEventName(): string;
    addEvent(newEvent: any): void;
    updateStatusBar(keystate: IKeyState | null): void;
    updateStatusBarMode(): void;
    updateStatusBarKey(keystate: IKeyState): void;
    updateStatusBarSelected(): void;
    updateStatusBarEdits(flash?: boolean): void;
}

export interface IKeybind {
    keyseq: string[];
    action: (state: IState, ui: IUI, num?: number) => void;
}

export interface IKeySeqParse {
    number: number | boolean;
    validKeybinds: IKeybind[];
}


export interface IKeyState {
    seq: string[];
    ui: IUI;
    state: IState;
    handleKeyPress(key: KeyboardEvent): void;
    parseSeq(seq: string): IKeySeqParse;
}

export interface SyncResult {
    created: {old_id: string, new_id: string}[];
    deleted: string[];
    modified: string[];
}

export interface IDatalinkSpec {
    name: string;
    calendars: string[];
    eventTitleSourceProperty: string | null;
    properties: { [key: string]: IDatalinkField };
}

export interface IDatalinkField {
    options: IDatalinkFieldOption[] | string;
    freeform: boolean;
}

export type IDatalinkFieldOption = IModalOption;

export interface IEventDatalink {
    datalink_name: string;
    event: IEventObj;
    properties: { [key: string]: string | number};
}