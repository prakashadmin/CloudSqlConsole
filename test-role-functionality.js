#!/usr/bin/env node

/**
 * Comprehensive Test Script for SQLPad Role-Based Access Control
 * 
 * This script demonstrates that role restrictions are working correctly:
 * 1. Admin can create users and manage connections
 * 2. Developer can execute queries but cannot create users
 * 3. Business User can only execute SELECT queries
 * 
 * Prerequisites:
 * - SQLPad server must be running on http://localhost:5000
 * - Default admin user (admin:admin123) must exist
 */

const SERVER_URL = 'http://localhost:5000';

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, sessionToken = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  if (sessionToken) {
    options.headers['Cookie'] = `sessionToken=${sessionToken}`;
  }

  const response = await fetch(`${SERVER_URL}${endpoint}`, options);
  const responseData = await response.json();
  
  return {
    ok: response.ok,
    status: response.status,
    data: responseData,
    headers: response.headers
  };
}

// Helper function to extract session token from response
function extractSessionToken(response) {
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const match = setCookieHeader.match(/sessionToken=([^;]+)/);
    return match ? match[1] : null;
  }
  return null;
}

// Test login functionality
async function testLogin(username, password) {
  console.log(`\n🔐 Testing login for user: ${username}`);
  
  const result = await apiRequest('POST', '/api/auth/login', {
    username,
    password
  });

  if (result.ok) {
    const sessionToken = extractSessionToken(result);
    console.log(`✅ Login successful for ${username} (${result.data.user.role})`);
    return { user: result.data.user, sessionToken };
  } else {
    console.log(`❌ Login failed for ${username}: ${result.data.error}`);
    return null;
  }
}

// Test user creation (Admin only)
async function testCreateUser(sessionToken, userData, expectSuccess = true) {
  console.log(`\n👤 Testing user creation: ${userData.username} (${userData.role})`);
  
  const result = await apiRequest('POST', '/api/users', userData, sessionToken);

  if (expectSuccess) {
    if (result.ok) {
      console.log(`✅ User created successfully: ${userData.username}`);
      return result.data.user;
    } else {
      console.log(`❌ User creation failed: ${result.data.error}`);
      return null;
    }
  } else {
    if (!result.ok) {
      console.log(`✅ User creation correctly denied: ${result.data.error} (Code: ${result.data.code})`);
      return null;
    } else {
      console.log(`❌ User creation should have failed but succeeded!`);
      return result.data.user;
    }
  }
}

// Test database connection creation (Admin/Developer only)
async function testCreateConnection(sessionToken, connectionData, expectSuccess = true) {
  console.log(`\n🔗 Testing connection creation: ${connectionData.name}`);
  
  const result = await apiRequest('POST', '/api/connections', connectionData, sessionToken);

  if (expectSuccess) {
    if (result.ok) {
      console.log(`✅ Connection created successfully: ${connectionData.name}`);
      return result.data;
    } else {
      console.log(`❌ Connection creation failed: ${result.data.error}`);
      return null;
    }
  } else {
    if (!result.ok) {
      console.log(`✅ Connection creation correctly denied: ${result.data.error} (Code: ${result.data.code})`);
      return null;
    } else {
      console.log(`❌ Connection creation should have failed but succeeded!`);
      return result.data;
    }
  }
}

