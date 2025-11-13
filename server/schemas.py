# schemas.py
from config import ma
from models import (User, Member, Group, GroupMember, Event,        EventRegistration,
                   Sermon, Donation, PrayerRequest, Page, Announcement, 
                   Media, ContactMessage, NavigationMenu, NavigationItem)
from marshmallow import fields, validate, validates, validates_schema, ValidationError
from datetime import datetime, time

# ============================================
# USER & MEMBER SCHEMAS WITH VALIDATION
# ============================================
class MemberSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Member
        load_instance = True
        include_fk = True
    
    # Field validation
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    phone = fields.String(validate=validate.Length(max=20))
    address = fields.String(validate=validate.Length(max=500))
    
    @validates('phone')
    def validate_phone(self, value):
        """Validate phone number format"""
        if value:
            # Remove common separators
            cleaned = value.replace('-', '').replace('(', '').replace(')', '').replace(' ', '')
            if not cleaned.isdigit():
                raise ValidationError('Phone number must contain only digits and common separators')
            if len(cleaned) < 10:
                raise ValidationError('Phone number must be at least 10 digits')
    
    @validates('join_date')
    def validate_join_date(self, value):
        """Join date cannot be in the future"""
        if value and value > datetime.now().date():
            raise ValidationError('Join date cannot be in the future')


class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ('_password_hash',)
    
    member = fields.Nested(MemberSchema, dump_only=True)
    email = fields.Email(required=True)
    full_name = fields.Method("get_full_name")
    
    def get_full_name(self, obj):
        if obj.member:
            return f"{obj.member.first_name} {obj.member.last_name}"
        return None
    
    @validates('email')
    def validate_email(self, value):
        """Check if email already exists"""
        existing = User.query.filter_by(email=value).first()
        # If updating, exclude current user from check
        if existing and (not self.instance or existing.id != self.instance.id):
            raise ValidationError('Email already registered')


class UserCreateSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ('id', 'created_at')
    
    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True, validate=validate.Length(min=8, max=100))
    
    @validates('password')
    def validate_password(self, value):
        """Validate password strength"""
        if not any(char.isdigit() for char in value):
            raise ValidationError('Password must contain at least one digit')
        if not any(char.isupper() for char in value):
            raise ValidationError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in value):
            raise ValidationError('Password must contain at least one lowercase letter')


# ============================================
# GROUP SCHEMAS WITH VALIDATION
# ============================================
class GroupMemberSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = GroupMember
        load_instance = True
        include_fk = True
    
    user = fields.Nested('UserSchema', only=('id', 'email', 'full_name'), dump_only=True)
    role = fields.String(validate=validate.OneOf(['leader', 'co_leader', 'member']))
    
    @validates('join_date')
    def validate_join_date(self, value):
        """Join date cannot be in the future"""
        if value and value > datetime.now().date():
            raise ValidationError('Join date cannot be in the future')
    
    @validates_schema
    def validate_group_member(self, data, **kwargs):
        """Check if user is already in this group"""
        if 'group_id' in data and 'user_id' in data:
            existing = GroupMember.query.filter_by(
                group_id=data['group_id'],
                user_id=data['user_id']
            ).first()
            
            if existing and (not self.instance or existing.id != self.instance.id):
                raise ValidationError({'user_id': ['User is already a member of this group']})


class GroupSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Group
        load_instance = True
        include_fk = True
    
    members = fields.Nested(GroupMemberSchema, many=True, dump_only=True)
    subgroups = fields.Nested('GroupSchema', many=True, exclude=('subgroups', 'members'), dump_only=True)
    leader = fields.Nested('UserSchema', only=('id', 'email', 'full_name'), dump_only=True)
    parent_group = fields.Nested('GroupSchema', only=('id', 'name'), dump_only=True)
    
    # Validation
    name = fields.String(required=True, validate=validate.Length(min=1, max=255))
    group_type = fields.String(validate=validate.OneOf(['cell', 'youth', 'men', 'women', 'other']))
    meeting_day = fields.String(validate=validate.OneOf([
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ]))
    meeting_time = fields.Time()
    location = fields.String(validate=validate.Length(max=255))
    
    member_count = fields.Method("get_member_count")
    
    def get_member_count(self, obj):
        return len(obj.members)
    
    @validates('meeting_time')
    def validate_meeting_time(self, value):
        """Validate meeting time is reasonable"""
        if value:
            # Convert to datetime.time if it's a string
            if isinstance(value, str):
                try:
                    value = datetime.strptime(value, '%H:%M:%S').time()
                except ValueError:
                    raise ValidationError('Invalid time format. Use HH:MM:SS')
            
            # Check if time is reasonable (e.g., not at 3 AM)
            if value.hour < 6 or value.hour > 23:
                raise ValidationError('Meeting time should be between 6:00 AM and 11:00 PM')
    
    @validates('parent_group_id')
    def validate_parent_group(self, value):
        """Check if parent group exists and prevent circular references"""
        if value:
            parent = Group.query.get(value)
            if not parent:
                raise ValidationError('Parent group does not exist')
            
            # Prevent self-referencing
            if self.instance and value == self.instance.id:
                raise ValidationError('Group cannot be its own parent')
            
            # Prevent circular reference (simplified check)
            if self.instance and parent.parent_group_id == self.instance.id:
                raise ValidationError('Circular parent-child relationship detected')
    
    @validates('leader_id')
    def validate_leader(self, value):
        """Check if leader exists and is a valid user"""
        if value:
            leader = User.query.get(value)
            if not leader:
                raise ValidationError('Leader does not exist')


# ============================================
# EVENT SCHEMAS WITH VALIDATION
# ============================================
class EventRegistrationSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = EventRegistration
        load_instance = True
        include_fk = True
    
    user = fields.Nested('UserSchema', only=('id', 'email', 'full_name'), dump_only=True)
    status = fields.String(validate=validate.OneOf(['confirmed', 'pending', 'cancelled']))
    guests_count = fields.Integer(validate=validate.Range(min=0, max=10))
    
    @validates_schema
    def validate_registration(self, data, **kwargs):
        """Check if user is already registered and if event is full"""
        if 'event_id' in data and 'user_id' in data:
            # Check duplicate registration
            existing = EventRegistration.query.filter_by(
                event_id=data['event_id'],
                user_id=data['user_id']
            ).first()
            
            if existing and (not self.instance or existing.id != self.instance.id):
                raise ValidationError({'user_id': ['User is already registered for this event']})
            
            # Check if event is full
            event = Event.query.get(data['event_id'])
            if event and event.max_attendees:
                current_registrations = len(event.registrations)
                if current_registrations >= event.max_attendees:
                    raise ValidationError({'event_id': ['Event is full']})


class EventSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Event
        load_instance = True
    
    registrations = fields.Nested(EventRegistrationSchema, many=True, dump_only=True)
    
    # Validation
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    start_datetime = fields.DateTime(required=True)
    end_datetime = fields.DateTime()
    location = fields.String(validate=validate.Length(max=255))
    max_attendees = fields.Integer(validate=validate.Range(min=1))
    
    registration_count = fields.Method("get_registration_count")
    is_full = fields.Method("check_if_full")
    
    def get_registration_count(self, obj):
        return len(obj.registrations)
    
    def check_if_full(self, obj):
        if obj.max_attendees:
            return len(obj.registrations) >= obj.max_attendees
        return False
    
    @validates('start_datetime')
    def validate_start_datetime(self, value):
        """Start date cannot be in the past (for new events)"""
        if not self.instance and value < datetime.now():
            raise ValidationError('Event start date cannot be in the past')
    
    @validates_schema
    def validate_event_times(self, data, **kwargs):
        """Validate end time is after start time"""
        if 'start_datetime' in data and 'end_datetime' in data:
            if data['end_datetime'] and data['start_datetime'] >= data['end_datetime']:
                raise ValidationError({'end_datetime': ['End time must be after start time']})


