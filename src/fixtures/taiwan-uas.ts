// Sample dossier from design/atlas-mockup.html (Taiwan UAS). Raw mockup shape, extracted unchanged.
// Slice S0 maps it onto src/lib/types.ts; screens are built against it before the research engine exists.

export const ATLAS_NODES = [
  {
    "id": "g1",
    "short": "MND Armaments Bureau",
    "name": "Ministry of National Defense — Armaments Bureau",
    "role": "Runs defense procurement tenders; sets qualification rules for drone suppliers.",
    "cat": "gov",
    "st": "sup",
    "infl": 92,
    "sup": 62,
    "src": 14,
    "action": "Request a pre-tender capability briefing; lead with supply-chain provenance.",
    "x": -0.55,
    "y": -0.35,
    "z": 0.25
  },
  {
    "id": "g2",
    "short": "NCSIST",
    "name": "National Chung-Shan Institute of Science & Technology",
    "role": "Defense R&D institute; runs testing and certification for UAS payloads.",
    "cat": "gov",
    "st": "neu",
    "infl": 85,
    "sup": 8,
    "src": 11,
    "action": "Propose a joint field test on the 5.1 GHz detection gap.",
    "x": -0.75,
    "y": -0.05,
    "z": -0.15
  },
  {
    "id": "g3",
    "short": "MOEA Industrial Dev.",
    "name": "MOEA — Industrial Development Administration",
    "role": "Funds local manufacturing and supply-chain subsidies.",
    "cat": "gov",
    "st": "sup",
    "infl": 74,
    "sup": 48,
    "src": 9,
    "action": "Apply for co-financing once a local assembly partner is signed.",
    "x": -0.3,
    "y": -0.7,
    "z": -0.1
  },
  {
    "id": "g4",
    "short": "Civil Aeronautics Admin.",
    "name": "Civil Aeronautics Administration",
    "role": "Registers drones and sets operating rules for civilian airspace.",
    "cat": "gov",
    "st": "neu",
    "infl": 58,
    "sup": 0,
    "src": 6,
    "action": "Confirm dual-use registration path before any public demo.",
    "x": -0.9,
    "y": -0.45,
    "z": 0.4
  },
  {
    "id": "g5",
    "short": "NCC",
    "name": "National Communications Commission",
    "role": "Approves radio-frequency use for sensors and datalinks.",
    "cat": "gov",
    "st": "res",
    "infl": 61,
    "sup": -34,
    "src": 5,
    "action": "File spectrum pre-consultation early; approvals are backlogged.",
    "x": -0.6,
    "y": 0.2,
    "z": 0.6
  },
  {
    "id": "g6",
    "short": "Defense Committee",
    "name": "Legislative Yuan — Foreign Affairs & National Defense Committee",
    "role": "Reviews defense budgets and procurement amendments.",
    "cat": "gov",
    "st": "sup",
    "infl": 80,
    "sup": 40,
    "src": 8,
    "action": "Brief two co-sponsors before the committee review.",
    "x": -0.2,
    "y": -0.25,
    "z": 0.75
  },
  {
    "id": "i1",
    "short": "Drone Industry Alliance",
    "name": "Drone industry alliance (TEDIBOA)",
    "role": "260+ member companies; coordinates the \"non-red\" supply chain.",
    "cat": "ind",
    "st": "sup",
    "infl": 70,
    "sup": 55,
    "src": 7,
    "action": "Join as associate member; fastest route to local partners.",
    "x": 0.45,
    "y": -0.35,
    "z": -0.35
  },
  {
    "id": "i2",
    "short": "State aerospace prime",
    "name": "State-linked aerospace prime contractor",
    "role": "Likely system integrator for large government drone contracts.",
    "cat": "ind",
    "st": "neu",
    "infl": 78,
    "sup": 12,
    "src": 6,
    "action": "Position as a subsystem supplier, not a competitor.",
    "x": 0.15,
    "y": -0.6,
    "z": 0.3
  },
  {
    "id": "i3",
    "short": "Listed drone OEM",
    "name": "Listed drone OEM · Taichung",
    "role": "Incumbent local manufacturer; competes for the same tenders.",
    "cat": "ind",
    "st": "res",
    "infl": 66,
    "sup": -52,
    "src": 5,
    "action": "Avoid head-on bids; explore a component licensing deal.",
    "x": 0.8,
    "y": -0.1,
    "z": 0.15
  },
  {
    "id": "i4",
    "short": "Tier-1 telecom",
    "name": "Tier-1 telecom operator",
    "role": "Owns secure network infrastructure; potential datalink partner.",
    "cat": "ind",
    "st": "neu",
    "infl": 63,
    "sup": 5,
    "src": 4,
    "action": "Test datalink compatibility before proposing partnership.",
    "x": 0.6,
    "y": 0.15,
    "z": 0.6
  },
  {
    "id": "i5",
    "short": "Taoyuan suppliers",
    "name": "Component supplier cluster · Taoyuan",
    "role": "Motors, batteries and frames; needed for local-content rules.",
    "cat": "ind",
    "st": "sup",
    "infl": 45,
    "sup": 38,
    "src": 3,
    "action": "Shortlist two suppliers to meet local-content thresholds.",
    "x": 0.7,
    "y": -0.5,
    "z": -0.6
  },
  {
    "id": "c1",
    "short": "Kestrel Dual-Use Fund",
    "name": "Kestrel Dual-Use Fund (fictional)",
    "role": "Venture fund focused on dual-use hardware in Asia.",
    "cat": "cap",
    "st": "sup",
    "infl": 52,
    "sup": 60,
    "src": 3,
    "action": "Share the dossier summary; ask for intros to portfolio integrators.",
    "x": 0.2,
    "y": 0.6,
    "z": 0.35
  },
  {
    "id": "c2",
    "short": "Harbor Lane FO",
    "name": "Harbor Lane Family Office (fictional)",
    "role": "Family office; invests $250k–$2M in industrial tech.",
    "cat": "cap",
    "st": "sup",
    "infl": 40,
    "sup": 45,
    "src": 2,
    "action": "Approach after the first government pilot is confirmed.",
    "x": 0.45,
    "y": 0.75,
    "z": 0
  },
  {
    "id": "c3",
    "short": "Angel syndicate",
    "name": "Angel syndicate · 14 members",
    "role": "Individual investors; tickets of $2k–$50k.",
    "cat": "cap",
    "st": "neu",
    "infl": 30,
    "sup": 10,
    "src": 2,
    "action": "Low priority until a local entity is set up.",
    "x": -0.05,
    "y": 0.85,
    "z": -0.2
  },
  {
    "id": "c4",
    "short": "National Dev. Fund",
    "name": "National Development Fund",
    "role": "Government co-investment vehicle for strategic industries.",
    "cat": "cap",
    "st": "neu",
    "infl": 68,
    "sup": 15,
    "src": 5,
    "action": "Co-investment requires a Taiwan entity; plan for month 6.",
    "x": -0.25,
    "y": 0.5,
    "z": 0.15
  },
  {
    "id": "l1",
    "short": "Cross-border counsel",
    "name": "Independent counsel · cross-border VC",
    "role": "Matches foreign startups with local investors; handles entity setup.",
    "cat": "leg",
    "st": "sup",
    "infl": 35,
    "sup": 50,
    "src": 2,
    "action": "Book a scoping call on entity structure and investor intros.",
    "x": -0.55,
    "y": 0.65,
    "z": -0.45
  },
  {
    "id": "l2",
    "short": "Export-control firm",
    "name": "Taipei law firm · export controls",
    "role": "Advises on defense export licences and end-user checks.",
    "cat": "leg",
    "st": "neu",
    "infl": 48,
    "sup": 20,
    "src": 4,
    "action": "Confirm export-licence needs before shipping demo units.",
    "x": -0.85,
    "y": 0.35,
    "z": -0.6
  },
  {
    "id": "e1",
    "short": "TADTE 2027",
    "name": "Taipei Aerospace & Defense Technology Exhibition",
    "role": "Sep 23–25, 2027 · Taipei Nangang, Hall 1. 9 mapped stakeholders expected.",
    "cat": "evt",
    "st": "evt",
    "infl": 70,
    "sup": 30,
    "src": 3,
    "action": "Reserve a partner-booth slot; schedule 5 meetings in advance.",
    "x": 0.15,
    "y": -0.1,
    "z": -0.8
  },
  {
    "id": "e2",
    "short": "Drone ecosystem summit",
    "name": "Drone ecosystem summit [DATE]",
    "role": "Industry-alliance event; investors and integrators attend.",
    "cat": "evt",
    "st": "evt",
    "infl": 50,
    "sup": 25,
    "src": 2,
    "action": "Apply for the startup pitch track.",
    "x": 0.5,
    "y": 0.45,
    "z": -0.55
  },
  {
    "id": "e3",
    "short": "Procurement briefing",
    "name": "Defense procurement briefing day [DATE]",
    "role": "Annual supplier briefing by the procurement authority.",
    "cat": "evt",
    "st": "evt",
    "infl": 55,
    "sup": 20,
    "src": 2,
    "action": "Register as a prospective supplier to receive the invitation.",
    "x": -0.35,
    "y": -0.55,
    "z": 0.7
  }
] as const;

