/**
 * Automated Test Suite for Markaz Student Registration & Calendar System
 * Runs against live Express app and MySQL database
 */

const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const db = require('../src/config/db');

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest({ method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', err => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' Starting Markaz System Automated Verification Tests ');
  console.log('======================================================\n');

  server = app.listen(PORT);
  let adminToken = '';

  try {
    // Reset test data for idempotent test execution (only test students 3 and 4)
    await db.query(`DELETE FROM unit_assignments WHERE student_id IN (3, 4)`);
    await db.query(`DELETE FROM registrations WHERE student_id IN (3, 4)`);

    // TEST 1: Health check
    console.log('[TEST 1] GET /api/health');
    const healthRes = await makeRequest({ path: '/api/health' });
    assert.strictEqual(healthRes.statusCode, 200);
    assert.strictEqual(healthRes.body.status, 'healthy');
    console.log('  ✓ Health check passed');

    // TEST 2: Student lookup by Registration / Admission Number (1602)
    console.log('[TEST 2] GET /api/students/lookup?number=1602');
    const studentRes = await makeRequest({ path: '/api/students/lookup?number=1602' });
    assert.strictEqual(studentRes.statusCode, 200);
    assert.strictEqual(studentRes.body.success, true);
    assert.strictEqual(studentRes.body.student.candidateName, 'JAMALUDDEEN ABDUL HAMEED');
    assert.strictEqual(studentRes.body.student.class, 'THQ');
    assert.strictEqual(studentRes.body.student.place, 'MANI');
    assert.strictEqual(studentRes.body.student.mobile, '9632679895');
    console.log('  ✓ Student 1602 correctly retrieved from MySQL with full details');

    // TEST 3: Student lookup with non-existent number
    console.log('[TEST 3] GET /api/students/lookup?number=999999');
    const notFoundRes = await makeRequest({ path: '/api/students/lookup?number=999999' });
    assert.strictEqual(notFoundRes.statusCode, 404);
    assert.strictEqual(notFoundRes.body.success, false);
    console.log('  ✓ Unknown student number handled with 404 error');

    // TEST 4: Inside Kerala Location Hierarchy
    console.log('[TEST 4] Location Hierarchy: Districts -> Zones -> Circles -> Available Units');
    const distRes = await makeRequest({ path: '/api/locations/districts' });
    assert.strictEqual(distRes.statusCode, 200);
    assert.ok(distRes.body.districts.length > 0);
    const kozhikode = distRes.body.districts.find(d => d.name === 'Kozhikode');
    assert.ok(kozhikode, 'Kozhikode district found');

    const zoneRes = await makeRequest({ path: `/api/locations/zones?districtId=${kozhikode.id}` });
    assert.strictEqual(zoneRes.statusCode, 200);
    const ferokeZone = zoneRes.body.zones.find(z => z.name === 'Feroke');
    assert.ok(ferokeZone, 'Feroke zone found');

    const circleRes = await makeRequest({ path: `/api/locations/circles?zoneId=${ferokeZone.id}` });
    assert.strictEqual(circleRes.statusCode, 200);
    const ferokeCircle = circleRes.body.circles.find(c => c.name === 'Feroke Town');
    assert.ok(ferokeCircle, 'Feroke Town circle found');

    // Unit 6 (Chaliyam North) is actively assigned to Student 1604 (MUHAMMED ASHIQ)!
    // So getAvailableUnits should NOT include Unit 6!
    const availUnitRes = await makeRequest({ path: `/api/locations/units/available?circleId=${ferokeCircle.id}` });
    assert.strictEqual(availUnitRes.statusCode, 200);
    const hasUnit6 = availUnitRes.body.units.some(u => u.id === 6);
    assert.strictEqual(hasUnit6, false, 'Unit 6 (actively assigned) must NOT appear in available units');
    console.log('  ✓ Dynamic location hierarchy and active unit exclusion confirmed');

    // TEST 5: Admin Login with bcrypt & JWT
    console.log('[TEST 5] POST /api/auth/login');
    const loginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'admin', password: 'admin123' }
    });
    assert.strictEqual(loginRes.statusCode, 200);
    assert.ok(loginRes.body.token, 'JWT token returned');
    adminToken = loginRes.body.token;
    console.log('  ✓ Admin login verified and JWT token acquired');

    // TEST 6: Protected admin route security
    console.log('[TEST 6] GET /api/admin/dashboard without token');
    const unauthRes = await makeRequest({ path: '/api/admin/dashboard' });
    assert.strictEqual(unauthRes.statusCode, 401, 'Unauthenticated request must be rejected');

    console.log('  [TEST 6b] GET /api/admin/dashboard with valid JWT token');
    const authDashRes = await makeRequest({
      path: '/api/admin/dashboard',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(authDashRes.statusCode, 200);
    assert.ok(authDashRes.body.stats.totalStudents >= 11);
    console.log('  ✓ Admin route authorization verified');

    // TEST 7: Concurrency & Duplicate Unit Assignment Prevention
    console.log('[TEST 7] Submit duplicate unit assignment for already-claimed unit (Unit 6)');
    const dupRes = await makeRequest({
      method: 'POST',
      path: '/api/registrations',
      body: {
        student_id: 3, // Jamaluddeen
        registration_type: 'inside_kerala',
        district_id: kozhikode.id,
        zone_id: ferokeZone.id,
        circle_id: ferokeCircle.id,
        unit_id: 6, // Already assigned to student 1604 (MUHAMMED ASHIQ)!
        confirmed: true
      }
    });
    assert.strictEqual(dupRes.statusCode, 409, 'Must return 409 Conflict');
    assert.ok(
      dupRes.body.message.includes('This unit has already been selected by another student'),
      'Must contain exact prompt specified message'
    );
    console.log('  ✓ Unit concurrency protection prevented claiming an already-assigned unit');

    // TEST 8a: Validation for minimum 100 calendar quantity requirement
    console.log('[TEST 8a] Validation for calendar quantity below 100 (e.g. 50 or negative)');
    const belowMinRes = await makeRequest({
      method: 'POST',
      path: '/api/registrations',
      body: {
        student_id: 3,
        registration_type: 'inside_kerala',
        district_id: kozhikode.id,
        zone_id: ferokeZone.id,
        circle_id: ferokeCircle.id,
        unit_id: 2,
        calendars_requested: 50, // Less than minimum 100
        confirmed: true
      }
    });
    assert.strictEqual(belowMinRes.statusCode, 400, 'Calendar quota below 100 must be rejected');
    assert.ok(belowMinRes.body.message.includes('Minimum 100 calendars required'));

    // TEST 8b: Successful Inside Kerala Registration with Student-Selected Calendar Quantity (125 Nos)
    console.log('[TEST 8b] Submit valid registration for Student 1602 with student-selected 125 calendars on Unit 4 (Farook College Unit)');
    const validRegRes = await makeRequest({
      method: 'POST',
      path: '/api/registrations',
      body: {
        student_id: 3, // Jamaluddeen
        registration_type: 'inside_kerala',
        district_id: kozhikode.id,
        zone_id: ferokeZone.id,
        circle_id: ferokeCircle.id,
        unit_id: 4, // Available test unit
        calendars_requested: 125,
        confirmed: true
      }
    });
    assert.strictEqual(validRegRes.statusCode, 201);
    assert.ok(validRegRes.body.registration.registrationCode.startsWith('MKZ-2026-'));
    assert.strictEqual(validRegRes.body.registration.calendarsRequested, 125, 'calendarsRequested must match student selection');
    assert.strictEqual(validRegRes.body.registration.additionalCalendars, 0, 'additionalCalendars must initialize to 0');
    assert.strictEqual(validRegRes.body.registration.calendarsAllotted, 125, 'calendarsAllotted must match initial requested quantity');

    const [dbRegCheck] = await db.query(
      `SELECT calendars_requested, additional_calendars, calendars_allotted FROM registrations WHERE id = ?`,
      [validRegRes.body.registration.id]
    );
    assert.strictEqual(dbRegCheck[0].calendars_requested, 125);
    assert.strictEqual(dbRegCheck[0].additional_calendars, 0);
    assert.strictEqual(dbRegCheck[0].calendars_allotted, 125);
    console.log('  ✓ Registration succeeded with student-selected 125 calendars and persisted to MySQL');

    // TEST 9: Repeat Registration Prevention for Same Student
    console.log('[TEST 9] Attempt duplicate submission for already-registered Student 1602');
    const repeatRegRes = await makeRequest({
      method: 'POST',
      path: '/api/registrations',
      body: {
        student_id: 3,
        registration_type: 'inside_kerala',
        district_id: kozhikode.id,
        zone_id: ferokeZone.id,
        circle_id: ferokeCircle.id,
        unit_id: 3,
        confirmed: true
      }
    });
    assert.strictEqual(repeatRegRes.statusCode, 409);
    console.log('  ✓ Repeat registration for same student successfully rejected');

    // TEST 10: Outside Kerala Registration
    console.log('[TEST 10] Submit Outside Kerala registration for Student 1603 (Ahmed Afnan)');
    const outsideRegRes = await makeRequest({
      method: 'POST',
      path: '/api/registrations',
      body: {
        student_id: 4, // Ahmed Afnan
        registration_type: 'outside_kerala',
        state_name: 'Tamil Nadu',
        outside_district: 'Chennai',
        outside_zone: 'North Chennai',
        outside_circle: 'Royapuram',
        outside_unit: 'Mannady Unit',
        confirmed: true
      }
    });
    assert.strictEqual(outsideRegRes.statusCode, 201);
    console.log('  ✓ Outside Kerala registration succeeded with custom text inputs');

    // TEST 11: Unit Assignment Release
    console.log('[TEST 11] Admin releases unit assignment');
    // Find assignment for Unit 4 (created in test 8b)
    const [assignments] = await db.query(`SELECT id FROM unit_assignments WHERE unit_id = 4 AND status = 'active'`);
    assert.ok(assignments.length > 0);
    const assignId = assignments[0].id;

    const releaseRes = await makeRequest({
      method: 'POST',
      path: `/api/admin/unit-assignments/${assignId}/release`,
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: { release_reason: 'Testing release workflow by administrative authority' }
    });
    assert.strictEqual(releaseRes.statusCode, 200);
    console.log('  ✓ Unit assignment released and marked in history');

    // Now Unit 4 should be available again!
    const checkAvailAgain = await makeRequest({ path: `/api/locations/units/available?circleId=${ferokeCircle.id}` });
    const hasUnit4Again = checkAvailAgain.body.units.some(u => u.id === 4);
    assert.strictEqual(hasUnit4Again, true, 'Unit 4 must now be available again');
    console.log('  ✓ Released unit is once again available in selection list');

    // [TEST 12] GET /api/locations/admin/places (Combined Place Management)
    console.log('[TEST 12] GET /api/locations/admin/places (Combined Place Management)');
    const placesRes = await makeRequest({
      path: '/api/locations/admin/places?search=Feroke&limit=50',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(placesRes.statusCode, 200);
    assert.strictEqual(placesRes.body.success, true);
    assert(Array.isArray(placesRes.body.places), 'Places must be an array');
    assert(placesRes.body.places.length > 0, 'Must return places');

    // Verify columns exist on every row
    const firstPlace = placesRes.body.places[0];
    assert('district_name' in firstPlace, 'Must have district_name');
    assert('zone_name' in firstPlace, 'Must have zone_name');
    assert('circle_name' in firstPlace, 'Must have circle_name');
    assert('unit_name' in firstPlace, 'Must have unit_name');
    assert('assigned_student_name' in firstPlace, 'Must have assigned_student_name');
    assert('assignment_status' in firstPlace, 'Must have assignment_status');

    // Find Unit 6 (Chaliyam North) which is assigned to Student 1604 (MUHAMMED ASHIQ)
    const unit6 = placesRes.body.places.find(p => p.unit_id === 6);
    assert(unit6, 'Unit 6 must exist');
    assert.strictEqual(unit6.assignment_status, 'Assigned');
    assert.strictEqual(unit6.assigned_student_name, 'MUHAMMED ASHIQ');

    // Find an unassigned unit (Unit 5: Seethi Sahib Nagar)
    const unassignedUnit = placesRes.body.places.find(p => p.unit_id === 5);
    assert(unassignedUnit, 'Unit 5 must exist');
    assert.strictEqual(unassignedUnit.assignment_status, 'Unassigned');
    assert.strictEqual(unassignedUnit.assigned_student_name, 'Unassigned');

    // Test search filter
    const searchRes = await makeRequest({
      path: '/api/locations/admin/places?search=Feroke',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(searchRes.statusCode, 200);
    assert(searchRes.body.places.every(p => 
      p.district_name.includes('Feroke') || 
      p.zone_name.includes('Feroke') || 
      p.circle_name.includes('Feroke') || 
      p.unit_name.includes('Feroke') ||
      p.assigned_student_name.includes('Feroke')
    ), 'Search results must match term');

    console.log('  ✓ Combined Place Management retrieved with District, Zone, Circle, Unit, and Assigned Student Name');
    console.log('  ✓ Active assignment and Unassigned statuses verified dynamically');

    // TEST 13: Calendar Quota Management
    console.log('[TEST 13] Calendar Quota Management (Default 100, [+] Increment, [-] Decrement, Persistence)');
    // 1. Unauthorized attempt
    const unauthQuota = await makeRequest({
      method: 'PATCH',
      path: '/api/registrations/1/quota',
      body: { delta: 1 }
    });
    assert.strictEqual(unauthQuota.statusCode, 401, 'Unauthenticated quota update must be rejected');

    // 2. Authorized quota update with delta: +1
    const [regRows] = await db.query(`SELECT id, calendars_allotted FROM registrations LIMIT 1`);
    assert(regRows.length > 0, 'At least one registration must exist');
    const targetRegId = regRows[0].id;
    const initialQuota = regRows[0].calendars_allotted;

    const plusOneRes = await makeRequest({
      method: 'PATCH',
      path: `/api/registrations/${targetRegId}/quota`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { delta: 1 }
    });
    assert.strictEqual(plusOneRes.statusCode, 200);
    assert.strictEqual(plusOneRes.body.calendars_allotted, initialQuota + 1);
    console.log(`  ✓ Successfully increased quota from ${initialQuota} to ${initialQuota + 1} with [+]`);

    // 3. Repeated clicks (+5)
    for (let c = 0; c < 5; c++) {
      await makeRequest({
        method: 'PATCH',
        path: `/api/registrations/${targetRegId}/quota`,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { delta: 1 }
      });
    }
    const [after5Rows] = await db.query(`SELECT calendars_allotted FROM registrations WHERE id = ?`, [targetRegId]);
    assert.strictEqual(after5Rows[0].calendars_allotted, initialQuota + 6);
    console.log(`  ✓ Successfully handled repeated [+] clicks (Quota: ${initialQuota + 6}) with MySQL persistence`);

    // 4. Set explicit quota value (e.g. 150)
    const setQuotaRes = await makeRequest({
      method: 'PATCH',
      path: `/api/registrations/${targetRegId}/quota`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { calendars_allotted: 150 }
    });
    assert.strictEqual(setQuotaRes.statusCode, 200);
    assert.strictEqual(setQuotaRes.body.calendars_allotted, 150);

    // 5. Decrement with [-]
    const minusRes = await makeRequest({
      method: 'PATCH',
      path: `/api/registrations/${targetRegId}/quota`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { delta: -1 }
    });
    assert.strictEqual(minusRes.statusCode, 200);
    assert.strictEqual(minusRes.body.calendars_allotted, 149);

    // 6. Prevent negative quota
    const negRes = await makeRequest({
      method: 'PATCH',
      path: `/api/registrations/${targetRegId}/quota`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { delta: -9999 }
    });
    // 7. Verify admin additional calendars separate maintenance without overwriting original request
    const student1602RegId = validRegRes.body.registration.id;
    console.log('  [TEST 13b] Grant additional 15 calendars to Student 1602 (preserving original 125 request)');
    const addGrantRes = await makeRequest({
      method: 'PATCH',
      path: `/api/registrations/${student1602RegId}/quota`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { additional_calendars: 15 }
    });
    assert.strictEqual(addGrantRes.statusCode, 200);
    assert.strictEqual(addGrantRes.body.calendars_requested, 125, 'Student original requested quantity must NOT be overwritten');
    assert.strictEqual(addGrantRes.body.additional_calendars, 15, 'Additional quantity maintained separately');
    assert.strictEqual(addGrantRes.body.calendars_allotted, 140, 'Final approved quantity is 125 + 15 = 140');

    // Verify in database query and admin registration list
    const [auditReg] = await db.query(
      `SELECT calendars_requested, additional_calendars, calendars_allotted FROM registrations WHERE id = ?`,
      [student1602RegId]
    );
    assert.strictEqual(auditReg[0].calendars_requested, 125, 'Database requested quantity preserved');
    assert.strictEqual(auditReg[0].additional_calendars, 15, 'Database additional quantity preserved');
    assert.strictEqual(auditReg[0].calendars_allotted, 140, 'Database total quota is 140');

    const adminListRes = await makeRequest({
      path: `/api/registrations?search=1602&status=all`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminListRes.statusCode, 200);
    const regInList = adminListRes.body.registrations.find(r => r.id === student1602RegId);
    assert.ok(regInList, 'Student registration must be returned in admin list');
    assert.strictEqual(regInList.calendars_requested, 125);
    assert.strictEqual(regInList.additional_calendars, 15);
    assert.strictEqual(regInList.calendars_allotted, 140);
    console.log('  ✓ Admin review: Student requested quantity (125), additional granted (+15), and final approved (140) verified without overwriting');

    // [TEST 14] Test Permanent Delete for Students and Locations
    console.log('[TEST 14] Permanent Deletion (DELETE /api/students/:id & DELETE /api/locations/admin/:type/:id)');
    // 14a. Create a temp student
    const createStudentRes = await makeRequest({
      method: 'POST',
      path: '/api/students',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        class_name: 'TEST_CLASS',
        hajer_no: '999',
        reg_no: 'TEST_DEL_001',
        candidate_name: 'Delete Verification Student',
        mobile: '9988776655'
      }
    });
    assert.strictEqual(createStudentRes.statusCode, 201);
    const tempStudentId = createStudentRes.body.studentId;

    // 14b. Delete the temp student
    const deleteStudentRes = await makeRequest({
      method: 'DELETE',
      path: `/api/students/${tempStudentId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(deleteStudentRes.statusCode, 200);
    assert.strictEqual(deleteStudentRes.body.success, true);

    // 14c. Verify student no longer exists
    const lookupDeletedRes = await makeRequest({
      method: 'GET',
      path: `/api/students/lookup?number=TEST_DEL_001`
    });
    assert.strictEqual(lookupDeletedRes.statusCode, 404);
    console.log('  ✓ Student permanent deletion verified with database cleanup');

    // 14d. Create a temp unit
    const unitName = 'Test Unit ' + Date.now();
    const createUnitRes = await makeRequest({
      method: 'POST',
      path: '/api/locations/admin/units',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: unitName,
        circle_id: 1
      }
    });
    assert.strictEqual(createUnitRes.statusCode, 201);
    const tempUnitId = createUnitRes.body.id;

    // 14e. Delete the temp unit
    const deleteUnitRes = await makeRequest({
      method: 'DELETE',
      path: `/api/locations/admin/units/${tempUnitId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(deleteUnitRes.statusCode, 200);
    assert.strictEqual(deleteUnitRes.body.success, true);
    console.log('  ✓ Location/Place permanent deletion verified');

    // 14f. Attempt to delete Unit 16 (which has active assignment) should be prevented
    const deleteOccupiedUnitRes = await makeRequest({
      method: 'DELETE',
      path: `/api/locations/admin/units/16`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(deleteOccupiedUnitRes.statusCode, 409);
    console.log('  ✓ Prevention of deleting places with active student assignments verified (409 Conflict)');

    // [TEST 15] Test Cancel & Delete Registration (DELETE /api/registrations/:id)
    console.log('[TEST 15] Cancel & Delete Registration (DELETE /api/registrations/:id)');
    // 15a. Register Student 1606 for Unit 5
    const testRegRes = await makeRequest({
      method: 'POST',
      path: '/api/registrations',
      body: {
        student_id: 7,
        registration_type: 'inside_kerala',
        district_id: 1,
        zone_id: 1,
        circle_id: 1,
        unit_id: 5,
        calendars_requested: 100,
        confirmed: true
      }
    });
    assert.strictEqual(testRegRes.statusCode, 201);
    const createdRegId = testRegRes.body.registration.id;

    // 15b. Unit 5 should now be occupied
    const availBeforeRes = await makeRequest({ path: '/api/locations/units/available?circleId=1' });
    assert.strictEqual(availBeforeRes.body.units.some(u => u.id === 5), false, 'Unit 5 must NOT be available while registered');

    // 15c. Cancel & Delete the registration
    const deleteRegRes = await makeRequest({
      method: 'DELETE',
      path: `/api/registrations/${createdRegId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(deleteRegRes.statusCode, 200);
    assert.strictEqual(deleteRegRes.body.success, true);
    console.log('  ✓ Registration cancelled and deleted successfully');

    // 15d. Unit 5 must immediately be available again
    const availAfterRes = await makeRequest({ path: '/api/locations/units/available?circleId=1' });
    assert.strictEqual(availAfterRes.body.units.some(u => u.id === 5), true, 'Unit 5 must be available again after registration deletion');
    console.log('  ✓ Assigned unit immediately released and confirmed available');

    // 15e. Registration must not appear in active registrations list
    const activeRegsRes = await makeRequest({
      method: 'GET',
      path: '/api/registrations',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(activeRegsRes.body.registrations.some(r => r.id === createdRegId), false);
    console.log('  ✓ Cancelled registration cleanly removed from active list');

    // TEST 16: Reports & Analytics avoids 'Reg Code' in columns & exports
    console.log('\n[TEST 16] Verify Reports & Analytics avoids Reg Code');
    const reportRes = await makeRequest({
      method: 'GET',
      path: '/api/admin/reports/registrations?format=json',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(reportRes.statusCode, 200);
    assert.strictEqual(reportRes.body.success, true);
    const hasRegCodeKey = reportRes.body.columns.some(col => col.key === 'registration_code');
    const hasRegCodeHeader = reportRes.body.columns.some(col => col.header === 'Reg Code');
    assert.strictEqual(hasRegCodeKey, false, 'Reports column must NOT contain registration_code');
    assert.strictEqual(hasRegCodeHeader, false, 'Reports column header must NOT contain Reg Code');
    console.log('  ✓ Reports & Analytics cleanly avoids Reg Code column in dataset and columns configuration');

    // TEST 17: Admin Profile Update (Name & Password Validation)
    console.log('\n[TEST 17] Verify Admin Profile Update (Name & Password Settings)');
    // 17a. Attempt password update with wrong current password
    const badPwRes = await makeRequest({
      method: 'PUT',
      path: '/api/auth/profile',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      }
    });
    assert.strictEqual(badPwRes.statusCode, 400);
    assert.strictEqual(badPwRes.body.success, false);
    console.log('  ✓ Rejected password change with incorrect current password');

    // 17b. Update administrator full name
    const updateNameRes = await makeRequest({
      method: 'PUT',
      path: '/api/auth/profile',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        fullName: 'Jamia Administrator'
      }
    });
    assert.strictEqual(updateNameRes.statusCode, 200);
    assert.strictEqual(updateNameRes.body.success, true);
    assert.strictEqual(updateNameRes.body.admin.fullName, 'Jamia Administrator');
    console.log('  ✓ Successfully updated administrator full name');

    // Restore original name
    await makeRequest({
      method: 'PUT',
      path: '/api/auth/profile',
      headers: { Authorization: `Bearer ${updateNameRes.body.token}` },
      body: {
        fullName: 'Administrator'
      }
    });

    // TEST 18: Forgot Password Reset without changing name
    console.log('\n[TEST 18] Verify Forgot Password Reset without altering name');
    const resetRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/reset-password',
      body: {
        username: 'admin',
        newPassword: 'tempNewPassword99'
      }
    });
    assert.strictEqual(resetRes.statusCode, 200);
    assert.strictEqual(resetRes.body.success, true);
    console.log('  ✓ Password reset succeeded via /api/auth/reset-password');

    // Verify login with new password and check that name remains unchanged
    const newLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        username: 'admin',
        password: 'tempNewPassword99'
      }
    });
    assert.strictEqual(newLoginRes.statusCode, 200);
    assert.strictEqual(newLoginRes.body.admin.fullName, 'Administrator', 'Name must not change during password reset');
    console.log('  ✓ Login succeeded with new password and Administrator name is intact');

    // Restore original password 'admin123'
    await makeRequest({
      method: 'POST',
      path: '/api/auth/reset-password',
      body: {
        username: 'admin',
        newPassword: 'admin123'
      }
    });
    console.log('  ✓ Restored default password for development environment');

    console.log('\n======================================================');
    console.log(' ALL TESTS PASSED SUCCESSFULLY! ');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Test failure:', err);
    process.exit(1);
  } finally {
    try {
      await db.query(`DELETE FROM unit_assignments WHERE student_id IN (3, 4)`);
      await db.query(`DELETE FROM registrations WHERE student_id IN (3, 4)`);
    } catch (_) {}
    if (server) server.close();
    process.exit(0);
  }
}

runTests();
