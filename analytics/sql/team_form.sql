-- Team form: last 5 matches (W/D/L) sorted by most recent first
-- Result from home team's perspective
WITH match_results AS (
    SELECT
        m.id            AS match_id,
        m.match_date,
        m.matchweek,
        ht.name         AS home_team,
        at.name         AS away_team,
        m.home_score,
        m.away_score,
        CASE
            WHEN m.home_score  > m.away_score THEN 'W'
            WHEN m.home_score  = m.away_score THEN 'D'
            ELSE 'L'
        END             AS home_result,
        CASE
            WHEN m.away_score  > m.home_score THEN 'W'
            WHEN m.away_score  = m.home_score THEN 'D'
            ELSE 'L'
        END             AS away_result
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.home_score IS NOT NULL   -- completed matches only
),
team_results AS (
    -- Home perspective
    SELECT match_id, match_date, home_team AS team, home_result AS result FROM match_results
    UNION ALL
    -- Away perspective
    SELECT match_id, match_date, away_team AS team, away_result AS result FROM match_results
),
ranked AS (
    SELECT
        team,
        result,
        match_date,
        ROW_NUMBER() OVER (PARTITION BY team ORDER BY match_date DESC) AS rn
    FROM team_results
)
SELECT
    team,
    STRING_AGG(result, '' ORDER BY rn) AS form_last5,  -- e.g. "WWDLW"
    SUM(CASE WHEN result = 'W' THEN 3
             WHEN result = 'D' THEN 1
             ELSE 0 END)               AS points_last5
FROM ranked
WHERE rn <= 5
GROUP BY team
ORDER BY points_last5 DESC;
