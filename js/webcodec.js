

let cnv = document.getElementById('dst');
let ctx = cnv.getContext('2d', { alpha: false });
let ready_frames = [];
let underflow = true;
let time_base = 0;
let frame_time = 100; // in milliseconds
let handle_count = 0;
let render_count = 0;
var asset;

function handleFrame(frame) {
    console.log('handling frame ' + handle_count);
    handle_count++;
    ready_frames.push(frame);
    if (underflow)
        setTimeout(render_frame, 0);
}

function delay(time_ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, time_ms);
    });
}

async function render_frame() {
    console.log('rendering frame ' + render_count);
    
    render_count++;
    if (ready_frames.length == 0) {
        underflow = true;
        return;
    }
    let frame = ready_frames.shift();
    underflow = false;

    try {
        document.getElementById('frame_count').innerHTML = "Frame #: " + render_count;
        document.getElementById("coded_width").innerHTML = "codedWidth: " + frame.codedWidth;
        document.getElementById("coded_height").innerHTML = "codedHeight: " + frame.codedHeight;
        document.getElementById("display_width").innerHTML = "displayWidth: " + frame.displayWidth;
        document.getElementById("display_height").innerHTML = "displayHeight: " + frame.displayHeight;
    } catch(err) {
        document.getElementById('filename').innerHTML = "Error: " + err.message;
    }

    let bitmap = await frame.createImageBitmap();

    await delay(frame_time);
    ctx.drawImage(bitmap, 0, 0);

    // Immediately schedule rendering of the next frame
    setTimeout(render_frame, 0);
    frame.destroy();
}

async function decodeVideo(assetURL, avcC) {
    if ("VideoDecoder" in window) {
        const init = {
            output : handleFrame,
            error: (e) => {
                console.log(e.message);
            }
        };

        const config = {
            codec: "avc1.64000a",
            description : avcC, 
            codedWidth: cnv.width,
            codedHeight: cnv.height,
        };

        let decoder = new VideoDecoder(init);
        decoder.configure(config);

        console.log('creating encoded video chunk');

        (await fetch(assetURL)).arrayBuffer().then(async function(buffer) {
            let chunk = new EncodedVideoChunk({
                type : "key",
                timestamp: frame_time,
                data : buffer,
            });
    
            handle_count = 0;
            render_count = 0;
    
            decoder.decode(chunk);
            
            await decoder.flush();
        });


    } else {
        document.body.innerHTML = "<h1>WebCodecs API is not supported.</h1>";
        return;
    }
}