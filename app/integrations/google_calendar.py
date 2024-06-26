import logging
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.exceptions import RefreshError
from tenacity import retry, stop_after_attempt, wait_exponential
import os
from app.events import CALENDAR_IDS, Event

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def make_api_call(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except HttpError as e:
        logger.error(f"HTTP Error occurred: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error occurred: {e}")
        raise


def get_service():
    creds = load_or_refresh_credentials()
    service = build("calendar", "v3", credentials=creds)
    return service



def load_or_refresh_credentials():
    creds = None
    if os.path.exists("oauth.json"):
        print("Found oauth.json")
        creds = Credentials.from_authorized_user_file("oauth.json", SCOPES)
    if not creds or not creds.valid:
        print("Credentials not valid")
        if creds and creds.expired and creds.refresh_token:
            print(f"Credentials expired on {creds.expiry}, refreshing")
            try:
                creds.refresh(Request())
            except RefreshError:
                print("Refresh token is invalid, recreating credentials")
                creds = None
        
        if not creds:
            print("Creating new credentials")
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials for the next run
        with open("oauth.json", "w") as token:
            token.write(creds.to_json())
    
    return creds


def get_calendar_colors(service, calendar_ids):
    try:
        calendar_list = make_api_call(service.calendarList().list().execute)
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
        print(f"An HTTP error occurred in get_calendar_colors: {error}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred in get_calendar_colors: {e}")
        return None


def get_events(service, start: str, end: str) -> list[Event]:
    all_events = []

    def batch_callback(request_id, response, exception):
        if exception is not None:
            logger.error(
                f"Error fetching events for calendar {request_id}: {exception}"
            )
        else:
            calendar_name = request_id  # Using request_id to track calendar name
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
