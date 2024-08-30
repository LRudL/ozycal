import { IDatalinkSpec, IEventObj, IDatalinks, IEventDatalink, IState } from "./types";
import { DefaultMap } from "./utils";
import { pushToDatalink } from "./backendService";

export class Datalinks implements IDatalinks {
    datalinkSpecs: IDatalinkSpec[];
    eventDatalinks: Map<string, IEventDatalink>;
    eventsWithNewDatalinks: Set<string>;
    loadedWeeks: DefaultMap<string, boolean>;

    constructor(datalinks: IDatalinkSpec[]) {
        this.datalinkSpecs = datalinks;
        this.eventDatalinks = new Map();
        this.eventsWithNewDatalinks = new Set();
        this.loadedWeeks = new DefaultMap(() => false);
    }

    addDatalinkSpecs(datalinkSpecs: IDatalinkSpec[]) {
        // make sure to not duplicate datalink specs with the same names
        this.datalinkSpecs = this.datalinkSpecs.filter(datalink => !datalinkSpecs.some(d => d.name === datalink.name));
        this.datalinkSpecs.push(...datalinkSpecs);
    }

    getApplicableDatalinks(calendarName: string): IDatalinkSpec[] {
        return this.datalinkSpecs.filter(datalink => datalink.calendars.includes(calendarName));
    }

    getEventDatalink(event: IEventObj): IEventDatalink | null {
        let datalink =  this.eventDatalinks.get(event.id) || null;
        if (datalink == null) {
            return null;
        }
        return datalink;
    }

    updateEventId(old_id: string, new_id: string) {
        let datalink = this.eventDatalinks.get(old_id);
        if (datalink == null) {
            return;
        }
        this.eventDatalinks.delete(old_id);
        this.eventDatalinks.set(new_id, datalink);
    }

    setEventDatalink(event: IEventObj, datalink: IEventDatalink): void {
        this.eventDatalinks.set(event.id, datalink);
        this.eventsWithNewDatalinks.add(event.id);
    }

    importEventDatalinks(datalinks: IEventDatalink[]): void {
        // this specifically needs to not use setEventDatalink, because this is for loading existing datalinks, and we do not want the existing ones to be marked as needing syncing
        for (let datalink of datalinks) {
            this.eventDatalinks.set(datalink.event.id, datalink);
        }
    }

    getEventDatalinkName(eventID: string): string | null {
        const datalink = this.eventDatalinks.get(eventID);
        if (datalink == null) {
            return null;
        }
        return datalink.datalink_name;
    }

    toEventDatalinkPushes(): IEventDatalink[] {
        // Looks at datalinks.eventDatalinks, and creates IEventDatalinkPush objects based on the properties contained in the value of that map, the event_id in the key of the map, and by looking up the datalink_name 
        let pushes: IEventDatalink[] = [];
        for (let [event_id, datalink] of this.eventDatalinks.entries()) {
            if (!this.eventsWithNewDatalinks.has(event_id)) {
                continue;
            }
            let datalinkSpec = this.datalinkSpecs.find(spec => spec.name === datalink.datalink_name);
            if (datalinkSpec == null) {
                console.log(`No datalink spec found for datalink name ${datalink.datalink_name}`);
                continue;
            }
            let push: IEventDatalink = {
                event: datalink.event,
                datalink_name: datalink.datalink_name,
                properties: datalink.properties
            }
            pushes.push(push);
        }
        return pushes;
    }
}

export async function syncDatalinks(state: IState): Promise<boolean> {
    let eventDatalinkPushes = state.datalinks.toEventDatalinkPushes()
    let datalinkResponse = await pushToDatalink(eventDatalinkPushes)
    console.log("datalinkResponse", datalinkResponse)
    if (datalinkResponse["status"] == 200) {
        state.datalinks.eventsWithNewDatalinks = new Set();
        return true;
    } else {
        // Handle error responses
        console.error("Error:", datalinkResponse.status);
        if (datalinkResponse["status"] == 207) {
            alert("Some datalinks failed to push. Check the console for details.");
            console.log("Partial success in pushing datalinks:", datalinkResponse.data.message);
            console.log("Failed datalinks:", datalinkResponse.data.failed_datalinks);
            // keep only the eventswithNewDatalinks where the datalink it belongs to is contained in the list datalinkResponse.data.failed_datalinks
            state.datalinks.eventsWithNewDatalinks = new Set(
                Array.from(state.datalinks.eventsWithNewDatalinks).filter(eventId => {
                    const datalinkName = state.datalinks.getEventDatalinkName(eventId);
                    return datalinkName && datalinkResponse.data.failed_datalinks.includes(datalinkName);
                })
            );
        } else if (datalinkResponse["status"] == 500) {
            alert("Server error occurred while pushing datalinks. Check the console for details.");
            console.error("Server error:", datalinkResponse.data.error);
            console.error("Error details:", datalinkResponse.data.details);
        } else {
            alert("Unexpected error occurred while pushing datalinks. Check the console for details.");
            console.error("Unexpected response status:", datalinkResponse.status);
            console.error("Response data:", datalinkResponse.data);
        }
        return false;
    }
}