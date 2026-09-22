export default async function handler(req, res) {

    /*
    =====================================================
    CORS
    =====================================================
    */

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    /*
    =====================================================
    OPTIONS
    =====================================================
    */

    if(req.method === "OPTIONS"){

        return res.status(200).end();
    }


    /*
    =====================================================
    METHOD
    =====================================================
    */

    if(req.method !== "GET"){

        return res.status(405).json({

            success:false,

            error:
                "Method tidak diperbolehkan."
        });
    }


    /*
    =====================================================
    GET URL
    =====================================================
    */

    const youtubeUrl =
        req.query?.url;


    if(!youtubeUrl){

        return res.status(400).json({

            success:false,

            error:
                "Parameter url wajib diisi."
        });
    }


    /*
    =====================================================
    VALIDATE URL
    =====================================================
    */

    let parsedUrl;


    try{

        parsedUrl =
            new URL(
                youtubeUrl
            );

    }catch{

        return res.status(400).json({

            success:false,

            error:
                "URL YouTube tidak valid."
        });
    }


    /*
    =====================================================
    ALLOWED HOST
    =====================================================
    */

    const hostname =
        parsedUrl.hostname
            .toLowerCase()
            .replace(
                /^www\./,
                ""
            );


    const allowedHosts = [

        "youtube.com",

        "m.youtube.com",

        "youtu.be",

        "youtube-nocookie.com"

    ];


    if(
        !allowedHosts.includes(
            hostname
        )
    ){

        return res.status(400).json({

            success:false,

            error:
                "URL harus berasal dari YouTube."
        });
    }


    /*
    =====================================================
    AHM7 API
    =====================================================
    */

    const upstreamUrl =
        "https://ahm7xmakki.com/api/alldl?url=" +
        encodeURIComponent(
            youtubeUrl
        );


    /*
    =====================================================
    REQUEST AHM7
    =====================================================
    */

    try{

        const upstreamResponse =
            await fetch(
                upstreamUrl,
                {

                    method:"GET",

                    headers:{

                        "Accept":
                            "application/json",

                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36"
                    },

                    cache:"no-store"
                }
            );


        /*
        =================================================
        RESPONSE TEXT
        =================================================
        */

        const rawText =
            await upstreamResponse.text();


        /*
        =================================================
        PARSE JSON
        =================================================
        */

        let data;


        try{

            data =
                JSON.parse(
                    rawText
                );

        }catch{

            console.error(
                "AHM7 NON JSON:",
                rawText.substring(
                    0,
                    1000
                )
            );


            return res.status(502).json({

                success:false,

                error:
                    "Server downloader upstream tidak mengembalikan JSON.",

                upstreamStatus:
                    upstreamResponse.status
            });
        }


        /*
        =================================================
        UPSTREAM ERROR
        =================================================
        */

        if(
            !upstreamResponse.ok
        ){

            return res.status(502).json({

                success:false,

                error:
                    data.error ||
                    data.message ||
                    "API downloader upstream gagal.",

                upstreamStatus:
                    upstreamResponse.status,

                upstream:
                    data
            });
        }


        /*
        =================================================
        API EXPLICIT ERROR
        =================================================
        */

        if(
            data.success === false
        ){

            return res.status(400).json({

                success:false,

                error:
                    data.error ||
                    data.message ||
                    "Video tidak dapat diproses.",

                upstream:
                    data
            });
        }


        /*
        =================================================
        SUCCESS
        =================================================
        */

        return res.status(200).json(
            data
        );


    }catch(error){

        console.error(
            "AHM7 REQUEST ERROR:",
            error
        );


        return res.status(500).json({

            success:false,

            error:
                "Gagal menghubungi API downloader.",

            detail:
                error.message ||
                "Unknown server error"
        });
    }
}