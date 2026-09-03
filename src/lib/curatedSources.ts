export interface ApprovedSource {
  domain: string;
  displayName: string;
  category: "government" | "creative-commons" | "open-api" | "video" | "academic" | "prediction" | "international";
  licenceBasis: string;
  contentType: string;
  apiEndpoint?: string;
}

export const APPROVED_SOURCES: ApprovedSource[] = [
  // Government (US) — Public Domain under 17 USC §105
  { domain: "sec.gov", displayName: "SEC EDGAR", category: "government", licenceBasis: "public-domain-usgov", contentType: "Financial filings, S-1s, 10-Ks" },
  { domain: "federalreserve.gov", displayName: "Federal Reserve", category: "government", licenceBasis: "public-domain-usgov", contentType: "FOMC statements, rate decisions" },
  { domain: "bls.gov", displayName: "Bureau of Labor Statistics", category: "government", licenceBasis: "public-domain-usgov", contentType: "Employment, CPI, JOLTS data", apiEndpoint: "api.bls.gov/publicAPI/v2/" },
  { domain: "bea.gov", displayName: "Bureau of Economic Analysis", category: "government", licenceBasis: "public-domain-usgov", contentType: "GDP, trade, income data", apiEndpoint: "apps.bea.gov/api/data/" },
  { domain: "weather.gov", displayName: "NOAA Weather", category: "government", licenceBasis: "public-domain-usgov", contentType: "Weather alerts, climate data", apiEndpoint: "api.weather.gov/alerts" },
  { domain: "nasa.gov", displayName: "NASA", category: "government", licenceBasis: "public-domain-usgov", contentType: "Space, Earth science, imagery", apiEndpoint: "api.nasa.gov/" },
  { domain: "usgs.gov", displayName: "USGS", category: "government", licenceBasis: "public-domain-usgov", contentType: "Earthquake data, geologic events", apiEndpoint: "earthquake.usgs.gov/fdsnws/event/1/" },
  { domain: "nvd.nist.gov", displayName: "NVD/NIST", category: "government", licenceBasis: "public-domain-usgov", contentType: "CVE vulnerability records", apiEndpoint: "services.nvd.nist.gov/rest/json/cves/2.0" },
  { domain: "cisa.gov", displayName: "CISA", category: "government", licenceBasis: "public-domain-usgov", contentType: "Cybersecurity advisories" },
  { domain: "federalregister.gov", displayName: "Federal Register", category: "government", licenceBasis: "public-domain-usgov", contentType: "Regulations, executive orders", apiEndpoint: "federalregister.gov/api/v1/documents" },
  { domain: "congress.gov", displayName: "Congress.gov", category: "government", licenceBasis: "public-domain-usgov", contentType: "Bills, CRS summaries, votes" },
  { domain: "fema.gov", displayName: "FEMA", category: "government", licenceBasis: "public-domain-usgov", contentType: "Disaster declarations" },
  { domain: "data.gov", displayName: "Data.gov", category: "government", licenceBasis: "public-domain-usgov", contentType: "300k+ US government datasets" },
  { domain: "epa.gov", displayName: "EPA", category: "government", licenceBasis: "public-domain-usgov", contentType: "Environmental data, regulations" },
  { domain: "nih.gov", displayName: "NIH", category: "government", licenceBasis: "public-domain-usgov", contentType: "Health research, clinical trials" },
  { domain: "cdc.gov", displayName: "CDC", category: "government", licenceBasis: "public-domain-usgov", contentType: "Public health data, advisories" },

  // Creative Commons / Explicit Redistribution
  { domain: "theconversation.com", displayName: "The Conversation", category: "creative-commons", licenceBasis: "CC-BY-ND-4.0", contentType: "Expert analysis articles (verbatim only)" },
  { domain: "globalvoices.org", displayName: "Global Voices", category: "creative-commons", licenceBasis: "CC-BY-3.0", contentType: "Citizen journalism, 50+ languages" },
  // EurekAlert, ScienceDaily, Phys.org REMOVED — verified as non-commercial only, explicit aggregation bans
  { domain: "rferl.org", displayName: "Radio Free Europe", category: "creative-commons", licenceBasis: "redistribution-grant-text", contentType: "E. Europe, Central Asia news (text only)" },
  { domain: "voanews.com", displayName: "Voice of America", category: "creative-commons", licenceBasis: "public-domain-usgov", contentType: "World news" },

  // Open APIs — Permissive Terms
  { domain: "news.ycombinator.com", displayName: "Hacker News", category: "open-api", licenceBasis: "permissive-api", contentType: "Tech news, links, discussion", apiEndpoint: "hacker-news.firebaseio.com/v0/" },
  { domain: "lobste.rs", displayName: "Lobsters", category: "open-api", licenceBasis: "permissive-api", contentType: "Curated tech news links" },
  { domain: "wikipedia.org", displayName: "Wikipedia", category: "open-api", licenceBasis: "CC-BY-SA-3.0", contentType: "Encyclopedia articles" },
  { domain: "opennewswire.org", displayName: "Open Newswire", category: "open-api", licenceBasis: "CC-varies", contentType: "Aggregated CC news" },

  // Social — Open/Decentralized
  { domain: "bsky.app", displayName: "Bluesky", category: "open-api", licenceBasis: "AT-protocol-public", contentType: "Decentralized social posts, trending topics" },
  { domain: "bsky.social", displayName: "Bluesky API", category: "open-api", licenceBasis: "AT-protocol-public", contentType: "Firehose, trending links" },
  { domain: "mastodon.social", displayName: "Mastodon", category: "open-api", licenceBasis: "ActivityPub-public", contentType: "Trending links, hashtags" },

  // Video
  { domain: "youtube.com", displayName: "YouTube", category: "video", licenceBasis: "embed-api", contentType: "Video embedding, transcripts" },
  { domain: "youtu.be", displayName: "YouTube (short)", category: "video", licenceBasis: "embed-api", contentType: "Video embedding, transcripts" },

  // Academic / Science
  { domain: "pubmed.ncbi.nlm.nih.gov", displayName: "PubMed", category: "academic", licenceBasis: "public-domain-abstracts", contentType: "Biomedical research abstracts" },
  { domain: "arxiv.org", displayName: "arXiv", category: "academic", licenceBasis: "CC0-metadata", contentType: "Preprint metadata (signal detection)" },
  { domain: "frontiersin.org", displayName: "Frontiers", category: "academic", licenceBasis: "CC-BY-4.0", contentType: "Open-access research articles" },
  { domain: "openalex.org", displayName: "OpenAlex", category: "academic", licenceBasis: "CC0", contentType: "Research metadata, citation tracking" },

  // Prediction / Forecasting
  { domain: "polymarket.com", displayName: "Polymarket", category: "prediction", licenceBasis: "public-api", contentType: "Prediction market probabilities" },
  { domain: "metaculus.com", displayName: "Metaculus", category: "prediction", licenceBasis: "public-api", contentType: "Community forecasts" },

  // International Government / Institutional
  { domain: "reliefweb.int", displayName: "UN ReliefWeb", category: "international", licenceBasis: "open-redistribution", contentType: "Humanitarian reports" },
  // WHO REMOVED — CC BY-NC-SA, NC blocks commercial use
  { domain: "ecb.europa.eu", displayName: "European Central Bank", category: "international", licenceBasis: "open-reuse", contentType: "Monetary policy" },
  { domain: "parliament.uk", displayName: "UK Parliament", category: "international", licenceBasis: "open-parliament-licence", contentType: "Hansard debate transcripts" },
  { domain: "data.europa.eu", displayName: "EU Open Data", category: "international", licenceBasis: "open-licence", contentType: "EU datasets and reports" },

  // Government — Canada
  { domain: "open.canada.ca", displayName: "Canada Open Data", category: "government", licenceBasis: "open-government-licence-canada", contentType: "Federal datasets and statistics" },
  { domain: "statcan.gc.ca", displayName: "Statistics Canada", category: "government", licenceBasis: "open-government-licence-canada", contentType: "Census, economic, social statistics" },

  // Government — Australia
  { domain: "data.gov.au", displayName: "Australia Open Data", category: "government", licenceBasis: "CC-BY-3.0-AU", contentType: "Federal/state government datasets" },
  { domain: "abs.gov.au", displayName: "Australian Bureau of Statistics", category: "government", licenceBasis: "CC-BY-2.5-AU", contentType: "Census, economic indicators, population" },

  // Government — United Kingdom
  { domain: "data.gov.uk", displayName: "UK Open Data Portal", category: "government", licenceBasis: "open-government-licence-uk", contentType: "Crown copyright datasets" },
  { domain: "ons.gov.uk", displayName: "UK Office for National Statistics", category: "government", licenceBasis: "open-government-licence-uk", contentType: "UK economic data, census, labour market" },

  // Government — Germany
  { domain: "govdata.de", displayName: "GovData Germany", category: "government", licenceBasis: "dl-de/by-2-0", contentType: "120K+ German government datasets" },
  { domain: "destatis.de", displayName: "Destatis Germany", category: "government", licenceBasis: "dl-de/by-2-0", contentType: "Official German statistics" },

  // Government — France
  { domain: "data.gouv.fr", displayName: "France Open Data", category: "government", licenceBasis: "licence-ouverte-2.0", contentType: "French government open data" },
  { domain: "insee.fr", displayName: "INSEE France", category: "government", licenceBasis: "licence-ouverte-2.0", contentType: "French economic and demographic statistics" },

  // Government — Asia
  { domain: "e-stat.go.jp", displayName: "e-Stat Japan", category: "government", licenceBasis: "CC-BY-4.0", contentType: "Official Japanese government statistics", apiEndpoint: "https://api.e-stat.go.jp/rest/3.0/app/" },
  { domain: "data.go.kr", displayName: "Korea Open Data", category: "government", licenceBasis: "KOGL-Type-1", contentType: "Korean government open data, 80K+ datasets" },
  { domain: "data.gov.in", displayName: "India Open Data", category: "government", licenceBasis: "GODL-India", contentType: "Indian government datasets" },
  { domain: "data.gov.sg", displayName: "Singapore Open Data", category: "government", licenceBasis: "singapore-open-data-licence", contentType: "Singapore government datasets with APIs" },

  // Government — US (additional)
  { domain: "govinfo.gov", displayName: "GovInfo (GPO)", category: "government", licenceBasis: "public-domain", contentType: "Federal court opinions, congressional records, CFR", apiEndpoint: "https://api.govinfo.gov/" },

  // CC-licensed news (additional)
  // ProPublica REMOVED — CC BY-NC-ND 3.0, NC blocks commercial use
  { domain: "en.wikinews.org", displayName: "WikiNews", category: "creative-commons", licenceBasis: "CC-BY-2.5", contentType: "Collaboratively written news articles" },
  // Democracy Now, TorrentFreak, Boing Boing REMOVED — all CC BY-NC variants, NC blocks commercial
  { domain: "agenciabrasil.ebc.com.br", displayName: "Agência Brasil", category: "creative-commons", licenceBasis: "CC-BY-3.0-BR", contentType: "Brazilian government news agency" },
  // FAIR REMOVED — CC BY-NC-ND 3.0, NC blocks commercial use
  { domain: "aeon.co", displayName: "Aeon", category: "creative-commons", licenceBasis: "CC-BY-ND", contentType: "Long-form essays on ideas, philosophy, science" },

  // Academic preprint servers (additional)
  { domain: "biorxiv.org", displayName: "bioRxiv", category: "academic", licenceBasis: "CC-varies-per-article", contentType: "Life sciences preprints" },
  { domain: "medrxiv.org", displayName: "medRxiv", category: "academic", licenceBasis: "CC-varies-per-article", contentType: "Health sciences preprints" },
  { domain: "chemrxiv.org", displayName: "ChemRxiv", category: "academic", licenceBasis: "CC-BY-4.0", contentType: "Chemistry preprints" },
  { domain: "doaj.org", displayName: "DOAJ", category: "academic", licenceBasis: "CC-BY-SA-4.0", contentType: "Index of 22K+ open access journals", apiEndpoint: "https://doaj.org/api/" },
  { domain: "semanticscholar.org", displayName: "Semantic Scholar", category: "academic", licenceBasis: "ODC-BY-1.0", contentType: "AI-powered academic search, 200M+ papers", apiEndpoint: "https://api.semanticscholar.org/graph/v1/" },

  // International organizations (additional)
  { domain: "data.worldbank.org", displayName: "World Bank Open Data", category: "international", licenceBasis: "CC-BY-4.0", contentType: "2000+ development indicators, 200+ countries", apiEndpoint: "https://api.worldbank.org/v2/" },
  { domain: "data.oecd.org", displayName: "OECD Data", category: "international", licenceBasis: "CC-BY-4.0", contentType: "Economic indicators, education, health data", apiEndpoint: "https://sdmx.oecd.org/public/rest/" },
  { domain: "fao.org", displayName: "FAOSTAT", category: "international", licenceBasis: "CC-BY-4.0", contentType: "Food, agriculture, forestry statistics" },
  { domain: "data.unicef.org", displayName: "UNICEF Data", category: "international", licenceBasis: "CC-BY-3.0-IGO", contentType: "Global child welfare statistics" },
  { domain: "data.humdata.org", displayName: "Humanitarian Data Exchange", category: "international", licenceBasis: "CC-BY-4.0", contentType: "Crisis data, displacement, food security", apiEndpoint: "https://data.humdata.org/api/3/" },

  // Open-Meteo REMOVED — free API tier is non-commercial only; paid plan required for commercial use
  { domain: "openaq.org", displayName: "OpenAQ", category: "international", licenceBasis: "CC-BY-4.0", contentType: "Global air quality data from government monitors", apiEndpoint: "https://api.openaq.org/v3/" },

  // Legal / Court
  { domain: "courtlistener.com", displayName: "CourtListener", category: "international", licenceBasis: "CC-BY-ND-4.0-site+public-domain-opinions", contentType: "9M+ US court opinions (public domain), site metadata (CC BY-ND)", apiEndpoint: "https://www.courtlistener.com/api/rest/v4/" },
  // Cornell LII REMOVED — CC BY-NC-SA, NC blocks commercial use (court opinions themselves are public domain via other sources)

  // Developer
  { domain: "about.gitlab.com", displayName: "GitLab Blog", category: "open-api", licenceBasis: "CC-BY-SA-4.0", contentType: "GitLab engineering blog" },
  { domain: "changelog.com", displayName: "Changelog", category: "open-api", licenceBasis: "CC-BY-4.0", contentType: "Developer podcasts and news" },

  // Think tanks — titles + links only (not full content)
  // Chatham House REMOVED — CC BY-NC-ND 4.0, NC blocks commercial use
  { domain: "pewresearch.org", displayName: "Pew Research Center", category: "international", licenceBasis: "custom-excerpts-only", contentType: "Polling, demographics — short excerpts (250 words) + links only" },

  // Mapping
  { domain: "openstreetmap.org", displayName: "OpenStreetMap", category: "open-api", licenceBasis: "ODbL-1.0", contentType: "Collaborative world map data" },

  // Sports data
  { domain: "football-data.org", displayName: "Football-Data.org", category: "open-api", licenceBasis: "free-api", contentType: "Football/soccer data — leagues, matches, standings", apiEndpoint: "https://api.football-data.org/v4/" },

  // Niche CC-licensed news (hidden gems)
  // The Markup REMOVED — CC BY-NC-ND, NC blocks commercial use
  { domain: "news.mongabay.com", displayName: "Mongabay", category: "creative-commons", licenceBasis: "CC-BY-ND-4.0", contentType: "Environmental/conservation journalism — rainforests, wildlife" },
  // Singularity Hub REMOVED — CC license could not be verified, standard copyright only
  // Undark REMOVED — custom terms unverified, safer to exclude for commercial

  // US Government (additional)
  { domain: "data.ntsb.gov", displayName: "NTSB Aviation Safety", category: "government", licenceBasis: "public-domain", contentType: "Aviation accident/incident investigation data" },
  { domain: "api.open.fec.gov", displayName: "FEC Campaign Finance", category: "government", licenceBasis: "public-domain", contentType: "Campaign contributions, expenditures, PAC data" },
  { domain: "eia.gov", displayName: "US Energy Information Admin", category: "government", licenceBasis: "public-domain", contentType: "Energy production, prices, forecasts" },
  { domain: "usda.gov", displayName: "USDA", category: "government", licenceBasis: "public-domain", contentType: "Agricultural statistics, food safety, crop reports" },

  // International (additional)
  { domain: "data.unhcr.org", displayName: "UNHCR Data Portal", category: "international", licenceBasis: "CC-BY-4.0", contentType: "Refugee and displacement statistics" },
  { domain: "esa.int", displayName: "European Space Agency", category: "international", licenceBasis: "CC-BY-SA-3.0-IGO", contentType: "Space missions, Earth observation, astronomy" },
  { domain: "agris.fao.org", displayName: "FAO AGRIS", category: "international", licenceBasis: "CC-BY-4.0", contentType: "16M+ agricultural research records" },

  // Global event monitoring
  { domain: "gdeltproject.org", displayName: "GDELT Project", category: "open-api", licenceBasis: "open-data", contentType: "Real-time global news monitoring in 100+ languages" },
  // Ballotpedia REMOVED — license unclear after transition from wiki to professional content

  // Tech standards
  { domain: "w3.org", displayName: "W3C Specifications", category: "open-api", licenceBasis: "W3C-royalty-free", contentType: "Web standards — HTML, CSS, WebAPI, accessibility" },
  { domain: "rfc-editor.org", displayName: "IETF RFCs", category: "open-api", licenceBasis: "IETF-Trust-License", contentType: "Internet protocol specifications — HTTP, DNS, TLS" },
];

