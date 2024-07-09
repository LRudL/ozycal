import json
import datetime

with open("calendar_ids.json", "r") as file:
    CALENDAR_IDS = json.load(file)

class Event:
    def __init__(
        self,
        calendar: str,
        start: datetime.datetime,
        end: datetime.datetime,
        summary: str,
        event_id=None,
        is_all_day=False,
    ):
        assert start <= end
        if not isinstance(start, datetime.datetime):
            start = datetime.datetime.fromisoformat(start)
        if not isinstance(end, datetime.datetime):
            end = datetime.datetime.fromisoformat(end)
        self.calendar = calendar
        self.start = start
        self.end = end
        self.summary = summary
        self.event_id = event_id
        self.is_all_day = is_all_day

    @staticmethod
    def from_gcal_event(event: dict, calendar="primary") -> "Event":
        start = event["start"].get("dateTime") or event["start"].get("date")
        end = event["end"].get("dateTime") or event["end"].get("date")
        is_all_day = "date" in event["start"]
        
        if "summary" not in event:
            event["summary"] = "[Google Calendar event with no title]"
        
        return Event(
            calendar=calendar,
            start=start,
            end=end,
            summary=event["summary"],
            event_id=event["id"],
            is_all_day=is_all_day,
        )

    def to_fullcalendar(self):
        event_data = {
            "title": self.summary,
            "id": self.event_id,
            "extendedProps": {
                "isOzycal": True,
                "calendar": self.calendar,
                "summary": self.summary,
            },
        }
        
        if self.is_all_day:
            event_data["allDay"] = True
            event_data["start"] = self.start.isoformat()
            event_data["end"] = self.end.isoformat()
        else:
            event_data["start"] = self.start.isoformat()
            event_data["end"] = self.end.isoformat()
        
        return event_data

    def gcal_update(self, service):
        event = (
            service.events()
            .get(calendarId=self.calendar, eventId=self.event_id)
            .execute()
        )
        event["summary"] = self.summary
        event["start"] = {"dateTime": self.start.isoformat()}
        event["end"] = {"dateTime": self.end.isoformat()}
        updated_event = (
            service.events()
            .update(calendarId=self.calendar, eventId=self.event_id, body=event)
            .execute()
        )
        return updated_event