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


def creds_bs():
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists("oauth.json"):
        print("Loading credentials from file")
        try:
            creds = Credentials.from_authorized_user_file("oauth.json", SCOPES)
        except ValueError:
            print("Invalid credentials, removing file")
            os.remove("oauth.json")  # Remove the invalid file
            creds = None  # Proceed to generate a new one
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        print("No valid credentials, generating new ones")
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing credentials")
            creds.refresh(Request())
        else:
            print("No refresh token, starting flow")
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
            # Save the credentials for the next run
            with open("oauth.json", "w") as token:
                token.write(creds.to_json())
    try:
        print("Building service")
        service = build("calendar", "v3", credentials=creds)
        return service
    except HttpError as error:
        print(f"An error occurred: {error}")
        return None


def get_events(
    service, start: datetime.datetime, end: datetime.datetime
) -> list[Event]:
    all_events = []
    for calendar_name, calendar_id in CALENDAR_IDS.items():
        events_result = (
            service.events()
            .list(
                calendarId=calendar_id,
                timeMin=start,
                timeMax=end,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )

        if events_result.get("items"):
            all_events.extend(
                [
                    Event.from_gcal_event(event, calendar_name)
                    for event in events_result["items"]
                ]
            )

    return all_events
