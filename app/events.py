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

    @staticmethod
    def from_gcal_event(event: dict, calendar="primary") -> "Event":
        return Event(
            calendar=calendar,
            start=event["start"].get("dateTime", event["start"].get("date")),
            end=event["end"].get("dateTime", event["end"].get("date")),
            summary=event["summary"],
            event_id=event["id"],
        )

    def to_fullcalendar(self):
        return {
            "title": self.summary,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "id": self.event_id,
            "extendedProps": {
                "isOzycal": True,
                "calendar": self.calendar,
                "summary": self.summary,
            },
        }

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
