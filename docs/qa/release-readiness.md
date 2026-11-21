# Scosha - Release Readiness

**Decision:** NOT READY — critical smoke done; full 1939-case suite mostly NOT RUN; open P2s below.

## Gate checklist

- [x] Guest browse + shop filters + PDP + cart (smoke)
- [ ] Register/verify + COD order + confirmation (not run this session)
- [ ] Admin processes order + packing receipt (not run; login/dashboard OK)
- [x] AI face/body/furniture smoke (landing + open assistant only)
- [x] Authz: customer/guest cannot access admin API; checkout gated
- [ ] Production builds + staging env verified
- [ ] No open P0/P1 in bug-report.md (none open; **P2 DEF-S01/S02** remain)

## Open blockers for launch confidence

1. Execute more of `manual-browser-test-cases.md` (especially COD + admin order pipeline)
2. Fix or accept **DEF-S01** (mobile size selection vs bottom nav)
3. Fix or document **DEF-S02** (dashboard Revenue $0 with pending orders)
4. Staging MySQL + secrets (not Amaz shared); confirm SMTP / AI keys if required in prod
5. Confirm COD-only payment copy matches live policy

## Environment used for smoke

| App | URL | Status |
| --- | --- | --- |
| Storefront | http://localhost:3000 | Up |
| Admin | http://localhost:5174/admin | Up |
| API | http://localhost:5000/api/v1 | Healthy |
| DB | MySQL localhost:3306 / scosha | Connected |
