-- Team performance summary: goals, possession, form points
WITH match_results AS (
    SELECT
        m.home_team_id                                        AS team_id,
        m.home_score                                          AS scored,
        m.away_score                                          AS conceded,
        CASE WHEN m.home_score > m.away_score THEN 3
             WHEN m.home_score = m.away_score THEN 1
             ELSE 0 END                                       AS points
    FROM matches m
    WHERE m.home_score IS NOT NULL
    UNION ALL
    SELECT
        m.away_team_id,
        m.away_score,
        m.home_score,
        CASE WHEN m.away_score > m.home_score THEN 3
             WHEN m.away_score = m.home_score THEN 1
             ELSE 0 END
    FROM matches m
    WHERE m.away_score IS NOT NULL
)
SELECT
    t.name                        AS team,
    COUNT(*)                      AS played,
    SUM(CASE WHEN mr.points = 3 THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN mr.points = 1 THEN 1 ELSE 0 END) AS draws,
    SUM(CASE WHEN mr.points = 0 THEN 1 ELSE 0 END) AS losses,
    SUM(mr.scored)                AS goals_for,
    SUM(mr.conceded)              AS goals_against,
    SUM(mr.scored) - SUM(mr.conceded) AS goal_diff,
    SUM(mr.points)                AS points
FROM match_results mr
JOIN teams t ON t.id = mr.team_id
GROUP BY t.id, t.name
ORDER BY points DESC, goal_diff DESC;
