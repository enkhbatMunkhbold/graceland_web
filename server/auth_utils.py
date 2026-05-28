import os


def user_is_admin(user):
    if not user:
        return False
    if getattr(user, 'is_admin', False):
        return True
    admin_usernames = os.environ.get('ADMIN_USERNAMES', '').strip()
    if not admin_usernames:
        return False
    allowed = {name.strip() for name in admin_usernames.split(',') if name.strip()}
    return user.username in allowed
