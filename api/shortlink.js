const { Redis } = require("@upstash/redis");

const redisUrl =
  process.env.DIMZLINK_KV_REST_API_URL ||
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;

const redisToken =
  process.env.DIMZLINK_KV_REST_API_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error("Redis environment variable belum tersedia.");
}

const redis = new Redis({
  url: redisUrl,
  token: redisToken
});

const KEY_PREFIX = "dimzlink:";
const ALIAS_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;

function json(res, status, data) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function randomAlias(length = 7) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let output = "";

  for (let i = 0; i < length; i++) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }

  return output;
}

function getBaseUrl(req) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    forwardedHost ||
    req.headers.host ||
    "";

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    forwardedProto ||
    (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

function redirectPage(destination) {
  const safeDestination = JSON.stringify(destination)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="theme-color" content="#f1f0ed">
<title>DIMZLINK — Continue</title>

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box
}

html,body{
  width:100%;
  min-height:100%;
  overflow:hidden
}

body{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:16px;
  background:#f1f0ed;
  color:#17181c;
  font:13px Arial,Helvetica,sans-serif
}

.box{
  width:min(430px,100%);
  padding:25px 20px;
  border:1px solid rgba(20,22,27,.095);
  border-radius:18px;
  background:#faf9f7;
  box-shadow:0 15px 40px rgba(20,22,27,.08);
  text-align:center
}

.icon{
  width:48px;
  height:48px;
  display:grid;
  place-items:center;
  margin:0 auto 15px;
  border-radius:13px;
  background:rgba(112,103,206,.08);
  color:#7067ce;
  font-size:18px
}

h1{
  font-size:20px;
  letter-spacing:-.5px
}

p{
  margin-top:8px;
  color:#777a82;
  font-size:11px;
  line-height:1.6
}

.count{
  margin-top:19px;
  font-size:35px;
  font-weight:800;
  color:#7067ce
}

.progress{
  width:100%;
  height:5px;
  margin-top:13px;
  overflow:hidden;
  border-radius:20px;
  background:#e5e3df
}

.bar{
  width:0;
  height:100%;
  border-radius:20px;
  background:#7067ce;
  transition:width 1s linear
}

.close{
  width:100%;
  height:43px;
  margin-top:18px;
  border:1px solid rgba(20,22,27,.095);
  border-radius:10px;
  background:#f1f0ed;
  color:#17181c;
  font-size:11px;
  font-weight:700;
  cursor:pointer
}

.note{
  margin-top:11px;
  color:#999ca3;
  font-size:9px
}
</style>
</head>

<body>

<main class="box">

  <div class="icon">
    <span>↗</span>
  </div>

  <h1>Link siap dilanjutkan</h1>

  <p>
    Tunggu sebentar, kamu akan diarahkan ke halaman tujuan.
  </p>

  <div class="count" id="count">5</div>

  <div class="progress">
    <div class="bar" id="bar"></div>
  </div>

  <button class="close" id="close">
    Close
  </button>

  <div class="note">
    DIMZLINK
  </div>

</main>

<script>
const destination = ${safeDestination};

let seconds = 5;

const count = document.getElementById("count");
const bar = document.getElementById("bar");
const closeButton = document.getElementById("close");

let timer = setInterval(() => {
  seconds--;

  count.textContent = seconds;
  bar.style.width = ((5 - seconds) / 5 * 100) + "%";

  if (seconds <= 0) {
    clearInterval(timer);
    window.location.replace(destination);
  }
}, 1000);

closeButton.addEventListener("click", () => {
  clearInterval(timer);
  window.location.href = "/";
});
</script>

</body>
</html>`;
}

async function createShortlink(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, {
      error: "Method tidak diizinkan."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const url = String(body.url || "").trim();
    let alias = String(body.alias || "").trim();
    const expiresAt =
      body.expiresAt === null ||
      body.expiresAt === undefined ||
      body.expiresAt === ""
        ? null
        : Number(body.expiresAt);

    if (!url) {
      return json(res, 400, {
        error: "Destination URL wajib diisi."
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      return json(res, 400, {
        error: "Destination URL tidak valid."
      });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return json(res, 400, {
        error: "URL hanya boleh menggunakan HTTP atau HTTPS."
      });
    }

    if (alias) {
      if (!ALIAS_PATTERN.test(alias)) {
        return json(res, 400, {
          error:
            "Alias harus 4–32 karakter dan hanya boleh huruf, angka, _ atau -."
        });
      }
    } else {
      let found = false;

      for (let i = 0; i < 10; i++) {
        const generated = randomAlias(7);
        const exists = await redis.exists(
          KEY_PREFIX + generated
        );

        if (!exists) {
          alias = generated;
          found = true;
          break;
        }
      }

      if (!found) {
        return json(res, 500, {
          error: "Gagal membuat alias otomatis."
        });
      }
    }

    const key = KEY_PREFIX + alias;

    const existing = await redis.get(key);

    if (existing) {
      return json(res, 409, {
        error: "Alias tersebut sudah digunakan."
      });
    }

    let ttl = null;

    if (expiresAt !== null) {
      if (!Number.isFinite(expiresAt)) {
        return json(res, 400, {
          error: "Waktu expired tidak valid."
        });
      }

      ttl = Math.floor(
        (expiresAt - Date.now()) / 1000
      );

      if (ttl <= 0) {
        return json(res, 400, {
          error: "Tanggal expired harus berada di masa depan."
        });
      }
    }

    const record = {
      url: parsedUrl.toString(),
      createdAt: Date.now(),
      expiresAt:
        expiresAt === null ? null : expiresAt
    };

    if (ttl !== null) {
      await redis.set(key, record, {
        ex: ttl
      });
    } else {
      await redis.set(key, record);
    }

    const baseUrl = getBaseUrl(req);

    return json(res, 201, {
      success: true,
      alias,
      shortUrl: `${baseUrl}/${encodeURIComponent(alias)}`,
      expiresAt:
        expiresAt === null ? null : expiresAt
    });

  } catch (error) {
    console.error("CREATE SHORTLINK ERROR:", error);

    return json(res, 500, {
      error: "Terjadi kesalahan pada server."
    });
  }
}

async function openShortlink(req, res, alias) {
  try {
    if (!alias || !ALIAS_PATTERN.test(alias)) {
      return res.status(404).end("Shortlink tidak ditemukan.");
    }

    const key = KEY_PREFIX + alias;
    const record = await redis.get(key);

    if (!record) {
      res.status(404);
      res.setHeader(
        "Content-Type",
        "text/html; charset=utf-8"
      );

      return res.end(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DIMZLINK — 404</title>
<style>
body{
  margin:0;
  min-height:100vh;
  display:grid;
  place-items:center;
  padding:20px;
  background:#f1f0ed;
  color:#17181c;
  font:13px Arial
}
.box{
  width:min(420px,100%);
  padding:30px 20px;
  border:1px solid rgba(20,22,27,.1);
  border-radius:17px;
  background:#faf9f7;
  text-align:center;
  box-shadow:0 15px 40px rgba(0,0,0,.06)
}
h1{
  font-size:52px;
  margin:0;
  color:#7067ce
}
p{
  color:#777a82;
  line-height:1.7;
  font-size:11px
}
a{
  display:block;
  width:100%;
  padding:11px 0;
  margin-top:18px;
  border-radius:9px;
  background:#7067ce;
  color:#fff;
  text-decoration:none;
  font-weight:700
}
</style>
</head>
<body>
<div class="box">
<h1>404</h1>
<p>
Shortlink tidak ditemukan, sudah expired,
atau belum pernah dibuat.
</p>
<a href="/">Kembali ke halaman utama</a>
</div>
</body>
</html>`);
    }

    if (
      record.expiresAt &&
      Number(record.expiresAt) <= Date.now()
    ) {
      await redis.del(key);

      res.status(410);
      res.setHeader(
        "Content-Type",
        "text/html; charset=utf-8"
      );

      return res.end(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DIMZLINK — Expired</title>
<style>
body{
  margin:0;
  min-height:100vh;
  display:grid;
  place-items:center;
  padding:20px;
  background:#f1f0ed;
  color:#17181c;
  font:13px Arial
}
.box{
  width:min(420px,100%);
  padding:30px 20px;
  border:1px solid rgba(20,22,27,.1);
  border-radius:17px;
  background:#faf9f7;
  text-align:center
}
h1{
  margin:0;
  font-size:27px;
  color:#7067ce
}
p{
  color:#777a82;
  line-height:1.7;
  font-size:11px
}
a{
  display:block;
  margin-top:18px;
  padding:11px;
  border-radius:9px;
  background:#7067ce;
  color:#fff;
  text-decoration:none;
  font-weight:700
}
</style>
</head>
<body>
<div class="box">
<h1>Link Expired</h1>
<p>
Masa aktif shortlink ini sudah berakhir.
</p>
<a href="/">Kembali ke halaman utama</a>
</div>
</body>
</html>`);
    }

    res.status(200);
    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    return res.end(
      redirectPage(record.url)
    );

  } catch (error) {
    console.error("OPEN SHORTLINK ERROR:", error);

    res.status(500);
    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    return res.end(`
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DIMZLINK — Error</title>
</head>
<body>
<p>Terjadi kesalahan pada server.</p>
</body>
</html>
`);
  }
}

module.exports = async function handler(req, res) {
  const alias =
    req.query?.alias ||
    "";

  if (req.method === "POST") {
    return createShortlink(req, res);
  }

  if (req.method === "GET" && alias) {
    return openShortlink(
      req,
      res,
      String(alias)
    );
  }

  return json(res, 405, {
    error: "Method tidak diizinkan."
  });
};