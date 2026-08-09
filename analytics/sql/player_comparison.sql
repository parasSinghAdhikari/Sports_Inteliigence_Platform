-- Player comparison: side-by-side per-90 metrics for any two players
-- Replace the names to compare different players

WITH player_stats AS (
    SELECT
        p.name          AS player,
        t.name          AS team,
        p.position,
        SUM(ps.minutes)                                               AS minutes,
        SUM(ps.goals)                                                 AS goals,
        SUM(ps.assists)                                               AS assists,
        SUM(ps.xg)                                                    AS xg,
        SUM(ps.xa)                                                    AS xa,
        SUM(ps.shots)                                                 AS shots,
        SUM(ps.key_passes)                                            AS key_passes,
        SUM(ps.tackles)                                               AS tackles,
        SUM(ps.interceptions)                                         AS interceptions,

        -- Per-90 metrics
        ROUND(SUM(ps.goals)::numeric        / NULLIF(SUM(ps.minutes),0) * 90, 2) AS goals_p90,
        ROUND(SUM(ps.assists)::numeric      / NULLIF(SUM(ps.minutes),0) * 90, 2) AS assists_p90,
        ROUND(SUM(ps.xg)::numeric           / NULLIF(SUM(ps.minutes),0) * 90, 2) AS xg_p90,
        ROUND(SUM(ps.xa)::numeric           / NULLIF(SUM(ps.minutes),0) * 90, 2) AS xa_p90,
        ROUND(SUM(ps.shots)::numeric        / NULLIF(SUM(ps.minutes),0) * 90, 2) AS shots_p90,
        ROUND(SUM(ps.key_passes)::numeric   / NULLIF(SUM(ps.minutes),0) * 90, 2) AS key_passes_p90,
        ROUND(SUM(ps.tackles)::numeric      / NULLIF(SUM(ps.minutes),0) * 90, 2) AS tackles_p90,
        ROUND(SUM(ps.interceptions)::numeric/ NULLIF(SUM(ps.minutes),0) * 90, 2) AS interceptions_p90
    FROM players p
    JOIN player_season_stats ps ON p.id = ps.player_id
    JOIN teams t                ON p.team_id = t.id
    GROUP BY p.id, p.name, t.name, p.position
)
SELECT *
FROM player_stats
WHERE player IN ('Mohamed Salah', 'Bukayo Saka')   -- ← change player names here
ORDER BY player;
