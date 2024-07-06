import { IModalResult } from "./modal";

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
}

export interface IState {
    events: IEventObj[];
    selected: {
        mode: string,
        time: Date,
        event: null | IEventObj,
        calendar: string,
    },
    calendarNames: string[];
    editedEvents: {
        created: IEventObj[];
        deleted: IEventObj[];
        modified: IEventObj[];
    };
    uiUpdateTriggers: {
        selectedModeUpdate: (mode: string) => void;
        selectedTimeUpdate: (time: Date) => void;
        selectedEventUpdate: (event: IEventObj | null) => void;
        editedEventsUpdate: (editedEvents: {created: IEventObj[], deleted: IEventObj[], modified: IEventObj[]}) => void;
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

export interface IUI {
    interface: ICalendar;
    state: IState;
    customCalendarColors: { [key: string]: string };

    setCalendarColors(calendarColors: { [key: string]: string }): void;
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
    updateStatusBarEdits(): void;
}

export interface IKeybind {
    keyseq: string[];
    action: (state: IState, ui: IUI) => void;
}

export interface IKeyState {
    seq: string[];
    ui: IUI;
    state: IState;
    getValid(): IKeybind[];
    handleKeyPress(key: KeyboardEvent): void;
}