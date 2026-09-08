# VIPSCLUB Membership Portal 2026

HubSpot CMS theme for the VIPSCLUB member portal (IPS Partners / PartnerNet). This
repository contains the **theme source only** — HubL templates, modules, CSS, and
assets. Supporting logic that lives inside HubSpot (workflows, forms, HubDB tables,
CRM object/pipeline configuration) is documented but not stored here.

- **Platform:** HubSpot Content Hub (CMS) + Operations Hub (workflows)
- **Portal ID:** 442066989
- **Theme label:** VIPSCLUB Portal 2026

---

## Repository structure

```
vipsclub-portal-2026/
├── theme.json            Theme definition (fonts, colours, breakpoints)
├── fields.json           Theme-level design tokens (editable in the theme editor)
├── css/                  Global + per-area stylesheets
│   ├── portal/           Dashboard, sidebar, cards
│   ├── auth/             Login / register / reset pages
│   └── layout.css        Shared portal layout (header, sidebar, tier card)
├── img/                  Theme image assets
├── modules/              40 custom modules
│   └── Email Modules/    Programmable email modules
└── templates/            Page templates
    └── membership/       System auth pages (login, register, reset, etc.)
```

## Pages & templates

Portal pages (private / membership-gated): Member Dashboard, Services Catalogue,
Service Detail, Offers & Rewards Hub, My Deals, My Referrals, My Account, plus the
membership system pages (login, register, password reset, access denied).

Every template uses drag-and-drop areas where the page type allows; membership
system templates use direct module includes (HubSpot does not permit DnD on those).

## Key systems

| Area | How it works | Where the data lives |
|------|--------------|----------------------|
| **Membership / auth** | HubSpot membership (private content); custom-styled login/register/reset | HubSpot contacts + membership |
| **Points** | Ledger of point transactions; balances recalculated onto each member's referral record | Orders object (ledger) → Referral record (`total_points_earned`, `points_redeemable`) |
| **Referrals** | One "Self Contact" referral record per member; referrals link to it | Course object (referral records) |
| **Offers & Rewards** | Card grid with tier-gating, claim/redeem, points cost | Service object |
| **Deals** | Member-facing "My Deals" board (partner-gated) | Deal object |
| **Emails** | Transactional/marketing emails; several use programmable content (CRM HubL) | Email modules in `modules/Email Modules/` |

> **Note on dynamic content:** Points balances, tiers, referrals, offers, and deals
> are read live from HubSpot CRM objects via HubL (`crm_associations`, `crm_object`).
> Some modules require the *programmable email* / CRM-data setting to be enabled in
> HubSpot. Workflows (points award/deduction, tier assignment, email sends) and forms
> are configured in the HubSpot portal, not in this repo.

## Design tokens

- Primary red `#a22c35` · Dark `#212121` · Page background `#f7f7f7`
- Headings: Montserrat · Body: Inter
- Mobile breakpoint: 768px (sidebar collapses to a hamburger menu)

## Deploying

This theme is deployed with the [HubSpot CLI](https://developers.hubspot.com/docs/cms/developer-reference/local-development-cli).
From the repository root:

```bash
# One-time: authenticate the CLI against the portal
hs account auth

# Live-sync while developing (uploads on every save)
hs cms watch . "vipsclub-portal-2026" --account=<account-name>

# Or one-off upload
hs cms upload . "vipsclub-portal-2026" --account=<account-name>
```

Credentials are never stored in this repository — the CLI reads them from your local
`~/.hscli` configuration.
