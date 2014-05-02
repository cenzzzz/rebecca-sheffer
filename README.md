cs171-final-ry-ross
===================
### Code
The main visualization view is `comp_vis.html`, which in the `gh-pages` branch is set to `index.html`. But that's just a skeletal framework of the DOM; the real d3-driven meat is in `comp_vis.js`. A small amount of styling is included directly in `comp_vis.html`.

### Data
The data, originally scraped from [O2CM](http://www.o2cm.com/) by Cloud Cray's [DanceMarkScraper](https://github.com/CloudCray/DanceMarkScraper/) (included in `scrape/`), has been further aggregated by the script `aggregate.py`. The results are written to `data/`, sorted by each competition's unique `comp_id` string (as assigned by O2CM). `aggregate.py` also generates `comps.json`, an index of all competitions written to `data/`. `selections/hbdt.json` is compiled from a Harvard Ballroom Dance Team roster, is used by permission, and is not for replication.

### Docs
`docs/` holds the project proposal (`proposal.pdf`), design lab 1 writeup (`design.pdf`), process book as of milestone 1 (`process_old.pdf`) and final process book (`process.pdf`).