# ============================================
# SERMON SCHEMA WITH VALIDATION
# ============================================
class SermonSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Sermon
        load_instance = True
    
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    speaker_name = fields.String(validate=validate.Length(max=100))
    date = fields.Date(required=True)
    scripture_reference = fields.String(validate=validate.Length(max=255))
    audio_url = fields.Url(schemes={'http', 'https'})
    video_url = fields.Url(schemes={'http', 'https'})
    
    @validates('date')
    def validate_date(self, value):
        """Sermon date cannot be too far in the future"""
        if value > datetime.now().date():
            # Allow up to 30 days in future for scheduled sermons
            days_ahead = (value - datetime.now().date()).days
            if days_ahead > 30:
                raise ValidationError('Sermon date cannot be more than 30 days in the future')
    
    @validates('scripture_reference')
    def validate_scripture(self, value):
        """Basic validation of scripture reference format"""
        if value:
            # Simple check - should contain at least one digit
            if not any(char.isdigit() for char in value):
                raise ValidationError('Scripture reference should include chapter/verse numbers')


# ============================================
# DONATION SCHEMA WITH VALIDATION
# ============================================
class DonationSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Donation
        load_instance = True
        include_fk = True
    
    user = fields.Nested('UserSchema', only=('id', 'full_name'), dump_only=True)
    
    amount = fields.Decimal(required=True, as_string=True, places=2, validate=validate.Range(min=0.01))
    payment_method = fields.String(validate=validate.OneOf([
        'credit_card', 'debit_card', 'bank_transfer', 'cash', 'check', 'online'
    ]))
    designation = fields.String(validate=validate.Length(max=100))
    
    @validates('amount')
    def validate_amount(self, value):
        """Validate donation amount is reasonable"""
        if value > 1000000:  # $1 million limit
            raise ValidationError('Donation amount exceeds maximum allowed')


# ============================================
# PRAYER REQUEST SCHEMA WITH VALIDATION
# ============================================
class PrayerRequestSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = PrayerRequest
        load_instance = True
        include_fk = True
    
    user = fields.Nested('UserSchema', only=('id', 'full_name'), dump_only=True)
    
    request_text = fields.String(required=True, validate=validate.Length(min=10, max=2000))
    is_public = fields.Boolean()
    status = fields.String(validate=validate.OneOf(['pending', 'answered']))
    
    @validates('request_text')
    def validate_request_text(self, value):
        """Check for inappropriate content (basic check)"""
        # You could integrate a profanity filter here
        inappropriate_words = ['spam', 'viagra', 'casino']  # Basic example
        value_lower = value.lower()
        for word in inappropriate_words:
            if word in value_lower:
                raise ValidationError('Prayer request contains inappropriate content')


# ============================================
# PAGE SCHEMA WITH VALIDATION
# ============================================
class PageSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Page
        load_instance = True
    
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    slug = fields.String(required=True, validate=validate.Length(min=1, max=255))
    status = fields.String(validate=validate.OneOf(['published', 'draft']))
    
    @validates('slug')
    def validate_slug(self, value):
        """Validate slug format and uniqueness"""
        import re
        
        # Check format (lowercase, hyphens, no spaces)
        if not re.match(r'^[a-z0-9-]+$', value):
            raise ValidationError('Slug must contain only lowercase letters, numbers, and hyphens')
        
        # Check uniqueness
        existing = Page.query.filter_by(slug=value).first()
        if existing and (not self.instance or existing.id != self.instance.id):
            raise ValidationError('Slug already exists')


# ============================================
# ANNOUNCEMENT SCHEMA WITH VALIDATION
# ============================================
class AnnouncementSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Announcement
        load_instance = True
        include_fk = True
    
    author = fields.Nested('UserSchema', only=('id', 'full_name'), dump_only=True)
    
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    content = fields.String(required=True, validate=validate.Length(min=1, max=5000))
    publish_date = fields.DateTime()
    expire_date = fields.DateTime()
    
    @validates_schema
    def validate_dates(self, data, **kwargs):
        """Validate expire date is after publish date"""
        if 'publish_date' in data and 'expire_date' in data:
            if data['expire_date'] and data['publish_date'] >= data['expire_date']:
                raise ValidationError({'expire_date': ['Expiration date must be after publish date']})


