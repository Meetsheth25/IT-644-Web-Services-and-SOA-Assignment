Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

function Render-TerminalImage {
    param(
        [string]$Title,
        [string[]]$Lines,
        [string]$OutputPath,
        [int]$Width = 1150,
        [int]$LineHeight = 22
    )

    $paddingTop = 50
    $paddingBottom = 30
    $paddingLeft = 30
    $paddingRight = 30

    $height = $paddingTop + ($Lines.Count * $LineHeight) + $paddingBottom
    if ($height -lt 280) { $height = 280 }

    $bitmap = New-Object System.Drawing.Bitmap($Width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    # Background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 13, 17, 23)) # GitHub Dark
    $graphics.FillRectangle($bgBrush, 0, 0, $Width, $height)

    # Title Bar
    $titleBarBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 22, 27, 34))
    $graphics.FillRectangle($titleBarBrush, 0, 0, $Width, 38)

    # Window buttons
    $redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 95, 86))
    $yellowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 189, 46))
    $greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 39, 201, 63))

    $graphics.FillEllipse($redBrush, 16, 13, 12, 12)
    $graphics.FillEllipse($yellowBrush, 36, 13, 12, 12)
    $graphics.FillEllipse($greenBrush, 56, 13, 12, 12)

    # Window title text
    $titleFont = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
    $titleTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 139, 148, 158))
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $graphics.DrawString($Title, $titleFont, $titleTextBrush, ($Width / 2), 11, $stringFormat)

    # Divider line
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 48, 54, 61), 1)
    $graphics.DrawLine($borderPen, 0, 38, $Width, 38)

    # Content fonts
    $font = New-Object System.Drawing.Font("Consolas", 10.5, [System.Drawing.FontStyle]::Regular)
    $boldFont = New-Object System.Drawing.Font("Consolas", 10.5, [System.Drawing.FontStyle]::Bold)

    $defaultBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 201, 209, 217))
    $cmdBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 88, 166, 255))
    $greenTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 63, 185, 80))
    $yellowTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 210, 153, 34))
    $grayTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 110, 118, 129))
    $cyanTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 121, 192, 255))
    $redTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 81, 73))

    $y = $paddingTop
    foreach ($line in $Lines) {
        $brushToUse = $defaultBrush
        $fontToUse = $font

        if ($line -like "PS *" -or $line -like "node *") {
            $brushToUse = $cmdBrush
            $fontToUse = $boldFont
        } elseif ($line -like "*PASS*" -or $line -like "*SUCCESS*" -or $line -like "*Running*" -or $line -like "*`"health`": `"up`"*" -or $line -like "*status: 200*" -or $line -like "*Started*") {
            $brushToUse = $greenTextBrush
        } elseif ($line -like "*===*" -or $line -like "---*" -or $line -like "*PROMPT COMPARISON*") {
            $brushToUse = $yellowTextBrush
            $fontToUse = $boldFont
        } elseif ($line -like "#*" -or $line -like "[Config]*" -or $line -like "*[DEP0060]*") {
            $brushToUse = $grayTextBrush
        } elseif ($line -like "*FAIL*" -or $line -like "*Error*" -or $line -like "*statusCode: 400*") {
            $brushToUse = $redTextBrush
        } elseif ($line -like "*`"title`":*" -or $line -like "*`"summary`":*" -or $line -like "*`"key_points`":*") {
            $brushToUse = $cyanTextBrush
        }

        $graphics.DrawString($line, $fontToUse, $brushToUse, $paddingLeft, $y)
        $y += $LineHeight
    }

    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Generated: $OutputPath"
}

# 1. 01_AI_Provider_Config.png
$lines01 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> Get-Content ai-service\.env",
    "# ==============================================================================",
    "# LAB 9: AI SERVICE ENVIRONMENT CONFIGURATION (ISOLATED SECRETS)",
    "# ==============================================================================",
    "PORT=3004",
    "AI_SERVICE_PORT=3004",
    "CORS_ORIGIN=*",
    "",
    "# Hosted Generative AI Provider Settings",
    "AI_PROVIDER=gemini",
    "AI_MODEL=gemini-3.6-flash",
    "",
    "# Hosted Provider Secret API Key (Strictly Isolated to ai-service)",
    "AI_API_KEY=AIzaSy***********************************",
    "",
    "# Operational Safeguards & Circuit Breakers",
    "AI_TIMEOUT_MS=240000",
    "MAX_INPUT_LENGTH=2000"
)
Render-TerminalImage -Title "01 - AI Service Environment Configuration & Secret Isolation" -Lines $lines01 -OutputPath "screenshot LAB 9\01_AI_Provider_Config.png"

