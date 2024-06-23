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
    events: any[];
    editedEvents: {
        created: any[];
        deleted: any[];
        modified: any[];
    };
    selectedTime: Date;
    selectedEvent: any;
    importEvents: (events: IEventObj[]) => void;
    checkWellFormedness: () => void;
    getNextEvent: (time: Date | string, on_fail?: string, comparison?: string) => any;
    getPreviousEvent: (time: Date | string, on_fail?: string, comparison?: string) => any;
    getEventsContaining: (time: Date | string) => any[];
    getEventsOverlappingRange: (start: Date | string, end: Date | string) => any[];
    getEventsWithinRange: (start: Date | string, end: Date | string) => any[];
    getClosestEvent: (time: Date | string, metric_fn?: (event: any) => string) => any;
    getEventFromTime: (targetTime: Date | string, metric?: string) => any;
    getEventFromId: (id: string) => any;
    getContiguousEvents: (event: any) => any[];
    getNextNoncontiguousEvent: (event: any) => any;
    getPreviousNoncontiguousEvent: (time: Date | string) => any;
    addEvent: (start: Date | string, end: Date | string, title: string, id?: string) => any;
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
    updateSelectedEvent(): void;
    promptUserForEventName(): string;
    addEvent(newEvent: any): void;
}
