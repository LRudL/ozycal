export interface IEventObj {
    start:  string;
    end:  string;
    title: string;
    id: string;
}


export interface ICalendar {
    getEvents: () => any[];
    getEventById: (id: string) => any;
    addEvent: (event: any) => void;
    render: () => void;
    addEventSource: (source: IEventObj[]) => void;
}

export interface IState {
    currentMode: string;
    events: IEventObj[];
    editedEvents: {
        created: any[];
        deleted: any[];
        modified: any[];
    };
    selectedTime: Date;
    selectedEvent: any;
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
    updateSelectedTimeLine(time: Date): void;
    enableSelectedTimeLine(): void;
    disableSelectedTimeLine(): void;
    updateSelectedEvent(event: IEventObj | null): void;
    promptUserForEventName(): string;
    addEvent(newEvent: any): void;
}
