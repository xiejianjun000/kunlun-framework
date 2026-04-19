# Pre-Deployment System Checklist

Use this checklist before deploying to production to prevent common issues.

## Application Status

- [ ] Application builds successfully
- [ ] All tests pass (`pytest` / `npm test`)
- [ ] No new warnings introduced
- [ ] Dependencies are up to date (`pip-outdated` / `npm outdated`)
- [ ] Environment variables documented
- [ ] Configuration valid for production

---

## Database

- [ ] Migrations applied (`alembic upgrade head` / `python manage.py migrate`)
- [ ] Database backups enabled
- [ ] Connection pool configured
- [ ] Query performance tested
- [ ] Indexes in place
- [ ] Foreign keys validated
- [ ] Data integrity checked

---

## API & Integration

- [ ] API documentation updated
- [ ] Authentication/authorization working
- [ ] Rate limits configured
- [ ] API versioning considered
- [ ] External service dependencies verified
- [ ] Circuit breakers implemented
- [ ] Fallback logic in place
- [ ] Webhooks/notifications tested

---

## Performance

- [ ] Load testing completed
- [ ] Response times acceptable (< 200ms p95)
- [ ] Memory usage profiled
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] CDN configured for static assets
- [ ] Compression enabled
- [ ] Connection pools sized correctly

---

## Security

- [ ] Secrets stored securely (no hardcoded values)
- [ ] HTTPS enforced
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Input validation in place
- [ ] SQL injection prevented
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Dependencies scanned for vulnerabilities
- [ ] Access controls tested
- [ ] Audit logging enabled

---

## Monitoring & Logging

- [ ] Application logging configured
- [ ] Error tracking integrated (Sentry, etc.)
- [ ] Metrics collection enabled (Prometheus, etc.)
- [ ] Health check endpoint implemented
- [ ] Alerting rules configured
- [ ] Dashboard set up
- [ ] Log aggregation working
- [ ] Performance monitoring active

---

## Deployment

- [ ] Deployment script tested
- [ ] Rollback plan documented
- [ ] Zero-downtime deployment possible
- [ ] Database migrations reversible
- [ ] Feature flags configured
- [ ] Staging environment validated
- [ ] Backup before deploy
- [ ] Deploy window approved

---

## Post-Deploy

- [ ] Smoke tests passed
- [ ] Monitoring shows normal
- [ ] Error rates acceptable
- [ ] Performance baseline met
- [ ] User acceptance tested
- [ ] Documentation updated
- [ ] Team notified of changes
- [ ] Support team briefed

---

## Rollback Triggers

Immediately rollback if:

- [ ] Error rate > 1% (vs baseline 0.1%)
- [ ] Response time > 2x baseline
- [ ] Database connection errors
- [ ] Memory leak detected
- [ ] Critical functionality broken
- [ ] Security incident detected
- [ ] Data corruption suspected

---

## Contact Information

| Role | Name | Contact |
|------|------|---------|
| Tech Lead | | |
| DevOps | | |
| DBA | | |
| Security | | |
| Product Owner | | |
