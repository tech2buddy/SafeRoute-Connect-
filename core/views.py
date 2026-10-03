from copy import deepcopy

from django.contrib import messages
from django.contrib.auth import login, logout
from django.shortcuts import redirect, render
from django.utils import timezone

from .forms import (
    IncidentReportForm,
    SafeRouteLoginForm,
    SafeRouteProfileForm,
    SafeRouteSearchForm,
    SafeRouteSettingsForm,
    SafeRouteSignupForm,
    SupportMessageForm,
)


DEFAULT_ROUTE_HISTORY = [
    {
        "from": "Sol Plaatje University",
        "to": "Kimberley CBD",
        "timestamp": "May 20, 2024 - 10:30 AM",
        "risk_key": "safe",
        "risk_label": "Safe",
    },
    {
        "from": "SPU Residence",
        "to": "New Park",
        "timestamp": "May 18, 2024 - 08:15 AM",
        "risk_key": "moderate",
        "risk_label": "Moderate",
    },
    {
        "from": "SPU Main Gate",
        "to": "Royldene",
        "timestamp": "May 15, 2024 - 06:45 PM",
        "risk_key": "risky",
        "risk_label": "Risky",
    },
]

DEFAULT_COMMUNITY_REPORTS = [
    {
        "title": "Suspicious Activity",
        "location": "Du Toitspan Road",
        "severity_key": "risky",
        "severity_label": "High risk",
        "time": "2h ago",
        "description": "Community members reported suspicious movement near the taxi stop.",
    },
    {
        "title": "Poor Street Lighting",
        "location": "Memorial Road",
        "severity_key": "moderate",
        "severity_label": "Use caution",
        "time": "5h ago",
        "description": "Lighting around the pedestrian crossing is weak after sunset.",
    },
    {
        "title": "Robbery Report",
        "location": "Galeshewe",
        "severity_key": "risky",
        "severity_label": "High risk",
        "time": "1d ago",
        "description": "An overnight robbery was reported by a local resident.",
    },
]

FAVORITE_ROUTES = [
    {"label": "Campus to CBD", "detail": "Fast daytime route with strong foot traffic", "risk_key": "safe"},
    {"label": "Residence to Library", "detail": "Balanced evening route with lit streets", "risk_key": "moderate"},
]

HELP_TOPICS = [
    {
        "title": "How route safety works",
        "body": "SafeRoute combines route preference, recent reports, and area awareness cues to highlight lower-risk paths.",
    },
    {
        "title": "When to report an incident",
        "body": "Report anything that could affect community safety: hazards, harassment, suspicious behavior, or environmental risks.",
    },
    {
        "title": "Guest vs account access",
        "body": "Guests can explore prototype pages, while signed-in users can personalize their profile and save settings.",
    },
]


def _deepcopy_list(items):
    return deepcopy(items)


def _session_items(request, key, defaults):
    stored = request.session.get(key, [])
    return stored + _deepcopy_list(defaults)


def _store_session_items(request, key, items, limit=6):
    request.session[key] = items[:limit]
    request.session.modified = True


def _risk_meta(priority):
    mapping = {
        "safest": {
            "risk_key": "safe",
            "risk_label": "Safe",
            "summary": "Prioritizes well-traveled roads and stronger community confidence.",
            "eta": "18 min",
        },
        "balanced": {
            "risk_key": "moderate",
            "risk_label": "Moderate",
            "summary": "Balances travel time with current caution markers.",
            "eta": "14 min",
        },
        "fastest": {
            "risk_key": "risky",
            "risk_label": "Risky",
            "summary": "This route is quicker, but it passes through more uncertain areas.",
            "eta": "11 min",
        },
    }
    return mapping.get(priority, mapping["safest"])


def _build_route_result(cleaned_data):
    risk = _risk_meta(cleaned_data["safety_priority"])
    return {
        "from": cleaned_data["start_location"],
        "to": cleaned_data["destination"],
        "travel_mode": cleaned_data["travel_mode"],
        "preference": cleaned_data["safety_priority"],
        "risk_key": risk["risk_key"],
        "risk_label": risk["risk_label"],
        "summary": risk["summary"],
        "eta": risk["eta"],
        "waypoints": ["Campus Gate", "Memorial Road", "CBD Link"],
    }


