import csv
from datetime import datetime
import json
import os
from pydantic import BaseModel, Field
from typing import Union, Dict, List, Any
from itertools import groupby

from app.settings import settings
from app.structs import DatalinkFieldOption, DatalinkField, EventDatalinkSpec, EventObj, EventDatalink, SerializableModel

COLUMN_SPEC = ["id", "start", "stop", "calendar", "event_id"]

def initialize_event_datalink_logs():
    event_datalinks = settings.get_event_datalinks()
    datapath = settings.get_datapath()
    for event_datalink in event_datalinks:
        if not os.path.exists(f"{datapath}/{event_datalink.name}.csv"):
            with open(f"{datapath}/{event_datalink.name}.csv", "w") as f:
                header_row = COLUMN_SPEC + list(event_datalink.properties.keys())
                writer = csv.writer(f)
                writer.writerow(header_row)

def parsed_event_datalink_specs() -> List[EventDatalinkSpec]:
    """
    Parses the event datalinks schemas from the settings, replacing any {{datapath}} with the datapath,
    and converting any string properties to lists of DatalinkFieldOption objects.
    """
    datalinks = settings.get_event_datalinks()
    for datalink in datalinks:
        for property_name, property_config in datalink.properties.items():
            # effectively, this looks through string properties and replaces {{datapath}} with the datapath
            # (non-string properties are a DatalinkField.options list instead)
            if isinstance(property_config.options, str):
                # interpret string as path, filling any occurrence of {{datapath}} with the datapath
                datalink.properties[property_name].options = datalink.properties[property_name].options.replace("{{datapath}}", settings.get_datapath())
                # check if it's json or csv, if json just load, if csv interpret first column as value AND bigText, second as smallText
                if datalink.properties[property_name].options.endswith(".json"):
                    with open(datalink.properties[property_name].options) as f:
                        datalink.properties[property_name].options = json.load(f)
                elif datalink.properties[property_name].options.endswith(".csv"):
                    with open(datalink.properties[property_name].options) as f:
                        datalink.properties[property_name].options = [DatalinkFieldOption(bigText=row[0], smallText=row[1], value=row[0]) for row in csv.reader(f)]
    datalinks = [spec.model_dump() for spec in datalinks]
    return datalinks

class DatalinkLog:
    """
    These are all interfaces to .csv files, with some helper functions.
    
    The row schema in the .csv is:
    id start end calendar event_id {... properties ...}
    where {... properties ...} are the keys in self.spec.properties ( = EventDatalinkSpec.properties)
    """
    def __init__(self, datalink_spec: EventDatalinkSpec):
        self.spec = datalink_spec
        self.path = settings.get_datalink_datapath(datalink_spec.name)
    
    def default_title(self, row: dict):
        if self.spec.eventTitleSourceProperty is not None:
            return row[self.spec.eventTitleSourceProperty]
        return "UNKNOWN"
    
    def get_rows(self, start: datetime | None = None, end: datetime | None = None) -> list[dict]:
        if start is None:
            start = datetime.fromtimestamp(0)
        if end is None:
            # get last date
            end = datetime.max
        with open(self.path, "r") as f:
            reader = csv.reader(f)
            headers = next(reader)  # Get the headers from the first row
            return [
                {headers[i]: value for i, value in enumerate(row)}
                for row in reader
                if start <= datetime.fromisoformat(row[COLUMN_SPEC.index("start")]) <= end
            ]
    
    def validate_new(self, rows: list[EventDatalink]):
        for row in rows:
            assert row.datalink_name == self.spec.name, f"Invalid event datalink name: {row.datalink_name}"
            assert all(prop in row.properties for prop in self.spec.properties.keys()), f"Invalid event datalink properties: {row.properties.keys()}; does not match {self.spec.properties.keys()}"
            assert all(prop in self.spec.properties for prop in row.properties.keys()), f"Invalid event datalink properties: {row.properties.keys()}; does not match {self.spec.properties.keys()}"
            assert isinstance(row.event, EventObj), "Event datalink event must be an instance of EventObj"
    
    def add_rows(self, rows: list[EventDatalink]):
        """
        Adds rows to the datalink log, validating that they fit the schema.
        If there are rows that have an event ID that has already appeared beforehand, then instead of writing that as a new row, that row should be updated.
        """
        self.validate_new(rows)
        
        # Read all existing rows
        all_rows = []
        with open(self.path, "r") as f:
            reader = csv.reader(f)
            headers = next(reader)  # Skip header
            all_rows = list(reader)
        
        # Create a dictionary of existing rows for easy lookup
        existing_rows = {row[COLUMN_SPEC.index("event_id")]: row for row in all_rows}
        
        # Update existing rows and add new ones
        for row in rows:
            row_data = [
                str(self.get_next_id()) if row.event.id not in existing_rows else existing_rows[row.event.id][0],
                row.event.start.isoformat(),
                row.event.end.isoformat(),
                row.event.calendar,
                row.event.id,
            ]
            
            # Add properties in the order specified by self.spec.properties
            for prop in self.spec.properties.keys():
                row_data.append(row.properties.get(prop, ""))
            
            if row.event.id in existing_rows:
                existing_rows[row.event.id] = row_data
            else:
                all_rows.append(row_data)
        
        # Write updated file
        with open(self.path, "w") as f:
            writer = csv.writer(f)
            writer.writerow(headers)  # Write header
            writer.writerows(all_rows)

    def get_next_id(self):
        # Implement a method to get the next available ID, based on 1 + the current greatest id (or 0 if no non-header rows yet added)
        try:
            with open(self.path, "r") as f:
                reader = csv.reader(f)
                next(reader)  # Try to skip the header row
                ids = [int(row[0]) for row in reader if row]  # Assuming ID is the first column
            
            if not ids:
                return 1  # If no rows exist yet, start with ID 1
            else:
                return max(ids) + 1  # Return the next available ID
        except StopIteration:
            # File is empty or contains only a header
            return 1
        