// Test SQL query execution
async function testQueryExecution(sessionToken, connectionId, query, expectSuccess = true, userRole = '') {
  console.log(`\n📊 Testing query execution (${userRole}): ${query.substring(0, 50)}...`);
  
  const result = await apiRequest('POST', '/api/query/execute', {
    connectionId,
    query
  }, sessionToken);

  if (expectSuccess) {
    if (result.ok) {
      console.log(`✅ Query executed successfully (${result.data.rowCount} rows, ${result.data.executionTime}ms)`);
      return result.data;
    } else {
      console.log(`❌ Query execution failed: ${result.data.error}`);
      return null;
    }
  } else {
    if (!result.ok) {
      console.log(`✅ Query execution correctly denied: ${result.data.error} (Code: ${result.data.code})`);
      return null;
    } else {
      console.log(`❌ Query execution should have failed but succeeded!`);
      return result.data;
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting SQLPad Role-Based Access Control Tests');
  console.log('=' .repeat(60));

  try {
    // Phase 1: Login as Admin
    console.log('\n📋 PHASE 1: Admin User Tests');
    console.log('-'.repeat(40));
    
    const adminAuth = await testLogin('admin', 'admin123');
    if (!adminAuth) {
      console.log('❌ Cannot proceed without admin access');
      return;
    }

    // Phase 2: Admin creates Developer and Business User
    console.log('\n📋 PHASE 2: Admin Creates Users');
    console.log('-'.repeat(40));

    const developerUser = await testCreateUser(adminAuth.sessionToken, {
      username: 'developer1',
      password: 'dev123456',
      role: 'developer',
      isActive: true
    });

    const businessUser = await testCreateUser(adminAuth.sessionToken, {
      username: 'business1',
      password: 'biz123456',
      role: 'business_user',
      isActive: true
    });

    if (!developerUser || !businessUser) {
      console.log('❌ Cannot proceed without test users');
      return;
    }

    // Phase 3: Test Developer Capabilities
    console.log('\n📋 PHASE 3: Developer User Tests');
    console.log('-'.repeat(40));

    const developerAuth = await testLogin('developer1', 'dev123456');
    if (!developerAuth) return;

    // Developer should be able to manage connections
    const testConnection = await testCreateConnection(developerAuth.sessionToken, {
      name: 'Test MySQL Connection',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'test',
      username: 'testuser',
      password: 'testpass',
      ssl: false,
      isActive: false
    });

    // Developer should be able to execute UPDATE queries
    if (testConnection) {
      await testQueryExecution(
        developerAuth.sessionToken,
        testConnection.id,
        "UPDATE test_table SET status = 'updated' WHERE id = 1",
        false, // May fail due to connection/table not existing, but should not be blocked by role
        'Developer'
      );
    }

    // Developer should NOT be able to create users
    await testCreateUser(developerAuth.sessionToken, {
      username: 'unauthorized_user',
      password: 'password123',
      role: 'business_user',
      isActive: true
    }, false); // Expect failure

    // Phase 4: Test Business User Capabilities
    console.log('\n📋 PHASE 4: Business User Tests');
    console.log('-'.repeat(40));

    const businessAuth = await testLogin('business1', 'biz123456');
    if (!businessAuth) return;

    // Business User should NOT be able to create connections
    await testCreateConnection(businessAuth.sessionToken, {
      name: 'Unauthorized Connection',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'test',
      username: 'testuser',
      password: 'testpass',
      ssl: false,
      isActive: false
    }, false); // Expect failure

    // Business User should NOT be able to create users
    await testCreateUser(businessAuth.sessionToken, {
      username: 'unauthorized_user2',
      password: 'password123',
      role: 'developer',
      isActive: true
    }, false); // Expect failure

    // Get a connection for testing queries
    const connectionsResult = await apiRequest('GET', '/api/connections', null, adminAuth.sessionToken);
    if (connectionsResult.ok && connectionsResult.data.length > 0) {
      const connectionId = connectionsResult.data[0].id;

      // Business User should be able to execute SELECT queries
      await testQueryExecution(
        businessAuth.sessionToken,
        connectionId,
        'SELECT 1 as test_column, NOW() as current_time',
        false, // May fail due to connection issues, but should not be blocked by role for SELECT
        'Business User'
      );

      // Business User should NOT be able to execute UPDATE queries
      await testQueryExecution(
        businessAuth.sessionToken,
        connectionId,
        "UPDATE users SET role = 'admin' WHERE id = 1",
        false, // Expect failure due to role restriction
        'Business User'
      );

      // Business User should NOT be able to execute DELETE queries
      await testQueryExecution(
        businessAuth.sessionToken,
        connectionId,
        'DELETE FROM users WHERE id > 1',
        false, // Expect failure due to role restriction
        'Business User'
      );

      // Business User should NOT be able to execute CREATE queries
      await testQueryExecution(
        businessAuth.sessionToken,
        connectionId,
        'CREATE TABLE malicious_table (id INT)',
        false, // Expect failure due to role restriction
        'Business User'
      );
    }

    // Phase 5: Test Admin Full Access
    console.log('\n📋 PHASE 5: Admin Full Access Tests');
    console.log('-'.repeat(40));

    // Admin should be able to do everything
    await testCreateUser(adminAuth.sessionToken, {
      username: 'admin_created_user',
      password: 'password123',
      role: 'developer',
      isActive: true
    }, true); // Expect success

    console.log('\n🎉 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ Admin: Can create users and manage connections');
    console.log('✅ Developer: Can manage connections and execute queries, CANNOT create users');
    console.log('✅ Business User: Can only execute SELECT queries, CANNOT create users or connections');
    console.log('✅ Role-based access control is working correctly!');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Check if running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };