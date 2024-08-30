import { IDatalinkSpec, IEventDatalink, IEventObj, IState, IStateEditedEvents, IUI, SyncResult } from "./types";

export async function syncEditedEvents(editedEvents: IStateEditedEvents): Promise<SyncResult> {
    const response = await fetch('/api/update_events', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedEvents),
    });
    let result = await response.json() as SyncResult;
    console.log("Sync result:", result);
    return result;
}

export async function fetchWeeklyEvents(timezone: string, time?: Date): Promise<any> {
    console.log("Fetching events for the week surrounding the time: ", time)
    if (time) {
        const response = await fetch(`/api/weekly_events?timezone=${encodeURIComponent(timezone)}&time=${encodeURIComponent(time.toISOString())}`);
        return response.json();
    } else {
        const response = await fetch(`/api/weekly_events?timezone=${encodeURIComponent(timezone)}`);
        return response.json();
    }
}

export async function fetchColors(): Promise<any> {
    console.log("Fetching calendar colors")
    try {
        const response = await fetch(`/api/calendar_colors`);
        return response.json();
    } catch (error) {
        console.error('Error loading calendar colors:', error);
        return null;
    }
}

export async function fetchDatalinks(): Promise<IDatalinkSpec[]> {
    const response = await fetch(`/api/datalinks`);
    return response.json() as Promise<IDatalinkSpec[]>;
}

export async function fetchEventDatalinks(timezone: string, time?: Date): Promise<any> {
    if (time) {
        const response = await fetch(`/api/weekly_event_datalinks?timezone=${encodeURIComponent(timezone)}&time=${encodeURIComponent(time.toISOString())}`);
        return response.json();
    } else {
        const response = await fetch(`/api/weekly_event_datalinks?timezone=${encodeURIComponent(timezone)}`);
        return response.json();
    }
}

export async function pushToDatalink(datalinks: IEventDatalink[]) {
    const response = await fetch('/api/event_datalink_push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(datalinks),
    });
    return response.json();
}

// add every function in this file to window (to help with debugging routes)
declare global {
    interface Window {
        syncEditedEvents: typeof syncEditedEvents;
        fetchWeeklyEvents: typeof fetchWeeklyEvents;
        fetchColors: typeof fetchColors;
        fetchDatalinks: typeof fetchDatalinks;
        fetchEventDatalinks: typeof fetchEventDatalinks;
        pushToDatalink: typeof pushToDatalink;
    }
}

window.syncEditedEvents = syncEditedEvents;
window.fetchWeeklyEvents = fetchWeeklyEvents;
window.fetchColors = fetchColors;
window.fetchDatalinks = fetchDatalinks;
window.fetchEventDatalinks = fetchEventDatalinks;
window.pushToDatalink = pushToDatalink;
