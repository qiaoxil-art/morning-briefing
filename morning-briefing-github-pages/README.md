# Daily Morning Briefing

This is a free GitHub Pages + GitHub Actions setup for a phone-accessible morning briefing.

It runs in GitHub's cloud, publishes a fresh `index.html`, and does not require your laptop to be awake.

## What You Need To Do

1. Create a free GitHub account if you do not already have one.
2. Create a new public repository, for example `morning-briefing`.
3. Upload everything in this folder to that repository.
4. In the repository, go to **Settings -> Pages**.
5. Under **Build and deployment**, set **Source** to **GitHub Actions**.
6. Go to the **Actions** tab.
7. Open **Daily Morning Briefing**.
8. Tap **Run workflow** once to test it.
9. After it finishes, go back to **Settings -> Pages** and copy the published site URL.
10. Open that URL on your phone and add it to your home screen.

## Schedule

The workflow is scheduled with:

```yaml
cron: "0 23 * * *"
```

GitHub Actions cron uses UTC. `23:00 UTC` is `07:00 Asia/Singapore`.

If you want 7:00 AM in another timezone, edit `.github/workflows/daily-briefing.yml`.

## Cost

This is designed to cost $0:

- GitHub Pages is free for this kind of static site.
- GitHub Actions standard runners are free for public repositories.
- The generator uses public RSS/news feeds and does not require paid API keys.

## Limits

This free version does not use Claude, OpenAI, Bloomberg, Reuters APIs, or paid search APIs. It pulls public RSS-style news results and creates concise summaries from the available feed text.

That means it is good for a lightweight morning scan, but it will not be as nuanced as the original Claude prompt unless you later add an LLM or search API key.
