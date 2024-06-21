import datetime
import traceback
from flask import render_template, jsonify, request
import pytz

from app.utils import week_start_end
from .integrations.google_calendar import get_events

def init_routes(app, service):
    @app.route("/")
    def index():
        # Use render_template to serve your HTML file with events data
        return render_template("index.html")
    
    @app.route('/api/weekly_events')
    def weekly_events():
        timezone_str = request.args.get('timezone')
        if timezone_str:
            try:
                timezone = pytz.timezone(timezone_str)
            except pytz.UnknownTimeZoneError:
                return jsonify({'error': 'Unknown timezone'}), 400
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
            return jsonify({'error': 'Failed to fetch events', 'details': str(e)}), 500
