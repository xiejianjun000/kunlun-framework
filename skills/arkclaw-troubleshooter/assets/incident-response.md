# Incident Response Template

Use this template during production incidents to ensure systematic response.

## Incident Header

**Incident ID**: INC-YYYYMMDD-###
**Severity**: [ ] P1 Critical [ ] P2 High [ ] P3 Medium [ ] P4 Low
**Status**: [ ] Investigating [ ] Identified [ ] Monitoring [ ] Resolved
**Start Time**: ___________
**Duration**: _____ hours

**Incident Commander**: _______________________
**Communication Lead**: _______________________

---

## Impact Assessment

**What's broken**:
_______________________________________________________________

**Who's affected**:
- [ ] All users
- [ ] Specific region: _____
- [ ] Specific user segment: _____
- [ ] Internal users only

**Business impact**:
- Revenue impact: $_________ / hour
- User impact: ___________
- SLA breach: [ ] Yes [ ] No

---

## Timeline

### Detection
| Time | Event | Notes |
|------|-------|-------|
| | Alert triggered | |
| | Incident declared | |
| | | |

### Investigation
| Time | Action | Owner | Result |
|------|--------|-------|--------|
| | | | |
| | | | |
| | | | |

### Resolution
| Time | Action | Owner | Result |
|------|--------|-------|--------|
| | | | |
| | | | |
| | | | |

---

## Diagnosis

**Symptoms**:
- _________________________________________________
- _________________________________________________

**Affected Components**:
- [ ] Application servers
- [ ] Database
- [ ] Cache/Redis
- [ ] Queue/Background jobs
- [ ] External API
- [ ] Network/CDN
- [ ] Other: ___________

**Root Cause**:
_______________________________________________________________
_______________________________________________________________

**Contributing Factors**:
1. _______________________________
2. _______________________________
3. _______________________________

---

## Actions Taken

**Immediate Mitigation**:
1. _______________________________
2. _______________________________

**Short-term Fix**:
1. _______________________________
2. _______________________________

**Permanent Fix**:
- [ ] Implemented
- [ ] In progress
- [ ] Planned

---

## Communication

**Stakeholders Notified**:
- [ ] Engineering team
- [ ] Support team
- [ ] Management
- [ ] Customers (public status page)
- [ ] Other: ___________

**Communication Summary**:
- [ ] Initial notification (_____ minutes from detection)
- [ ] Updates every _____ minutes
- [ ] Resolution announcement
- [ ] Post-incident summary

---

## Resolution

**Fix Applied**:
_______________________________________________________________

**Verification Steps**:
- [ ] System metrics back to normal
- [ ] Error rates at baseline
- [ ] User reports resolved
- [ ] Monitoring stable for _____ minutes

**Rollback Performed**: [ ] Yes [ ] No
**Data Loss**: [ ] Yes [ ] No
**Service Degradation**: _____ hours total

---

## Post-Incident Actions

### Immediate (within 24 hours)
- [ ] Update runbooks
- [ ] Close incident ticket
- [ ] Send post-incident communication
- [ ] Customer impact credits (if applicable)

### Short-term (within 1 week)
- [ ] Complete post-incident review
- [ ] Implement permanent fix
- [ ] Add monitoring/alerting
- [ ] Update documentation

### Long-term (within 1 month)
- [ ] Architecture changes to prevent recurrence
- [ ] Process improvements
- [ ] Training/education
- [ ] Tooling improvements

---

## Lessons Learned

**What went well**:
1. _______________________________
2. _______________________________

**What could be improved**:
1. _______________________________
2. _______________________________

**Action Items**:
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| | | | |
| | | | |

---

## Metrics

**MTTD (Mean Time to Detect)**: _____ minutes
**MTTR (Mean Time to Resolve)**: _____ minutes
**MTTA (Mean Time to Acknowledge)**: _____ minutes

**Comparison to baseline**:
- MTTD: Better/Worse than average of _____ minutes
- MTTR: Better/Worse than average of _____ minutes

---

## References

**Related Alerts**:
- _______________________
- _______________________

**Related Incidents**:
- INC-___________________
- INC-___________________

**Runbooks Updated**:
- _______________________

**Documents Created**:
- [ ] Post-incident review
- [ ] Root cause analysis
- [ ] Action item tracker
