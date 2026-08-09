-- Top 10 goal scorers (season aggregate)
SELECT
    p.name          AS player,
    t.name          AS team,
    SUM(ps.goals)   AS goals,
    SUM(ps.assists) AS assists,
    SUM(ps.minutes) AS minutes,
    ROUND(SUM(ps.goals)::numeric / NULLIF(SUM(ps.minutes), 0) * 90, 2) AS goals_per90
FROM players p
JOIN player_season_stats ps ON p.id = ps.player_id
JOIN teams t                ON p.team_id = t.id
GROUP BY p.id, p.name, t.name
ORDER BY goals DESC
LIMIT 10;