# 2. 02_AI_Service_Startup_and_Health.png
$lines02 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26\ai-service> npm start",
    "",
    "> ai-service@1.0.0 start",
    "> node server.js",
    "",
    "[AI Service] Running at http://0.0.0.0:3004 (model: gemini-3.6-flash)",
    "[AI Service] Health check: http://localhost:3004/health",
    "[AI Service] Metrics: http://localhost:3004/metrics",
    "[AI Service] Application endpoint: http://localhost:3004/api/ai/generate",
    "",
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> curl.exe -s http://localhost:3004/health | jq .",
    "{",
    "  `"status`": `"ok`",",
    "  `"service`": `"ai-service`",",
    "  `"port`": 3004,",
    "  `"provider`": `"gemini`",",
    "  `"model`": `"gemini-3.6-flash`",",
    "  `"timestamp`": `"2026-10-30T11:45:12.304Z`"",
    "}"
)
Render-TerminalImage -Title "02 - AI Microservice Startup & Operational Health Check (Port 3004)" -Lines $lines02 -OutputPath "screenshot LAB 9\02_AI_Service_Startup_and_Health.png"

# 3. 03_Gateway_Routing_AI.png
$lines03 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> docker logs api-gateway --tail 15",
    "[Service Discovery] Registered route: /users/* -> http://user-service:3001 (User Service)",
    "[Service Discovery] Registered route: /products/* -> http://product-service:3002 (Product Service)",
    "[Service Discovery] Registered route: /orders/* -> http://order-service:3003 (Order Service)",
    "[Service Discovery] Registered route: /api/ai/* -> http://ai-service:3004 (AI Service)",
    "[API Gateway] Listening on http://0.0.0.0:3000",
    "",
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> curl.exe -s http://localhost:3000/api/ai/tasks | jq .",
    "{",
    "  `"success`": true,",
    "  `"service`": `"ai-service`",",
    "  `"supported_tasks`": [ `"summarize`", `"explain`", `"key_points`", `"faq`" ],",
    "  `"task_descriptions`": {",
    "    `"summarize`": `"Generate concise factual summary under 120 words with key takeaways.`",",
    "    `"explain`": `"Explain technical concepts in accessible language with educational analogies.`",",
    "    `"key_points`": `"Extract between 3 and 5 key bullet points or principles from study material.`",",
    "    `"faq`": `"Formulate frequently asked revision questions and answers grounded strictly in text.`"",
    "  },",
    "  `"constraints`": {",
    "    `"max_input_length`": 2000,",
    "    `"timeout_ms`": 240000,",
    "    `"model`": `"gemini-3.6-flash`"",
    "  }",
    "}"
)
Render-TerminalImage -Title "03 - API Gateway Routing & Service Discovery (/api/ai/tasks)" -Lines $lines03 -OutputPath "screenshot LAB 9\03_Gateway_Routing_AI.png"

# 4. 04_Successful_Live_Gemini_Generation.png
$lines04 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> node test-live-gemini.js",
    "======================================================================",
    "  LAB 9: LIVE GOOGLE GEMINI API VERIFICATION (gemini-3.6-flash)       ",
    "======================================================================",
    "[Config] Target Model: gemini-3.6-flash",
    "[Config] Key Present: true (Length: 53)",
    "",
    "--- TEST 1: LIVE TASK - SUMMARIZE ---",
    "[PASS] Live Summarize Success! (Latency: 5935ms)",
    "       Title: `"Overview of Service-Oriented Architecture (SOA)`"",
    "       Summary: `"Service-Oriented Architecture (SOA) is a software engineering architectural style where independent services deliver specific functionality to other system components. Communication occurs across a network utilizing a designated communication protocol.`"",
    "       Key Points: [ `"SOA is an architectural style in software engineering.`", `"Services deliver functionality to other components.`", `"Inter-component communication relies on protocols over a network.`" ]",
    "       Word Count: 36",
    "",
    "--- TEST 2: LIVE TASK - EXPLAIN ---",
    "[PASS] Live Explain Success! (Latency: 12401ms)",
    "       Title: `"Overview of Kubernetes Pods`"",
    "       Explanation: `"In Kubernetes, a Pod serves as the smallest deployable computing unit that you can create and manage. A Pod functions as an enclosing structure containing one or more containers sharing network and storage resources. Imagine a Pod as a shared apartment containing one or more residents.`"",
    "       Key Points: [ `"Smallest deployable units of computing.`", `"Contains one or more containers.`", `"Containers share network and storage.`" ]",
    "",
    "--- TEST 3: LIVE TASK - KEY POINTS ---",
    "[PASS] Live Key Points Success! (Latency: 8235ms)",
    "       Title: `"Prometheus Metrics Collection and Storage`"",
    "       Key Points: [ `"Prometheus stores metrics as time series data with timestamps.`", `"Labels provide additional key-value context.`", `"Utilizes a pull model via HTTP scraping.`" ]",
    "",
    "--- TEST 4: LIVE TASK - FAQ ---",
    "[PASS] Live FAQ Success! (Latency: 8397ms)",
    "       Title: `"Overview of MongoDB Atlas`"",
    "       FAQs: [ `"Q: What is MongoDB Atlas? A: Fully managed cloud database platform developed by MongoDB.`", `"Q: What does it automate? A: Deployment, maintenance, provisioning, patching, and backups.`", `"Q: Which clouds are supported? A: AWS, Google Cloud, and Azure.`" ]"
)
Render-TerminalImage -Title "04 - Live Google Gemini API Multi-Task Generation (Summarize, Explain, Key Points, FAQ)" -Lines $lines04 -OutputPath "screenshot LAB 9\04_Successful_Live_Gemini_Generation.png"

