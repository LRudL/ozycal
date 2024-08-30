import pytest
from datetime import datetime, timedelta
from app.integrations.datalink import DatalinkLog, COLUMN_SPEC
from app.structs import EventDatalinkSpec, DatalinkField, EventObj, EventDatalink
import csv
import tempfile
import os

def test_add_rows():
    # Create a temporary file for testing
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.csv') as temp_file:
        temp_path = temp_file.name

    try:
        # Create a sample EventDatalinkSpec
        spec = EventDatalinkSpec(
            name="test_datalink",
            calendars=["test_calendar"],
            properties={
                "prop1": DatalinkField(freeform=True),
                "prop2": DatalinkField(freeform=True)
            }
        )

        # Create a DatalinkLog instance
        datalink_log = DatalinkLog(spec)
        datalink_log.path = temp_path  # Override the path with our temp file

        # Write header row
        with open(temp_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(COLUMN_SPEC + list(spec.properties.keys()))

        # Create sample data
        now = datetime.now()
        event = EventObj(
            start=now,
            end=now + timedelta(hours=1),
            title="Test Event",
            id="event123",
            calendar="test_calendar"
        )

        rows = [
            EventDatalink(
                datalink_name="test_datalink",
                event=event,
                properties={
                    "prop1": "value1",
                    "prop2": "value2"
                }
            )
        ]

        # Call the function
        datalink_log.add_rows(rows)

        # Read the CSV and check the contents
        with open(temp_path, 'r') as f:
            reader = csv.reader(f)
            rows = list(reader)
        
        # The row schema in the .csv is:
        # id start end calendar event_id {... properties ...}

        assert len(rows) == 2  # Header + 1 data row
        assert rows[1] == [
            "1",
            event.start.isoformat(),
            event.end.isoformat(),
            "test_calendar",
            "event123",
            "value1",
            "value2",
        ]

    finally:
        # Clean up the temporary file
        os.unlink(temp_path)

def test_edit_rows():
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.csv') as temp_file:
        temp_path = temp_file.name

    try:
        # Create a sample EventDatalinkSpec
        spec = EventDatalinkSpec(
            name="test_datalink",
            calendars=["test_calendar"],
            properties={
                "prop1": DatalinkField(freeform=True),
                "prop2": DatalinkField(freeform=True)
            }
        )

        # Create a DatalinkLog instance
        datalink_log = DatalinkLog(spec)
        datalink_log.path = temp_path

        # Write header row
        with open(temp_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(COLUMN_SPEC + list(spec.properties.keys()))

        # Create initial event
        now = datetime.now()
        event = EventObj(
            start=now,
            end=now + timedelta(hours=1),
            title="Test Event",
            id="event123",
            calendar="test_calendar"
        )

        initial_row = EventDatalink(
            datalink_name="test_datalink",
            event=event,
            properties={
                "prop1": "initial_value1",
                "prop2": "initial_value2"
            }
        )

        # Add initial row
        datalink_log.add_rows([initial_row])

        # Create updated event with same ID
        updated_row = EventDatalink(
            datalink_name="test_datalink",
            event=event,
            properties={
                "prop1": "updated_value1",
                "prop2": "updated_value2"
            }
        )

        # Update the row
        datalink_log.add_rows([updated_row])

        # Read the CSV and check the contents
        with open(temp_path, 'r') as f:
            reader = csv.reader(f)
            rows = list(reader)

        assert len(rows) == 2  # Header + 1 data row
        assert rows[1] == [
            "1",
            event.start.isoformat(),
            event.end.isoformat(),
            "test_calendar",
            "event123",
            "updated_value1",
            "updated_value2",
        ]

    finally:
        # Clean up the temporary file
        os.unlink(temp_path)

# Run the tests
if __name__ == "__main__":
    pytest.main([__file__])