export const ATLAS_EDGES = [
  [
    "g1",
    "g2"
  ],
  [
    "g1",
    "g6"
  ],
  [
    "g1",
    "i2"
  ],
  [
    "g2",
    "i2"
  ],
  [
    "g2",
    "i1"
  ],
  [
    "g3",
    "i1"
  ],
  [
    "g3",
    "i5"
  ],
  [
    "g3",
    "c4"
  ],
  [
    "g4",
    "i3"
  ],
  [
    "g5",
    "i4"
  ],
  [
    "g6",
    "g3"
  ],
  [
    "i1",
    "i3"
  ],
  [
    "i1",
    "i5"
  ],
  [
    "i2",
    "i4"
  ],
  [
    "c1",
    "c2"
  ],
  [
    "c1",
    "l1"
  ],
  [
    "c4",
    "c1"
  ],
  [
    "l2",
    "i2"
  ],
  [
    "l1",
    "c3"
  ],
  [
    "e1",
    "g1"
  ],
  [
    "e1",
    "i1"
  ],
  [
    "e1",
    "i2"
  ],
  [
    "e2",
    "i1"
  ],
  [
    "e2",
    "c1"
  ],
  [
    "e3",
    "g1"
  ],
  [
    "e3",
    "g6"
  ],
  [
    "g4",
    "g5"
  ],
  [
    "l2",
    "g1"
  ]
] as const;