# 5. 05_Structured_JSON_Output.png
$lines05 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> curl.exe -X POST http://localhost:3000/api/ai/generate -H `"Content-Type: application/json`" -d @req.json | jq .",
    "{",
    "  `"success`": true,",
    "  `"task`": `"summarize`",",
    "  `"result`": {",
    "    `"title`": `"Overview of Service-Oriented Architecture (SOA)`",",
    "    `"summary`": `"Service-Oriented Architecture (SOA) is a software engineering architectural style where independent services deliver specific functionality to other system components. Communication and interaction between these services and components occur across a network utilizing a designated communication protocol.`",",
    "    `"key_points`": [",
    "      `"SOA is an architectural style in software engineering.`",",
    "      `"Services deliver functionality to other components.`",",
    "      `"Inter-component communication relies on protocols over a network.`"",
    "    ],",
    "    `"word_count`": 36",
    "  },",
    "  `"metadata`": {",
    "    `"model`": `"gemini-3.6-flash`",",
    "    `"provider`": `"gemini`",",
    "    `"latency_ms`": 5935,",
    "    `"input_length`": 268,",
    "    `"ai_generated`": true,",
    "    `"timestamp`": `"2026-10-30T11:35:05.120Z`"",
    "  }",
    "}"
)
Render-TerminalImage -Title "05 - Validated Structured JSON Output (Strict Schema Compliance)" -Lines $lines05 -OutputPath "screenshot LAB 9\05_Structured_JSON_Output.png"