def pull_from_event_datalinks(start: datetime, end: datetime) -> dict[str, list[EventDatalink]]:
    """
    This function returns a dictionary mapping datalink names to lists of EventDatalink objects
    with o.event.start (a datetime) between start and end given in this function
    """
    initialize_event_datalink_logs()
    edls = parsed_event_datalink_specs()
    result = {}
    
    for edl in edls:
        datalink_log = DatalinkLog(EventDatalinkSpec(**edl))
        rows = datalink_log.get_rows(start, end)
        
        event_datalinks = []
        for row in rows:
            properties = {prop: row[prop] for prop in edl['properties'].keys()}
            event = EventObj(
                id=row['event_id'],
                title=datalink_log.default_title(row),
                start=datetime.fromisoformat(row['start']),
                end=datetime.fromisoformat(row['stop']),
                calendar=row['calendar']
            )
            event_datalink = EventDatalink(
                datalink_name=edl['name'],
                event=event,
                properties=properties
            )
            event_datalinks.append(event_datalink)
        
        result[edl['name']] = event_datalinks
    
    return result

def push_to_event_datalink(rows: list[EventDatalink]) -> bool:
    """
    Takes a set of datalink rows, assumed to all fit the schema for some EventDatalink,
    and then adds them to the datalink's CSV log file.
    If something errors, it returns False, otherwise it returns True.
    """
    try:
        initialize_event_datalink_logs()
        edls = parsed_event_datalink_specs()
        assert len(rows) != 0, "No rows to push to event datalinks"
        assert len(set([row.datalink_name for row in rows])) == 1, "Cannot push to multiple event datalinks at once"
        
        datalink_name = rows[0].datalink_name
        edl = next((EventDatalinkSpec(**edl) for edl in edls if edl['name'] == datalink_name), None)
        assert edl is not None, f"Invalid event datalink name: {datalink_name}"
        
        datalink_log = DatalinkLog(edl)
        datalink_log.add_rows(rows)
        
        return True
    except Exception as e:
        print(f"Error pushing to event datalink: {str(e)}")
        return False

def push_to_event_datalinks(rows: list[EventDatalink]) -> list[str]:
    """
    A wrapper around push_to_event_datalink that sorts the events in `rows` by their .datalink_name, and then makes one call to push_to_event_datalink for every unique value of .datalink_name.
    Returns a list of datalink names where the push failed.
    """
    if not rows:
        return []  # No rows to push, return empty list

    # Sort rows by datalink_name
    sorted_rows = sorted(rows, key=lambda x: x.datalink_name)

    # Group rows by datalink_name
    grouped_rows = groupby(sorted_rows, key=lambda x: x.datalink_name)

    failed_datalinks = []
    # Push each group of rows to its respective datalink
    for datalink_name, group in grouped_rows:
        success = push_to_event_datalink(list(group))
        if not success:
            failed_datalinks.append(datalink_name)
            print(f"Failed to push to datalink: {datalink_name}")

    return failed_datalinks  # Return list of datalink names where push failed