import datetime
import json
import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.events import CALENDAR_IDS, Event

SCOPES = ["https://www.googleapis.com/auth/calendar"]


def get_service():
    creds = load_or_refresh_credentials()
    service = build("calendar", "v3", credentials=creds)
    return service


def load_or_refresh_credentials():
    creds = None
    if os.path.exists("oauth.json"):
        creds = Credentials.from_authorized_user_file("oauth.json", SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
            with open("oauth.json", "w") as token:
                token.write(creds.to_json())
    return creds


def get_calendar_colors(service, calendar_ids):
    try:
        calendar_list = service.calendarList().list().execute()
        calendar_colors = {}
        for calendar in calendar_list.get("items", []):
            calendar_id = calendar["id"]
            calendar_name = next(
                (k for k, v in CALENDAR_IDS.items() if v == calendar_id), None
            )
            if calendar_name and calendar_id in calendar_ids.values():
                bg_color = calendar.get("backgroundColor")
                if bg_color:
                    calendar_colors[calendar_name] = bg_color
        return calendar_colors
    except HttpError as error:
        print(f"An HTTP error occurred: {error}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None


def get_events(service, start: str, end: str) -> list[Event]:
    all_events = []

    def batch_callback(request_id, response, exception):
        if exception is not None:
            print(f"An error occurred: {exception}")
        else:
            calendar_name = (
                request_id  # Assuming request_id can be used to track calendar name
            )
            all_events.extend(
                [
                    Event.from_gcal_event(event, calendar_name)
                    for event in response.get("items", [])
                ]
            )

    batch = service.new_batch_http_request(callback=batch_callback)

    for calendar_name, calendar_id in CALENDAR_IDS.items():
        batch.add(
            service.events().list(
                calendarId=calendar_id,
                timeMin=start,
                timeMax=end,
                singleEvents=True,
                orderBy="startTime",
            ),
            request_id=calendar_name,  # Use calendar name as request ID
        )

    batch.execute()
    return all_events
