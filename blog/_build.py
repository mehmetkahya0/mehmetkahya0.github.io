"""Static blog builder.

Reads post sources from blog/_posts/*.html, then writes:
  - blog/<slug>.html        one page per post
  - blog/index.html         the blog index
  - index.html              the "Writing" teaser between <!-- BLOG:START --> and <!-- BLOG:END -->
  - sitemap.xml

Header, menu, icon sprite and footer are copied from index.html so every page stays in sync.
Files and folders starting with "_" are skipped by GitHub Pages (Jekyll), so neither this
script nor the sources are published.

Each source starts with a comment block of "key: value" lines:

    <!--
    title: Chain Prompt: driving Claude Code <em>with its own hooks</em>
    card_title: Chain Prompt
    description: One or two sentences for cards and meta tags.
    date: 2026-10-27
    tags: Developer tools, TypeScript
    cover: queue            (cover pattern from script.js COVERS)
    seed: 4
    repo: https://github.com/...
    demo: https://...       (optional)
    order: 1                (lower comes first)
    -->

Usage:  python blog/_build.py
"""

from __future__ import annotations

import datetime as dt
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
SRC = BLOG / "_posts"
SITE = "https://mehmetkahya0.github.io"
HOME_TEASER = 3  # posts shown on the homepage


# ---------------------------------------------------------------- sources