def _build_route_history_item(result):
    return {
        "from": result["from"],
        "to": result["to"],
        "timestamp": timezone.localtime().strftime("%b %d, %Y - %I:%M %p"),
        "risk_key": result["risk_key"],
        "risk_label": result["risk_label"],
    }


def _community_reports(request):
    return _session_items(request, "custom_reports", DEFAULT_COMMUNITY_REPORTS)


def _route_history(request):
    return _session_items(request, "custom_routes", DEFAULT_ROUTE_HISTORY)


def _build_alerts(reports):
    alerts = []
    for report in reports[:5]:
        alerts.append(
            {
                "title": report["title"],
                "location": report["location"],
                "severity_key": report["severity_key"],
                "severity_label": report["severity_label"],
                "time": report["time"],
                "body": report["description"],
            }
        )
    return alerts


def _dashboard_context(request):
    routes = _route_history(request)
    reports = _community_reports(request)
    alerts = _build_alerts(reports)
    return {
        "active_page": "dashboard",
        "page_title": "Dashboard",
        "page_subtitle": "Here's what's happening across the SafeRoute experience right now.",
        "stats": [
            {"value": len(routes), "label": "Safe Routes", "style": "safe"},
            {"value": len(reports), "label": "Incidents", "style": "warning"},
            {"value": max(len(reports) - 1, 1), "label": "Community", "style": "info"},
            {"value": len(alerts), "label": "Alerts", "style": "purple"},
        ],
        "recent_routes": routes[:3],
        "recent_reports": reports[:3],
        "alerts": alerts,
        "quick_actions": [
            {"href": "find_route", "title": "Find Safe Route", "body": "Plan the safest path to your destination.", "color": "green"},
            {"href": "report_incident", "title": "Report Incident", "body": "Share a safety concern with the community.", "color": "orange"},
            {"href": "alerts", "title": "View Alerts", "body": "Check active warnings in your area.", "color": "blue"},
            {"href": "community_reports", "title": "Community Reports", "body": "See what others have submitted recently.", "color": "purple"},
        ],
    }


def home(request):
    return render(request, "home.html")


