import os


PROTECTED_SUPERUSER_USERNAME = 'Boojoo'


def user_is_protected_superuser(user):
    return bool(user and getattr(user, 'username', None) == PROTECTED_SUPERUSER_USERNAME)


def user_is_admin(user):
    if not user:
        return False
    if user_is_protected_superuser(user):
        return True
    if getattr(user, 'is_admin', False):
        return True
    admin_usernames = os.environ.get('ADMIN_USERNAMES', '').strip()
    if not admin_usernames:
        return False
    allowed = {name.strip() for name in admin_usernames.split(',') if name.strip()}
    return user.username in allowed


def user_is_staff(user):
    if not user:
        return False
    return user_is_protected_superuser(user) or bool(getattr(user, 'is_staff', False))