export const ATLAS_TEAM = [
  {
    "id": "tm_you",
    "short": "You",
    "name": "You",
    "role": "CEO",
    "initials": "YO",
    "source": "Manual entries",
    "status": "CONNECTED",
    "x": 0,
    "y": 0.05,
    "z": 0
  },
  {
    "id": "tm_mei",
    "short": "Mei Chen",
    "name": "Mei Chen",
    "role": "BD lead",
    "initials": "MC",
    "source": "LinkedIn export",
    "status": "CONNECTED",
    "x": 0.12,
    "y": 0.12,
    "z": 0.1
  },
  {
    "id": "tm_priya",
    "short": "Priya Nair",
    "name": "Priya Nair",
    "role": "Advisor, ex-defense",
    "initials": "PN",
    "source": "LinkedIn + contacts",
    "status": "CONNECTED",
    "x": -0.12,
    "y": 0.14,
    "z": 0.08
  },
  {
    "id": "tm_dan",
    "short": "Daniel Ruiz",
    "name": "Daniel Ruiz",
    "role": "CTO",
    "initials": "DR",
    "source": "Not connected yet",
    "status": "INVITED",
    "x": 0.02,
    "y": 0.2,
    "z": -0.12
  }
] as const;

export const ATLAS_TIES = [
  {
    "m": "tm_mei",
    "org": "i1",
    "s": 3,
    "contact": "[Name], Secretariat",
    "how": "Former colleague, 2019–21"
  },
  {
    "m": "tm_mei",
    "org": "i2",
    "s": 2,
    "contact": "[Name], BD Manager",
    "how": "1st-degree LinkedIn"
  },
  {
    "m": "tm_priya",
    "org": "g2",
    "s": 2,
    "contact": "[Name], Researcher",
    "how": "Co-panelist, 2024 conference"
  },
  {
    "m": "tm_priya",
    "org": "c1",
    "s": 3,
    "contact": "[Name], Partner",
    "how": "Invested in her last company"
  },
  {
    "m": "tm_you",
    "org": "l1",
    "s": 3,
    "contact": "[Name], Counsel",
    "how": "Current advisor"
  }
] as const;