def public_page_view(request, page):
    form = SupportMessageForm(request.POST or None) if page == "contact" else None
    if request.method == "POST" and form and form.is_valid():
        requests = request.session.get("contact_requests", [])
        requests.append(form.cleaned_data)
        request.session["contact_requests"] = requests[-10:]
        messages.success(request, "Your message has been saved in this browser session. Email delivery is not yet available.")
        return redirect("contact")
    return render(request, "public_page.html", {"public_page": page, "form": form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect("routes")

    form = SafeRouteLoginForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        login(request, form.get_user())
        messages.success(request, "Welcome back to SafeRoute Connect.")
        return redirect("routes")

    return render(
        request,
        "auth/login.html",
        {
            "page_title": "Login",
            "form": form,
        },
    )


def signup_view(request):
    if request.user.is_authenticated:
        return redirect("routes")

    form = SafeRouteSignupForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user)
        messages.success(request, "Your account has been created.")
        return redirect("routes")

    return render(
        request,
        "auth/signup.html",
        {
            "page_title": "Register",
            "form": form,
        },
    )


def logout_view(request):
    logout(request)
    messages.success(request, "You have been logged out.")
    return redirect("home")


def routes_view(request):
    return render(request, "routes.html", _dashboard_context(request))


def find_route_view(request):
    initial = {
        "start_location": "Sol Plaatje University",
        "destination": "Kimberley CBD",
        "travel_mode": "walk",
        "safety_priority": "safest",
    }
    form = SafeRouteSearchForm(request.POST or None, initial=initial)
    last_result = request.session.get("last_route_result")

    if request.method == "POST" and form.is_valid():
        result = _build_route_result(form.cleaned_data)
        routes = request.session.get("custom_routes", [])
        routes.insert(0, _build_route_history_item(result))
        _store_session_items(request, "custom_routes", routes)
        request.session["last_route_result"] = result
        request.session.modified = True
        messages.success(request, "Route preview updated successfully.")
        last_result = result

    if not last_result:
        last_result = _build_route_result(initial)

    context = {
        "active_page": "find_route",
        "page_title": "Find Safe Route",
        "page_subtitle": "Compare route options and prioritize safer movement through the city.",
        "form": form,
        "route_result": last_result,
        "recent_routes": _route_history(request)[:4],
    }
    return render(request, "find_route.html", context)


def my_routes_view(request):
    context = {
        "active_page": "my_routes",
        "page_title": "My Routes",
        "page_subtitle": "Review recent route history and the paths you keep coming back to.",
        "route_history": _route_history(request),
        "favorite_routes": FAVORITE_ROUTES,
    }
    return render(request, "my_routes.html", context)


def report_incident_view(request):
    form = IncidentReportForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        custom_reports = request.session.get("custom_reports", [])
        custom_reports.insert(
            0,
            {
                "title": form.cleaned_data["incident_type"].replace("_", " ").title(),
                "location": form.cleaned_data["location"],
                "severity_key": form.cleaned_data["severity"],
                "severity_label": form.cleaned_data["severity"].replace("_", " ").title(),
                "time": "Just now",
                "description": form.cleaned_data["description"],
            },
        )
        _store_session_items(request, "custom_reports", custom_reports)
        messages.success(request, "Incident captured and added to the safety map.")
        return redirect("safety_map")

    context = {
        "active_page": "report_incident",
        "page_title": "Report Incident",
        "page_subtitle": "Help the community stay informed by logging a safety issue clearly and quickly.",
        "form": form,
        "recent_reports": _community_reports(request)[:3],
    }
    return render(request, "report_incident.html", context)


def alerts_view(request):
    reports = _community_reports(request)
    alerts = _build_alerts(reports)
    context = {
        "active_page": "alerts",
        "page_title": "Alerts",
        "page_subtitle": "Active signals and warning markers based on the latest community activity.",
        "alerts": alerts,
        "alert_counts": {
            "risky": len([alert for alert in alerts if alert["severity_key"] == "risky"]),
            "moderate": len([alert for alert in alerts if alert["severity_key"] == "moderate"]),
            "safe": len([alert for alert in alerts if alert["severity_key"] == "safe"]),
        },
    }
    return render(request, "alerts.html", context)


def community_reports_view(request):
    reports = _community_reports(request)
    context = {
        "active_page": "community_reports",
        "page_title": "Community Reports",
        "page_subtitle": "A live-looking feed of recent submissions, risk notes, and neighborhood observations.",
        "reports": reports,
    }
    return render(request, "community_reports.html", context)


def safety_map_view(request):
    reports = _community_reports(request)
    context = {
        "active_page": "safety_map",
        "page_title": "Safety Map",
        "page_subtitle": "See reported incidents on a live map and understand what is happening around you.",
        "reports": reports,
        "map_counts": {
            "total": len(reports),
            "risky": len([report for report in reports if report["severity_key"] == "risky"]),
            "moderate": len([report for report in reports if report["severity_key"] == "moderate"]),
            "safe": len([report for report in reports if report["severity_key"] == "safe"]),
        },
    }
    return render(request, "safety_map.html", context)


def profile_view(request):
    form = None
    if request.user.is_authenticated:
        form = SafeRouteProfileForm(request.POST or None, instance=request.user)
        if request.method == "POST" and form.is_valid():
            form.save()
            messages.success(request, "Your profile details were updated.")
            return redirect("profile")

    context = {
        "active_page": "profile",
        "page_title": "Profile",
        "page_subtitle": "See your account details, route activity, and community footprint in one place.",
        "form": form,
        "route_count": len(_route_history(request)),
        "report_count": len(_community_reports(request)),
    }
    return render(request, "profile.html", context)


def settings_view(request):
    defaults = request.session.get(
        "settings_form_data",
        {
            "alert_radius": "5km",
            "route_preference": "safest",
            "email_alerts": True,
            "community_digest": False,
        },
    )
    form = SafeRouteSettingsForm(request.POST or None, initial=defaults)

    if request.method == "POST" and form.is_valid():
        request.session["settings_form_data"] = form.cleaned_data
        request.session.modified = True
        messages.success(request, "Your preferences were saved.")
        return redirect("settings")

    context = {
        "active_page": "settings",
        "page_title": "Settings",
        "page_subtitle": "Choose how the product should notify you and how route decisions should default.",
        "form": form,
    }
    return render(request, "settings.html", context)


def support_view(request):
    form = SupportMessageForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        messages.success(request, "Your support message was prepared successfully.")
        return redirect("support")

    context = {
        "active_page": "support",
        "page_title": "Help & Support",
        "page_subtitle": "Get guidance, understand the platform, and reach out when you need help.",
        "form": form,
        "topics": HELP_TOPICS,
    }
    return render(request, "support.html", context)
