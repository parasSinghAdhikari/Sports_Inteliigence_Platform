-- Top assist providers with per-90 rate
SELECT
    p.name                                                          AS player,
    t.name                                                          AS team,
    p.position,
    SUM(pss.assists)                                                AS assists,
    SUM(pss.goals)                                                  AS goals,
    SUM(pss.minutes)                                                AS minutes,
    ROUND(SUM(pss.assists)::numeric / NULLIF(SUM(pss.minutes),0) * 90, 2) AS assists_per90
FROM player_season_stats pss
JOIN players p ON p.id = pss.player_id
JOIN teams   t ON t.id = p.team_id
GROUP BY p.id, p.name, t.name, p.position
ORDER BY assists DESC
LIMIT 10;