# ============================================
# MEDIA SCHEMA WITH VALIDATION
# ============================================
class MediaSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Media
        load_instance = True
        include_fk = True
    
    uploader = fields.Nested('UserSchema', only=('id', 'full_name'), dump_only=True)
    
    filename = fields.String(required=True, validate=validate.Length(min=1, max=255))
    file_path = fields.String(required=True, validate=validate.Length(min=1, max=500))
    file_type = fields.String(validate=validate.Length(max=50))
    
    @validates('file_type')
    def validate_file_type(self, value):
        """Validate allowed file types"""
        allowed_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'audio/mpeg', 'audio/mp3', 'audio/wav',
            'video/mp4', 'video/mpeg', 'video/webm',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        
        if value and value not in allowed_types:
            raise ValidationError(f'File type not allowed. Allowed types: {", ".join(allowed_types)}')
    
    @validates('filename')
    def validate_filename(self, value):
        """Validate filename"""
        import re
        
        # Check for dangerous characters
        if re.search(r'[<>:"/\\|?*]', value):
            raise ValidationError('Filename contains invalid characters')


# ============================================
# CONTACT MESSAGE SCHEMA WITH VALIDATION
# ============================================
class ContactMessageSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = ContactMessage
        load_instance = True
        include_fk = True
    
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    subject = fields.String(validate=validate.Length(max=255))
    message = fields.String(required=True, validate=validate.Length(min=10, max=2000))
    status = fields.String(validate=validate.OneOf(['new', 'read', 'responded']))


# ============================================
# NAVIGATION SCHEMAS WITH VALIDATION
# ============================================
class NavigationItemSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = NavigationItem
        load_instance = True
        include_fk = True
    
    children = fields.Nested('NavigationItemSchema', many=True, dump_only=True)
    
    label = fields.String(required=True, validate=validate.Length(min=1, max=100))
    url = fields.String(validate=validate.Length(max=255))
    order = fields.Integer(validate=validate.Range(min=0))
    
    @validates('url')
    def validate_url(self, value):
        """Validate URL format"""
        if value:
            import re
            # Allow internal paths (/about) or full URLs
            if not (value.startswith('/') or re.match(r'^https?://', value)):
                raise ValidationError('URL must start with / or be a full URL (http:// or https://)')


class NavigationMenuSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = NavigationMenu
        load_instance = True
    
    items = fields.Nested(NavigationItemSchema, many=True, dump_only=True)
    
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    location = fields.String(validate=validate.OneOf(['header', 'footer', 'sidebar']))


# ============================================
# INITIALIZE SCHEMAS
# ============================================
user_schema = UserSchema()
users_schema = UserSchema(many=True)
user_create_schema = UserCreateSchema()

member_schema = MemberSchema()
members_schema = MemberSchema(many=True)

group_schema = GroupSchema()
groups_schema = GroupSchema(many=True)

group_member_schema = GroupMemberSchema()
group_members_schema = GroupMemberSchema(many=True)

event_schema = EventSchema()
events_schema = EventSchema(many=True)

event_registration_schema = EventRegistrationSchema()
event_registrations_schema = EventRegistrationSchema(many=True)

sermon_schema = SermonSchema()
sermons_schema = SermonSchema(many=True)

donation_schema = DonationSchema()
donations_schema = DonationSchema(many=True)

prayer_request_schema = PrayerRequestSchema()
prayer_requests_schema = PrayerRequestSchema(many=True)

page_schema = PageSchema()
pages_schema = PageSchema(many=True)

announcement_schema = AnnouncementSchema()
announcements_schema = AnnouncementSchema(many=True)

media_schema = MediaSchema()
medias_schema = MediaSchema(many=True)

contact_message_schema = ContactMessageSchema()
contact_messages_schema = ContactMessageSchema(many=True)

navigation_menu_schema = NavigationMenuSchema()
navigation_menus_schema = NavigationMenuSchema(many=True)

navigation_item_schema = NavigationItemSchema()
navigation_items_schema = NavigationItemSchema(many=True)