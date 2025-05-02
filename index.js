const express = require("express");
const axios = require("axios");
const cors = require('cors');

require("dotenv").config();

const app = express();
app.use(cors());
const PORT = 3001;

app.use(express.json());

async function listNotebooks(folderPath) {
    try {
        const response = await axios.get(
            `${process.env.DATABRICKS_INSTANCE}/api/2.0/workspace/list`,
            {
                params: {
                    path: folderPath,
                },
                headers: {
                    Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}`,
                },
            }
        );

        // console.log("Databricks API response:", response.data);

        if (!response.data || !Array.isArray(response.data.objects)) {
            throw new Error("No objects found in the response or invalid response format.");
        }

        const notebooks = response.data.objects.filter((object) => object.object_type === "NOTEBOOK");

        console.log(`Found ${notebooks.length} notebooks:`);
        notebooks.forEach((notebook) => {
            console.log(`- ${notebook.path} (Type: ${notebook.object_type})`);
        });

        return notebooks;

    } catch (error) {
        console.error("Error listing notebooks:", error.response?.data || error.message);
        throw new Error("Failed to list notebooks.");
    }
}

  
app.post("/run-notebook", async (req, res) => {
  try {
    const { fileName, source } = req.body;
    const databricksToken = process.env.DATABRICKS_TOKEN;
    const databricksInstance = process.env.DATABRICKS_INSTANCE;
    const notebookFolderPath = process.env.NOTEBOOK_PATH;

    if (!source || !databricksToken || !databricksInstance || !notebookFolderPath) {
      return res.status(400).json({ error: "Missing required parameters or environment variables" });
    }

    // List notebooks in the folder
    const notebooks = await listNotebooks(notebookFolderPath);

    // Find notebook matching the source string in its path
    const matchingNotebook = notebooks.find(nb => nb.path.toLowerCase().includes(source.toLowerCase()));

    if (!matchingNotebook) {
      return res.status(400).json({ error: `No notebook found matching source: ${source}` });
    }

    const response = await axios.post(
      `${databricksInstance}/api/2.1/jobs/runs/submit`,
      {
        run_name: "Triggered from MDC App",
        existing_cluster_id: process.env.DATABRICKS_CLUSTER_ID,
        notebook_task: {
          notebook_path: matchingNotebook.path,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${databricksToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      message: `Notebook execution triggered successfully.`,
      run_id: response.data.run_id,
      notebook_name: matchingNotebook.path,
      notebooks,
    });
  } catch (error) {
    console.error("Error triggering notebook:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to trigger notebook" });
  }
});

app.get("/list-notebooks", async (req, res) => {
  try {
    const notebookPath = process.env.NOTEBOOK_PATH;
    const notebooks = await listNotebooks(notebookPath);

    res.json({
      message: `Notebooks in folder ${notebookPath}:`,
      notebooks: notebooks,
    });
  } catch (error) {
    console.error("Error listing notebooks:", error.message);
    res.status(500).json({ error: "Failed to list notebooks" });
  }
});

app.get("/run-status/:runId", async (req, res) => {
  try {
    const runId = req.params.runId;
    const databricksToken = process.env.DATABRICKS_TOKEN;
    const databricksInstance = process.env.DATABRICKS_INSTANCE;
    console.log(runId);

    if (!runId || !databricksToken || !databricksInstance) {
      return res.status(500).json({ error: "Missing required parameters or environment variables" });
    }

    const response = await axios.get(
      `${databricksInstance}/api/2.1/jobs/runs/get`,
      {
        params: {
          run_id: runId,
        },
        headers: {
          Authorization: `Bearer ${databricksToken}`,
        },
      }
    );


    const progressMap = {
      PENDING: 10,
      QUEUED: 20,
      RUNNING: 60,
      TERMINATING: 90,
      TERMINATED: 100,
    };
    const lifeCycle = response.data.state.life_cycle_state;
    const result_state = response.data.state.result_state || 'N/A';
    const state_message = response.data.state.state_message || '';

    res.json({
      message: `Status for run_id ${runId}:`,
      runStatus: response.data.state,
      status: lifeCycle === 'TERMINATED' ? 'completed'
            : lifeCycle === 'INTERNAL_ERROR' ? 'error'
            : lifeCycle.toLowerCase(),
      message: state_message,
      result: result_state,
      progress: progressMap[lifeCycle] || 0,
    });
  } catch (error) {
    console.error("Error fetching run status:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch run status" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
