import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DATA_FILE = path.resolve(process.cwd(), "movies.json");
const REQUESTS_FILE = path.resolve(process.cwd(), "requests.json");

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}
if (!fs.existsSync(REQUESTS_FILE)) {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify([]));
}

const getMovies = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const saveMovies = (movies: any[]) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(movies, null, 2));
};

const getRequests = () => {
  try {
    const data = fs.readFileSync(REQUESTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const saveRequests = (requests: any[]) => {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
};

// Check admin passcode
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "admin123";

const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const passcode = req.headers["x-admin-passcode"];
  if (passcode === ADMIN_PASSCODE) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// API Routes
app.get("/api/movies", (req, res) => {
  res.json(getMovies());
});

app.post("/api/movies", authenticate, (req, res) => {
  const { title, description, imageUrl, downloadUrl } = req.body;
  
  if (!title || !downloadUrl) {
    return res.status(400).json({ error: "Title and download link are required." });
  }

  const movies = getMovies();
  const newMovie = {
    id: Date.now().toString(),
    title,
    description,
    imageUrl,
    downloadUrl,
    createdAt: new Date().toISOString()
  };
  
  movies.push(newMovie);
  saveMovies(movies);
  
  res.status(201).json(newMovie);
});

app.delete("/api/movies/:id", authenticate, (req, res) => {
  const { id } = req.params;
  console.log("Delete request received for id:", id);
  const movies = getMovies();
  const filteredMovies = movies.filter((m: any) => String(m.id) !== String(id));
  
  if (movies.length === filteredMovies.length) {
    console.log("Movie not found for id:", id);
    return res.status(404).json({ error: "Movie not found" });
  }
  
  saveMovies(filteredMovies);
  console.log("Movie deleted successfully:", id);
  res.json({ success: true });
});

app.get("/api/requests", (req, res) => {
  res.json(getRequests());
});

app.post("/api/requests", (req, res) => {
  const { title } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: "Movie title is required." });
  }

  const requests = getRequests();
  const newRequest = {
    id: Date.now().toString(),
    title,
    createdAt: new Date().toISOString()
  };
  
  requests.push(newRequest);
  saveRequests(requests);
  
  res.status(201).json(newRequest);
});

app.delete("/api/requests/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const requests = getRequests();
  const filteredRequests = requests.filter((r: any) => String(r.id) !== String(id));
  
  if (requests.length === filteredRequests.length) {
    return res.status(404).json({ error: "Request not found" });
  }
  
  saveRequests(filteredRequests);
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
