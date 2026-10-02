const { Redis } = require("@upstash/redis");
const crypto = require("crypto");

const redis = new Redis({
  url: process.env.DIMZLINK_KV_REST_API_URL,
  token: process.env.DIMZLINK_KV_REST_API_TOKEN
});

const ALIAS_REGEX=/^[A-Za-z0-9_-]{4,32}$/;

const RESERVED=new Set([
  "api",
  "www",
  "admin",
  "login",
  "logout",
  "shortlink",
  "favicon",
  "robots",
  "sitemap",
  "media",
  "static",
  "assets"
]);

function json(res,status,data){

  res.status(status);

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  return res.end(JSON.stringify(data));
}

function getQuery(req,name){

  const value=req.query?.[name];

  if(Array.isArray(value)){
    return value[0];
  }

  return value;
}

function generateAlias(){

  const chars=
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const bytes=crypto.randomBytes(7);

  let result="";

  for(let i=0;i<7;i++){

    result+=chars[bytes[i]%chars.length];

  }

  return result;
}

function generateDeleteToken(){

  return crypto.randomBytes(24).toString("hex");

}

function normalizeExpiry(value){

  if(!value){
    return null;
  }

  const date=new Date(value);

  if(Number.isNaN(date.getTime())){
    return null;
  }

  return date.getTime();

}

function getBaseUrl(req){

  const proto=
    req.headers["x-forwarded-proto"] ||
    (process.env.VERCEL ? "https" : "http");

  const host=
    req.headers.host ||
    process.env.VERCEL_URL;

  return `${proto}://${host}`;

}

function htmlEscape(value){

  return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}

async function getLink(alias){

  const key=`dimzlink:${alias}`;

  const data=await redis.get(key);

  if(!data){
    return null;
  }

  if(typeof data==="string"){

    try{
      return JSON.parse(data);
    }catch{
      return null;
    }

  }

  return data;

}

