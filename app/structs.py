from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Union, Any

class SerializableModel(BaseModel):
    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()}
    )
    
    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()  # Use .dict() for Pydantic v1

    def to_json(self) -> dict[str, Any]:
        return self.model_dump(mode='json')  # This will handle datetime serialization

class DatalinkFieldOption(SerializableModel):
    bigText: str
    smallText: str
    value: Union[str, float, int, bool]

class DatalinkField(SerializableModel):
    options: Union[list[DatalinkFieldOption], str] = Field(default_factory=list)
    freeform: bool = False
    onCreate: bool = False

class EventDatalinkSpec(SerializableModel):
    name: str
    calendars: list[str]
    eventTitleSourceProperty: str | None = None
    properties: dict[str, DatalinkField]

class EventObj(SerializableModel):
    start: datetime
    end: datetime
    title: str
    id: str
    calendar: str

def convert_event_obj(event: dict) -> EventObj:
    return EventObj(
        start=datetime.fromisoformat(event['start']),
        end=datetime.fromisoformat(event['end']),
        title=event['title'],
        id=event['id'],
        calendar=event.get('extendedProps', {}).get('calendar', '')
    )

class EventDatalink(SerializableModel):
    datalink_name: str
    event: EventObj
    properties: dict[str, int | float | str | bool]