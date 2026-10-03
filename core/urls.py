from django.urls import path

from .views import (
    alerts_view,
    community_reports_view,
    find_route_view,
    home,
    public_page_view,
    login_view,
    logout_view,
    my_routes_view,
    profile_view,
    report_incident_view,
    routes_view,
    safety_map_view,
    settings_view,
    signup_view,
    support_view,
)


urlpatterns = [
    path("", home, name="home"),
    path("features/", public_page_view, {"page": "features"}, name="features"),
    path("preview/", public_page_view, {"page": "preview"}, name="preview"),
    path("contact/", public_page_view, {"page": "contact"}, name="contact"),
    path("accounts/login/", login_view, name="login"),
    path("accounts/signup/", signup_view, name="signup"),
    path("accounts/logout/", logout_view, name="logout"),
    path("routes/", routes_view, name="routes"),
    path("routes/find/", find_route_view, name="find_route"),
    path("routes/history/", my_routes_view, name="my_routes"),
    path("incidents/report/", report_incident_view, name="report_incident"),
    path("alerts/", alerts_view, name="alerts"),
    path("map/", safety_map_view, name="safety_map"),
    path("community/", community_reports_view, name="community_reports"),
    path("profile/", profile_view, name="profile"),
    path("settings/", settings_view, name="settings"),
    path("support/", support_view, name="support"),
]