export const ATLAS_CATS = {
  "all": "All",
  "gov": "Government",
  "ind": "Industry",
  "cap": "Capital",
  "leg": "Legal",
  "evt": "Events"
} as const;

export const ATLAS_STANCE = {
  "sup": {
    "label": "SUPPORTIVE",
    "color": "#2B5A87",
    "chip": "background: #DCE6F1; color: #1E4468"
  },
  "neu": {
    "label": "NEUTRAL",
    "color": "#A39B8E",
    "chip": "background: #ECE7DE; color: #4F4A42"
  },
  "res": {
    "label": "RESISTANT",
    "color": "#D9783F",
    "chip": "background: #F6E2D7; color: #8A3517"
  },
  "evt": {
    "label": "EVENT",
    "color": "#1C1B19",
    "chip": "background: #1C1B19; color: #FFFFFF"
  }
} as const;

export const ATLAS_LEADS = {
  "inv": {
    "label": "Investors",
    "note": "Atlas shows contact routes only. It does not broker investments or take success fees.",
    "items": [
      {
        "id": "c1",
        "kind": "VENTURE FUND",
        "name": "Kestrel Dual-Use Fund",
        "match": "91",
        "meta": "Tickets $500k–$3M · Seed–Series A · Asia",
        "why": "4 portfolio companies supply the state aerospace prime.",
        "route": "Warm intro via drone industry alliance"
      },
      {
        "id": "c2",
        "kind": "FAMILY OFFICE",
        "name": "Harbor Lane Family Office",
        "match": "84",
        "meta": "Tickets $250k–$2M · industrial tech",
        "why": "Backed two foreign hardware entrants in the last 3 years.",
        "route": "Intro via cross-border counsel"
      },
      {
        "id": "c3",
        "kind": "ANGEL SYNDICATE",
        "name": "Angel syndicate · 14 members",
        "match": "62",
        "meta": "Tickets $2k–$50k · individual investors",
        "why": "Members include former defense-industry executives.",
        "route": "Pitch at the drone ecosystem summit"
      }
    ]
  },
  "law": {
    "label": "Lawyers",
    "note": "Matches are for introductions only. Atlas does not give legal advice.",
    "items": [
      {
        "id": "l1",
        "kind": "INDEPENDENT COUNSEL",
        "name": "Cross-border VC counsel",
        "match": "88",
        "meta": "Entity setup · investor matching · English and Mandarin",
        "why": "Has placed foreign startups with 3 of your matched investors.",
        "route": "Book a 30-min scoping call"
      },
      {
        "id": "l2",
        "kind": "LAW FIRM",
        "name": "Taipei firm · export controls",
        "match": "79",
        "meta": "Defense export licences · end-user checks",
        "why": "You will need an export licence before shipping demo units.",
        "route": "Referral via industry alliance legal desk"
      }
    ]
  },
  "evt": {
    "label": "Events",
    "note": "Events are ranked by how many of your mapped stakeholders are expected to attend.",
    "items": [
      {
        "id": "e1",
        "kind": "TRADE SHOW",
        "name": "TADTE 2027",
        "match": "9",
        "meta": "Taipei Nangang · dates TBC",
        "why": "9 mapped stakeholders expected, including the procurement authority.",
        "route": "Reserve a partner-booth slot"
      },
      {
        "id": "e3",
        "kind": "GOVERNMENT BRIEFING",
        "name": "Defense procurement briefing day",
        "match": "6",
        "meta": "Taipei · [DATE]",
        "why": "Annual supplier briefing; invitation needs prior registration.",
        "route": "Register as a prospective supplier"
      },
      {
        "id": "e2",
        "kind": "SUMMIT",
        "name": "Drone ecosystem summit",
        "match": "5",
        "meta": "Taipei · [DATE]",
        "why": "Startup pitch track; 2 matched investors attended last year.",
        "route": "Apply for the pitch track"
      }
    ]
  }
} as const;

