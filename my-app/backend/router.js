const authRoutes = require("./routes/auth.routes");

const router = (req, res) => {
  if (req.url.startsWith("/auth")) {
    return authRoutes(req, res);
  }

  res.writeHead(404);
  res.end(JSON.stringify({ message: "Route not found" }));
};

module.exports = router;