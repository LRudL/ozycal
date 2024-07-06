import datetime
import traceback
from flask import render_template, jsonify, request
import pytz
from app.events import CALENDAR_IDS

from app.utils import week_start_end
from app.integrations.google_calendar import (
    get_calendar_colors,
    get_events,
    get_service,
    make_api_call,
)

# SERVICE = get_service()


def init_routes(app):
    @app.route("/")
    def index():
        # Use render_template to serve your HTML file with events data
        return render_template("index.html")

    @app.route("/api/reload_service")
    def reload_service():
        global SERVICE
        SERVICE = get_service()
        return jsonify({"message": "Service reloaded"})

    @app.route("/api/weekly_events")
    def weekly_events():
        service = get_service()
        timezone_str = request.args.get("timezone")
        if timezone_str:
            try:
                timezone = pytz.timezone(timezone_str)
            except pytz.UnknownTimeZoneError:
                return jsonify({"error": "Unknown timezone"}), 400
        else:
            print(f"No timezone provided, using UTC")
            timezone = pytz.utc

        try:
            # get current time, and adjust to start of the week (Monday) and end of the week (Sunday)
            start, end = week_start_end(timezone=timezone, isoformat=True)
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
        calendar_colors = get_calendar_colors(service, CALENDAR_IDS)
        return jsonify(calendar_colors)

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
            calendar_id = CALENDAR_IDS.get(event["extendedProps"]["calendar"])
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
            calendar_id = CALENDAR_IDS.get(event["extendedProps"]["calendar"])
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
            calendar_id = CALENDAR_IDS.get(event["extendedProps"]["calendar"])
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