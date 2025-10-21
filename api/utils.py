import pytz
from datetime import timedelta, time
from django.utils import timezone
from .models import Character

def get_user_current_date(user, timezone_str='UTC'):
    try:
        user_tz = pytz.timezone(timezone_str)
    except pytz.UnknownTimeZoneError:
        user_tz = pytz.utc

    utc_now = timezone.now()
    user_now = utc_now.astimezone(user_tz)
    
    reset_time = user.character.daily_reset_time if hasattr(user, 'character') else time(3, 0)
    reset_point = user_now.replace(hour=reset_time.hour, minute=reset_time.minute, second=0, microsecond=0)

    if user_now < reset_point:
        return (user_now - timedelta(days=1)).date()
    else:
        return user_now.date()
