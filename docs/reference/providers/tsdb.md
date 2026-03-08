---
title: TSDB
parent: Providers
grand_parent: Technical Reference
nav_order: 2
docs_version: "2.4.0"
---

# TheSportsDB Provider

TheSportsDB (TSDB) is a community-driven sports data API. Teamarr uses it as a provider for leagues not covered by ESPN, including Australian sports, rugby, cricket, boxing, and Scandinavian leagues.

## API Tiers

TSDB has two tiers, both accessed via the same API endpoints:

| | Free | Premium |
|---|---|---|
| **API Key** | `123` (default) | Your own key (6+ digits) |
| **Rate Limit** | 30 req/min | 100 req/min |
| **Events per Query** | 5 per day per league | Full coverage |
| **Team Search** | 10 teams | 3,000 teams |
| **Cost** | Free | ~$9/month |

### Free Tier Leagues

These leagues have low enough event volume to work within free tier limits:

- CFL, Unrivaled, AFL, NRL, Super Rugby, Norwegian Hockey, Boxing

### Premium Tier Leagues

These leagues have high event volume (e.g., cup competitions with many concurrent games) and require a premium key for full coverage:

- IPL, BBL, SA20 (cricket)
- Svenska Cupen (soccer)

Without a premium key, cricket leagues will have limited event coverage (5 events per day per league).

## Configuration

Add your premium key in **Settings > System > TheSportsDB API Key**. The key takes effect immediately (no restart required). The league picker shows a crown icon on premium-tier leagues and warns if you select one without a key configured.

Get a key at [thesportsdb.com/pricing](https://www.thesportsdb.com/pricing).

## Rate Limiting

Teamarr enforces rate limits proactively using a sliding window limiter:
- Free: 30 requests per 60-second window
- Premium: 100 requests per 60-second window

If the API returns HTTP 429, Teamarr retries with exponential backoff (5s, 10s, 20s, 40s, 80s).

## Cricket

Cricket leagues (IPL, BBL, SA20) are premium tier. A premium key is recommended for full event coverage. Without one, TSDB's free tier returns up to 5 events per day per league, which may miss concurrent matches.
