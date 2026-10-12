# Presentation scenarios

Apply `20261012_presentation_features.sql` to install twelve fictional features
in a separate table. It is safe to rerun without duplicating the data. These
are not real observations about Kimberley; locations are scenario anchors.

Signed-in users can read the features. Ordinary users cannot write them.
They do not create community incidents, affect live counts, or appear as AI
discoveries. The live route model excludes them unless presentation mode is
explicitly enabled from the route map. Toggle off to restore live scoring.

Hazards: lighting, harassment, dangerous crossing, damaged pavement,
blocked walkway, isolated path, and theft. Positive features: working
lighting, monitored entrance, designated crossing, maintained footpath,
and clear sightlines. Scenario ages are relative to when the dataset is
loaded, so a presentation does not become empty as seed timestamps age.

Positive features never subtract hazard points. They break ties for the
lowest-exposure preference; time-focused and balanced ranking are unchanged.
The score and contributing features are shown in the route explanation.
Candidate routes are still OSRM alternatives, not newly generated detours.

For a demo, use the university and shopping-centre destinations, enable
Presentation mode on the map, then Find routes. Select alternative routes
and open the rating explanation. Features only contribute within 200 m of
the returned road geometry, so rankings depend on the routes actually returned.
