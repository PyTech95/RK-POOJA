# RK POOJA — PRD

## Original Problem Statement
Build a production-ready PWA called **RK POOJA** — India's AI-powered multilingual travel & transport marketplace. Tagline: **"ONE APP. ALL RIDES."**

Combines Uber (rides), Ola (local/outstation), Porter (parcels), travel agencies (group bus), and ChatGPT-style AI. Primary purpose: generate inquiries, capture leads, AI-qualify, convert via WhatsApp, manage through admin. NOT a direct booking engine.

## Architecture
- **Frontend:** React 19 + React Router + Tailwind + shadcn/ui + framer-motion + recharts + Outfit/Manrope fonts
- **Backend:** FastAPI + Motor (async MongoDB) + JWT auth + emergentintegrations (Claude Sonnet 4.5)
- **AI:** Claude Sonnet 4.5 via Emergent Universal Key for chat + voice transcript parsing. Deterministic rules for quote estimation & lead scoring.
- **Maps:** None for v1 (city-name based distance heuristics). Browser Web Speech API for voice.
- **WhatsApp:** wa.me deep links (no API key)

## User Personas
1. **Customer (mobile, regional language)** — submits inquiries via web/voice/chat
2. **Support Agent / Admin** — manages leads on admin dashboard
3. **Power user (return customer)** — uses dashboard to track history

## Core Requirements (Static)
- 7 services: Car, Auto, Bike, Tempo Traveller, Bus, Porter, Goods
- 12 Indian languages (en, hi, mr, gu, bn, ta, te, kn, ml, pa, or, as)
- AI Voice booking, AI Chat, AI Quote, AI Lead scoring (Hot/Warm/Cold)
- WhatsApp-first lead conversion
- Mobile-first PWA
- Brand colors: #0A2E6D (navy) + #FF7A00 (orange)

## What's Been Implemented (V1 — Feb 2026)
- [x] FastAPI backend with JWT auth (register/login/me/update)
- [x] Auto-seeded admin user (admin@rkpooja.in / admin@123)
- [x] Inquiry CRUD with AI quote + lead score on create
- [x] AI chat assistant (Claude Sonnet 4.5, multilingual, persists history)
- [x] AI voice transcript parser (extracts structured fields)
- [x] AI quote estimator (distance + rate table, INR)
- [x] AI lead scoring (deterministic rules, hot/warm/cold)
- [x] Admin endpoints: list/filter inquiries, update status, stats aggregation
- [x] React frontend — full responsive design
- [x] Home page (hero, 7 services, how-it-works, popular routes, reviews, WhatsApp CTA)
- [x] Individual service pages with smart inquiry forms (calendar, vehicle category selector, live quote)
- [x] AI Chat drawer (sheet) with suggestions
- [x] Voice Booking dialog (Web Speech API → AI parser → pre-filled form)
- [x] Language picker modal (first launch) + header switcher (12 languages)
- [x] Floating actions: WhatsApp, Voice mic (pulse), AI chat, expandable phone call
- [x] User dashboard (my inquiries, profile, language settings)
- [x] Admin dashboard (KPIs, filterable leads table, status updates, charts: bar/pie/line/funnel)
- [x] JWT auth with login/signup pages
- [x] Brand custom Logo component (navy RK + orange pin)
- [x] All `data-testid` for testing

## Backlog (P1)
- [ ] Saved locations & travel history (separate from inquiries)
- [ ] Email/SMS notifications (Resend / Twilio)
- [ ] PWA offline mode + install prompt + manifest icons
- [ ] Google Maps autocomplete + actual driving distance
- [ ] Multilingual deep translation (more strings) for all 12 languages
- [ ] OTP login (Twilio)

## Backlog (P2)
- [ ] AI demand forecasting on admin
- [ ] AI auto-reply for WhatsApp business webhook
- [ ] Driver/partner onboarding portal
- [ ] Rating & review collection
- [ ] Coupon / referral system

## Test Credentials
See `/app/memory/test_credentials.md`.
