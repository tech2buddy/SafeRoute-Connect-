from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import User


class SafeRouteLoginForm(AuthenticationForm):
    username = forms.CharField(
        label="Username",
        widget=forms.TextInput(
            attrs={
                "class": "auth-input",
                "placeholder": "Enter your username",
                "autocomplete": "username",
            }
        ),
    )
    password = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(
            attrs={
                "class": "auth-input",
                "placeholder": "Enter your password",
                "autocomplete": "current-password",
            }
        ),
    )


class SafeRouteSignupForm(UserCreationForm):
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(
            attrs={
                "class": "auth-input",
                "placeholder": "Enter your email address",
                "autocomplete": "email",
            }
        ),
    )

    class Meta:
        model = User
        fields = ("username", "email", "password1", "password2")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs.update(
            {
                "class": "auth-input",
                "placeholder": "Choose a username",
                "autocomplete": "username",
            }
        )
        self.fields["password1"].widget.attrs.update(
            {
                "class": "auth-input",
                "placeholder": "Create a password",
                "autocomplete": "new-password",
            }
        )
        self.fields["password2"].widget.attrs.update(
            {
                "class": "auth-input",
                "placeholder": "Confirm your password",
                "autocomplete": "new-password",
            }
        )

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"]
        if commit:
            user.save()
        return user


def _text_input(placeholder, input_type="text"):
    widget_class = forms.TextInput
    if input_type == "email":
        widget_class = forms.EmailInput
    elif input_type == "datetime-local":
        widget_class = forms.DateTimeInput

    attrs = {
        "class": "app-input",
        "placeholder": placeholder,
    }
    if input_type == "datetime-local":
        attrs["type"] = "datetime-local"
    return widget_class(attrs=attrs)


def _select():
    return forms.Select(attrs={"class": "app-select"})


def _textarea(placeholder):
    return forms.Textarea(
        attrs={
            "class": "app-textarea",
            "placeholder": placeholder,
            "rows": 5,
        }
    )


class SafeRouteSearchForm(forms.Form):
    start_location = forms.CharField(
        label="Starting location",
        widget=_text_input("Enter your starting point"),
    )
    destination = forms.CharField(
        label="Destination",
        widget=_text_input("Enter your destination"),
    )
    travel_mode = forms.ChoiceField(
        label="Travel mode",
        choices=[
            ("walk", "Walking"),
            ("drive", "Driving"),
            ("taxi", "Taxi / Ride"),
        ],
        widget=_select(),
    )
    safety_priority = forms.ChoiceField(
        label="Route preference",
        choices=[
            ("safest", "Safest route"),
            ("balanced", "Balanced"),
            ("fastest", "Fastest available"),
        ],
        widget=_select(),
    )


class IncidentReportForm(forms.Form):
    incident_type = forms.ChoiceField(
        label="Incident type",
        choices=[
            ("suspicious_activity", "Suspicious Activity"),
            ("poor_lighting", "Poor Street Lighting"),
            ("robbery", "Robbery / Theft"),
            ("harassment", "Harassment"),
            ("road_hazard", "Road Hazard"),
        ],
        widget=_select(),
    )
    location = forms.CharField(
        label="Location",
        widget=_text_input("Where did this happen?"),
    )
    severity = forms.ChoiceField(
        label="Severity",
        choices=[
            ("safe", "Low concern"),
            ("moderate", "Use caution"),
            ("risky", "High risk"),
        ],
        widget=_select(),
    )
    occurred_at = forms.DateTimeField(
        label="Time of incident",
        required=False,
        widget=_text_input("When did it happen?", "datetime-local"),
        input_formats=["%Y-%m-%dT%H:%M"],
    )
    description = forms.CharField(
        label="Description",
        widget=_textarea("Describe what happened and any details that could help others."),
    )


class SafeRouteProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ("first_name", "last_name", "email")
        widgets = {
            "first_name": _text_input("First name"),
            "last_name": _text_input("Last name"),
            "email": _text_input("Email address", "email"),
        }


class SafeRouteSettingsForm(forms.Form):
    alert_radius = forms.ChoiceField(
        label="Alert radius",
        choices=[
            ("2km", "2 km"),
            ("5km", "5 km"),
            ("10km", "10 km"),
        ],
        widget=_select(),
    )
    route_preference = forms.ChoiceField(
        label="Default route preference",
        choices=[
            ("safest", "Safest route"),
            ("balanced", "Balanced"),
            ("fastest", "Fastest available"),
        ],
        widget=_select(),
    )
    email_alerts = forms.BooleanField(
        label="Email alerts",
        required=False,
        widget=forms.CheckboxInput(attrs={"class": "app-checkbox"}),
    )
    community_digest = forms.BooleanField(
        label="Community digest",
        required=False,
        widget=forms.CheckboxInput(attrs={"class": "app-checkbox"}),
    )


class SupportMessageForm(forms.Form):
    category = forms.ChoiceField(
        label="Category",
        choices=[
            ("account", "Account help"),
            ("routing", "Route guidance"),
            ("reporting", "Incident reporting"),
            ("technical", "Technical issue"),
        ],
        widget=_select(),
    )
    subject = forms.CharField(
        label="Subject",
        widget=_text_input("What do you need help with?"),
    )
    message = forms.CharField(
        label="Message",
        widget=_textarea("Share the issue or question you want support with."),
    )