def parse_post(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(.*?)-->\s*", raw, re.S)
    if not m:
        raise SystemExit(f"{path.name}: missing metadata comment")
    meta = {}
    for line in m.group(1).strip().splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip()
    body = raw[m.end():].strip()

    post = {
        "slug": path.stem,
        "title": meta["title"],
        "plain_title": re.sub(r"<[^>]+>", "", meta["title"]),
        "card_title": meta.get("card_title") or re.sub(r"<[^>]+>", "", meta["title"]),
        "description": meta["description"],
        "date": dt.date.fromisoformat(meta["date"]),
        "tags": [t.strip() for t in meta.get("tags", "").split(",") if t.strip()],
        "cover": meta.get("cover", "orb"),
        "seed": meta.get("seed", "1"),
        "repo": meta.get("repo", ""),
        "demo": meta.get("demo", ""),
        "order": int(meta.get("order", "99")),
    }
    post["body"], post["toc"] = add_heading_ids(body)
    words = len(re.sub(r"<[^>]+>", " ", body).split())
    post["minutes"] = max(1, round(words / 220))
    return post


def slugify(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", html.unescape(text)).lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def add_heading_ids(body: str) -> tuple[str, list[tuple[str, str]]]:
    toc = []

    def repl(m: re.Match) -> str:
        inner = m.group(1)
        hid = slugify(inner)
        toc.append((hid, re.sub(r"<[^>]+>", "", inner)))
        return f'<h2 id="{hid}">{inner}</h2>'

    return re.sub(r"<h2>(.*?)</h2>", repl, body), toc


# ---------------------------------------------------------- shared chrome

def between(text: str, start: str, end: str, include_start: bool = True) -> str:
    i = text.index(start)
    j = text.index(end, i)
    return text[i if include_start else i + len(start):j]


def site_chrome() -> dict:
    """Pull the sprite, header, menu and footer out of index.html and make links absolute."""
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    sprite = between(index, "    <!-- SVG sprite", "\n\n    <!-- ============ Header")
    header = between(index, "    <!-- ============ Header", "\n\n    <!-- Fullscreen menu")
    menu = between(index, "    <!-- Fullscreen menu", "\n\n    <main")
    footer = between(index, "    <!-- ============ Footer", "\n\n    <script")

    def absolute(fragment: str) -> str:
        fragment = fragment.replace('href="#top" class="nav-logo"', 'href="/" class="nav-logo"')
        # Section anchors become "/#section"; "#top" and sprite icons ("#i-…") stay local
        fragment = re.sub(r'<a href="#(?!top")([\w-]+)"', r'<a href="/#\1"', fragment)
        return fragment.replace('src="images/', 'src="/images/')

    header = absolute(header).replace(
        '<a href="/blog/" class="nav-link">', '<a href="/blog/" class="nav-link is-active" aria-current="page">'
    )
    return {"sprite": sprite, "header": header, "menu": absolute(menu), "footer": absolute(footer)}


def head(title: str, description: str, url: str, kind: str = "website", extra: str = "") -> str:
    t, d = html.escape(title), html.escape(description)
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#06121b" />
    <title>{t}</title>
    <meta name="description" content="{d}" />
    <meta name="author" content="Mehmet Kahya" />
    <link rel="canonical" href="{url}" />
    <meta property="og:type" content="{kind}" />
    <meta property="og:url" content="{url}" />
    <meta property="og:title" content="{t}" />
    <meta property="og:description" content="{d}" />
    <meta property="og:image" content="{SITE}/preview.jpg" />
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:title" content="{t}" />
    <meta property="twitter:description" content="{d}" />
    <meta property="twitter:image" content="{SITE}/preview.jpg" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/favicon.png" />
    <link rel="alternate" type="application/rss+xml" title="Mehmet Kahya — Writing" href="/blog/feed.xml" />
    <script data-goatcounter="https://mehmetkahya.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/styles.css" />{extra}
  </head>"""


def page(chrome: dict, head_html: str, main: str) -> str:
    return f"""{head_html}
  <body>
    <a class="skip-link" href="#main">Skip to content</a>

{chrome["sprite"]}

{chrome["header"]}

{chrome["menu"]}

    <main id="main">
{main}
    </main>

{chrome["footer"]}

    <div class="read-progress" aria-hidden="true"></div>
    <script src="/script.js"></script>
  </body>
</html>
"""


# ------------------------------------------------------------- fragments

ORB = '<span class="btn-orb"><svg><use href="#i-arrow-ur" /></svg></span>'


def fmt_date(d: dt.date) -> str:
    return f"{d:%b} {d.day}, {d:%Y}"


def card(post: dict, feature: bool = False, indent: str = "            ") -> str:
    cls = "bezel card post-card reveal" + (" post-card-feature" if feature else "")
    tags = ",".join(slugify(t) for t in post["tags"])
    first_tag = html.escape(post["tags"][0]) if post["tags"] else "Post"
    return f"""{indent}<a href="/blog/{post["slug"]}.html" class="{cls}" data-tags="{tags}">
{indent}  <div class="bezel-core card-core">
{indent}    <div class="cover" data-kind="{post["cover"]}" data-seed="{post["seed"]}" aria-hidden="true"><canvas></canvas></div>
{indent}    <div class="card-body">
{indent}      <div class="post-card-meta"><span>{first_tag}</span><span class="dot"></span><span>{post["minutes"]} min read</span></div>
{indent}      <h3 class="card-title">{html.escape(post["card_title"])}</h3>
{indent}      <p class="card-desc">{html.escape(post["description"])}</p>
{indent}      <div class="card-foot"><span class="read-more">Read the post</span>{ORB}</div>
{indent}    </div>
{indent}  </div>
{indent}</a>
"""


def post_page(chrome: dict, post: dict, prev: dict | None, nxt: dict | None) -> str:
    url = f"{SITE}/blog/{post['slug']}.html"
    ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post["plain_title"],
        "description": post["description"],
        "datePublished": post["date"].isoformat(),
        "author": {"@type": "Person", "name": "Mehmet Kahya", "url": SITE},
        "mainEntityOfPage": url,
        "keywords": ", ".join(post["tags"]),
    }
    extra = f'\n    <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'
    title = f"{post['plain_title']} — Mehmet Kahya"

    actions = []
    if post["repo"]:
        actions.append(
            f'<a href="{post["repo"]}" target="_blank" rel="noopener" class="btn btn-light magnetic">'
            f'<span>View on GitHub</span><span class="btn-orb"><svg><use href="#i-github" /></svg></span></a>'
        )
    if post["demo"]:
        actions.append(
            f'<a href="{post["demo"]}" target="_blank" rel="noopener" class="btn btn-ghost magnetic">'
            f"<span>Live demo</span>{ORB}</a>"
        )
    tags = "".join(f"<li>{html.escape(t)}</li>" for t in post["tags"])
    toc = "\n".join(f'              <li><a href="#{hid}">{html.escape(text)}</a></li>' for hid, text in post["toc"])

    nav = []
    if prev:
        nav.append(
            f'<a class="post-nav-link prev" href="/blog/{prev["slug"]}.html">'
            f'<span class="mono">← Previous</span><span>{html.escape(prev["card_title"])}</span></a>'
        )
    else:
        nav.append("<span></span>")
    if nxt:
        nav.append(
            f'<a class="post-nav-link next" href="/blog/{nxt["slug"]}.html">'
            f'<span class="mono">Next →</span><span>{html.escape(nxt["card_title"])}</span></a>'
        )

    main = f"""      <article class="post">
        <header class="post-hero" id="top">
          <div class="container">
            <div class="post-hero-inner">
              <a class="post-back reveal" href="/blog/"><svg><use href="#i-arrow-r" /></svg>All posts</a>
              <div class="post-meta reveal">
                <span class="eyebrow">{html.escape(post["tags"][0] if post["tags"] else "Post")}</span>
                <span class="mono"><time datetime="{post["date"].isoformat()}">{fmt_date(post["date"])}</time> · {post["minutes"]} min read</span>
              </div>
              <h1 class="post-title reveal">{post["title"]}</h1>
              <p class="post-lede reveal">{html.escape(post["description"])}</p>
              <div class="post-actions reveal">
                {"".join(actions)}
              </div>
            </div>
            <div class="bezel post-cover reveal">
              <div class="bezel-core">
                <div class="cover" data-kind="{post["cover"]}" data-seed="{post["seed"]}" aria-hidden="true"><canvas></canvas></div>
              </div>
            </div>
          </div>
        </header>

        <div class="container post-layout">
          <aside class="post-toc" aria-label="On this page">
            <h2>On this page</h2>
            <ol>
{toc}
            </ol>
          </aside>
          <div class="prose">
{post["body"]}
            <hr />
            <ul class="chips" aria-label="Tags">{tags}</ul>
          </div>
        </div>

        <footer class="post-end container">
          <nav class="post-nav" aria-label="More posts">
            {"".join(nav)}
          </nav>
        </footer>
      </article>"""
    return page(chrome, head(title, post["description"], url, "article", extra), main)


def index_page(chrome: dict, posts: list[dict]) -> str:
    # Filter by each post's primary topic only; secondary tags would clutter the bar
    tags = []
    for p in posts:
        if p["tags"] and p["tags"][0] not in tags:
            tags.append(p["tags"][0])
    buttons = ['<button type="button" data-tag="all" aria-pressed="true">All</button>'] + [
        f'<button type="button" data-tag="{slugify(t)}" aria-pressed="false">{html.escape(t)}</button>' for t in tags
    ]
    cards = "".join(card(p, feature=(i == 0)) for i, p in enumerate(posts))
    main = f"""      <header class="blog-head" id="top">
        <div class="container">
          <span class="eyebrow reveal">Writing</span>
          <h1 class="display reveal">Notes from <em>the lab.</em></h1>
          <p class="body-lg reveal">
            Deep dives into how my projects actually work: the architecture, the bugs that took a weekend,
            and the decisions I would make differently today.
          </p>
        </div>
      </header>

      <section class="blog-list" aria-label="All posts">
        <div class="container">
          <div class="blog-filter reveal" role="toolbar" aria-label="Filter posts by topic">
            {"".join(buttons)}
          </div>
          <div class="post-grid">
{cards}          </div>
        </div>
      </section>"""
    return page(
        chrome,
        head(
            "Writing — Mehmet Kahya",
            "Technical deep dives into Mehmet Kahya's open-source projects: Claude Code tooling, browser extensions, AirPlay streaming, WebRTC and more.",
            f"{SITE}/blog/",
        ),
        main,
    )


def home_teaser(posts: list[dict]) -> str:
    cards = "".join(card(p, indent="            ") for p in posts[:HOME_TEASER])
    return f"""      <!-- BLOG:START -->
      <!-- Generated by blog/_build.py — edit the posts, not this block -->
      <section id="writing" class="section writing" aria-labelledby="writing-heading">
        <div class="container">
          <div class="section-head section-head-split">
            <div>
              <span class="eyebrow reveal">05 — Writing</span>
              <h2 class="display reveal" id="writing-heading">Notes from <em>the lab.</em></h2>
            </div>
            <p class="body-md section-sub reveal">Technical deep dives into how my projects work, what broke along the way, and what I learned.</p>
          </div>
          <div class="post-grid">
{cards}          </div>
          <div class="writing-cta reveal">
            <a href="/blog/" class="btn btn-ghost magnetic">
              <span>All {len(posts)} posts</span>
              {ORB}
            </a>
          </div>
        </div>
      </section>
      <!-- BLOG:END -->"""


def feed(posts: list[dict]) -> str:
    items = "".join(
        f"""
    <item>
      <title>{html.escape(p["plain_title"])}</title>
      <link>{SITE}/blog/{p["slug"]}.html</link>
      <guid>{SITE}/blog/{p["slug"]}.html</guid>
      <pubDate>{dt.datetime.combine(p["date"], dt.time(9)).strftime("%a, %d %b %Y %H:%M:%S +0300")}</pubDate>
      <description>{html.escape(p["description"])}</description>
    </item>"""
        for p in posts
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mehmet Kahya — Writing</title>
    <link>{SITE}/blog/</link>
    <description>Technical deep dives into Mehmet Kahya's open-source projects.</description>
    <language>en</language>{items}
  </channel>
</rss>
"""


def sitemap(posts: list[dict]) -> str:
    today = dt.date.today().isoformat()
    urls = [(f"{SITE}/", today, "1.0"), (f"{SITE}/blog/", today, "0.8")]
    urls += [(f"{SITE}/blog/{p['slug']}.html", p["date"].isoformat(), "0.7") for p in posts]
    body = "".join(
        f"""
  <url>
    <loc>{loc}</loc>
    <lastmod>{mod}</lastmod>
    <priority>{prio}</priority>
  </url>"""
        for loc, mod, prio in urls
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}
</urlset>
"""


# ------------------------------------------------------------------ main

def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")
    print("wrote", path.relative_to(ROOT))


def main() -> None:
    posts = sorted((parse_post(p) for p in SRC.glob("*.html")), key=lambda p: (p["order"], p["slug"]))
    chrome = site_chrome()

    for i, post in enumerate(posts):
        prev = posts[i - 1] if i > 0 else None
        nxt = posts[i + 1] if i + 1 < len(posts) else None
        write(BLOG / f"{post['slug']}.html", post_page(chrome, post, prev, nxt))
    write(BLOG / "index.html", index_page(chrome, posts))
    write(BLOG / "feed.xml", feed(posts))
    write(ROOT / "sitemap.xml", sitemap(posts))

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    start = index.index("      <!-- BLOG:START -->")
    end = index.index("<!-- BLOG:END -->") + len("<!-- BLOG:END -->")
    write(ROOT / "index.html", index[:start] + home_teaser(posts) + index[end:])


if __name__ == "__main__":
    main()
