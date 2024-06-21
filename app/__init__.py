from flask import Flask
import json
from googleapiclient.discovery import build
from .integrations.google_calendar import creds_bs

def create_app():
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.secret_key = "Your_secret_key_here"

    with open("api.json", "r") as file:
        api_data = json.load(file)
        api_key = api_data

    # Initialize Google Calendar Service
    service = creds_bs()

    from .routes import init_routes
    init_routes(app, service)

    return app
