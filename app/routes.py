from datetime import datetime
import traceback
from app.integrations.datalink import parsed_event_datalink_specs, pull_from_event_datalinks, push_to_event_datalinks, EventDatalink
from flask import render_template, jsonify, request
import pytz
from app.structs import EventObj, convert_event_obj

from app.utils import week_start_end
from app.integrations.google_calendar import (
    get_calendar_colors,
    get_events,
    get_service,
    make_api_call,
)
from app.settings import settings

# SERVICE = get_service()

def time_and_tz_parse(timezone_str, time_str):
    time = datetime.fromisoformat(time_str) if time_str else None
    if timezone_str:
        try:
            timezone = pytz.timezone(timezone_str)
        except pytz.UnknownTimeZoneError:
            raise Exception(f"Unknown timezone: {timezone_str}")
    else:
        print(f"No timezone provided, using UTC")
        timezone = pytz.utc
    return time, timezone


def init_routes(app):
    @app.route("/")
    def index():
        # Use render_template to serve your HTML file with events data
        return render_template("index.html")

    @app.route("/api/weekly_events")
    def weekly_events():
        service = get_service()
        timezone_str = request.args.get("timezone")
        time_str = request.args.get("time")
        time, timezone = time_and_tz_parse(timezone_str, time_str)

        try:
            # get current time, and adjust to start of the week (Monday) and end of the week (Sunday)
            start, end = week_start_end(time=time, timezone=timezone, isoformat=True)
            events = get_events(service, start, end)
            return jsonify([event.to_fullcalendar() for event in events])
        except Exception as e:
            # Log the exception for debugging
            print(f"Error fetching events: {e}")
            traceback.print_exc()  # Print the stack trace
            # Return an empty list or appropriate error message in JSON format
            return jsonify({"error": "Failed to fetch events", "details": str(e)}), 500

    @app.route("/api/calendar_colors")
    def calendar_colors():
        service = get_service()
        calendar_colors = get_calendar_colors(service, settings.get_calendar_ids())
        return jsonify(calendar_colors)
    
    @app.route("/api/datalinks")
    def datalinks():
        return jsonify(parsed_event_datalink_specs())
    
    @app.route("/api/weekly_event_datalinks")
    def weekly_event_datalinks():
        timezone_str = request.args.get("timezone")
        time_str = request.args.get("time")
        time, timezone = time_and_tz_parse(timezone_str, time_str)
        start, end = week_start_end(time=time, timezone=timezone, isoformat=False)
        datalinks = pull_from_event_datalinks(start=start, end=end)
        
        # Convert the EventDatalink objects to JSON-serializable dictionaries
        serializable_datalinks = {
            datalink_name: [event_datalink.to_json() for event_datalink in event_datalinks]
            for datalink_name, event_datalinks in datalinks.items()
        }
        
        return jsonify(serializable_datalinks)
    
    @app.route("/api/event_datalink_push", methods=["POST"])
    def event_datalink_push():
        data = request.json
        
        print("RECEIVED in event_datalink_push")
        print(data)
        
        try:
            # Convert the incoming JSON data to EventDatalink objects
            event_datalinks = [
                EventDatalink(
                    datalink_name=item['datalink_name'],
                    event=convert_event_obj(item['event']),
                    properties=item['properties']
                )
                for item in data
            ]
            
            # Call push_to_event_datalinks and get the list of failed datalinks
            failed_datalinks = push_to_event_datalinks(event_datalinks)
            
            if not failed_datalinks:
                return jsonify({"status": 200, "message": "All datalinks pushed successfully"})
            else:
                return jsonify({
                    "status": 207, # multi-status
                    "message": "Some datalinks failed to push",
                    "failed_datalinks": failed_datalinks
                })
        except Exception as e:
            print(f"Error pushing datalinks: {e}")
            traceback.print_exc()
            return jsonify({"status": 500, "error": "Failed to push datalinks", "details": str(e)})

    @app.route("/api/update_events", methods=["POST"])
    def update_events():
        service = get_service()
        data = request.json
        
        response = {
            "created": [],
            "deleted": [],
            "modified": []
        }

        # Handle created events
        for event in data.get("created", []):
            calendar_id = settings.get_calendar_ids().get(event["extendedProps"]["calendar"])
            if not calendar_id:
                continue
            
            new_event = {
                "summary": event["title"],
                "start": {"dateTime": event["start"], "timeZone": "UTC"},
                "end": {"dateTime": event["end"], "timeZone": "UTC"},
            }
            
            try:
                created_event = make_api_call(
                    service.events().insert(calendarId=calendar_id, body=new_event).execute
                )
                response["created"].append({
                    "old_id": event["id"],
                    "new_id": created_event["id"]
                })
            except Exception as e:
                print(f"Error creating event: {e}")

        # Handle deleted events
        for event in data.get("deleted", []):
            calendar_id = settings.get_calendar_ids().get(event["extendedProps"]["calendar"])
            if not calendar_id:
                continue
            
            try:
                make_api_call(
                    service.events().delete(calendarId=calendar_id, eventId=event["id"]).execute
                )
                response["deleted"].append(event["id"])
            except Exception as e:
                print(f"Error deleting event: {e}")

        # Handle modified events
        for event in data.get("modified", []):
            calendar_id = settings.get_calendar_ids().get(event["extendedProps"]["calendar"])
            if not calendar_id:
                continue
            
            updated_event = {
                "summary": event["title"],
                "start": {"dateTime": event["start"], "timeZone": "UTC"},
                "end": {"dateTime": event["end"], "timeZone": "UTC"},
            }
            
            try:
                modified_event = make_api_call(
                    service.events().update(
                        calendarId=calendar_id, eventId=event["id"], body=updated_event
                    ).execute
                )
                response["modified"].append(modified_event["id"])
            except Exception as e:
                print(f"Error modifying event: {e}")

        return jsonify(response)