// Transparent heuristic, not a crime prediction model. Coordinates are [longitude, latitude].
export const RISK_RULES={version:1,radius:200,maxAgeDays:7,weights:{safe:1,moderate:3,risky:6}};
export function segmentDistance(point,a,b) {
    const scale=Math.cos(point[1]*Math.PI/180), meters=111195;
    const ax=(a[0]-point[0])*scale*meters, ay=(a[1]-point[1])*meters;
    const dx=(b[0]-a[0])*scale*meters, dy=(b[1]-a[1])*meters;
    const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy || 1)));
    return Math.hypot(ax+t*dx,ay+t*dy);
}
const validPoint=p=>Array.isArray(p) && p.length>=2 && p.every(Number.isFinite) && Math.abs(p[0])<=180 && Math.abs(p[1])<=90;
export function assessRoute(route,reports,now=Date.now(),{presentation=false}={}) {
    const coordinates=route.geometry?.coordinates;
    if(!Array.isArray(reports) || !Array.isArray(coordinates) || coordinates.length<2 || !coordinates.every(validPoint)) return {key:'unknown',label:'Risk not assessed',score:null,matches:[]};
    const matches=[], supports=[], seen=new Set();
    for(const report of reports) {
        const scenario=presentation && report.origin==='presentation';
        if(report.origin!=='community' && report.origin!=='imported' && !scenario)continue;
        if(report.status==='resolved' || report.status==='rejected' || (report.is_demo && !scenario))continue;
        const age=(now-new Date(report.occurred_at).getTime())/86400000;
        const point=[report.longitude,report.latitude];
        if(!Number.isFinite(age) || age<0 || age>RISK_RULES.maxAgeDays || !validPoint(point))continue;
        if(report.origin==='imported' && (!report.expires_at || new Date(report.expires_at).getTime()<=now || report.location_precision!=='exact'))continue;
        const weight=RISK_RULES.weights[report.severity]; if(!weight)continue;
        const identity=report.id || `${point}/${report.occurred_at}/${report.incident_type}`;
        if(seen.has(identity))continue; seen.add(identity);
        let distance=Infinity;
        for(let i=1;i<coordinates.length;i++)distance=Math.min(distance,segmentDistance(point,coordinates[i-1],coordinates[i]));
        if(distance>RISK_RULES.radius)continue;
        if(scenario && report.feature_kind==='support') { supports.push({type:report.incident_type,location:report.location,distance:Math.round(distance)}); continue; }
        const recency=age<=1 ? 1 : age<=3 ? .6 : .3;
        const proximity=distance<=50 ? 1 : distance<=100 ? .75 : .5;
        matches.push({id:report.id,type:report.incident_type,location:report.location,severity:report.severity,origin:report.origin,distance:Math.round(distance),ageDays:age,contribution:weight*recency*proximity});
    }
    const score=matches.reduce((total,report)=>total+report.contribution,0);
    const key=score>=6 ? 'risky' : score>=2 ? 'moderate' : 'safe';
    return {version:2,key,label:{safe:'Lower reported exposure',moderate:'Moderate reported exposure',risky:'Higher reported exposure'}[key],score:Math.round(score*100)/100,matches:matches.sort((a,b)=>b.contribution-a.contribution),supports};
}
export function rankRoutes(routes,reports,preference='safest',now=Date.now(),options={}) {
    const rated=routes.map(route=>({...route,assessment:assessRoute(route,reports,now,options)}));
    const fastest=Math.max(1,Math.min(...rated.map(route=>route.duration)));
    const cost=route=>preference==='fastest' || route.assessment.score===null ? route.duration/fastest : preference==='balanced' ? route.duration/fastest+route.assessment.score/6 : route.assessment.score;
    return rated.sort((a,b)=>cost(a)-cost(b) || (preference==='safest' ? (b.assessment.supports?.length || 0)-(a.assessment.supports?.length || 0) : 0) || a.duration-b.duration);
}
