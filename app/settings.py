import time
import json
from app.structs import EventDatalinkSpec


class Settings:
    def __init__(self, settings_path: str):
        self.settings_path = settings_path
        with open(self.settings_path) as f:
            self.settings = json.load(f)
        self.time_last_loaded = time.time()

    def get_settings(self):
        if time.time() - self.time_last_loaded > 10: # cache for 10 seconds
            with open(self.settings_path) as f:
                self.settings = json.load(f)
                self.time_last_loaded = time.time()
        return self.settings
    
    def get_calendar_ids(self) -> dict[str, str]:
        return self.get_settings()["calendar_ids"]
    
    def get_datapath(self) -> str:
        return self.get_settings()["datapath"]

    def get_datalink_datapath(self, datalink_name) -> str:
        return f"{self.get_datapath()}/{datalink_name}.csv"

    def get_event_datalinks(self) -> list[EventDatalinkSpec]:
        return [EventDatalinkSpec(**spec) for spec in self.get_settings()["event_datalinks"]]

    
settings = Settings("ozycal_settings.json")
