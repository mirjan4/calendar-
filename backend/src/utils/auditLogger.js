/**
 * Audit Logger
 * Avoided as requested: operations pass through cleanly without recording audit logs.
 */
async function logAction() {
  // No-op
  return Promise.resolve();
}

module.exports = { logAction };
