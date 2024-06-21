import datetime
import pytz

def week_start_end(time=None, timezone=None, isoformat=False):
    """Returns the bounds of the week starting and ending around `time`. If `time == None`, it is set to the current time."""
    if time is None:
        time = datetime.datetime.now(pytz.utc)
    else:
        if time.tzinfo is None:
            time = pytz.utc.localize(time)
    
    if timezone:
        time = time.astimezone(timezone)
    
    start_of_week = time - datetime.timedelta(days=time.weekday())  # Monday
    end_of_week = start_of_week + datetime.timedelta(days=6)  # Sunday
    start = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end = end_of_week.replace(hour=23, minute=59, second=59, microsecond=0)
    
    if isoformat:
        start, end = start.isoformat(), end.isoformat()
    
    return start, end
