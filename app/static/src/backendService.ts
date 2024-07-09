import { IState, IStateEditedEvents, IUI, SyncResult } from "./types";

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