export const BANNED_DOMAINS: string[] = [
  // Major news publishers — all rights reserved, active litigation
  "nytimes.com", "washingtonpost.com", "wsj.com", "ft.com",
  "theguardian.com", "bbc.com", "bbc.co.uk", "cnn.com",
  "foxnews.com", "reuters.com", "apnews.com", "ap.org",
  "bloomberg.com", "economist.com", "forbes.com", "businessinsider.com",
  "cnbc.com", "nbcnews.com", "abcnews.go.com", "cbsnews.com",
  "usatoday.com", "latimes.com", "chicagotribune.com",
  "politico.com", "theatlantic.com", "newyorker.com",
  "wired.com", "arstechnica.com", "theverge.com", "vox.com",
  "vice.com", "buzzfeednews.com", "dailymail.co.uk",
  "independent.co.uk", "telegraph.co.uk", "mirror.co.uk",
  "aljazeera.com", "france24.com", "dw.com",
  "nhk.or.jp", "scmp.com", "straitstimes.com",
  "smh.com.au", "abc.net.au", "news.com.au",
  "globalnews.ca", "cbc.ca",
  "techcrunch.com", "engadget.com", "mashable.com", "gizmodo.com",
  "marca.com", "as.com", "sport.es", "mundodeportivo.com",
  "espn.com", "skysports.com", "goal.com",

  // Wire services
  "prnewswire.com", "businesswire.com", "globenewswire.com",

  // Social media — no redistribution rights
  "reddit.com", "old.reddit.com",
  "twitter.com", "x.com",
  "instagram.com", "facebook.com", "threads.net",
  "tiktok.com", "snapchat.com",
  "medium.com", "substack.com",
  "linkedin.com",

  // Europe — newspapers
  "lemonde.fr", "lefigaro.fr", "liberation.fr", "leparisien.fr", "ouest-france.fr",
  "20minutes.fr", "lexpress.fr", "lepoint.fr", "nouvelobs.com", "mediapart.fr",
  "spiegel.de", "bild.de", "faz.net", "sueddeutsche.de", "zeit.de",
  "welt.de", "handelsblatt.com", "tagesspiegel.de", "stern.de",
  "corriere.it", "repubblica.it", "lastampa.it", "ilsole24ore.com", "ansa.it",
  "elpais.com", "elmundo.es", "lavanguardia.com", "abc.es", "elconfidencial.com",
  "publico.pt", "dn.pt", "jn.pt", "expresso.pt",
  "nos.nl", "volkskrant.nl", "nrc.nl", "telegraaf.nl", "ad.nl",
  "irishtimes.com", "independent.ie", "rte.ie",
  "svd.se", "dn.se", "aftonbladet.se", "expressen.se",
  "vg.no", "dagbladet.no", "nrk.no", "aftenposten.no",
  "politiken.dk", "berlingske.dk", "dr.dk", "jyllands-posten.dk",
  "yle.fi", "hs.fi", "iltalehti.fi",
  "tagesanzeiger.ch", "nzz.ch", "blick.ch", "swissinfo.ch",
  "onet.pl", "gazeta.pl", "wprost.pl", "newsweek.pl", "wyborcza.pl",
  "denik.cz", "novinky.cz", "idnes.cz",
  "kathimerini.gr", "ekathimerini.com",
  "hurriyetdailynews.com", "hurriyet.com.tr", "sabah.com.tr", "dailysabah.com",

  // Asia — newspapers
  "timesofindia.indiatimes.com", "ndtv.com", "hindustantimes.com", "indianexpress.com",
  "thehindu.com", "livemint.com", "dnaindia.com", "firstpost.com", "scroll.in",
  "thewire.in", "news18.com", "deccanherald.com",
  "japantimes.co.jp", "japantoday.com", "mainichi.jp", "asahi.com",
  "koreaherald.com", "koreatimes.co.kr", "koreajoongangdaily.joins.com",
  "bangkokpost.com", "nationthailand.com",
  "channelnewsasia.com", "todayonline.com",
  "inquirer.net", "rappler.com", "philstar.com",
  "thejakartapost.com", "kompas.com", "detik.com",
  "freemalaysiatoday.com", "thestar.com.my", "nst.com.my",
  "vnexpress.net", "dawn.com", "geo.tv", "thenews.com.pk",
  "thedailystar.net", "bdnews24.com",

  // Middle East
  "timesofisrael.com", "haaretz.com", "jpost.com", "ynetnews.com",
  "arabnews.com", "saudigazette.com.sa", "thenationalnews.com",
  "gulfnews.com", "khaleejtimes.com", "gulftoday.ae",
  "middleeasteye.net", "al-monitor.com", "alarabiya.net",

  // Africa
  "nation.africa", "standardmedia.co.ke",
  "dailymaverick.co.za", "news24.com", "timeslive.co.za", "iol.co.za", "mg.co.za",
  "guardian.ng", "punchng.com", "premiumtimesng.com", "vanguardngr.com",
  "allafrica.com", "africanews.com",

  // Latin America
  "folha.uol.com.br", "oglobo.globo.com", "estadao.com.br", "uol.com.br",
  "clarin.com", "lanacion.com.ar", "infobae.com",
  "eluniversal.com.mx", "milenio.com", "reforma.com",
  "emol.com", "latercera.com",
  "eltiempo.com", "elespectador.com",

  // Canada & Oceania (additional)
  "theglobeandmail.com", "nationalpost.com", "thestar.com", "montrealgazette.com",
  "nzherald.co.nz", "stuff.co.nz", "rnz.co.nz",

  // UK (additional)
  "thesun.co.uk", "express.co.uk", "metro.co.uk", "standard.co.uk", "scotsman.com",

  // US (additional regional)
  "nypost.com", "sfchronicle.com", "bostonglobe.com", "dallasnews.com",
  "seattletimes.com", "miamiherald.com", "denverpost.com", "startribune.com",
  "detroitnews.com", "houstonchronicle.com", "inquirer.com", "baltimoresun.com",
  "ajc.com", "tampabay.com",

  // Business / Finance media
  "marketwatch.com", "barrons.com", "fool.com", "seekingalpha.com",
  "investopedia.com", "thestreet.com", "moneycontrol.com",
  "morningstar.com", "benzinga.com",
  "fortune.com", "inc.com", "fastcompany.com", "entrepreneur.com",
  "hbr.org",

  // Tech media (additional)
  "theinformation.com", "theregister.com", "zdnet.com", "tomshardware.com",
  "pcmag.com", "cnet.com", "tomsguide.com",
  "digitaltrends.com", "9to5mac.com", "9to5google.com",
  "macrumors.com", "appleinsider.com", "androidcentral.com",
  "venturebeat.com", "howtogeek.com", "lifehacker.com",
  "xda-developers.com", "thenextweb.com", "hackernoon.com",

  // Sports media (additional)
  "theathletic.com", "bleacherreport.com", "sbnation.com",
  "cbssports.com", "foxsports.com", "si.com",
  "sportingnews.com", "eurosport.com", "lequipe.fr", "gazzetta.it", "kicker.de",
  "formula1.com", "autosport.com", "motorsport.com",
  "cricbuzz.com", "espncricinfo.com",

  // Lifestyle / Entertainment
  "people.com", "tmz.com", "eonline.com", "usmagazine.com",
  "variety.com", "hollywoodreporter.com", "deadline.com",
  "ew.com", "rollingstone.com", "billboard.com",
  "cosmopolitan.com", "vogue.com", "vanityfair.com", "gq.com",
  "eater.com", "bonappetit.com",
  "huffpost.com", "dailybeast.com", "buzzfeed.com",

  // News aggregators
  "news.google.com", "flipboard.com", "smartnews.com",
  "newsbreak.com", "ground.news", "news.yahoo.com", "msn.com",

  // Paywalled research
  "stratfor.com", "janes.com", "gartner.com", "forrester.com",
  "statista.com",

  // Photo / image agencies
  "gettyimages.com", "shutterstock.com", "afp.com", "istockphoto.com",
  "alamy.com", "adobestock.com",

  // Magazines
  "time.com", "newsweek.com", "slate.com", "salon.com",
  "foreignaffairs.com", "foreignpolicy.com",
  "scientificamerican.com", "nationalgeographic.com", "smithsonianmag.com",
  "nymag.com",

  // International news agencies
  "efe.com", "xinhuanet.com", "chinadaily.com.cn", "globaltimes.cn", "cgtn.com",
  "tass.com", "rt.com", "kyodonews.net",

  // Newsletter publishers
  "morningbrew.com", "axios.com", "semafor.com", "puck.news",
  "stratechery.com",

  // Broadcast / TV (additional)
  "msnbc.com", "pbs.org", "npr.org",
  "sky.com", "itv.com", "channel4.com",
  "euronews.com", "9news.com.au", "7news.com.au",
  "ctv.ca",

  // Science / Health (copyrighted journals)
  "nature.com", "science.org", "newscientist.com",
  "thelancet.com", "bmj.com", "statnews.com",
  "medscape.com", "webmd.com", "healthline.com",
  "livescience.com",

  // Legal / Policy
  "law360.com", "law.com", "thehill.com", "rollcall.com",

  // Science outlets — verified non-commercial only, explicit aggregation bans
  "eurekalert.org", "sciencedaily.com", "phys.org", "singularityhub.com",
];

export function extractDomainFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname;
  } catch {
    return url;
  }
}

export function isSourceApproved(url: string): boolean {
  const domain = extractDomainFromUrl(url);
  return APPROVED_SOURCES.some(
    (source) => domain === source.domain || domain.endsWith(`.${source.domain}`)
  );
}

export function isSourceBanned(url: string): boolean {
  const domain = extractDomainFromUrl(url);
  return BANNED_DOMAINS.some(
    (banned) => domain === banned || domain.endsWith(`.${banned}`)
  );
}

export type SourceValidationResult =
  | { status: "approved"; source: ApprovedSource }
  | { status: "banned"; domain: string }
  | { status: "unknown"; domain: string };

export function validateSourceUrl(url: string): SourceValidationResult {
  const domain = extractDomainFromUrl(url);

  const approvedSource = APPROVED_SOURCES.find(
    (source) => domain === source.domain || domain.endsWith(`.${source.domain}`)
  );
  if (approvedSource) return { status: "approved", source: approvedSource };

  if (isSourceBanned(url)) return { status: "banned", domain };

  return { status: "unknown", domain };
}
