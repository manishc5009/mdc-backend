# Testing the /run-status/:runId API

This document explains how to test the `/run-status/:runId` API implemented in `index.js`.

## Prerequisites

- Node.js installed
- Backend server running on port 3001
- Environment variables set:
  - `DATABRICKS_TOKEN`: Your Databricks API token
  - `DATABRICKS_INSTANCE`: Your Databricks instance URL (e.g., https://<your-instance>.cloud.databricks.com)
- A valid `runId` to test with

## Running the Server

1. Ensure environment variables are set. You can create a `.env` file in the backend directory with the following content:

```
DATABRICKS_TOKEN=your_databricks_token_here
DATABRICKS_INSTANCE=https://your-databricks-instance.cloud.databricks.com
NOTEBOOK_PATH=/path/to/notebooks
```

2. Start the server:

```bash
node index.js
```

The server will listen on http://localhost:3001

## Testing with curl

Use the following curl command to test the `/run-status/:runId` API:

```bash
curl -X GET http://localhost:3001/run-status/<runId>
```

Replace `<runId>` with a valid run ID.

Example:

```bash
curl -X GET http://localhost:3001/run-status/12345
```

## Testing with Postman

1. Open Postman.
2. Create a new GET request.
3. Set the URL to `http://localhost:3001/run-status/<runId>`.
4. Replace `<runId>` with a valid run ID.
5. Send the request and observe the response.

## Automated Testing with Jest and Supertest

You can write an automated test for the `/run-status/:runId` API using Jest and Supertest.

1. Install dependencies:

```bash
npm install --save-dev jest supertest
```

2. Create a test file `index.test.js` with the following content:

```javascript
const request = require('supertest');
const express = require('express');
const app = require('./index'); // Adjust if your app export is different

describe('GET /run-status/:runId', () => {
  it('should return run status for a valid runId', async () => {
    const runId = '12345'; // Use a valid runId for testing
    const response = await request(app).get(`/run-status/${runId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('runStatus');
  });
});
```

3. Modify `index.js` to export the app for testing:

At the end of `index.js`, add:

```javascript
module.exports = app;
```

4. Run the test:

```bash
npx jest
```

---

This should help you test the `/run-status/:runId` API effectively.
