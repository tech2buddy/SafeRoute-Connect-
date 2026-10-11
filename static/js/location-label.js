export function locationLabel(result) {
    const address = result?.address || {};
    const road = address.road || address.pedestrian || address.footway;
    const area = address.suburb || address.neighbourhood || address.quarter;
    const city = address.city || address.town || address.village;
    const namedPlace = address.building || address.amenity || address.shop || address.office || address.tourism
        || (['building','amenity','shop','office','tourism'].includes(result?.class) ? result.name : null);
    // Reverse geocoding finds a nearby mapped feature, not proof of building occupancy.
    const street = road ? [address.house_number,road].filter(Boolean).join(' ') : null;
    if (!namedPlace && !street) return 'Your current GPS position';
    const parts = [...new Set([namedPlace,street,area,city].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
    return `Near ${parts.join(', ')}`.slice(0,300);
}
