import { spawn } from "child_process";

if (process.env.RUN_NEXT === "true") {
  const env = {
    ...process.env,
    DATABASE_URL: process.env.NEXT_DATABASE_URL || process.env.DATABASE_URL,
    PORT: "5000",
  };
  console.log("Starting Next.js app from next-reference/...");
  const next = spawn("npx", ["next", "dev", "--port", "5000", "--hostname", "0.0.0.0"], {
    cwd: "/home/runner/workspace/next-reference",
    env,
    stdio: "inherit",
  });
  next.on("exit", (code) => process.exit(code || 0));
} else {
  startExpress();
}

async function startExpress() {
  const express = (await import("express")).default;
  const { registerRoutes } = await import("./routes");
  const { serveStatic } = await import("./static");
  const { createServer } = await import("http");
  const { seedDatabase } = await import("./seed");

  const app = express();
  const httpServer = createServer(app);

  app.use(
    express.json({
      verify: (req: any, _res: any, buf: any) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  function log(message: string, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
  }

  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson: any, ...args: any[]) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        log(logLine);
      }
    });

    next();
  });

  try {
    await seedDatabase();
  } catch (error) {
    console.error("Error seeding database:", error);
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: any, res: any, next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
