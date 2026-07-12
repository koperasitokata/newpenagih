import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

function rewriteUrls(text: string): string {
  if (!text) return text;
  return text
    // 1. Rewrite any absolute or local reference to GET_PHOTO to our node secure proxy /api/photo
    .replace(/https?:\/\/api\.tokata\.site(:8000)?\/(api-login|api-admin)\.php\?action=GET_PHOTO/gi, '/api/photo?action=GET_PHOTO')
    .replace(/(api-login|api-admin)\.php\?action=GET_PHOTO/gi, '/api/photo?action=GET_PHOTO')
    // 2. Rewrite remaining api-login URLs to our /api-login route
    .replace(/https?:\/\/api\.tokata\.site(:8000)?\/api-login\.php/g, '/api-login')
    .replace(/api-login\.php/g, '/api-login');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support parsing JSON and urlencoded payloads up to 10MB (for profile and evidence photos)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Pure Caching & CORS-Safe Image Proxy for SQL Database Images (Secure Stream Tunnel)
  app.get("/api/photo", async (req, res) => {
    const queryIndex = req.originalUrl.indexOf("?");
    const queryString = queryIndex !== -1 ? req.originalUrl.substring(queryIndex) : "";

    const targets = [
      "https://backend.tokata.site/v1/admin" + queryString,
      "https://backend.tokata.site/v1/login" + queryString,
      "https://backend.tokata.site/v1/login" + queryString,
      "ttps://backend.tokata.site/v1/admin" + queryString,
    ];

    console.log(`[Photo Proxy] Incoming request for secure photo. Query: ${queryString}`);

    const fetchOptions: RequestInit = {
      method: "GET",
      redirect: "follow",
    };

    for (const targetUrl of targets) {
      try {
        console.log(`[Photo Proxy] Trying fetch from: ${targetUrl}`);
        const response = await fetch(targetUrl, fetchOptions);
        const contentType = response.headers.get("content-type") || "";

        if (response.ok && contentType.toLowerCase().includes("image/")) {
          console.log(`[Photo Proxy] Successfully received image from: ${targetUrl}. Serving with 24h browser cache.`);
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
          const len = response.headers.get("content-length");
          if (len) res.setHeader("Content-Length", len);

          const arrayBuf = await response.arrayBuffer();
          return res.send(Buffer.from(arrayBuf));
        } else {
          console.warn(`[Photo Proxy] Target failed or returned non-image (status ${response.status}, contentType ${contentType})`);
        }
      } catch (err: any) {
        console.warn(`[Photo Proxy] Error fetching from ${targetUrl}: ${err.message}`);
      }
    }

    console.error(`[Photo Proxy] All target endpoints failed to serve the image.`);
    return res.status(404).json({ success: false, message: "Foto tidak ditemukan." });
  });

  // API Proxy - forwards client actions to http://api.tokata.site/api-login.php with smart port 8000 fallback
  app.all("/api-login", express.text({ type: '*/*', limit: '10mb' }), async (req, res) => {
    const queryIndex = req.originalUrl.indexOf('?');
    const queryString = queryIndex !== -1 ? req.originalUrl.substring(queryIndex) : '';

    const primaryUrl = "https://backend.tokata.site/v1/login" + queryString;
    const fallbackUrl = "https://backend.tokata.site/v1/login" + queryString;
    
    const method = req.method;
    const fetchOptions: RequestInit = {
      method: method,
      redirect: 'follow',
    };

    if (method === 'POST') {
      fetchOptions.headers = {
        'Content-Type': 'application/json; charset=utf-8',
      };
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    try {
      console.log(`[Proxy] Forwarding ${method} request to primary PHP server: ${primaryUrl}`);
      const response = await fetch(primaryUrl, fetchOptions);
      const contentType = response.headers.get('content-type') || '';

      // If it's a binary photo request and succeeded as an image
      if (contentType.toLowerCase().includes('image/')) {
        console.log(`[Proxy] Serving binary image directly from primary URL.`);
        res.setHeader('Content-Type', contentType);
        const len = response.headers.get('content-length');
        if (len) res.setHeader('Content-Length', len);
        const cc = response.headers.get('cache-control');
        if (cc) res.setHeader('Cache-Control', cc);
        
        const arrayBuf = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuf));
      }

      const text = await response.text();

      try {
        // Try parsing the primary response as JSON
        const data = JSON.parse(text);
        console.log(`[Proxy] Primary URL succeeded and returned JSON. Status: ${response.status}`);
        
        const rewrittenText = rewriteUrls(text);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.send(rewrittenText);
      } catch (jsonErr) {
        // Primary URL returned non-JSON (e.g. 404 page, Cloudflare block, etc.)
        console.warn(`[Proxy] Primary URL responded with non-JSON. Details: status ${response.status}, contentType: ${contentType}. Attempting fallback to ${fallbackUrl}...`);
        
        const fallbackResponse = await fetch(fallbackUrl, fetchOptions);
        const fbContentType = fallbackResponse.headers.get('content-type') || '';

        if (fbContentType.toLowerCase().includes('image/')) {
          console.log(`[Proxy] Serving binary image directly from fallback URL.`);
          res.setHeader('Content-Type', fbContentType);
          const len = fallbackResponse.headers.get('content-length');
          if (len) res.setHeader('Content-Length', len);
          const cc = fallbackResponse.headers.get('cache-control');
          if (cc) res.setHeader('Cache-Control', cc);
          
          const arrayBuf = await fallbackResponse.arrayBuffer();
          return res.send(Buffer.from(arrayBuf));
        }

        const fallbackText = await fallbackResponse.text();
        
        try {
          const fallbackData = JSON.parse(fallbackText);
          console.log(`[Proxy] Fallback URL succeeded with status ${fallbackResponse.status}`);
          
          const rewrittenText = rewriteUrls(fallbackText);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.send(rewrittenText);
        } catch {
          console.error(`[Proxy] Both primary and fallback failed to return JSON. Fallback response contentType: ${fbContentType}`);
          res.setHeader('Content-Type', fbContentType || 'text/html');
          return res.send(fallbackText);
        }
      }
    } catch (primaryErr: any) {
      console.warn(`[Proxy] Connection to primary URL failed: ${primaryErr.message || primaryErr}. Attempting fallback to ${fallbackUrl}...`);
      
      try {
        const fallbackResponse = await fetch(fallbackUrl, fetchOptions);
        const fbContentType = fallbackResponse.headers.get('content-type') || '';

        if (fbContentType.toLowerCase().includes('image/')) {
          console.log(`[Proxy] Serving binary image directly from fallback URL after primary failed.`);
          res.setHeader('Content-Type', fbContentType);
          const len = fallbackResponse.headers.get('content-length');
          if (len) res.setHeader('Content-Length', len);
          const cc = fallbackResponse.headers.get('cache-control');
          if (cc) res.setHeader('Cache-Control', cc);
          
          const arrayBuf = await fallbackResponse.arrayBuffer();
          return res.send(Buffer.from(arrayBuf));
        }

        const fallbackText = await fallbackResponse.text();
        
        try {
          const fallbackData = JSON.parse(fallbackText);
          console.log(`[Proxy] Fallback URL succeeded after connection fail with status ${fallbackResponse.status}`);
          
          const rewrittenText = rewriteUrls(fallbackText);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.send(rewrittenText);
        } catch {
          res.setHeader('Content-Type', fbContentType || 'text/html');
          return res.send(fallbackText);
        }
      } catch (fallbackErr: any) {
        console.error("[Proxy Error] Both primary and fallback endpoints unreachable:", fallbackErr);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(500).json({ 
          success: false, 
          message: `Gagal menghubungkan ke server API Anda (${fallbackErr.message || fallbackErr}).`
        });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