export const ATLAS_TRACK = [
  {
    "id": "alliance",
    "name": "Drone industry alliance",
    "stage": "contacted",
    "next": "Intro meeting held · debrief due",
    "due": "YESTERDAY",
    "st": "sup"
  },
  {
    "id": "mnd",
    "name": "MND Armaments Bureau",
    "stage": "contacted",
    "next": "Pre-tender briefing requested · awaiting reply",
    "due": "NOV 4",
    "st": "sup"
  },
  {
    "id": "prime",
    "name": "State aerospace prime",
    "stage": "contacted",
    "next": "Intro via alliance secretariat",
    "due": "NOV 10",
    "st": "neu"
  },
  {
    "id": "kestrel",
    "name": "Kestrel Dual-Use Fund",
    "stage": "met",
    "next": "Send dossier summary",
    "due": "NOV 2",
    "st": "sup"
  },
  {
    "id": "counsel",
    "name": "Cross-border counsel",
    "stage": "partner",
    "next": "Taiwan entity setup in progress",
    "due": "ONGOING",
    "st": "sup"
  },
  {
    "id": "ncc",
    "name": "NCC (spectrum)",
    "stage": "found",
    "next": "File spectrum pre-consultation",
    "due": "NOV 8",
    "st": "res"
  },
  {
    "id": "ncsist",
    "name": "NCSIST",
    "stage": "found",
    "next": "Propose joint field test on 5.1 GHz gap",
    "due": "NOV 15",
    "st": "neu"
  },
  {
    "id": "tadte",
    "name": "TADTE 2027 · Sep 23–25",
    "stage": "found",
    "next": "Reserve partner-booth slot",
    "due": "DEC 1",
    "st": "evt"
  }
] as const;

export const ATLAS_STAGE_LABEL = {
  "found": "Found",
  "contacted": "Contacted",
  "met": "Met",
  "partner": "Partner"
} as const;

export const ATLAS_STAGE_BASE = {
  "found": 28,
  "contacted": 9,
  "met": 4,
  "partner": 1
} as const;

export const ATLAS_DOT = {
  "sup": "#2B5A87",
  "neu": "#A39B8E",
  "res": "#D9783F",
  "evt": "#1C1B19"
} as const;

export const ATLAS_DOC_TYPES = [
  {
    "id": "note",
    "label": "Briefing note",
    "meta": "3 pages · for one meeting"
  },
  {
    "id": "deck",
    "label": "Risk deck",
    "meta": "4 pages · for leadership"
  },
  {
    "id": "watch",
    "label": "Watch-list update",
    "meta": "1–2 pages · monthly"
  }
] as const;