function redirectPage(alias){

  const safeAlias=htmlEscape(alias);

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#f5f7fb">
<meta name="robots" content="noindex,nofollow">
<title>DIMZLINK — Please Wait</title>

<style>
*{
  box-sizing:border-box;
  margin:0;
  padding:0;
}

body{
  min-height:100vh;
  background:#f5f7fb;
  color:#18202b;
  font-family:Arial,Helvetica,sans-serif;
  display:flex;
  justify-content:center;
}

.wrap{
  width:min(470px,calc(100% - 28px));
  padding:24px 0 35px;
}

.card{
  background:#fff;
  border:1px solid #e5e9f0;
  border-radius:20px;
  padding:22px;
  box-shadow:0 15px 45px rgba(20,35,60,.08);
}

.brand{
  text-align:center;
  font-size:20px;
  font-weight:800;
}

.brand-sub{
  color:#737b87;
  font-size:11px;
  margin-top:3px;
}

.ad-slot{
  width:100%;
  max-width:728px;
  margin:16px auto;
  overflow:hidden;
  display:block;
}

.ad-slot-inner{
  width:100%;
  min-height:90px;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
}

@media(max-width:600px){
  .ad-slot{
    max-width:100%;
  }

  .ad-slot-inner{
    min-height:90px;
  }
}

.icon{
  width:58px;
  height:58px;
  border-radius:18px;
  background:#eff6ff;
  color:#2563eb;
  display:flex;
  align-items:center;
  justify-content:center;
  margin:4px auto 14px;
  font-size:25px;
}

.title{
  text-align:center;
  font-size:19px;
  font-weight:800;
}

.desc{
  text-align:center;
  color:#737b87;
  font-size:12px;
  margin-top:5px;
}

.timer{
  text-align:center;
  margin:18px 0 13px;
  font-size:14px;
  color:#64748b;
}

.timer strong{
  color:#2563eb;
  font-size:22px;
}

.continue{
  width:100%;
  height:49px;
  border:0;
  border-radius:12px;
  background:#2563eb;
  color:#fff;
  font-weight:750;
  font-size:13px;
  transition:opacity .15s,background .15s;
}

.continue:disabled{
  opacity:.45;
  cursor:not-allowed;
  background:#64748b;
}

.continue:not(:disabled):hover{
  background:#1d4ed8;
}

.status{
  text-align:center;
  color:#737b87;
  font-size:10px;
  margin-top:9px;
}

@media(max-width:500px){

  .wrap{
    padding-top:15px;
  }

  .card{
    padding:17px;
  }

}
</style>
</head>

<body>

<div class="wrap">

  <div class="card">

    <div class="brand">
      DIMZLINK
    </div>

    <div class="brand-sub">
      Simple URL Shortener
    </div>

    <div class="ad-slot">
      <div class="ad-slot-inner">
      <script async="async" data-cfasync="false" src="https://pl31582805.profitableratecpmnetwork.com/fed2058e1962999b60696b4485804a97/invoke.js"></script>
<div id="container-fed2058e1962999b60696b4485804a97"></div>
      </div>
    </div>

    <div class="icon">
      🔗
    </div>

    <div class="title">
      Link sedang disiapkan
    </div>

    <div class="desc">
      Tunggu sampai timer selesai untuk melanjutkan.
    </div>

    <div class="timer">
      Tunggu
      <strong id="count">5</strong>
      detik
    </div>

    <button
      id="continueBtn"
      class="continue"
      type="button"
      disabled
    >
      🔒 Lanjutkan (5)
    </button>

    <div class="status" id="status">
      Tombol akan aktif setelah timer selesai.
    </div>

    <div class="ad-slot">
      <div class="ad-slot-inner">
        <script>
(function(rijscq){
var d = document,
    s = d.createElement('script'),
    l = d.currentScript || d.scripts[d.scripts.length - 1];
s.settings = rijscq || {};
s.src = "\/\/peacefulbicycle.com\/b-X.VpsndaGBll0PY\/WGcG\/re\/ml9xuqZiUvlHk\/PzT\/ci0ROrDNAaziNZDME\/tzNUzcQa4\/M\/D_MV0nNVQV";
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({})
</script>
    </div>
  </div>

  </div>

</div>

<script>
(function(){

  const alias=${JSON.stringify(alias)};

  const count=document.getElementById("count");
  const button=document.getElementById("continueBtn");
  const status=document.getElementById("status");

  let seconds=5;

  function update(){

    count.textContent=seconds;

    if(seconds>0){

      button.disabled=true;
      button.textContent="🔒 Lanjutkan ("+seconds+")";

      return;
    }

    button.disabled=false;
    button.textContent="✓ Lanjutkan";

    status.textContent="Link sudah siap. Silakan lanjutkan.";

  }

  update();

  const timer=setInterval(()=>{

    seconds--;

    update();

    if(seconds<=0){

      clearInterval(timer);

    }

  },1000);

  button.addEventListener("click",()=>{

    if(button.disabled){
      return;
    }

    button.disabled=true;
    button.textContent="Membuka...";

    window.location.href=
      "/api/shortlink?alias="+
      encodeURIComponent(alias)+
      "&go=1";

  });

})();
</script>

<script>(function(s){s.dataset.zone='11925350',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>

</body>
</html>`;

}

module.exports=async function handler(req,res){

  try{

    if(
      !process.env.DIMZLINK_KV_REST_API_URL ||
      !process.env.DIMZLINK_KV_REST_API_TOKEN
    ){

      return json(res,500,{
        error:"Redis belum dikonfigurasi di Vercel."
      });

    }

    if(req.method==="POST"){

      let body=req.body;

      if(typeof body==="string"){

        try{
          body=JSON.parse(body);
        }catch{
          body={};
        }

      }

      body=body||{};

      const url=String(body.url||"").trim();

      let alias=String(body.alias||"").trim();

      const expiresAt=normalizeExpiry(body.expiresAt);

      if(!url){

        return json(res,400,{
          error:"URL tujuan wajib diisi."
        });

      }

      if(url.length>2048){

        return json(res,400,{
          error:"URL terlalu panjang."
        });

      }

      let parsedUrl;

      try{
        parsedUrl=new URL(url);
      }catch{

        return json(res,400,{
          error:"URL tidak valid."
        });

      }

      if(
        parsedUrl.protocol!=="http:" &&
        parsedUrl.protocol!=="https:"
      ){

        return json(res,400,{
          error:"URL harus menggunakan HTTP atau HTTPS."
        });

      }

      if(alias){

        if(!ALIAS_REGEX.test(alias)){

          return json(res,400,{
            error:
              "Alias harus 4-32 karakter dan hanya boleh menggunakan huruf, angka, _ atau -."
          });

        }

        if(RESERVED.has(alias.toLowerCase())){

          return json(res,400,{
            error:"Alias tersebut tidak dapat digunakan."
          });

        }

      }

      if(expiresAt!==null){

        if(expiresAt<=Date.now()){

          return json(res,400,{
            error:"Tanggal expiry harus berada di masa depan."
          });

        }

      }

      let finalAlias=alias;

      const maxTry=8;

      for(let attempt=0;attempt<maxTry;attempt++){

        if(!finalAlias){
          finalAlias=generateAlias();
        }

        const key=`dimzlink:${finalAlias}`;

        const deleteToken=generateDeleteToken();

        const record={
          url,
          alias:finalAlias,
          createdAt:new Date().toISOString(),
          expiresAt:expiresAt
            ? new Date(expiresAt).toISOString()
            : null,
          deleteToken
        };

        const options={
          nx:true
        };

        if(expiresAt!==null){

          const ttl=Math.ceil(
            (expiresAt-Date.now())/1000
          );

          if(ttl<1){

            return json(res,400,{
              error:"Expiry terlalu dekat."
            });

          }

          options.ex=ttl;

        }

        const result=await redis.set(
          key,
          JSON.stringify(record),
          options
        );

        if(result==="OK"){

          const shortUrl=
            `${getBaseUrl(req)}/${finalAlias}`;

          return json(res,201,{
            success:true,
            alias:finalAlias,
            shortUrl,
            expiresAt:record.expiresAt,
            deleteToken
          });

        }

        if(alias){

          return json(res,409,{
            error:"Alias sudah digunakan."
          });

        }

        finalAlias="";

      }

      return json(res,500,{
        error:"Gagal membuat alias. Silakan coba lagi."
      });

    }

    if(req.method==="DELETE"){

      let body=req.body;

      if(typeof body==="string"){

        try{
          body=JSON.parse(body);
        }catch{
          body={};
        }

      }

      body=body||{};

      const alias=String(body.alias||"").trim();
      const deleteToken=String(body.deleteToken||"").trim();

      if(!ALIAS_REGEX.test(alias)){

        return json(res,400,{
          error:"Alias tidak valid."
        });

      }

      if(!deleteToken){

        return json(res,401,{
          error:"Delete token diperlukan."
        });

      }

      const key=`dimzlink:${alias}`;

      const data=await getLink(alias);

      if(!data){

        return json(res,404,{
          error:"Shortlink tidak ditemukan."
        });

      }

      if(data.deleteToken!==deleteToken){

        return json(res,403,{
          error:"Token tidak valid."
        });

      }

      await redis.del(key);

      return json(res,200,{
        success:true
      });

    }

    if(req.method==="GET"){

      const alias=String(
        getQuery(req,"alias")||""
      ).trim();

      if(!ALIAS_REGEX.test(alias)){

        return json(res,400,{
          error:"Alias tidak valid."
        });

      }

      const data=await getLink(alias);

      if(!data){

        res.status(404);
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
<title>DIMZLINK — Not Found</title>
<style>
body{
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#f5f7fb;
  color:#18202b;
  font-family:Arial,sans-serif;
}
.box{
  width:min(420px,calc(100% - 30px));
  padding:28px;
  background:#fff;
  border:1px solid #e5e9f0;
  border-radius:18px;
  text-align:center;
}
h1{
  margin:0 0 7px;
  font-size:20px;
}
p{
  color:#737b87;
  font-size:13px;
}
</style>
</head>
<body>
<div class="box">
<h1>Shortlink tidak ditemukan</h1>
<p>Link mungkin sudah dihapus atau sudah expired.</p>
</div>
</body>
</html>
        `);

      }

      if(
        data.expiresAt &&
        new Date(data.expiresAt).getTime()<=Date.now()
      ){

        await redis.del(`dimzlink:${alias}`);

        res.status(410);
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
<title>DIMZLINK — Expired</title>
<style>
body{
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#f5f7fb;
  font-family:Arial,sans-serif;
}
.box{
  width:min(420px,calc(100% - 30px));
  padding:28px;
  background:#fff;
  border:1px solid #e5e9f0;
  border-radius:18px;
  text-align:center;
}
h1{
  font-size:20px;
}
p{
  color:#737b87;
  font-size:13px;
}
</style>
</head>
<body>
<div class="box">
<h1>Shortlink sudah expired</h1>
<p>Masa berlaku link ini sudah berakhir.</p>
</div>
</body>
</html>
        `);

      }

      const go=String(getQuery(req,"go")||"");

      if(go==="1"){

        try{
          await redis.incr(`dimzlink:clicks:${alias}`);
        }catch{}

        res.statusCode=302;

        res.setHeader(
          "Location",
          data.url
        );

        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate"
        );

        return res.end();

      }

      res.status(200);

      res.setHeader(
        "Content-Type",
        "text/html; charset=utf-8"
      );

      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );

      return res.end(redirectPage(alias));

    }

    return json(res,405,{
      error:"Method tidak didukung."
    });

  }catch(error){

    console.error(error);

    return json(res,500,{
      error:"Terjadi kesalahan pada server."
    });

  }

};