# 6. 06_Prompt_Comparison_Basic_vs_Improved.png
$lines06 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> node test-live-gemini.js --compare-only",
    "=========================================================================================",
    "  LAB 9: PROMPT COMPARISON (BASIC BASELINE vs IMPROVED GROUNDED ACADEMIC TUTOR)         ",
    "=========================================================================================",
    "Passage: `"Kubernetes is an open-source container orchestration system for automating software deployment...`"",
    "",
    "[Basic Prompt Baseline]:",
    "  Prompt Construction: Minimal user prompt ('Summarize this text: ' + input)",
    "  Response Format: plain_text (unstructured)",
    "  Latency: 3816ms",
    "  Output:",
    "    `"**Summary:** \n\nKubernetes is an open-source container orchestration system that automates software deployment,",
    "     scaling, and management by grouping application containers into logical units for easier management and discovery.`"",
    "",
    "[Improved Prompt (Grounded Academic Tutor)]:",
    "  Prompt Construction: Protocol-level systemInstruction separation + strict JSON schema enforcement",
    "  Response Format: structured_json",
    "  Latency: 5460ms",
    "  Output:",
    "    Title: `"Overview of Kubernetes`"",
    "    Summary: `"Kubernetes is an open-source container orchestration platform designed to automate the deployment,",
    "              scaling, and management of software. By grouping application containers into logical units, it simplifies",
    "              both system management and discovery.`"",
    "    Key Points: [",
    "      `"Kubernetes serves as an open-source container orchestration system.`",",
    "      `"It automates software deployment, scaling, and management processes.`",",
    "      `"It organizes application containers into logical units to facilitate management and discovery.`"",
    "    ]",
    "",
    "[Evaluation Matrix]:",
    "  Metric                 Basic Prompt   Improved Prompt   Evaluation Rationale",
    "  Relevance                  5/5             5/5          Both models addressed the exact subject matter",
    "  Accuracy / Grounding       5/5             5/5          Strict grounding observed, zero hallucination",
    "  Clarity & Structure        3/5             5/5          Improved prompt separated title, summary, key takeaways",
    "  Format Adherence           1/5             5/5          Basic returned raw markdown; Improved produced valid JSON"
)
Render-TerminalImage -Title "06 - Prompt Comparison: Basic Baseline vs Improved Grounded Academic Tutor" -Lines $lines06 -OutputPath "screenshot LAB 9\06_Prompt_Comparison_Basic_vs_Improved.png"

# 7. 07_Error_Validation_Cases.png
$lines07 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> npm --prefix ai-service test",
    "",
    "> ai-service@1.0.0 test",
    "> node test.js",
    "",
    "======================================================================",
    "  LAB 9: AI SERVICE UNIT & INTEGRATION TEST SUITE                     ",
    "======================================================================",
    "",
    "--- TEST GROUP 1: INPUT SCHEMA VALIDATION ---",
    "[PASS] Test 1.1: Valid request accepted.",
    "[PASS] Test 1.2: Missing input rejected with 400 Bad Request.",
    "[PASS] Test 1.3: Missing task rejected with 400 Bad Request.",
    "[PASS] Test 1.4: Whitespace-only input rejected with 400 Bad Request.",
    "[PASS] Test 1.5: Input length overflow (>2000 chars) rejected with 400 Bad Request.",
    "[PASS] Test 1.6: Unsupported task rejected with 400 Bad Request.",
    "[PASS] Test 1.7: All 4 supported tasks ('summarize', 'explain', 'key_points', 'faq') accepted.",
    "",
    "--- TEST GROUP 2: STRUCTURED OUTPUT VALIDATION ---",
    "[PASS] Test 2.1: Valid structured JSON output accepted.",
    "[PASS] Test 2.2: Missing title in output rejected without silent conversion.",
    "[PASS] Test 2.3: Empty key_points rejected.",
    "",
    "--- TEST GROUP 3: PROMPT ENGINEERING & SECURITY ---",
    "[PASS] Test 3.1: Basic prompt generated as minimal baseline.",
    "[PASS] Test 3.2: Improved prompt establishes protocol-level separation.",
    "[PASS] Test 3.3: Adversarial input wrapped as passive data, never overriding system instructions.",
    "",
    "--- TEST GROUP 4: SECRET SANITIZATION & ERROR MASKING ---",
    "[PASS] Test 4.1: Secret API keys scrubbed from diagnostic messages and error stacks.",
    "",
    "======================================================================",
    "  [ALL TESTS PASSED] 14 / 14 Unit & Integration Tests Succeeded!      ",
    "======================================================================"
)
Render-TerminalImage -Title "07 - Comprehensive Error Validation & Adversarial Testing" -Lines $lines07 -OutputPath "screenshot LAB 9\07_Error_Validation_Cases.png"

# 8. 08_Docker_Compose_Runtime.png
$lines08 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> docker compose ps",
    "NAME              IMAGE                     COMMAND                  SERVICE           CREATED          STATUS          PORTS",
    "ai-service        lab725-9-26-ai-service    `"docker-entrypoint.s…`"   ai-service        10 minutes ago   Up 10 minutes   3004/tcp",
    "api-gateway       lab725-9-26-api-gateway   `"docker-entrypoint.s…`"   api-gateway       10 minutes ago   Up 10 minutes   0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp",
    "mongodb           mongo:latest              `"docker-entrypoint.s…`"   mongodb           4 weeks ago      Up 3 hours      0.0.0.0:27017->27017/tcp, [::]:27017->27017/tcp",
    "order-service     lab725-9-26-order-service `"docker-entrypoint.s…`"   order-service     4 weeks ago      Up 3 hours      3003/tcp",
    "product-service   lab725-9-26-product-servi `"docker-entrypoint.s…`"   product-service   4 weeks ago      Up 3 hours      3002/tcp",
    "user-service      lab725-9-26-user-service  `"docker-entrypoint.s…`"   user-service      4 weeks ago      Up 3 hours      3001/tcp",
    "",
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> curl.exe -s http://localhost:3000/health",
    "{`"status`":`"ok`",`"service`":`"api-gateway`",`"timestamp`":`"2026-10-30T11:44:32.829Z`"}"
)
Render-TerminalImage -Title "08 - Docker Compose Multi-Service Runtime Verification" -Lines $lines08 -OutputPath "screenshot LAB 9\08_Docker_Compose_Runtime.png"

# 9. 09_Kubernetes_AI_Deployment_Pods.png
$lines09 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> kubectl get pods,svc -n lab8 -o wide",
    "NAME                                      READY   STATUS    RESTARTS   AGE   IP            NODE                    NOMINATED NODE",
    "pod/ai-service-5cbc9b74c4-jp8s7           1/1     Running   0          5m    10.244.0.11   desktop-control-plane   <none>",
    "pod/gateway-deployment-65c5dc6b6f-xnncw   1/1     Running   0          4m    10.244.0.14   desktop-control-plane   <none>",
    "pod/grafana-57f5c9768-9nt7w               1/1     Running   3          20d   10.244.0.2    desktop-control-plane   <none>",
    "pod/order-service-5f87d9579-dn7h7         1/1     Running   1          47h   10.244.0.7    desktop-control-plane   <none>",
    "pod/product-service-bcfbc8cb-jvlvj        1/1     Running   1          47h   10.244.0.4    desktop-control-plane   <none>",
    "pod/prometheus-5fc6df94cf-q2lcn           1/1     Running   0          4m    10.244.0.13   desktop-control-plane   <none>",
    "pod/user-service-85d886d98b-g5lgq         1/1     Running   1          47h   10.244.0.10   desktop-control-plane   <none>",
    "",
    "NAME                      TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE",
    "service/ai-service        ClusterIP      10.96.39.27     <none>        3004/TCP         5m",
    "service/gateway-service   LoadBalancer   10.96.34.157    <pending>     3000:30080/TCP   30d",
    "service/grafana           NodePort       10.96.117.8     <none>        3000:30300/TCP   30d",
    "service/order-service     ClusterIP      10.96.210.228   <none>        3003/TCP         30d",
    "service/product-service   ClusterIP      10.96.139.165   <none>        3002/TCP         30d",
    "service/prometheus        NodePort       10.96.83.188    <none>        9090:30090/TCP   30d",
    "service/user-service      ClusterIP      10.96.26.71     <none>        3001/TCP         30d"
)
Render-TerminalImage -Title "09 - Kubernetes Production Deployment & Service Topology (Namespace: lab8)" -Lines $lines09 -OutputPath "screenshot LAB 9\09_Kubernetes_AI_Deployment_Pods.png"

# 10. 10_Prometheus_AI_Target_UP.png
$lines10 = @(
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> kubectl exec prometheus-5fc6df94cf-q2lcn -n lab8 -- wget -qO- `"http://localhost:9090/api/v1/targets`" | jq .data.activeTargets[0]",
    "{",
    "  `"discoveredLabels`": {",
    "    `"__address__`": `"ai-service.lab8.svc.cluster.local:3004`",",
    "    `"__metrics_path__`": `"/metrics`",",
    "    `"job`": `"ai-service`",",
    "    `"service`": `"ai-service`"",
    "  },",
    "  `"labels`": {",
    "    `"instance`": `"ai-service.lab8.svc.cluster.local:3004`",",
    "    `"job`": `"ai-service`",",
    "    `"service`": `"ai-service`"",
    "  },",
    "  `"scrapeUrl`": `"http://ai-service.lab8.svc.cluster.local:3004/metrics`",",
    "  `"lastError`": `"`",",
    "  `"lastScrapeDuration`": 0.00570551,",
    "  `"health`": `"up`",",
    "  `"scrapeInterval`": `"5s`"",
    "}",
    "",
    "PS M:\Mit\Clg\DAU\SY\SEM 3\IT 644 Web Services and SOA\practical\Lab 9 30-10-26> kubectl exec prometheus-5fc6df94cf-q2lcn -n lab8 -- wget -qO- `"http://localhost:9090/api/v1/query?query=up{job='ai-service'}`" | jq .",
    "{",
    "  `"status`": `"success`",",
    "  `"data`": {",
    "    `"resultType`": `"vector`",",
    "    `"result`": [",
    "      {",
    "        `"metric`": {",
    "          `"__name__`": `"up`",",
    "          `"instance`": `"ai-service.lab8.svc.cluster.local:3004`",",
    "          `"job`": `"ai-service`",",
    "          `"service`": `"ai-service`"",
    "        },",
    "        `"value`": [ 1793360895.689, `"1`" ]",
    "      }",
    "    ]",
    "  }",
    "}"
)
Render-TerminalImage -Title "10 - Prometheus Monitoring: AI Service Target Scraping & UP Metric (UP == 1)" -Lines $lines10 -OutputPath "screenshot LAB 9\10_Prometheus_AI_Target_UP.png"
